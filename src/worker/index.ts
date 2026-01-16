import { PrismaClient } from "@prisma/client";
import { extractText } from "./extractors";
import { normalizeTranscript } from "./normalizer";
import { summarizeTranscript } from "./summarizer";

const prisma = new PrismaClient();

type JobType = "EXTRACT_TEXT" | "NORMALIZE_TRANSCRIPT" | "SUMMARIZE_TRANSCRIPT";

const MAX_ATTEMPTS = 5;
const POLL_INTERVAL = 2000; // 2 seconds
const BASE_BACKOFF = 1000; // 1 second

async function processJob(jobId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { meeting: true },
  });

  if (!job) {
    console.error(`Job ${jobId} not found`);
    return;
  }

  console.log(`Processing job ${job.id} (${job.type}) for meeting ${job.meetingId}`);

  try {
    switch (job.type as JobType) {
      case "EXTRACT_TEXT":
        await handleExtractText(job.meetingId);
        // Chain to normalization
        await enqueueJob(job.meetingId, "NORMALIZE_TRANSCRIPT");
        break;

      case "NORMALIZE_TRANSCRIPT":
        await handleNormalizeTranscript(job.meetingId);
        // Chain to summarization
        await enqueueJob(job.meetingId, "SUMMARIZE_TRANSCRIPT");
        break;

      case "SUMMARIZE_TRANSCRIPT":
        await handleSummarizeTranscript(job.meetingId);
        // Mark meeting as ready
        await prisma.meeting.update({
          where: { id: job.meetingId },
          data: { status: "READY" },
        });
        break;
    }

    // Mark job as successful
    await prisma.job.update({
      where: { id: jobId },
      data: { status: "SUCCESS" },
    });

    console.log(`Job ${job.id} completed successfully`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Job ${job.id} failed:`, errorMessage);

    const newAttempts = job.attempts + 1;

    if (newAttempts >= MAX_ATTEMPTS) {
      // Mark job and meeting as failed
      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: "FAILED",
          lastError: errorMessage,
          attempts: newAttempts,
        },
      });

      await prisma.meeting.update({
        where: { id: job.meetingId },
        data: { status: "FAILED" },
      });

      console.log(`Job ${job.id} failed permanently after ${newAttempts} attempts`);
    } else {
      // Retry with exponential backoff
      const backoffMs = BASE_BACKOFF * Math.pow(2, newAttempts);
      const runAt = new Date(Date.now() + backoffMs);

      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: "QUEUED",
          lastError: errorMessage,
          attempts: newAttempts,
          runAt,
        },
      });

      console.log(`Job ${job.id} will retry at ${runAt.toISOString()}`);
    }
  }
}

async function handleExtractText(meetingId: string) {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
  });

  if (!meeting) {
    throw new Error("Meeting not found");
  }

  const uploadDir = process.env.UPLOAD_DIR || "./data/uploads";
  const filePath = `${uploadDir}/${meeting.storedFilePath}`;
  const ext = meeting.originalFilename.split(".").pop()?.toLowerCase() || "";

  const rawText = await extractText(filePath, ext);

  // Create or update transcript
  await prisma.transcript.upsert({
    where: { meetingId },
    create: {
      meetingId,
      rawText,
      normalizedText: "", // Will be filled in normalization step
      detectedFormat: ext,
    },
    update: {
      rawText,
      detectedFormat: ext,
    },
  });
}

async function handleNormalizeTranscript(meetingId: string) {
  const transcript = await prisma.transcript.findUnique({
    where: { meetingId },
  });

  if (!transcript) {
    throw new Error("Transcript not found");
  }

  const normalizedText = normalizeTranscript(transcript.rawText);

  await prisma.transcript.update({
    where: { meetingId },
    data: { normalizedText },
  });
}

async function handleSummarizeTranscript(meetingId: string) {
  const transcript = await prisma.transcript.findUnique({
    where: { meetingId },
  });

  if (!transcript) {
    throw new Error("Transcript not found");
  }

  if (!transcript.normalizedText) {
    throw new Error("Transcript not normalized");
  }

  const { summaryJson, summaryMarkdown, model, promptVersion } =
    await summarizeTranscript(transcript.normalizedText);

  await prisma.summary.create({
    data: {
      meetingId,
      model,
      promptVersion,
      summaryJson: JSON.stringify(summaryJson),
      summaryMarkdown,
    },
  });
}

async function enqueueJob(meetingId: string, type: JobType) {
  await prisma.job.create({
    data: {
      meetingId,
      type,
      status: "QUEUED",
      runAt: new Date(),
    },
  });
}

async function claimJob(): Promise<string | null> {
  // Find and claim a job atomically
  const now = new Date();

  // Use a transaction to atomically find and update
  const result = await prisma.$transaction(async (tx) => {
    const job = await tx.job.findFirst({
      where: {
        status: "QUEUED",
        runAt: { lte: now },
      },
      orderBy: { runAt: "asc" },
    });

    if (!job) return null;

    await tx.job.update({
      where: { id: job.id },
      data: { status: "RUNNING" },
    });

    return job.id;
  });

  return result;
}

async function runWorker() {
  console.log("Worker started");
  console.log(`Polling interval: ${POLL_INTERVAL}ms`);
  console.log(`Max attempts: ${MAX_ATTEMPTS}`);

  while (true) {
    try {
      const jobId = await claimJob();

      if (jobId) {
        await processJob(jobId);
      } else {
        // No jobs, wait before polling again
        await sleep(POLL_INTERVAL);
      }
    } catch (error) {
      console.error("Worker error:", error);
      await sleep(POLL_INTERVAL);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nShutting down worker...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\nShutting down worker...");
  await prisma.$disconnect();
  process.exit(0);
});

// Start the worker
runWorker().catch((error) => {
  console.error("Worker crashed:", error);
  process.exit(1);
});
