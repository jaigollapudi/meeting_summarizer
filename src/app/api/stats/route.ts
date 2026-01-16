import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [statusCounts, summaries] = await Promise.all([
      prisma.meeting.groupBy({
        by: ["status"],
        _count: true,
      }),
      prisma.summary.findMany({
        select: { summaryJson: true },
      }),
    ]);

    const uploaded = await prisma.meeting.count();
    const processing = statusCounts.find((s) => s.status === "PROCESSING")?._count ?? 0;
    const ready = statusCounts.find((s) => s.status === "READY")?._count ?? 0;
    const failed = statusCounts.find((s) => s.status === "FAILED")?._count ?? 0;

    // Count action items and decisions from all summaries
    let actionItems = 0;
    let decisions = 0;

    for (const summary of summaries) {
      try {
        const data = JSON.parse(summary.summaryJson);
        actionItems += data.action_items?.length ?? 0;
        decisions += data.decisions?.length ?? 0;
      } catch {
        // Skip invalid JSON
      }
    }

    return NextResponse.json({
      uploaded,
      processing,
      ready,
      failed,
      actionItems,
      decisions,
    });
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}

