import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        summaries: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    const latestSummary = meeting.summaries[0];
    if (!latestSummary) {
      return NextResponse.json(
        { error: "No summary available to export" },
        { status: 400 }
      );
    }

    const filename = `${meeting.title.replace(/[^a-zA-Z0-9]/g, "_")}_summary.md`;

    return new NextResponse(latestSummary.summaryMarkdown, {
      headers: {
        "Content-Type": "text/markdown",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Failed to export summary:", error);
    return NextResponse.json(
      { error: "Failed to export summary" },
      { status: 500 }
    );
  }
}

