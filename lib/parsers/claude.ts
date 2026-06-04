import type { Page } from 'puppeteer-core';
import type { ChatMessage } from '@/types/chat';

export async function parseClaude(page: Page): Promise<{ title: string; messages: ChatMessage[] }> {
  await page.waitForSelector('main, [role="main"], body', { timeout: 15000 }).catch(() => {});

  // Wait for any conversation content to appear
  await page.waitForSelector(
    '[data-testid="human-turn"], [data-testid="ai-turn"], article, [class*="ConversationTurn"], [class*="HumanTurn"]',
    { timeout: 8000 }
  ).catch(() => {});

  const data = await page.evaluate(() => {
    const SKIP_TAGS = new Set(['button', 'svg', 'path', 'use', 'circle', 'script', 'style', 'noscript']);
    const INLINE_TAGS = new Set(['strong', 'b', 'em', 'i', 'code', 'a', 'span', 'mark', 'sub', 'sup']);

    function escHtml(s: string): string {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function extractCodeText(el: Element): string {
      return el.innerHTML
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
        .trim();
    }

    function inlineHtml(el: Element): string {
      let out = '';
      el.childNodes.forEach((node) => {
        if (node.nodeType === 3) { out += escHtml(node.textContent ?? ''); return; }
        const child = node as Element;
        const tag = child.tagName?.toLowerCase();
        if (!tag || SKIP_TAGS.has(tag)) return;
        const t = child.textContent ?? '';
        if (tag === 'strong' || tag === 'b') out += `<strong>${escHtml(t)}</strong>`;
        else if (tag === 'em' || tag === 'i') out += `<em>${escHtml(t)}</em>`;
        else if (tag === 'code') out += `<code>${escHtml(t)}</code>`;
        else if (tag === 'br') out += '<br>';
        else out += escHtml(t);
      });
      return out;
    }

    function walk(node: Node, out: string[]): void {
      if (node.nodeType === 3) {
        const t = node.textContent?.trim() ?? '';
        if (t) out.push(`<p>${escHtml(t)}</p>`);
        return;
      }
      const el = node as Element;
      const tag = el.tagName?.toLowerCase();
      if (!tag || SKIP_TAGS.has(tag)) return;
      if (el.getAttribute('aria-hidden') === 'true') return;
      switch (tag) {
        case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': {
          const t = el.textContent?.trim();
          if (t) out.push(`<${tag}>${escHtml(t)}</${tag}>`);
          return;
        }
        case 'p': {
          const inner = inlineHtml(el);
          if (inner.trim()) out.push(`<p>${inner}</p>`);
          return;
        }
        case 'pre': {
          const code = extractCodeText(el);
          if (code) out.push(`<pre><code>${escHtml(code)}</code></pre>`);
          return;
        }
        case 'ul': case 'ol': {
          const items = Array.from(el.querySelectorAll(':scope > li, li'))
            .filter((li, i, arr) => !arr.slice(0, i).some(prev => prev.contains(li)))
            .map(li => `<li>${escHtml(li.textContent?.trim() ?? '')}</li>`)
            .join('');
          if (items) out.push(`<${tag}>${items}</${tag}>`);
          return;
        }
        case 'li': return;
        case 'blockquote': {
          const t = el.textContent?.trim();
          if (t) out.push(`<blockquote>${escHtml(t)}</blockquote>`);
          return;
        }
        case 'hr': out.push('<hr>'); return;
        case 'br': return;
        default:
          if (INLINE_TAGS.has(tag)) {
            const t = el.textContent?.trim();
            if (t) out.push(`<p>${escHtml(t)}</p>`);
          } else {
            el.childNodes.forEach((child) => walk(child, out));
          }
      }
    }

    function extractContent(el: Element): string {
      const parts: string[] = [];
      el.childNodes.forEach((node) => walk(node, parts));
      return parts.join('\n');
    }

    // ── Debug info ────────────────────────────────────────────────
    const allTestIds = Array.from(document.querySelectorAll('[data-testid]'))
      .map(el => el.getAttribute('data-testid'))
      .filter(Boolean);

    const bodySnippet = document.body?.innerHTML?.slice(0, 3000) ?? '';

    // ── Strategy 1: canonical data-testid selectors ────────────────
    const messages: { role: string; contentHtml: string; content: string }[] = [];

    const humanTurns = document.querySelectorAll(
      '[data-testid="human-turn"], [data-testid="human_message"]'
    );
    const aiTurns = document.querySelectorAll(
      '[data-testid="ai-turn"], [data-testid="assistant_message"]'
    );

    if (humanTurns.length > 0 || aiTurns.length > 0) {
      const allItems: { el: Element; role: 'user' | 'assistant' }[] = [];
      humanTurns.forEach((el) => allItems.push({ el, role: 'user' }));
      aiTurns.forEach((el) => allItems.push({ el, role: 'assistant' }));
      allItems.sort((a, b) =>
        a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
      );
      allItems.forEach(({ el, role }) => {
        const contentEl = el.querySelector('.prose, .markdown, [class*="prose"]') || el;
        const content = contentEl.textContent?.trim() ?? '';
        if (content) messages.push({ role, contentHtml: extractContent(contentEl), content });
      });
    }

    // ── Strategy 2: partial data-testid match ─────────────────────
    if (messages.length === 0) {
      const allTestIdEls = Array.from(document.querySelectorAll('[data-testid]'));
      const found: { el: Element; role: 'user' | 'assistant' }[] = [];
      allTestIdEls.forEach((el) => {
        const tid = (el.getAttribute('data-testid') ?? '').toLowerCase();
        if (tid.includes('human') || tid.includes('user')) found.push({ el, role: 'user' });
        else if (tid.includes('ai') || tid.includes('assistant')) found.push({ el, role: 'assistant' });
      });
      found.sort((a, b) =>
        a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
      );
      found.forEach(({ el, role }) => {
        const content = el.textContent?.trim() ?? '';
        if (content) messages.push({ role, contentHtml: extractContent(el), content });
      });
    }

    // ── Strategy 3: article elements ──────────────────────────────
    if (messages.length === 0) {
      document.querySelectorAll('article').forEach((article) => {
        const content = article.textContent?.trim() ?? '';
        if (!content) return;
        const cls = (article.className ?? '').toLowerCase();
        const role = cls.includes('human') || cls.includes('user') ? 'user' : 'assistant';
        messages.push({ role, contentHtml: extractContent(article), content });
      });
    }

    // ── Strategy 4: class name heuristics ────────────────────────
    if (messages.length === 0) {
      const candidates = document.querySelectorAll(
        '[class*="Human"], [class*="human"], [class*="Assistant"], [class*="assistant"], [class*="message"], [class*="Message"]'
      );
      candidates.forEach((el) => {
        const cls = (el.className ?? '').toLowerCase();
        const role = cls.includes('human') || cls.includes('user') ? 'user' : 'assistant';
        const content = el.textContent?.trim() ?? '';
        if (content.length > 10) messages.push({ role, contentHtml: extractContent(el), content });
      });
    }

    const title = document.title?.replace(/ - Claude$/i, '').trim() || 'Claude Conversation';
    return { title, messages, debug: { allTestIds, bodySnippet } };
  });

  // Log to Vercel for debugging
  console.log('[claude] testIds on page:', JSON.stringify(data.debug.allTestIds));
  console.log('[claude] body snippet:', data.debug.bodySnippet);
  console.log('[claude] messages found:', data.messages.length);

  return {
    title: data.title,
    messages: data.messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
      contentHtml: m.contentHtml,
    })),
  };
}
