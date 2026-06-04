import type { Page } from 'puppeteer-core';
import type { ChatMessage } from '@/types/chat';

export async function parseChatGPT(page: Page): Promise<{ title: string; messages: ChatMessage[] }> {
  await page.waitForSelector('main, [role="main"], body', { timeout: 15000 }).catch(() => {});

  const data = await page.evaluate(() => {
    const SKIP_TAGS = new Set(['button', 'svg', 'path', 'use', 'circle', 'script', 'style', 'noscript']);
    const INLINE_TAGS = new Set(['strong', 'b', 'em', 'i', 'code', 'a', 'span', 'mark', 'sub', 'sup']);

    function escHtml(s: string): string {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function extractCodeText(el: Element): string {
      // Get inner content preserving newlines from <br> / block spans
      return el.innerHTML
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
        .trim();
    }

    // Converts inline children of an element to safe HTML
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
        else out += escHtml(t); // flatten unknown inline tags
      });
      return out;
    }

    // Walks the DOM and builds clean semantic HTML — never emits wrapper <div>s
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

      // ChatGPT code block viewer (CodeMirror) — extract raw code text
      if (el.id === 'code-block-viewer') {
        const inner = el.querySelector('.cm-content, pre, code') ?? el;
        const code = extractCodeText(inner);
        if (code) out.push(`<pre><code>${escHtml(code)}</code></pre>`);
        return;
      }

      // Language label sibling above code blocks — skip
      if (el.getAttribute('data-testid') === 'copy-turn-action-button') return;

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
            .filter((li, i, arr) => !arr.slice(0, i).some(prev => prev.contains(li))) // dedup nested
            .map(li => `<li>${escHtml(li.textContent?.trim() ?? '')}</li>`)
            .join('');
          if (items) out.push(`<${tag}>${items}</${tag}>`);
          return;
        }
        case 'li': {
          // Handled inside ul/ol above; skip standalone
          return;
        }
        case 'blockquote': {
          const t = el.textContent?.trim();
          if (t) out.push(`<blockquote>${escHtml(t)}</blockquote>`);
          return;
        }
        case 'hr':
          out.push('<hr>');
          return;
        case 'br':
          return;
        default:
          // div / section / article / span / etc — recurse into children
          if (INLINE_TAGS.has(tag)) {
            // Inline element at block level — wrap in p
            const t = el.textContent?.trim();
            if (t) out.push(`<p>${escHtml(t)}</p>`);
          } else {
            el.childNodes.forEach((child) => walk(child, out));
          }
      }
    }

    function extractContent(proseEl: Element): string {
      const parts: string[] = [];
      proseEl.childNodes.forEach((node) => walk(node, parts));
      return parts.join('\n');
    }

    const messages: { role: string; contentHtml: string; content: string }[] = [];

    const roleEls = document.querySelectorAll('[data-message-author-role]');
    roleEls.forEach((el) => {
      const role = el.getAttribute('data-message-author-role');
      if (role !== 'user' && role !== 'assistant') return;

      const proseEl = el.querySelector('.prose, .markdown, [class*="prose"], [class*="markdown"]') ?? el;
      const content = proseEl.textContent?.trim() ?? '';
      if (!content) return;

      const contentHtml = extractContent(proseEl);
      messages.push({ role, contentHtml, content });
    });

    // Fallback: article-based turns
    if (messages.length === 0) {
      document.querySelectorAll('article').forEach((article) => {
        const roleEl = article.querySelector('[data-message-author-role]');
        const role = roleEl?.getAttribute('data-message-author-role');
        if (role !== 'user' && role !== 'assistant') return;

        const contentEl = article.querySelector('.prose, .markdown, .text-base, [class*="content"]') ?? article;
        const content = contentEl.textContent?.trim() ?? '';
        if (!content) return;

        messages.push({ role, contentHtml: extractContent(contentEl), content });
      });
    }

    const h1 = document.querySelector('h1')?.textContent?.trim();
    const titleTag = document.title?.replace(' - ChatGPT', '').replace(' | ChatGPT', '').trim();
    const title = h1 || titleTag || 'ChatGPT Conversation';

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
