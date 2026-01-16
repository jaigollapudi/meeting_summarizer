"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  FileText,
  Settings,
  Mic2,
} from "lucide-react";
import { clsx } from "clsx";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload Transcript", icon: Upload },
  { href: "/meetings", label: "Meetings", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[280px] bg-bg-secondary border-r border-border-subtle">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border-subtle">
        <div className="flex h-10 w-10 items-center justify-center rounded-card bg-accent-blue/10">
          <Mic2 className="h-5 w-5 text-accent-blue" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-text-primary">
            Meeting Summarizer
          </h1>
          <p className="text-xs text-text-muted">localhost</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-6 px-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-3 px-4 py-3 rounded-button text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent-blue/10 text-accent-blue border border-accent-blue/20 shadow-glow"
                      : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

