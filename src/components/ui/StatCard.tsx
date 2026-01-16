import { ReactNode } from "react";
import { clsx } from "clsx";

interface StatCardProps {
  icon: ReactNode;
  value: number | string;
  label: string;
  loading?: boolean;
}

export function StatCard({ icon, value, label, loading }: StatCardProps) {
  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-card p-5 min-w-[160px]">
      <div className="text-text-muted mb-3">{icon}</div>
      {loading ? (
        <div className="skeleton h-8 w-16 rounded mb-2" />
      ) : (
        <p className="text-3xl font-semibold text-text-primary">{value}</p>
      )}
      <p className="text-xs font-medium text-text-muted uppercase tracking-wider mt-1">
        {label}
      </p>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-card p-5 min-w-[160px]">
      <div className="skeleton h-5 w-5 rounded mb-3" />
      <div className="skeleton h-8 w-16 rounded mb-2" />
      <div className="skeleton h-3 w-20 rounded" />
    </div>
  );
}

