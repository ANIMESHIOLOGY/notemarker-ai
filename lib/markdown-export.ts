import type { ChatDocument } from '@/types/chat';

export function chatToMarkdown(doc: ChatDocument): string {
  const platformLabel =
    doc.platform === 'chatgpt' ? 'ChatGPT' : doc.platform === 'claude' ? 'Claude' : 'AI Chat';
  const date = new Date(doc.exportedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const lines: string[] = [
    `# ${doc.title}`,
    '',
    `> Exported from **${platformLabel}** on ${date}  `,
    `> ${doc.messageCount} messages · [View original](${doc.url})`,
    '',
    '---',
    '',
  ];

  for (const msg of doc.messages) {
    const label = msg.role === 'user' ? '**You**' : `**${platformLabel}**`;
    lines.push(label, '', msg.content, '', '---', '');
  }

  return lines.join('\n');
}

export function downloadMarkdown(doc: ChatDocument): void {
  const md = chatToMarkdown(doc);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function copyToClipboard(doc: ChatDocument): Promise<void> {
  return navigator.clipboard.writeText(chatToMarkdown(doc));
}
