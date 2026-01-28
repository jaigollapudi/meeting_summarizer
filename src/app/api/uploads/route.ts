import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MeetingStatus, SourceType } from "@prisma/client";
import { extractTextFromBuffer } from "@/lib/extractors";
import { normalizeTranscript } from "@/lib/normalizer";
import { summarizeTranscript } from "@/lib/summarizer";

const MAX_SIZE = parseInt(process.env.MAX_UPLOAD_MB || "25", 10) * 1024 * 1024;

const ALLOWED_EXTENSIONS = ["txt", "vtt", "srt", "docx", "pdf"];
const MIME_TYPES: Record<string, string[]> = {
  txt: ["text/plain"],
  vtt: ["text/vtt"],
  srt: ["application/x-subrip", "text/srt", "text/plain"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  pdf: ["application/pdf"],
};

export async function POST(request: NextRequest) {
  let meetingId: string | null = null;
  
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string) || "";
    const meetingDateStr = formData.get("meetingDate") as string | null;
    const tags = (formData.get("tags") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Validate extension
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate MIME type
    const allowedMimes = MIME_TYPES[ext] || [];
    if (!allowedMimes.includes(file.type) && file.type !== "application/octet-stream") {
      console.warn(`Unexpected MIME type ${file.type} for extension ${ext}`);
    }

    // Read file content
    const buffer = Buffer.from(await file.arrayBuffer());

    // Step 1: Extract text
    let rawText: string;
    try {
      rawText = await extractTextFromBuffer(buffer, ext);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Text extraction failed";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json(
        { error: "Could not extract text from file. Please check the file format." },
        { status: 400 }
      );
    }

    // Step 2: Normalize transcript
    const normalizedText = normalizeTranscript(rawText);

    // Parse meeting date
    const meetingDate = meetingDateStr ? new Date(meetingDateStr) : null;

    // Create meeting record (initially PROCESSING)
    const meeting = await prisma.meeting.create({
      data: {
        title: title || file.name.replace(/\.[^.]+$/, ""),
        meetingDate,
        tags: tags || null,
        status: MeetingStatus.PROCESSING,
        sourceType: SourceType.UPLOAD,
        originalFilename: file.name,
        storedFilePath: "", // No file storage in serverless
      },
    });
    meetingId = meeting.id;

    // Create transcript
    await prisma.transcript.create({
      data: {
        meetingId: meeting.id,
        rawText,
        normalizedText,
        detectedFormat: ext,
      },
    });

    // Step 3: Summarize transcript (if OpenAI is configured)
    if (process.env.OPENAI_API_KEY) {
      try {
        const { summaryJson, summaryMarkdown, model, promptVersion } = 
          await summarizeTranscript(normalizedText);

        await prisma.summary.create({
          data: {
            meetingId: meeting.id,
            model,
            promptVersion,
            summaryJson: JSON.stringify(summaryJson),
            summaryMarkdown,
          },
        });

        // Mark as ready
        await prisma.meeting.update({
          where: { id: meeting.id },
          data: { status: MeetingStatus.READY },
        });

        return NextResponse.json({
          meetingId: meeting.id,
          message: "Upload and processing complete",
          status: "READY",
        });
      } catch (error) {
        console.error("Summarization failed:", error);
        
        // Mark as failed but keep the transcript
        await prisma.meeting.update({
          where: { id: meeting.id },
          data: { status: MeetingStatus.FAILED },
        });

        return NextResponse.json({
          meetingId: meeting.id,
          message: "Upload successful but summarization failed. You can retry from the meeting page.",
          status: "FAILED",
          error: error instanceof Error ? error.message : "Summarization failed",
        });
      }
    } else {
      // No API key - mark as failed
      await prisma.meeting.update({
        where: { id: meeting.id },
        data: { status: MeetingStatus.FAILED },
      });

      return NextResponse.json({
        meetingId: meeting.id,
        message: "Upload successful but OPENAI_API_KEY not configured",
        status: "FAILED",
      });
    }
  } catch (error) {
    console.error("Upload failed:", error);
    
    // If we created a meeting, mark it as failed
    if (meetingId) {
      try {
        await prisma.meeting.update({
          where: { id: meetingId },
          data: { status: MeetingStatus.FAILED },
        });
      } catch {
        // Ignore cleanup errors
      }
    }
    
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
