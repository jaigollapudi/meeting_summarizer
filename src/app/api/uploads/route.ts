import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";
import fs from "fs/promises";
import path from "path";

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
      // Allow application/octet-stream as fallback for some browsers
      console.warn(`Unexpected MIME type ${file.type} for extension ${ext}`);
    }

    // Create upload directory if it doesn't exist
    const uploadDir = process.env.UPLOAD_DIR || "./data/uploads";
    await fs.mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const uniqueId = uuidv4();
    const storedFilename = `${uniqueId}.${ext}`;
    const filePath = path.join(uploadDir, storedFilename);

    // Write file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    // Parse meeting date
    const meetingDate = meetingDateStr ? new Date(meetingDateStr) : null;

    // Create meeting record
    const meeting = await prisma.meeting.create({
      data: {
        title: title || file.name.replace(/\.[^.]+$/, ""),
        meetingDate,
        tags: tags || null,
        status: "PROCESSING",
        sourceType: "UPLOAD",
        originalFilename: file.name,
        storedFilePath: storedFilename,
      },
    });

    // Enqueue extraction job
    await prisma.job.create({
      data: {
        meetingId: meeting.id,
        type: "EXTRACT_TEXT",
        status: "QUEUED",
        runAt: new Date(),
      },
    });

    return NextResponse.json({
      meetingId: meeting.id,
      message: "Upload successful, processing started",
    });
  } catch (error) {
    console.error("Upload failed:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}

