"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { Header } from "@/components/layout/Header";
import { Button, Input } from "@/components/ui";
import { Upload, FileText, X, Loader2 } from "lucide-react";

const ACCEPTED_TYPES = {
  "text/plain": [".txt"],
  "text/vtt": [".vtt"],
  "application/x-subrip": [".srt"],
  "text/srt": [".srt"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/pdf": [".pdf"],
};

const MAX_SIZE = 25 * 1024 * 1024; // 25MB

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [tags, setTags] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    if (acceptedFiles.length > 0) {
      const f = acceptedFiles[0];
      setFile(f);
      // Auto-fill title from filename if empty
      if (!title) {
        const nameWithoutExt = f.name.replace(/\.[^.]+$/, "");
        setTitle(nameWithoutExt);
      }
    }
  }, [title]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE,
    multiple: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title || file.name);
      if (meetingDate) formData.append("meetingDate", meetingDate);
      if (tags) formData.append("tags", tags);

      const res = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      router.push(`/meetings/${data.meetingId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setError(null);
  };

  return (
    <div className="min-h-screen">
      <Header
        title="Upload Transcript"
        subtitle="Upload a meeting transcript to generate summaries"
        showUploadButton={false}
      />

      <div className="px-8 pb-8 max-w-2xl">
        <form onSubmit={handleSubmit}>
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`
              relative border-2 border-dashed rounded-card p-12 text-center cursor-pointer transition-colors mb-6
              ${isDragActive
                ? "border-accent-blue bg-accent-blue/5"
                : "border-border-subtle hover:border-border bg-bg-secondary"
              }
              ${file ? "border-status-ready bg-status-ready/5" : ""}
            `}
          >
            <input {...getInputProps()} />
            
            {file ? (
              <div className="flex items-center justify-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-bg-tertiary flex items-center justify-center">
                  <FileText className="h-6 w-6 text-status-ready" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-text-primary">{file.name}</p>
                  <p className="text-sm text-text-muted">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile();
                  }}
                  className="ml-auto p-2 text-text-muted hover:text-text-primary transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <>
                <div className="mx-auto h-16 w-16 rounded-full bg-bg-tertiary flex items-center justify-center mb-4">
                  <Upload className="h-8 w-8 text-text-muted" />
                </div>
                <p className="text-text-primary font-medium mb-2">
                  {isDragActive ? "Drop file here" : "Drag and drop your transcript"}
                </p>
                <p className="text-sm text-text-muted mb-4">
                  or click to browse
                </p>
                <p className="text-xs text-text-muted">
                  Supported: TXT, VTT, SRT, DOCX, PDF · Max 25MB
                </p>
              </>
            )}
          </div>

          {/* File rejection errors */}
          {fileRejections.length > 0 && (
            <div className="mb-6 p-4 rounded-card bg-status-failed/10 border border-status-failed/20">
              <p className="text-sm text-status-failed">
                {fileRejections[0].errors[0].message}
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 rounded-card bg-status-failed/10 border border-status-failed/20">
              <p className="text-sm text-status-failed">{error}</p>
            </div>
          )}

          {/* Optional fields */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Meeting Title
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter meeting title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Meeting Date
              </label>
              <Input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Tags
              </label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g., weekly, engineering, planning"
              />
              <p className="text-xs text-text-muted mt-1">
                Separate multiple tags with commas
              </p>
            </div>
          </div>

          {/* Submit button */}
          <Button
            type="submit"
            disabled={!file || uploading}
            className="w-full"
            size="lg"
          >
            {uploading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 mr-2" />
                Upload & Process
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

