"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { StatCard, FilterBar, MeetingsTable } from "@/components/ui";
import {
  Upload,
  Loader2,
  CheckCircle,
  XCircle,
  ListTodo,
  MessageSquare,
} from "lucide-react";

interface Stats {
  uploaded: number;
  processing: number;
  ready: number;
  failed: number;
  actionItems: number;
  decisions: number;
}

interface Meeting {
  id: string;
  title: string;
  originalFilename: string;
  status: "PROCESSING" | "READY" | "FAILED";
  meetingDate: string | null;
  createdAt: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState("recent");

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      params.set("sort", sortBy);

      const [statsRes, meetingsRes] = await Promise.all([
        fetch("/api/stats"),
        fetch(`/api/meetings?${params}`),
      ]);

      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
      if (meetingsRes.ok) {
        const data = await meetingsRes.json();
        setMeetings(data.meetings);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [search, status, sortBy]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll for updates every 5 seconds if there are processing meetings
  useEffect(() => {
    const hasProcessing = meetings.some((m) => m.status === "PROCESSING");
    if (!hasProcessing) return;

    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [meetings, fetchData]);

  return (
    <div className="min-h-screen">
      <Header
        title="Dashboard"
        subtitle="Track and manage your meeting transcripts"
      />

      <div className="px-8 pb-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard
            icon={<Upload className="h-5 w-5" />}
            value={stats?.uploaded ?? 0}
            label="UPLOADED"
            loading={loading}
          />
          <StatCard
            icon={<Loader2 className="h-5 w-5" />}
            value={stats?.processing ?? 0}
            label="PROCESSING"
            loading={loading}
          />
          <StatCard
            icon={<CheckCircle className="h-5 w-5" />}
            value={stats?.ready ?? 0}
            label="READY"
            loading={loading}
          />
          <StatCard
            icon={<XCircle className="h-5 w-5" />}
            value={stats?.failed ?? 0}
            label="FAILED"
            loading={loading}
          />
          <StatCard
            icon={<ListTodo className="h-5 w-5" />}
            value={stats?.actionItems ?? 0}
            label="ACTION ITEMS"
            loading={loading}
          />
          <StatCard
            icon={<MessageSquare className="h-5 w-5" />}
            value={stats?.decisions ?? 0}
            label="DECISIONS"
            loading={loading}
          />
        </div>

        {/* Meetings section */}
        <section>
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                All Meetings
              </h2>
              <p className="text-sm text-text-muted">
                {meetings.length} {meetings.length === 1 ? "meeting" : "meetings"}
              </p>
            </div>
          </div>

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

          {/* Meetings table */}
          <MeetingsTable meetings={meetings} loading={loading} />
        </section>
      </div>
    </div>
  );
}

