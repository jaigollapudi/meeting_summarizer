import { clsx } from "clsx";

type Status = "PROCESSING" | "READY" | "FAILED" | "QUEUED";

interface StatusBadgeProps {
  status: Status;
}

const statusConfig: Record<
  Status,
  { label: string; className: string; dotClass: string }
> = {
  PROCESSING: {
    label: "Processing",
    className: "bg-status-processing/10 text-status-processing border-status-processing/20",
    dotClass: "bg-status-processing",
  },
  READY: {
    label: "Ready",
    className: "bg-status-ready/10 text-status-ready border-status-ready/20",
    dotClass: "bg-status-ready",
  },
  FAILED: {
    label: "Failed",
    className: "bg-status-failed/10 text-status-failed border-status-failed/20",
    dotClass: "bg-status-failed",
  },
  QUEUED: {
    label: "Queued",
    className: "bg-status-queued/10 text-status-queued border-status-queued/20",
    dotClass: "bg-status-queued",
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border",
        config.className
      )}
    >
      <span className={clsx("h-1.5 w-1.5 rounded-full", config.dotClass)} />
      {config.label}
    </span>
  );
}

