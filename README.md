<div align="center">

# NoteMarker AI

**Turn any shared ChatGPT or Claude conversation into a clean document — instantly.**

Paste a share link. Get a PDF or Markdown file. No sign-up, no storage, no fluff.

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/license-MIT-22c55e?style=flat-square)](LICENSE)

</div>

---

## The problem

You had a great conversation with an AI. Now it lives inside a chat app — unsearchable, unshareable, one link-expiry away from being gone.

NoteMarker pulls the full conversation out and gives you a real document.

---

## How it works

1. Copy the **public share link** from ChatGPT or Claude
2. Paste it into NoteMarker
3. Preview the conversation message by message
4. Export as **PDF** or **Markdown**

That's it. No account, no data stored, no rate limits on your end.

---

## Exports

| Format | What you get |
|---|---|
| PDF | Formatted document, ready to share or archive |
| Markdown `.md` | Download as file or copy to clipboard |

---

## Supported platforms

| Platform | Link pattern |
|---|---|
| ChatGPT | `chatgpt.com/share/…` |
| Claude | `claude.ai/share/…` |

> The chat must be set to **public** before you share the link. Private links won't work.

---

## Running locally

**Requires:** Node.js 18+, Google Chrome

```bash
git clone https://github.com/ANIMESHIOLOGY/notemarker-ai.git
cd notemarker-ai
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

Chrome is auto-detected. To point to a specific binary:

```bash
CHROME_PATH="/path/to/chrome" npm run dev
```

---

## Deploy your own

Pre-configured for Vercel — no extra setup needed. The headless browser (`@sparticuz/chromium`) works out of the box in serverless environments.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ANIMESHIOLOGY/notemarker-ai)

Or manually:

1. Fork this repo
2. Import at [vercel.com/new](https://vercel.com/new)
3. Click Deploy — no environment variables required

---

## Stack

| | |
|---|---|
| Framework | Next.js 16 · App Router |
| UI | shadcn/ui · Tailwind CSS v4 |
| Scraping | Puppeteer-core · @sparticuz/chromium |
| PDF | @react-pdf/renderer |
| Language | TypeScript · React 19 |

---

## Contributing

Open an issue before starting a large change. Small fixes — PRs welcome directly.

---

<div align="center">

MIT License · Built by [@ANIMESHIOLOGY](https://github.com/ANIMESHIOLOGY)

</div>
