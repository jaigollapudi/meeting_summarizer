import OpenAI from "openai";

const PROMPT_VERSION = "1.0.0";

interface ActionItem {
  task: string;
  owner: string | null;
  due_date: string | null;
  priority: "low" | "medium" | "high";
}

export interface SummarySchema {
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

export interface SummarizeResult {
  summaryJson: SummarySchema;
  summaryMarkdown: string;
  model: string;
  promptVersion: string;
}

const SYSTEM_PROMPT = `You are an expert meeting summarizer. Your task is to analyze meeting transcripts and extract structured information.

You MUST return a valid JSON object with EXACTLY this structure:
{
  "title": "Meeting title inferred from content",
  "meeting_date": "YYYY-MM-DD format if mentioned, otherwise null",
  "executive_summary": ["Brief summary point 1", "Brief summary point 2", ...],
  "decisions": ["Decision 1", "Decision 2", ...],
  "action_items": [
    {"task": "Task description", "owner": "Name or null", "due_date": "Date or null", "priority": "low|medium|high"}
  ],
  "risks_blockers": ["Risk or blocker 1", ...],
  "open_questions": ["Question 1", ...],
  "key_points": ["Key discussion point 1", ...],
  "tags": ["relevant", "topic", "tags"]
}

Rules:
1. Do NOT invent owners or due dates - use null if not explicitly stated
2. Keep bullets concise and businesslike
3. Extract action items carefully - only include actual commitments
4. Prioritize action items based on urgency/importance mentioned
5. Tags should be 3-6 relevant topic keywords
6. executive_summary should have 2-4 high-level points
7. If the transcript is short or lacks certain elements, use empty arrays []`;

export async function summarizeTranscript(
  normalizedText: string
): Promise<SummarizeResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const openai = new OpenAI({ apiKey });

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Analyze this meeting transcript:\n\n${normalizedText}` },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_completion_tokens: 4000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from LLM");
  }

  const summaryJson = validateAndParseResponse(content);
  const summaryMarkdown = generateMarkdown(summaryJson);

  return {
    summaryJson,
    summaryMarkdown,
    model,
    promptVersion: PROMPT_VERSION,
  };
}

function validateAndParseResponse(content: string): SummarySchema {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Invalid JSON response from LLM");
  }

  const schema = parsed as Record<string, unknown>;

  return {
    title: typeof schema.title === "string" ? schema.title : "Untitled Meeting",
    meeting_date:
      typeof schema.meeting_date === "string" ? schema.meeting_date : null,
    executive_summary: Array.isArray(schema.executive_summary)
      ? schema.executive_summary.filter((s): s is string => typeof s === "string")
      : [],
    decisions: Array.isArray(schema.decisions)
      ? schema.decisions.filter((s): s is string => typeof s === "string")
      : [],
    action_items: Array.isArray(schema.action_items)
      ? schema.action_items
          .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
          .map((item) => ({
            task: typeof item.task === "string" ? item.task : "",
            owner: typeof item.owner === "string" ? item.owner : null,
            due_date: typeof item.due_date === "string" ? item.due_date : null,
            priority: validatePriority(item.priority),
          }))
          .filter((item) => item.task.length > 0)
      : [],
    risks_blockers: Array.isArray(schema.risks_blockers)
      ? schema.risks_blockers.filter((s): s is string => typeof s === "string")
      : [],
    open_questions: Array.isArray(schema.open_questions)
      ? schema.open_questions.filter((s): s is string => typeof s === "string")
      : [],
    key_points: Array.isArray(schema.key_points)
      ? schema.key_points.filter((s): s is string => typeof s === "string")
      : [],
    tags: Array.isArray(schema.tags)
      ? schema.tags.filter((s): s is string => typeof s === "string")
      : [],
  };
}

function validatePriority(value: unknown): "low" | "medium" | "high" {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }
  return "medium";
}

function generateMarkdown(summary: SummarySchema): string {
  const lines: string[] = [];

  lines.push(`# ${summary.title}`);
  lines.push("");

  if (summary.meeting_date) {
    lines.push(`**Date:** ${summary.meeting_date}`);
    lines.push("");
  }

  if (summary.tags.length > 0) {
    lines.push(`**Tags:** ${summary.tags.join(", ")}`);
    lines.push("");
  }

  lines.push("## Executive Summary");
  lines.push("");
  for (const point of summary.executive_summary) {
    lines.push(`- ${point}`);
  }
  lines.push("");

  if (summary.key_points.length > 0) {
    lines.push("## Key Points");
    lines.push("");
    for (const point of summary.key_points) {
      lines.push(`- ${point}`);
    }
    lines.push("");
  }

  if (summary.decisions.length > 0) {
    lines.push("## Decisions");
    lines.push("");
    for (const decision of summary.decisions) {
      lines.push(`- ${decision}`);
    }
    lines.push("");
  }

  if (summary.action_items.length > 0) {
    lines.push("## Action Items");
    lines.push("");
    lines.push("| Task | Owner | Due Date | Priority |");
    lines.push("|------|-------|----------|----------|");
    for (const item of summary.action_items) {
      const owner = item.owner || "—";
      const dueDate = item.due_date || "—";
      lines.push(`| ${item.task} | ${owner} | ${dueDate} | ${item.priority} |`);
    }
    lines.push("");
  }

  if (summary.risks_blockers.length > 0) {
    lines.push("## Risks & Blockers");
    lines.push("");
    for (const risk of summary.risks_blockers) {
      lines.push(`- ${risk}`);
    }
    lines.push("");
  }

  if (summary.open_questions.length > 0) {
    lines.push("## Open Questions");
    lines.push("");
    for (const question of summary.open_questions) {
      lines.push(`- ${question}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

