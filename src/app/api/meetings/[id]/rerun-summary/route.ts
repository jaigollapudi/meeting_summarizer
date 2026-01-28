import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MeetingStatus } from "@prisma/client";
import { summarizeTranscript } from "@/lib/summarizer";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: { transcript: true },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    if (!meeting.transcript) {
      return NextResponse.json(
        { error: "No transcript available to summarize" },
        { status: 400 }
      );
    }

    if (!meeting.transcript.normalizedText) {
      return NextResponse.json(
        { error: "Transcript not normalized" },
        { status: 400 }
      );
    }

    // Update meeting status to PROCESSING
    await prisma.meeting.update({
      where: { id },
      data: { status: MeetingStatus.PROCESSING },
    });

    try {
      // Run summarization synchronously (serverless-compatible)
      const { summaryJson, summaryMarkdown, model, promptVersion } = 
        await summarizeTranscript(meeting.transcript.normalizedText);

      // Create new summary
      await prisma.summary.create({
        data: {
          meetingId: id,
          model,
          promptVersion,
          summaryJson: JSON.stringify(summaryJson),
          summaryMarkdown,
        },
      });

      // Mark as ready
      await prisma.meeting.update({
        where: { id },
        data: { status: MeetingStatus.READY },
      });

      return NextResponse.json({ 
        success: true, 
        message: "Summary regenerated successfully" 
      });
    } catch (error) {
      // Mark as failed
      await prisma.meeting.update({
        where: { id },
        data: { status: MeetingStatus.FAILED },
      });

      console.error("Summarization failed:", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Summarization failed" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Failed to rerun summary:", error);
    return NextResponse.json(
      { error: "Failed to rerun summary" },
      { status: 500 }
    );
  }
}
