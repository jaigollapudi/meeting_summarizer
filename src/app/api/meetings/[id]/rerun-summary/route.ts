import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MeetingStatus, JobType, JobStatus } from "@prisma/client";

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

    // Update meeting status to PROCESSING
    await prisma.meeting.update({
      where: { id },
      data: { status: MeetingStatus.PROCESSING },
    });

    // Enqueue a new summarization job
    await prisma.job.create({
      data: {
        meetingId: id,
        type: JobType.SUMMARIZE_TRANSCRIPT,
        status: JobStatus.QUEUED,
        runAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, message: "Summarization job queued" });
  } catch (error) {
    console.error("Failed to rerun summary:", error);
    return NextResponse.json(
      { error: "Failed to rerun summary" },
      { status: 500 }
    );
  }
}

