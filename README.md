# Meeting Summarizer

A sleek local web dashboard for uploading meeting transcripts, generating AI-powered summaries, and managing meeting insights.

![Dashboard Preview](docs/dashboard-preview.png)

## Features

- **Upload transcripts** - Support for TXT, VTT, SRT, DOCX, and PDF files
- **AI-powered summaries** - Extract action items, decisions, key points, and more
- **Dark, modern UI** - Clean dashboard with stats, filters, and searchable tables
- **Background processing** - Worker process handles extraction and summarization
- **Structured output** - JSON schema with executive summary, action items, risks, etc.
- **Export to Markdown** - Download formatted summary documents

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or pnpm
- OpenAI API key

### Installation

```bash
# Clone or navigate to the project
cd meeting_summarizer

# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Create the database
npm run db:push
```

### Configuration

**Local Development:**

Create a `.env` file in the project root:

```env
DATABASE_URL="file:./dev.db"
UPLOAD_DIR="./data/uploads"
OPENAI_API_KEY="sk-your-api-key-here"
OPENAI_MODEL="gpt-4.1-mini"
MAX_UPLOAD_MB="25"
```

**Vercel Deployment:**

1. Create a Prisma Postgres database in your Vercel dashboard
2. Add these environment variables in Vercel:
   - `DATABASE_URL` - Your Prisma Postgres connection string
   - `OPENAI_API_KEY` - Your OpenAI API key
   - `OPENAI_MODEL` - Model name (e.g., "gpt-4.1-mini" or "gpt-5.1")
   - `UPLOAD_DIR` - Set to `/tmp` for serverless (files are temporary)
   - `MAX_UPLOAD_MB` - Maximum upload size (default: "25")

3. Push to GitHub - Vercel will automatically deploy
4. Migrations run automatically during build via `prisma migrate deploy`

**Note:** The worker process (`npm run worker`) needs to run separately. For Vercel, consider:
- Using Vercel Cron Jobs to trigger processing
- Using a separate worker service (e.g., Railway, Render)
- Or processing jobs synchronously in API routes (not recommended for long-running tasks)

### Running the Application

You need to run two processes:

**Terminal 1 - Web Server:**
```bash
npm run dev
```

**Terminal 2 - Worker Process:**
```bash
npm run worker
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Uploading a Transcript

1. Click "Upload Transcript" in the sidebar or header
2. Drag and drop your transcript file (or click to browse)
3. Optionally set a title, meeting date, and tags
4. Click "Upload & Process"

The worker will automatically:
1. Extract text from the file
2. Normalize the transcript (clean up formatting, detect speakers)
3. Generate an AI summary

### Viewing Results

- **Dashboard** - Overview stats and recent meetings
- **Meetings** - Full list with search and filters
- **Meeting Detail** - View summary, action items, and full transcript

### Re-running Summaries

On any meeting detail page, click "Rerun" to generate a fresh summary with the current LLM model.

### Exporting

Click "Export" to download the summary as a Markdown file.

## Supported File Types

| Format | Notes |
|--------|-------|
| `.txt` | Plain text, UTF-8 preferred |
| `.vtt` | WebVTT subtitles (timestamps removed, speakers preserved) |
| `.srt` | SubRip subtitles (timestamps removed) |
| `.docx` | Microsoft Word documents (common MS Teams export format) |
| `.pdf` | PDF with selectable text (no OCR) |

## Project Structure

```
meeting_summarizer/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── api/             # API routes
│   │   ├── meetings/        # Meetings pages
│   │   ├── settings/        # Settings page
│   │   └── upload/          # Upload page
│   ├── components/          # React components
│   │   ├── layout/          # Sidebar, Header
│   │   └── ui/              # Reusable UI components
│   ├── lib/                 # Shared utilities
│   └── worker/              # Background job processor
│       ├── index.ts         # Worker entry point
│       ├── extractors.ts    # Text extraction
│       ├── normalizer.ts    # Transcript normalization
│       └── summarizer.ts    # LLM summarization
├── prisma/
│   └── schema.prisma        # Database schema
├── data/
│   └── uploads/             # Uploaded files
└── package.json
```

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/uploads` | Upload a transcript file |
| GET | `/api/meetings` | List meetings (with filters) |
| GET | `/api/meetings/:id` | Get meeting details |
| DELETE | `/api/meetings/:id` | Delete a meeting |
| POST | `/api/meetings/:id/rerun-summary` | Re-run summarization |
| GET | `/api/meetings/:id/export` | Export summary as markdown |
| GET | `/api/meetings/:id/summaries` | List all summary versions |
| GET | `/api/stats` | Dashboard statistics |
| GET | `/api/config` | Current configuration |

## Database Schema

- **Meeting** - Core meeting record with status, file info
- **Transcript** - Raw and normalized text
- **Summary** - Structured JSON + markdown summary
- **Job** - Background job queue

## Worker

The worker process polls the Job table and processes tasks:

1. `EXTRACT_TEXT` - Parse uploaded file
2. `NORMALIZE_TRANSCRIPT` - Clean up text, detect speakers
3. `SUMMARIZE_TRANSCRIPT` - Call LLM for structured summary

Jobs have automatic retry with exponential backoff (max 5 attempts).

## Summary Output Schema

```json
{
  "title": "Meeting title",
  "meeting_date": "2024-01-15",
  "executive_summary": ["Point 1", "Point 2"],
  "decisions": ["Decision 1"],
  "action_items": [
    {
      "task": "Complete the report",
      "owner": "John",
      "due_date": "2024-01-20",
      "priority": "high"
    }
  ],
  "risks_blockers": ["Risk 1"],
  "open_questions": ["Question 1"],
  "key_points": ["Key point 1"],
  "tags": ["weekly", "planning"]
}
```

## Development

```bash
# Run in development mode
npm run dev

# Run the worker
npm run worker

# Open Prisma Studio (database GUI)
npm run db:studio

# Run migrations
npm run db:migrate
```

## Testing with Sample Files

Create a test transcript file:

```bash
cat > test-transcript.txt << 'EOF'
Meeting: Weekly Engineering Sync
Date: January 15, 2024

John: Good morning everyone. Let's review our sprint progress.

Sarah: The API migration is 80% complete. We should finish by Friday.

John: Great. Any blockers?

Mike: I'm waiting on the database credentials from DevOps.

John: I'll follow up with them today. Sarah, can you document the new endpoints?

Sarah: Yes, I'll have the documentation ready by Wednesday.

John: Perfect. Any other updates?

Mike: We need to decide on the caching strategy for the dashboard.

John: Let's schedule a separate meeting for that. I'll send an invite.

Sarah: Sounds good. One more thing - we should prioritize the security audit.

John: Agreed. Let's make that a high priority for next sprint.

Meeting adjourned.
EOF
```

Then upload via the UI or curl:

```bash
curl -X POST http://localhost:3000/api/uploads \
  -F "file=@test-transcript.txt" \
  -F "title=Weekly Engineering Sync" \
  -F "tags=weekly,engineering"
```

## License

MIT

