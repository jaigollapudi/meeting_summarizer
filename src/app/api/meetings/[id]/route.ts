import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        transcript: true,
        summaries: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...meeting,
      latestSummary: meeting.summaries[0] || null,
      summaries: undefined, // Remove the array, we only need latest
    });
  } catch (error) {
    console.error("Failed to fetch meeting:", error);
    return NextResponse.json(
      { error: "Failed to fetch meeting" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const meeting = await prisma.meeting.findUnique({
      where: { id },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Delete the uploaded file
    const uploadDir = process.env.UPLOAD_DIR || "./data/uploads";
    const filePath = path.join(uploadDir, meeting.storedFilePath);
    try {
      await fs.unlink(filePath);
    } catch {
      // File might not exist, ignore
    }

    // Delete the meeting (cascades to transcript, summaries, jobs)
    await prisma.meeting.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete meeting:", error);
    return NextResponse.json(
      { error: "Failed to delete meeting" },
      { status: 500 }
    );
  }
}

