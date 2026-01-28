import mammoth from "mammoth";

export async function extractTextFromBuffer(
  buffer: Buffer,
  ext: string
): Promise<string> {
  switch (ext) {
    case "txt":
      return extractTxt(buffer);
    case "vtt":
      return extractVtt(buffer);
    case "srt":
      return extractSrt(buffer);
    case "docx":
      return extractDocx(buffer);
    case "pdf":
      return extractPdf(buffer);
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

function extractTxt(buffer: Buffer): string {
  // Try UTF-8 first, fall back to latin1
  const text = buffer.toString("utf-8");
  // Check for replacement character which indicates encoding issues
  if (text.includes("\uFFFD")) {
    return buffer.toString("latin1");
  }
  return text;
}

function extractVtt(buffer: Buffer): string {
  const content = extractTxt(buffer);
  return parseSubtitleFormat(content, "vtt");
}

function extractSrt(buffer: Buffer): string {
  const content = extractTxt(buffer);
  return parseSubtitleFormat(content, "srt");
}

function parseSubtitleFormat(content: string, format: "vtt" | "srt"): string {
  const lines = content.split("\n");
  const textLines: string[] = [];
  let isInCue = false;
  let currentSpeaker = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip WEBVTT header
    if (format === "vtt" && line.startsWith("WEBVTT")) {
      continue;
    }

    // Skip NOTE comments in VTT
    if (format === "vtt" && line.startsWith("NOTE")) {
      continue;
    }

    // Skip sequence numbers in SRT
    if (format === "srt" && /^\d+$/.test(line)) {
      continue;
    }

    // Skip timestamp lines
    if (line.includes("-->")) {
      isInCue = true;
      continue;
    }

    // Empty line marks end of cue
    if (line === "") {
      isInCue = false;
      continue;
    }

    // Process cue text
    if (isInCue || line.length > 0) {
      // Check for speaker label in format "<v Speaker Name>"
      const vttSpeakerMatch = line.match(/^<v\s+([^>]+)>/);
      if (vttSpeakerMatch) {
        const speaker = vttSpeakerMatch[1].trim();
        const text = line.replace(/<v\s+[^>]+>/, "").replace(/<\/v>/, "").trim();
        if (speaker !== currentSpeaker) {
          currentSpeaker = speaker;
          if (text) {
            textLines.push(`${speaker}: ${text}`);
          }
        } else if (text) {
          const lastLine = textLines[textLines.length - 1];
          if (lastLine && lastLine.startsWith(`${speaker}:`)) {
            textLines[textLines.length - 1] = `${lastLine} ${text}`;
          } else {
            textLines.push(text);
          }
        }
        continue;
      }

      // Check for colon-separated speaker (e.g., "Speaker: text")
      const colonSpeakerMatch = line.match(/^([A-Za-z][A-Za-z\s.'-]+):\s*(.*)$/);
      if (colonSpeakerMatch) {
        const speaker = colonSpeakerMatch[1].trim();
        const text = colonSpeakerMatch[2].trim();
        if (speaker !== currentSpeaker) {
          currentSpeaker = speaker;
          textLines.push(`${speaker}: ${text}`);
        } else if (text) {
          textLines.push(text);
        }
        continue;
      }

      // Regular text line - remove any remaining tags
      const cleanedLine = line
        .replace(/<[^>]+>/g, "")
        .replace(/\{[^}]+\}/g, "")
        .trim();

      if (cleanedLine) {
        textLines.push(cleanedLine);
      }
    }
  }

  return textLines.join("\n");
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });

  if (!result.value || result.value.trim().length === 0) {
    throw new Error("DOCX extraction returned empty content");
  }

  return result.value;
}

async function extractPdf(buffer: Buffer): Promise<string> {
  // Dynamic import for pdf-parse
  const pdfParse = (await import("pdf-parse")).default;

  try {
    const data = await pdfParse(buffer);

    if (!data.text || data.text.trim().length === 0) {
      throw new Error(
        "PDF text extraction failed; export as DOCX/TXT for better results"
      );
    }

    return data.text;
  } catch (error) {
    if (error instanceof Error && error.message.includes("PDF text extraction")) {
      throw error;
    }
    throw new Error(
      "PDF text extraction failed; export as DOCX/TXT for better results"
    );
  }
}

