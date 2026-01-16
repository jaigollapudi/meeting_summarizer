"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Button, StatusBadge, Input } from "@/components/ui";
import {
  ArrowLeft,
  RefreshCw,
  Trash2,
  Download,
  ChevronDown,
  ChevronUp,
  Calendar,
  FileText,
  Tag,
  Search,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  ListTodo,
  MessageSquare,
  Lightbulb,
  Loader2,
} from "lucide-react";

interface ActionItem {
  task: string;
  owner: string | null;
  due_date: string | null;
  priority: "low" | "medium" | "high";
}

interface SummaryData {
  title: string;
  meeting_date: string | null;
  executive_summary: string[];
  decisions: string[];
  action_items: ActionItem[];
  risks_blockers: string[];
  open_questions: string[];
  key_points: string[];
  tags: string[];
}

interface Meeting {
  id: string;
  title: string;
  originalFilename: string;
  status: "PROCESSING" | "READY" | "FAILED";
  meetingDate: string | null;
  tags: string | null;
  createdAt: string;
  updatedAt: string;
  transcript: {
    rawText: string;
    normalizedText: string;
    detectedFormat: string;
  } | null;
  latestSummary: {
    id: string;
    model: string;
    promptVersion: string;
    summaryJson: string;
    summaryMarkdown: string;
    createdAt: string;
  } | null;
}

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [rerunning, setRerunning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);
  const [transcriptSearch, setTranscriptSearch] = useState("");

  const fetchMeeting = useCallback(async () => {
    try {
      const res = await fetch(`/api/meetings/${id}`);
      if (res.ok) {
        setMeeting(await res.json());
      } else if (res.status === 404) {
        router.push("/meetings");
      }
    } catch (error) {
      console.error("Failed to fetch meeting:", error);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchMeeting();
  }, [fetchMeeting]);

  // Poll if processing
  useEffect(() => {
    if (meeting?.status !== "PROCESSING") return;
    const interval = setInterval(fetchMeeting, 3000);
    return () => clearInterval(interval);
  }, [meeting?.status, fetchMeeting]);

  const handleRerun = async () => {
    setRerunning(true);
    try {
      const res = await fetch(`/api/meetings/${id}/rerun-summary`, {
        method: "POST",
      });
      if (res.ok) {
        fetchMeeting();
      }
    } catch (error) {
      console.error("Failed to rerun summary:", error);
    } finally {
      setRerunning(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this meeting?")) return;
    
    setDeleting(true);
    try {
      const res = await fetch(`/api/meetings/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/meetings");
      }
    } catch (error) {
      console.error("Failed to delete meeting:", error);
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    window.open(`/api/meetings/${id}/export`, "_blank");
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!meeting) {
    return null;
  }

  const summary: SummaryData | null = meeting.latestSummary
    ? JSON.parse(meeting.latestSummary.summaryJson)
    : null;

  const highlightSearch = (text: string) => {
    if (!transcriptSearch) return text;
    const regex = new RegExp(`(${transcriptSearch})`, "gi");
    return text.replace(regex, '<mark class="bg-accent-yellow/30 text-text-primary">$1</mark>');
  };

  const filteredTranscript = meeting.transcript?.normalizedText || "";

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="px-8 py-6 border-b border-border-subtle">
        <div className="flex items-center gap-4 mb-4">
          <Link
            href="/meetings"
            className="p-2 text-text-muted hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-text-primary">
                {meeting.title}
              </h1>
              <StatusBadge status={meeting.status} />
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-text-muted">
              <span className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                {meeting.originalFilename}
              </span>
              {meeting.meetingDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(meeting.meetingDate), "MMM d, yyyy")}
                </span>
              )}
              {meeting.tags && (
                <span className="flex items-center gap-1">
                  <Tag className="h-4 w-4" />
                  {meeting.tags}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRerun}
              disabled={rerunning || meeting.status === "PROCESSING"}
            >
              {rerunning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Rerun
            </Button>
            <Button variant="secondary" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </Button>
          </div>
        </div>
      </header>

      <div className="px-8 pt-6">
        {meeting.status === "PROCESSING" && (
          <div className="mb-6 p-4 rounded-card bg-status-processing/10 border border-status-processing/20 flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-status-processing animate-spin" />
            <p className="text-sm text-status-processing">
              Processing transcript... This may take a moment.
            </p>
          </div>
        )}

        {meeting.status === "FAILED" && (
          <div className="mb-6 p-4 rounded-card bg-status-failed/10 border border-status-failed/20">
            <p className="text-sm text-status-failed">
              Processing failed. Try re-running the summary or check the transcript format.
            </p>
          </div>
        )}

        {/* Summary sections */}
        {summary && (
          <div className="grid gap-6 lg:grid-cols-2 mb-6">
            {/* Executive Summary */}
            <SummaryCard
              title="Executive Summary"
              icon={<MessageSquare className="h-5 w-5" />}
              items={summary.executive_summary}
            />

            {/* Key Points */}
            <SummaryCard
              title="Key Points"
              icon={<Lightbulb className="h-5 w-5" />}
              items={summary.key_points}
            />

            {/* Decisions */}
            <SummaryCard
              title="Decisions"
              icon={<CheckCircle className="h-5 w-5" />}
              items={summary.decisions}
              emptyText="No decisions recorded"
            />

            {/* Risks & Blockers */}
            <SummaryCard
              title="Risks & Blockers"
              icon={<AlertTriangle className="h-5 w-5" />}
              items={summary.risks_blockers}
              emptyText="No risks or blockers identified"
            />

            {/* Open Questions */}
            <SummaryCard
              title="Open Questions"
              icon={<HelpCircle className="h-5 w-5" />}
              items={summary.open_questions}
              emptyText="No open questions"
            />
          </div>
        )}

        {/* Action Items */}
        {summary && summary.action_items.length > 0 && (
          <div className="mb-6 bg-bg-secondary border border-border-subtle rounded-card p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-text-primary mb-4">
              <ListTodo className="h-5 w-5" />
              Action Items
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-text-muted border-b border-border-subtle">
                    <th className="pb-3 font-medium">Task</th>
                    <th className="pb-3 font-medium">Owner</th>
                    <th className="pb-3 font-medium">Due Date</th>
                    <th className="pb-3 font-medium">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {summary.action_items.map((item, i) => (
                    <tr key={i}>
                      <td className="py-3 text-text-primary">{item.task}</td>
                      <td className="py-3 text-text-secondary">
                        {item.owner || "—"}
                      </td>
                      <td className="py-3 text-text-secondary">
                        {item.due_date || "—"}
                      </td>
                      <td className="py-3">
                        <PriorityBadge priority={item.priority} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Transcript */}
        {meeting.transcript && (
          <div className="bg-bg-secondary border border-border-subtle rounded-card">
            <button
              onClick={() => setTranscriptExpanded(!transcriptExpanded)}
              className="w-full flex items-center justify-between p-6 text-left"
            >
              <h3 className="flex items-center gap-2 text-lg font-semibold text-text-primary">
                <FileText className="h-5 w-5" />
                Transcript
                <span className="text-sm font-normal text-text-muted ml-2">
                  ({meeting.transcript.detectedFormat.toUpperCase()})
                </span>
              </h3>
              {transcriptExpanded ? (
                <ChevronUp className="h-5 w-5 text-text-muted" />
              ) : (
                <ChevronDown className="h-5 w-5 text-text-muted" />
              )}
            </button>
            
            {transcriptExpanded && (
              <div className="px-6 pb-6">
                <div className="mb-4">
                  <Input
                    icon="search"
                    placeholder="Search transcript..."
                    value={transcriptSearch}
                    onChange={(e) => setTranscriptSearch(e.target.value)}
                  />
                </div>
                <div
                  className="p-4 bg-bg-tertiary rounded-button text-sm text-text-secondary whitespace-pre-wrap max-h-[500px] overflow-y-auto font-mono"
                  dangerouslySetInnerHTML={{
                    __html: highlightSearch(filteredTranscript),
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  icon,
  items,
  emptyText = "Nothing to show",
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  emptyText?: string;
}) {
  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-card p-6">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-text-primary mb-4">
        {icon}
        {title}
      </h3>
      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-text-secondary">
              <span className="text-text-muted">•</span>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-text-muted">{emptyText}</p>
      )}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: "low" | "medium" | "high" }) {
  const config = {
    low: "bg-status-ready/10 text-status-ready border-status-ready/20",
    medium: "bg-status-queued/10 text-status-queued border-status-queued/20",
    high: "bg-status-failed/10 text-status-failed border-status-failed/20",
  };

  return (
    <span
      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${config[priority]}`}
    >
      {priority}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen pb-8">
      <header className="px-8 py-6 border-b border-border-subtle">
        <div className="flex items-center gap-4">
          <div className="skeleton h-9 w-9 rounded" />
          <div className="flex-1">
            <div className="skeleton h-7 w-64 rounded mb-2" />
            <div className="skeleton h-4 w-48 rounded" />
          </div>
          <div className="flex gap-2">
            <div className="skeleton h-9 w-20 rounded" />
            <div className="skeleton h-9 w-20 rounded" />
            <div className="skeleton h-9 w-20 rounded" />
          </div>
        </div>
      </header>
      <div className="px-8 pt-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-bg-secondary border border-border-subtle rounded-card p-6"
            >
              <div className="skeleton h-6 w-40 rounded mb-4" />
              <div className="space-y-2">
                <div className="skeleton h-4 w-full rounded" />
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-4 w-5/6 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

