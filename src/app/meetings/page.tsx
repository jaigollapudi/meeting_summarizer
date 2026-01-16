"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { FilterBar, MeetingsTable } from "@/components/ui";

interface Meeting {
  id: string;
  title: string;
  originalFilename: string;
  status: "PROCESSING" | "READY" | "FAILED";
  meetingDate: string | null;
  createdAt: string;
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState("recent");

  const fetchMeetings = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      params.set("sort", sortBy);

      const res = await fetch(`/api/meetings?${params}`);
      if (res.ok) {
        const data = await res.json();
        setMeetings(data.meetings);
      }
    } catch (error) {
      console.error("Failed to fetch meetings:", error);
    } finally {
      setLoading(false);
    }
  }, [search, status, sortBy]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  // Poll for updates every 5 seconds if there are processing meetings
  useEffect(() => {
    const hasProcessing = meetings.some((m) => m.status === "PROCESSING");
    if (!hasProcessing) return;

    const interval = setInterval(fetchMeetings, 5000);
    return () => clearInterval(interval);
  }, [meetings, fetchMeetings]);

  return (
    <div className="min-h-screen">
      <Header
        title="Meetings"
        subtitle="View and manage all your meeting transcripts"
      />

      <div className="px-8 pb-8">
        {/* Filter bar */}
        <div className="mb-4">
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            status={status}
            onStatusChange={setStatus}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />
        </div>

        {/* Info */}
        <p className="text-sm text-text-muted mb-4">
          {meetings.length} {meetings.length === 1 ? "meeting" : "meetings"}
        </p>

        {/* Meetings table */}
        <MeetingsTable meetings={meetings} loading={loading} />
      </div>
    </div>
  );
}

