import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const summaries = await prisma.summary.findMany({
      where: { meetingId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        model: true,
        promptVersion: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ summaries });
  } catch (error) {
    console.error("Failed to fetch summaries:", error);
    return NextResponse.json(
      { error: "Failed to fetch summaries" },
      { status: 500 }
    );
  }
}

