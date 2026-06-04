import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { ChatPDF } from '@/lib/pdf-generator';
import type { ChatDocument } from '@/types/chat';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const doc: ChatDocument = await req.json();

    if (!doc?.messages?.length) {
      return NextResponse.json({ error: 'Invalid or empty chat document.' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = React.createElement(ChatPDF, { doc }) as any;
    const buffer: Buffer = await renderToBuffer(element);

    const slug = doc.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 60);
    const filename = `${slug}-${Date.now()}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[pdf] error:', message);
    return NextResponse.json({ error: `Failed to generate PDF: ${message}` }, { status: 500 });
  }
}
