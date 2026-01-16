"use client";

import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { format } from "date-fns";

interface Meeting {
  id: string;
  title: string;
  originalFilename: string;
  status: "PROCESSING" | "READY" | "FAILED";
  meetingDate: string | null;
  createdAt: string;
}

interface MeetingsTableProps {
  meetings: Meeting[];
  loading?: boolean;
}

export function MeetingsTable({ meetings, loading }: MeetingsTableProps) {
  if (loading) {
    return <MeetingsTableSkeleton />;
  }

  if (meetings.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-card overflow-hidden">
      {/* Table header */}
      <div className="grid grid-cols-[1fr_180px_140px_140px_40px] gap-4 px-6 py-3 border-b border-border-subtle text-xs font-medium text-text-muted uppercase tracking-wider">
        <div>Meeting / Title</div>
        <div>Date</div>
        <div>Status</div>
        <div>Created</div>
        <div></div>
      </div>

      {/* Table rows */}
      <div className="divide-y divide-border-subtle">
        {meetings.map((meeting) => (
          <Link
            key={meeting.id}
            href={`/meetings/${meeting.id}`}
            className="grid grid-cols-[1fr_180px_140px_140px_40px] gap-4 px-6 py-4 hover:bg-bg-tertiary transition-colors items-center group"
          >
            {/* Title & filename */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-bg-tertiary border border-border-subtle flex items-center justify-center text-text-muted">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-text-primary truncate">
                  {meeting.title}
                </p>
                <p className="text-sm text-text-muted truncate">
                  {meeting.originalFilename} · Upload
                </p>
              </div>
            </div>

            {/* Meeting date */}
            <div className="text-sm text-text-secondary">
              {meeting.meetingDate
                ? format(new Date(meeting.meetingDate), "MMM d, yyyy")
                : "—"}
            </div>

            {/* Status */}
            <div>
              <StatusBadge status={meeting.status} />
            </div>

            {/* Created */}
            <div className="text-sm text-text-secondary">
              {format(new Date(meeting.createdAt), "MMM d")}
            </div>

            {/* Chevron */}
            <div className="text-text-muted group-hover:text-text-primary transition-colors">
              <ChevronRight className="h-5 w-5" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function MeetingsTableSkeleton() {
  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-card overflow-hidden">
      <div className="grid grid-cols-[1fr_180px_140px_140px_40px] gap-4 px-6 py-3 border-b border-border-subtle">
        <div className="skeleton h-3 w-24 rounded" />
        <div className="skeleton h-3 w-12 rounded" />
        <div className="skeleton h-3 w-14 rounded" />
        <div className="skeleton h-3 w-16 rounded" />
        <div />
      </div>
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_180px_140px_140px_40px] gap-4 px-6 py-4 border-b border-border-subtle last:border-b-0"
        >
          <div className="flex items-center gap-3">
            <div className="skeleton h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <div className="skeleton h-4 w-48 rounded" />
              <div className="skeleton h-3 w-32 rounded" />
            </div>
          </div>
          <div className="skeleton h-4 w-24 rounded self-center" />
          <div className="skeleton h-6 w-20 rounded-full self-center" />
          <div className="skeleton h-4 w-16 rounded self-center" />
          <div />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-card p-12 text-center">
      <div className="mx-auto h-16 w-16 rounded-full bg-bg-tertiary flex items-center justify-center mb-4">
        <FileText className="h-8 w-8 text-text-muted" />
      </div>
      <h3 className="text-lg font-medium text-text-primary mb-2">
        No meetings yet
      </h3>
      <p className="text-sm text-text-secondary mb-6">
        Upload your first transcript to get started
      </p>
      <Link
        href="/upload"
        className="inline-flex items-center px-4 py-2 bg-accent-blue text-white text-sm font-medium rounded-button hover:bg-accent-blue-hover transition-colors"
      >
        Upload Transcript
      </Link>
    </div>
  );
}

