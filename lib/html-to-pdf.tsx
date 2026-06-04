import React from 'react';
import { Text, View, StyleSheet } from '@react-pdf/renderer';
import { parse } from 'node-html-parser';
import type { Node, HTMLElement as NHTMLElement } from 'node-html-parser';

const GRAY_200 = '#e5e7eb';
const GRAY_500 = '#6b7280';
const GRAY_700 = '#374151';
const GRAY_900 = '#111827';
const PURPLE = '#7c3aed';
const CODE_BG = '#1e1e2e';
const CODE_FG = '#cdd6f4';

const s = StyleSheet.create({
  text: { fontSize: 10.5, lineHeight: 1.7, color: GRAY_700 },
  bold: { fontWeight: 'bold', fontSize: 10.5, color: GRAY_700 },
  italic: { fontStyle: 'italic', fontSize: 10.5, color: GRAY_700 },
  inlineCode: { fontFamily: 'Courier', fontSize: 9.5, color: '#c026d3' },
  codeBlock: { backgroundColor: CODE_BG, borderRadius: 6, padding: 12, marginVertical: 6 },
  codeText: { fontFamily: 'Courier', fontSize: 9, color: CODE_FG, lineHeight: 1.6 },
  h1: { fontSize: 16, fontWeight: 'bold', color: GRAY_900, marginTop: 10, marginBottom: 6 },
  h2: { fontSize: 13, fontWeight: 'bold', color: GRAY_900, marginTop: 8, marginBottom: 5 },
  h3: { fontSize: 11, fontWeight: 'bold', color: GRAY_700, marginTop: 6, marginBottom: 4 },
  paragraph: { marginBottom: 6 },
  list: { marginVertical: 4, marginLeft: 8 },
  listItem: { flexDirection: 'row', marginBottom: 3 },
  bullet: { fontSize: 10.5, color: GRAY_500, width: 14 },
  listText: { fontSize: 10.5, color: GRAY_700, flex: 1, lineHeight: 1.6 },
  divider: { borderTopWidth: 1, borderTopColor: GRAY_200, marginVertical: 8 },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: PURPLE,
    paddingLeft: 10,
    marginVertical: 4,
  },
  blockquoteText: { fontSize: 10.5, color: GRAY_500, lineHeight: 1.7, fontStyle: 'italic' },
});

function isTextNode(node: Node): boolean {
  return node.nodeType === 3;
}

// Inline renderer — returns children for a <Text> parent
function renderInline(node: Node, key: number): React.ReactNode {
  if (isTextNode(node)) {
    return node.rawText ?? null;
  }
  const el = node as NHTMLElement;
  const tag = el.tagName?.toLowerCase();
  const children = el.childNodes.map((c, i) => renderInline(c, i));
  switch (tag) {
    case 'strong':
    case 'b':
      return <Text key={key} style={s.bold}>{children}</Text>;
    case 'em':
    case 'i':
      return <Text key={key} style={s.italic}>{children}</Text>;
    case 'code':
      return <Text key={key} style={s.inlineCode}>{el.textContent}</Text>;
    case 'br':
      return '\n';
    case 'a':
    default:
      return <Text key={key}>{children}</Text>;
  }
}

// Block renderer — returns View/Text children
function renderBlock(node: Node, key: number): React.ReactNode {
  if (isTextNode(node)) {
    const t = node.rawText?.trim();
    return t ? <Text key={key} style={s.text}>{t}</Text> : null;
  }

  const el = node as NHTMLElement;
  const tag = el.tagName?.toLowerCase();

  switch (tag) {
    case 'p': {
      const text = el.textContent?.trim();
      if (!text) return null;
      return (
        <View key={key} style={s.paragraph}>
          <Text style={s.text}>{el.childNodes.map((c, i) => renderInline(c, i))}</Text>
        </View>
      );
    }

    case 'pre': {
      const codeEl = el.querySelector('code') ?? el;
      return (
        <View key={key} style={s.codeBlock}>
          <Text style={s.codeText}>{codeEl.textContent}</Text>
        </View>
      );
    }

    case 'code':
      return (
        <View key={key} style={s.codeBlock}>
          <Text style={s.codeText}>{el.textContent}</Text>
        </View>
      );

    case 'h1':
      return <Text key={key} style={s.h1}>{el.textContent.trim()}</Text>;
    case 'h2':
      return <Text key={key} style={s.h2}>{el.textContent.trim()}</Text>;
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return <Text key={key} style={s.h3}>{el.textContent.trim()}</Text>;

    case 'blockquote':
      return (
        <View key={key} style={s.blockquote}>
          <Text style={s.blockquoteText}>{el.textContent.trim()}</Text>
        </View>
      );

    case 'ul': {
      const items = el.querySelectorAll('li');
      return (
        <View key={key} style={s.list}>
          {items.map((li, j) => (
            <View key={j} style={s.listItem}>
              <Text style={s.bullet}>•  </Text>
              <Text style={s.listText}>{li.textContent.trim()}</Text>
            </View>
          ))}
        </View>
      );
    }

    case 'ol': {
      const items = el.querySelectorAll('li');
      return (
        <View key={key} style={s.list}>
          {items.map((li, j) => (
            <View key={j} style={s.listItem}>
              <Text style={s.bullet}>{j + 1}.  </Text>
              <Text style={s.listText}>{li.textContent.trim()}</Text>
            </View>
          ))}
        </View>
      );
    }

    case 'strong':
    case 'b':
      return <Text key={key} style={s.bold}>{el.textContent}</Text>;
    case 'em':
    case 'i':
      return <Text key={key} style={s.italic}>{el.textContent}</Text>;

    case 'hr':
      return <View key={key} style={s.divider} />;

    // UI/non-content elements — skip entirely
    case 'br':
    case 'button':
    case 'svg':
    case 'path':
    case 'use':
    case 'circle':
    case 'script':
    case 'style':
    case 'noscript':
      return null;

    default: {
      // Catch CodeMirror code viewers that weren't cleaned by the scraper
      const elId = el.getAttribute('id') ?? '';
      const elCls = el.getAttribute('class') ?? '';
      if (elId === 'code-block-viewer' || elCls.includes('cm-editor') || elCls.includes('cm-content')) {
        const inner = el.querySelector('pre') ?? el.querySelector('code') ?? el;
        const codeText = inner.textContent?.trim();
        if (codeText) {
          return (
            <View key={key} style={s.codeBlock}>
              <Text style={s.codeText}>{codeText}</Text>
            </View>
          );
        }
        return null;
      }

      // Skip elements that are clearly UI chrome (aria-hidden, pointer-events-none, etc.)
      if (el.getAttribute('aria-hidden') === 'true') return null;

      if (!el.childNodes?.length) {
        const t = el.textContent?.trim();
        return t ? <Text key={key} style={s.text}>{t}</Text> : null;
      }
      const children = el.childNodes.map((c, j) => renderBlock(c, j)).filter(Boolean);
      return children.length ? <View key={key}>{children}</View> : null;
    }
  }
}

export function htmlToPdf(html: string): React.ReactNode[] {
  if (!html?.trim()) return [];
  const root = parse(html);
  return root.childNodes.map((node, i) => renderBlock(node, i)).filter(Boolean);
}
