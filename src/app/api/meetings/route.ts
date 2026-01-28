import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MeetingStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") as MeetingStatus | null;
    const sort = searchParams.get("sort") || "recent";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const validStatuses: MeetingStatus[] = ["PROCESSING", "READY", "FAILED"];

    const where: {
      status?: MeetingStatus;
      OR?: { title: { contains: string } }[];
    } = {};

    if (status && validStatuses.includes(status)) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
      ];
    }

    const orderBy: { createdAt?: "asc" | "desc"; title?: "asc" } =
      sort === "oldest"
        ? { createdAt: "asc" }
        : sort === "title"
        ? { title: "asc" }
        : { createdAt: "desc" };

    const [meetings, total] = await Promise.all([
      prisma.meeting.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          originalFilename: true,
          status: true,
          meetingDate: true,
          createdAt: true,
        },
      }),
      prisma.meeting.count({ where }),
    ]);

    return NextResponse.json({
      meetings,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Failed to fetch meetings:", error);
    return NextResponse.json(
      { error: "Failed to fetch meetings" },
      { status: 500 }
    );
  }
}
