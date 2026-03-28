# QuietCareer

**A private career intelligence system for navigating a volatile job market.**

Your data never leaves your device. No accounts. No tracking. No cloud we control.

> "Built for you. Not your employer."

## Deploy

### One-Click Deploy to Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/lunarfile/quietcareer)

### One-Click Deploy to Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/lunarfile/quietcareer)

### Run Locally with Docker

```bash
docker compose up
# Open http://localhost:7749
```

### Run Locally with Node.js

```bash
npm install
npm run dev -p 7749
# Open http://localhost:7749
```

## What This Is

A self-hosted career command center for people who:
- Want to document their work before reviews, layoffs, or interviews
- Need to calculate when they can afford to quit
- Track energy to spot burnout before it hits
- Want AI to turn casual notes into promotion-ready language
- Don't trust employer-owned tools with career data

## Features

### Core
- **Field Notes** — Daily work logger with impact types, tags, mood, and AI rewriting
- **Proof** — AI generates performance reviews, resume bullets, 1:1 talking points, promotion packets
- **Runway** — Escape velocity calculator with what-if scenarios and runway projection charts
- **Battery** — Energy check-ins with adaptive mode suggestions (Coast/Maintain/Push/Escape)
- **Next Moves** — Goal tracking with progress and confetti on completion
- **Prep** — Meeting preparation with AI-generated briefings and action items
- **The Week** — Weekly career snapshot with risk level, wins, and AI insights

### Intelligence
- **5 Traffic Light Metrics** — Impact, Visibility, Skills, Runway, Energy — each with green/yellow/red status
- **Risk Level** — LOW / MODERATE / HIGH aggregate career health indicator
- **Career Heatmap** — 12-week GitHub-style activity visualization
- **Energy-Work Correlation** — Pattern insights (best/worst days, burnout warnings)
- **Smart Greetings** — Dashboard adapts messaging to your energy, streak, and risk level
- **Meeting Reminders** — Prompted when a meeting is within 2 days and unprepped
- **Data Freshness** — Nudged when your proof record goes cold

### Privacy
- 100% local data (IndexedDB via Dexie.js)
- AES-256-GCM encryption for sensitive fields
- Zero telemetry, zero tracking, zero cookies
- Works offline for all non-AI features
- Bring your own AI key — we never see your prompts

### AI Providers

| Provider | Free Tier? | Setup |
|----------|:---:|-------|
| OpenRouter | Some free models | [openrouter.ai](https://openrouter.ai) |
| Google Gemini | Yes (15 RPM) | [aistudio.google.com](https://aistudio.google.com) |
| Anthropic Claude | No | [console.anthropic.com](https://console.anthropic.com) |
| OpenAI | No | [platform.openai.com](https://platform.openai.com) |
| Groq | Yes (30 RPM) | [console.groq.com](https://console.groq.com) |

### Experience
- Light & dark mode (system preference + manual toggle)
- Daily motivational quote (30 curated anti-hustle quotes)
- Keyboard shortcuts (Ctrl+N, Ctrl+E, Ctrl+D)
- Mobile FAB for quick entry
- PWA — installable on home screen
- Journal calendar view with heatmap
- Drag-and-drop data import
- PDF + Markdown + clipboard export
- Print stylesheet for snapshots
- Cross-device sync via Google Drive / manual export

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15.2 (App Router, static export) |
| Language | TypeScript 5.6 (strict mode) |
| Styling | Tailwind CSS 4.0 |
| Database | Dexie.js 4.0 (IndexedDB) |
| Charts | Recharts 2.15 |
| PDF | jsPDF + jspdf-autotable |
| Icons | Lucide React |
| Desktop | Tauri 2 (Windows + Mac) |
| Deploy | Vercel / Netlify / Docker |

## License

Copyright (c) 2026 LunarFile. All rights reserved.
