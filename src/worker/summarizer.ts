import OpenAI from "openai";

const PROMPT_VERSION = "1.0.0";
const MAX_TOKENS_PER_CHUNK = 12000; // Leave room for response
const OVERLAP_TOKENS = 500;

interface ActionItem {
  task: string;
  owner: string | null;
  due_date: string | null;
  priority: "low" | "medium" | "high";
}

interface SummarySchema {
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

interface SummarizeResult {
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

const CHUNK_PROMPT = `Analyze this section of a meeting transcript and extract key information.
Focus on decisions, action items, risks, and important discussion points.
Return the JSON structure as specified.

Transcript section:
`;

const SYNTHESIS_PROMPT = `You have analyzed multiple sections of a meeting transcript. Now synthesize the partial summaries into a final comprehensive summary.

Combine and deduplicate information across sections:
- Merge similar action items
- Consolidate decisions
- Create a cohesive executive summary
- Remove duplicate key points

Return the final JSON structure with all information merged appropriately.

Partial summaries:
`;

export async function summarizeTranscript(
  normalizedText: string
): Promise<SummarizeResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const openai = new OpenAI({ apiKey });

  // Estimate tokens (rough: 4 chars per token)
  const estimatedTokens = Math.ceil(normalizedText.length / 4);

  let summaryJson: SummarySchema;

  if (estimatedTokens <= MAX_TOKENS_PER_CHUNK) {
    // Single chunk processing
    summaryJson = await processSingleChunk(openai, model, normalizedText);
  } else {
    // Multi-chunk processing
    summaryJson = await processMultipleChunks(openai, model, normalizedText);
  }

  // Generate markdown from JSON
  const summaryMarkdown = generateMarkdown(summaryJson);

  return {
    summaryJson,
    summaryMarkdown,
    model,
    promptVersion: PROMPT_VERSION,
  };
}

async function processSingleChunk(
  openai: OpenAI,
  model: string,
  text: string
): Promise<SummarySchema> {
  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Analyze this meeting transcript:\n\n${text}` },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_completion_tokens: 4000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from LLM");
  }

  return validateAndParseResponse(content);
}

async function processMultipleChunks(
  openai: OpenAI,
  model: string,
  text: string
): Promise<SummarySchema> {
  // Split text into chunks
  const chunks = splitIntoChunks(text, MAX_TOKENS_PER_CHUNK, OVERLAP_TOKENS);
  console.log(`Processing ${chunks.length} chunks`);

  // Process each chunk
  const partialSummaries: SummarySchema[] = [];

  for (let i = 0; i < chunks.length; i++) {
    console.log(`Processing chunk ${i + 1}/${chunks.length}`);

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `${CHUNK_PROMPT}${chunks[i]}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_completion_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      try {
        const parsed = validateAndParseResponse(content);
        partialSummaries.push(parsed);
      } catch (error) {
        console.warn(`Failed to parse chunk ${i + 1}:`, error);
      }
    }
  }

  if (partialSummaries.length === 0) {
    throw new Error("Failed to process any chunks");
  }

  if (partialSummaries.length === 1) {
    return partialSummaries[0];
  }

  // Synthesize final summary
  console.log("Synthesizing final summary");
  const synthesisInput = JSON.stringify(partialSummaries, null, 2);

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `${SYNTHESIS_PROMPT}${synthesisInput}` },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_completion_tokens: 4000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from synthesis");
  }

  return validateAndParseResponse(content);
}

function splitIntoChunks(
  text: string,
  maxTokens: number,
  overlapTokens: number
): string[] {
  const chunks: string[] = [];
  const charsPerToken = 4;
  const maxChars = maxTokens * charsPerToken;
  const overlapChars = overlapTokens * charsPerToken;

  let start = 0;

  while (start < text.length) {
    let end = start + maxChars;

    if (end >= text.length) {
      chunks.push(text.slice(start));
      break;
    }

    // Try to break at paragraph boundary
    const searchStart = Math.max(start + maxChars - 1000, start);
    const searchEnd = Math.min(start + maxChars + 500, text.length);
    const searchText = text.slice(searchStart, searchEnd);

    const paragraphBreak = searchText.lastIndexOf("\n\n");
    if (paragraphBreak !== -1) {
      end = searchStart + paragraphBreak;
    } else {
      // Fall back to sentence boundary
      const sentenceBreak = searchText.lastIndexOf(". ");
      if (sentenceBreak !== -1) {
        end = searchStart + sentenceBreak + 1;
      }
    }

    chunks.push(text.slice(start, end));
    start = end - overlapChars;
  }

  return chunks;
}

function validateAndParseResponse(content: string): SummarySchema {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Invalid JSON response from LLM");
  }

  // Validate structure
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

