/**
 * Transcript Normalization
 *
 * This module cleans up extracted transcript text:
 * - Removes repeated headers/footers/page numbers
 * - Collapses excessive whitespace
 * - Detects and preserves speaker turns
 * - Maintains paragraph structure
 */

// Patterns for speaker detection
const SPEAKER_PATTERNS = [
  // "Name:" at start of line
  /^([A-Z][a-zA-Z\s.'-]+):\s*/,
  // "[Name]" pattern
  /^\[([A-Za-z][A-Za-z\s.'-]+)\]\s*/,
  // "Speaker 1/2" pattern
  /^(Speaker\s*\d+):\s*/i,
  // "Participant 1/2" pattern
  /^(Participant\s*\d+):\s*/i,
];

// Patterns for lines to remove
const REMOVE_PATTERNS = [
  // Page numbers
  /^Page\s+\d+(\s+of\s+\d+)?$/i,
  /^\d+\s*$/,
  // Common headers/footers
  /^(confidential|draft|internal|private)$/i,
  /^meeting\s+transcript$/i,
  /^transcript$/i,
  // Timestamps that slipped through
  /^\d{1,2}:\d{2}(:\d{2})?(\s*(AM|PM))?$/i,
  // Date-only lines
  /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}$/i,
  /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/,
];

export function normalizeTranscript(rawText: string): string {
  if (!rawText || rawText.trim().length === 0) {
    return "";
  }

  const lines = rawText.split("\n");
  const processedLines: string[] = [];
  let currentSpeaker: string | null = null;
  let consecutiveEmptyLines = 0;

  // First pass: identify repeated lines (headers/footers)
  const lineCounts = new Map<string, number>();
  for (const line of lines) {
    const trimmed = line.trim().toLowerCase();
    if (trimmed.length > 0 && trimmed.length < 100) {
      lineCounts.set(trimmed, (lineCounts.get(trimmed) || 0) + 1);
    }
  }

  // Lines appearing more than 3 times are likely headers/footers
  const repeatedLines = new Set<string>();
  lineCounts.forEach((count, line) => {
    if (count > 3) {
      repeatedLines.add(line);
    }
  });

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines (but track them for paragraph breaks)
    if (trimmed.length === 0) {
      consecutiveEmptyLines++;
      if (consecutiveEmptyLines === 1) {
        // Single empty line = paragraph break
        processedLines.push("");
      }
      continue;
    }

    consecutiveEmptyLines = 0;

    // Skip repeated headers/footers
    if (repeatedLines.has(trimmed.toLowerCase())) {
      continue;
    }

    // Skip lines matching remove patterns
    let shouldRemove = false;
    for (const pattern of REMOVE_PATTERNS) {
      if (pattern.test(trimmed)) {
        shouldRemove = true;
        break;
      }
    }
    if (shouldRemove) {
      continue;
    }

    // Detect speaker turns
    let speaker: string | null = null;
    let content = trimmed;

    for (const pattern of SPEAKER_PATTERNS) {
      const match = trimmed.match(pattern);
      if (match) {
        speaker = match[1].trim();
        content = trimmed.slice(match[0].length).trim();
        break;
      }
    }

    // Format the line
    if (speaker) {
      if (speaker !== currentSpeaker) {
        // New speaker
        currentSpeaker = speaker;
        if (processedLines.length > 0 && processedLines[processedLines.length - 1] !== "") {
          processedLines.push(""); // Add blank line before new speaker
        }
        processedLines.push(`${speaker}: ${content}`);
      } else {
        // Same speaker, continue their text
        processedLines.push(content);
      }
    } else {
      // No speaker detected, just add the content
      processedLines.push(content);
    }
  }

  // Post-processing: collapse excessive whitespace within lines
  const result = processedLines
    .map((line) => {
      // Collapse multiple spaces to single space
      return line.replace(/\s+/g, " ").trim();
    })
    .join("\n");

  // Remove excessive consecutive newlines (more than 2)
  return result.replace(/\n{3,}/g, "\n\n").trim();
}

