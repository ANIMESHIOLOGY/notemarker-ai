import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { existsSync } from 'fs';
import type { ChatDocument } from '@/types/chat';
import { parseChatGPT } from './parsers/chatgpt';
import { parseClaude } from './parsers/claude';

const WINDOWS_CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  `C:\\Users\\${process.env.USERNAME}\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe`,
  'C:\\Program Files\\Chromium\\Application\\chrome.exe',
];

const UNIX_CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/snap/bin/chromium',
];

// Vercel's file tracer skips non-JS files, so the bin/*.br binaries are never
// deployed. Pass the GitHub release URL instead — chromium downloads to /tmp on
// cold start and reuses it on warm starts.
const CHROMIUM_PACK_URL =
  'https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.x64.tar';

async function getExecutablePath(): Promise<string> {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }

  if (process.env.VERCEL || process.env.AWS_EXECUTION_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return await chromium.executablePath(CHROMIUM_PACK_URL);
  }

  const paths = process.platform === 'win32' ? WINDOWS_CHROME_PATHS : UNIX_CHROME_PATHS;
  const found = paths.find((p) => existsSync(p));
  if (found) return found;

  return await chromium.executablePath();
}

export async function scrapeChat(url: string): Promise<ChatDocument> {
  const platform = detectPlatform(url);
  const executablePath = await getExecutablePath();

  const browser = await puppeteer.launch({
    args: [
      ...chromium.args,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
    ],
    executablePath,
    headless: true,
    defaultViewport: { width: 1280, height: 900 },
  });

  try {
    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Claude SPAs need more time to hydrate
    const waitMs = platform === 'claude' ? 5000 : 2500;
    await new Promise((r) => setTimeout(r, waitMs));

    const parsed =
      platform === 'chatgpt' ? await parseChatGPT(page) : await parseClaude(page);

    return {
      ...parsed,
      url,
      platform,
      exportedAt: new Date().toISOString(),
      messageCount: parsed.messages.length,
    };
  } finally {
    await browser.close();
  }
}

export function detectPlatform(url: string): 'chatgpt' | 'claude' | 'unknown' {
  if (url.includes('chatgpt.com') || url.includes('chat.openai.com')) return 'chatgpt';
  if (url.includes('claude.ai')) return 'claude';
  return 'unknown';
}

export function validateUrl(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return (
      protocol === 'https:' &&
      ['chatgpt.com', 'chat.openai.com', 'claude.ai'].includes(hostname)
    );
  } catch {
    return false;
  }
}
