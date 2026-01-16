import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "Meeting Summarizer",
  description: "Upload and summarize meeting transcripts with AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen bg-bg-primary">
        <ToastProvider>
          <Sidebar />
          <main className="flex-1 ml-[280px] min-h-screen">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
