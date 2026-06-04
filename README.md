# NoteMarker AI

Turn any shared ChatGPT or Claude conversation into a clean, exportable document — PDF or Markdown — in seconds.

![NoteMarker AI](https://img.shields.io/badge/Next.js-16-black?logo=next.js) ![React](https://img.shields.io/badge/React-19-61DAFB?logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript) ![License](https://img.shields.io/badge/license-MIT-green)

---

## What it does

Paste a public share link from ChatGPT or Claude. NoteMarker scrapes the full conversation, shows you a message-by-message preview, and lets you export it as:

- **PDF** — formatted, ready to share or archive
- **Markdown** — download as `.md` or copy to clipboard

No login required. No data stored. Works entirely on-demand.

---

## Demo

> Paste a link like `https://chatgpt.com/share/…` or `https://claude.ai/share/…` and hit **Extract**.

---

## Tech stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | shadcn/ui + Tailwind CSS v4 |
| Scraping | Puppeteer-core + @sparticuz/chromium |
| PDF | @react-pdf/renderer |
| Language | TypeScript / React 19 |

---

## Getting started locally

**Prerequisites:** Node.js 18+, Google Chrome installed

```bash
git clone https://github.com/ANIMESHIOLOGY/notemarker-ai.git
cd notemarker-ai
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Chrome is auto-detected from common install paths. To override:

```bash
CHROME_PATH="/path/to/chrome" npm run dev
```

---

## Deploying to Vercel

This project is pre-configured for Vercel. `@sparticuz/chromium` handles the headless browser in the serverless environment automatically.

1. Push this repo to GitHub
2. Import it at [vercel.com/new](https://vercel.com/new)
3. Deploy — no environment variables needed

---

## Project structure

```
app/
  page.tsx                  # Main UI
  api/
    scrape/route.ts         # POST {url} → ChatDocument JSON
    export/pdf/route.ts     # POST ChatDocument → PDF binary
lib/
  scraper.ts                # Browser launch + platform detection
  parsers/
    chatgpt.ts              # ChatGPT DOM parser
    claude.ts               # Claude DOM parser
  pdf-generator.tsx         # React PDF document component
  markdown-export.ts        # Markdown / clipboard export
```

---

## Supported platforms

| Platform | Share URL pattern |
|---|---|
| ChatGPT | `chatgpt.com/share/…` or `chat.openai.com/share/…` |
| Claude | `claude.ai/share/…` |

Only **public** share links work. Make sure "Share" is enabled in your chat before copying the link.

---

## Contributing

PRs are welcome. Open an issue first for larger changes.

---

## License

MIT
