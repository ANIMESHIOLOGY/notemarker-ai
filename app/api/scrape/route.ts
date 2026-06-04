import { NextRequest, NextResponse } from 'next/server';
import { scrapeChat, validateUrl } from '@/lib/scraper';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url: string = body?.url;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'A URL is required.' }, { status: 400 });
    }

    const trimmed = url.trim();

    if (!validateUrl(trimmed)) {
      return NextResponse.json(
        {
          error:
            'Only shared links from ChatGPT (chatgpt.com) or Claude (claude.ai) are supported.',
        },
        { status: 400 }
      );
    }

    const chatDoc = await scrapeChat(trimmed);

    if (chatDoc.messages.length === 0) {
      return NextResponse.json(
        {
          error:
            'No messages were found. The link may be private, expired, or the page structure has changed.',
        },
        { status: 422 }
      );
    }

    return NextResponse.json(chatDoc);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[scrape] error:', message);
    return NextResponse.json(
      { error: `Failed to extract chat: ${message}` },
      { status: 500 }
    );
  }
}
