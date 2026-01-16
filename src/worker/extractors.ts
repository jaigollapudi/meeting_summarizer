import fs from "fs/promises";
import mammoth from "mammoth";

export async function extractText(filePath: string, ext: string): Promise<string> {
  switch (ext) {
    case "txt":
      return extractTxt(filePath);
    case "vtt":
      return extractVtt(filePath);
    case "srt":
      return extractSrt(filePath);
    case "docx":
      return extractDocx(filePath);
    case "pdf":
      return extractPdf(filePath);
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

async function extractTxt(filePath: string): Promise<string> {
  try {
    // Try UTF-8 first
    return await fs.readFile(filePath, "utf-8");
  } catch {
    // Fallback to latin1
    return await fs.readFile(filePath, "latin1");
  }
}

async function extractVtt(filePath: string): Promise<string> {
  const content = await extractTxt(filePath);
  return parseSubtitleFormat(content, "vtt");
}

async function extractSrt(filePath: string): Promise<string> {
  const content = await extractTxt(filePath);
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
          // Same speaker, just add text
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
      const colonSpeakerMatch = line.match(/^([A-Za-z][A-Za-z\s.]+):\s*(.*)$/);
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

async function extractDocx(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  const result = await mammoth.extractRawText({ buffer });

  if (!result.value || result.value.trim().length === 0) {
    throw new Error("DOCX extraction returned empty content");
  }

  return result.value;
}

async function extractPdf(filePath: string): Promise<string> {
  // Dynamic import for pdf-parse
  const pdfParse = (await import("pdf-parse")).default;
  const buffer = await fs.readFile(filePath);

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

