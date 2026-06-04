import type { Page } from 'puppeteer-core';
import type { ChatMessage } from '@/types/chat';

export async function parseClaude(page: Page): Promise<{ title: string; messages: ChatMessage[] }> {
  await page.waitForSelector('main, [role="main"], body', { timeout: 15000 }).catch(() => {});

  const data = await page.evaluate(() => {
    const messages: { role: string; contentHtml: string; content: string }[] = [];

    // Primary: data-testid selectors used by Claude
    const humanTurns = document.querySelectorAll(
      '[data-testid="human-turn"], [data-testid="human_message"]'
    );
    const aiTurns = document.querySelectorAll(
      '[data-testid="ai-turn"], [data-testid="assistant_message"]'
    );

    if (humanTurns.length > 0 || aiTurns.length > 0) {
      // Build ordered list from DOM position
      const allItems: { el: Element; role: 'user' | 'assistant' }[] = [];
      humanTurns.forEach((el) => allItems.push({ el, role: 'user' }));
      aiTurns.forEach((el) => allItems.push({ el, role: 'assistant' }));

      allItems.sort((a, b) => {
        const pos = a.el.compareDocumentPosition(b.el);
        return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
      });

      allItems.forEach(({ el, role }) => {
        const contentEl =
          el.querySelector('.prose, .markdown, [class*="prose"], [class*="content"]') || el;
        const content = contentEl.textContent?.trim() ?? '';
        if (content) messages.push({ role, contentHtml: contentEl.innerHTML, content });
      });
    }

    // Fallback: class-name heuristics
    if (messages.length === 0) {
      const candidates = document.querySelectorAll('[class*="Human"], [class*="Assistant"], [class*="human"], [class*="assistant"]');
      candidates.forEach((el) => {
        const cls = el.className?.toLowerCase?.() ?? '';
        const role = cls.includes('human') ? 'user' : cls.includes('assistant') ? 'assistant' : null;
        if (!role) return;
        const content = el.textContent?.trim() ?? '';
        if (content) messages.push({ role, contentHtml: el.innerHTML, content });
      });
    }

    const title = document.title?.replace(' - Claude', '').trim() || 'Claude Conversation';
    return { title, messages };
  });

  return {
    title: data.title,
    messages: data.messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
      contentHtml: m.contentHtml,
    })),
  };
}
