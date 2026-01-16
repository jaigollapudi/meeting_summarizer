import { NextResponse } from "next/server";

const PROMPT_VERSION = "1.0.0";

export async function GET() {
  return NextResponse.json({
    openaiKeyConfigured: !!process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    uploadDir: process.env.UPLOAD_DIR || "./data/uploads",
    maxUploadMb: parseInt(process.env.MAX_UPLOAD_MB || "25", 10),
    databaseUrl: process.env.DATABASE_URL || "file:./dev.db",
    promptVersion: PROMPT_VERSION,
  });
}

