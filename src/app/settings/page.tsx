"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { CheckCircle, XCircle, Cpu, Key, Database, FolderOpen } from "lucide-react";

interface Config {
  openaiKeyConfigured: boolean;
  openaiModel: string;
  uploadDir: string;
  maxUploadMb: number;
  databaseUrl: string;
  promptVersion: string;
}

export default function SettingsPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch("/api/config");
        if (res.ok) {
          setConfig(await res.json());
        }
      } catch (error) {
        console.error("Failed to fetch config:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  return (
    <div className="min-h-screen">
      <Header
        title="Settings"
        subtitle="View current configuration"
        showUploadButton={false}
      />

      <div className="px-8 pb-8 max-w-2xl">
        <div className="space-y-4">
          {/* OpenAI API Key */}
          <ConfigCard
            icon={<Key className="h-5 w-5" />}
            title="OpenAI API Key"
            loading={loading}
          >
            {config && (
              <div className="flex items-center gap-2">
                {config.openaiKeyConfigured ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-status-ready" />
                    <span className="text-status-ready">Configured</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-status-failed" />
                    <span className="text-status-failed">Not configured</span>
                  </>
                )}
              </div>
            )}
          </ConfigCard>

          {/* Model */}
          <ConfigCard
            icon={<Cpu className="h-5 w-5" />}
            title="LLM Model"
            loading={loading}
          >
            {config && (
              <span className="text-text-primary font-mono">
                {config.openaiModel}
              </span>
            )}
          </ConfigCard>

          {/* Prompt Version */}
          <ConfigCard
            icon={<Cpu className="h-5 w-5" />}
            title="Prompt Version"
            loading={loading}
          >
            {config && (
              <span className="text-text-primary font-mono">
                {config.promptVersion}
              </span>
            )}
          </ConfigCard>

          {/* Database */}
          <ConfigCard
            icon={<Database className="h-5 w-5" />}
            title="Database"
            loading={loading}
          >
            {config && (
              <span className="text-text-primary font-mono text-sm">
                {config.databaseUrl}
              </span>
            )}
          </ConfigCard>

          {/* Upload Directory */}
          <ConfigCard
            icon={<FolderOpen className="h-5 w-5" />}
            title="Upload Directory"
            loading={loading}
          >
            {config && (
              <span className="text-text-primary font-mono text-sm">
                {config.uploadDir}
              </span>
            )}
          </ConfigCard>

          {/* Max Upload Size */}
          <ConfigCard
            icon={<FolderOpen className="h-5 w-5" />}
            title="Max Upload Size"
            loading={loading}
          >
            {config && (
              <span className="text-text-primary">{config.maxUploadMb} MB</span>
            )}
          </ConfigCard>
        </div>

        <div className="mt-8 p-4 bg-bg-secondary border border-border-subtle rounded-card">
          <h3 className="text-sm font-medium text-text-primary mb-2">
            Environment Variables
          </h3>
          <p className="text-sm text-text-muted mb-3">
            Configuration is set via environment variables. Create a{" "}
            <code className="px-1 py-0.5 bg-bg-tertiary rounded text-text-secondary">
              .env
            </code>{" "}
            file in the project root:
          </p>
          <pre className="p-3 bg-bg-tertiary rounded-button text-xs text-text-secondary overflow-x-auto">
{`DATABASE_URL="file:./dev.db"
UPLOAD_DIR="./data/uploads"
OPENAI_API_KEY="sk-your-api-key-here"
OPENAI_MODEL="gpt-4.1-mini"
MAX_UPLOAD_MB="25"`}
          </pre>
        </div>
      </div>
    </div>
  );
}

function ConfigCard({
  icon,
  title,
  loading,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-card p-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="text-text-muted">{icon}</div>
        <span className="text-text-secondary font-medium">{title}</span>
      </div>
      {loading ? (
        <div className="skeleton h-5 w-24 rounded" />
      ) : (
        children
      )}
    </div>
  );
}

