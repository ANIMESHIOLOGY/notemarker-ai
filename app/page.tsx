'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  FileText,
  Download,
  Copy,
  CheckCheck,
  Loader2,
  Sparkles,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Bot,
  User,
} from 'lucide-react';
import type { ChatDocument } from '@/types/chat';
import { downloadMarkdown, copyToClipboard } from '@/lib/markdown-export';
import { cn } from '@/lib/utils';

type Stage = 'idle' | 'scraping' | 'done' | 'error';

const STAGES = [
  'Opening share link…',
  'Rendering page…',
  'Extracting conversation…',
  'Formatting messages…',
];

export default function HomePage() {
  const [url, setUrl] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
  const [stageIdx, setStageIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [doc, setDoc] = useState<ChatDocument | null>(null);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  async function handleExtract() {
    if (!url.trim()) return;
    setStage('scraping');
    setError('');
    setDoc(null);
    setStageIdx(0);
    setProgress(10);

    const timer = setInterval(() => {
      setStageIdx((i) => {
        const next = i + 1;
        setProgress(10 + next * 20);
        return next >= STAGES.length ? STAGES.length - 1 : next;
      });
    }, 4000);

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      clearInterval(timer);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.');
        setStage('error');
        return;
      }

      setProgress(100);
      setDoc(data);
      setStage('done');
      setExpanded(new Set([0]));
    } catch {
      clearInterval(timer);
      setError('Network error — please check your connection and try again.');
      setStage('error');
    }
  }

  async function handlePdfDownload() {
    if (!doc) return;
    setPdfLoading(true);
    setError('');
    try {
      const res = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'PDF generation failed');
      }
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `${doc.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Delay revoke so browser has time to start the download
      setTimeout(() => URL.revokeObjectURL(href), 5000);
    } catch (err) {
      setError(`PDF failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setPdfLoading(false);
    }
  }

  async function handleCopy() {
    if (!doc) return;
    await copyToClipboard(doc);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function toggleMessage(i: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  const platformLabel =
    doc?.platform === 'chatgpt' ? 'ChatGPT' : doc?.platform === 'claude' ? 'Claude' : 'AI Chat';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-white">
      {/* Header */}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-slate-900 tracking-tight">NoteMarker AI</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            Beta
          </Badge>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">
            Turn any AI chat into a{' '}
            <span className="text-violet-600">clean document</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-xl mx-auto">
            Paste a shared ChatGPT or Claude link — extract the full conversation and export it as
            PDF or Markdown in seconds.
          </p>
          <div className="flex items-center justify-center gap-3 mt-5">
            <Badge variant="outline" className="gap-1.5 px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
              ChatGPT
            </Badge>
            <Badge variant="outline" className="gap-1.5 px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
              Claude
            </Badge>
          </div>
        </div>

        {/* Input card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
          <label className="block text-sm font-medium text-slate-700 mb-2">Share link</label>
          <div className="flex gap-3">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
              placeholder="https://chatgpt.com/share/… or https://claude.ai/share/…"
              disabled={stage === 'scraping'}
              className="flex-1 h-11 text-sm"
            />
            <Button
              onClick={handleExtract}
              disabled={stage === 'scraping' || !url.trim()}
              className="h-11 px-6 bg-violet-600 hover:bg-violet-700 text-white shrink-0"
            >
              {stage === 'scraping' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Extract
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Only public share links work — make sure &quot;Share&quot; is enabled in your chat.
          </p>
        </div>

        {/* Loading */}
        {stage === 'scraping' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="w-4 h-4 text-violet-600 animate-spin" />
              <span className="text-sm font-medium text-slate-700">{STAGES[stageIdx]}</span>
            </div>
            <Progress value={progress} className="h-1.5" />
            <p className="text-xs text-slate-400 mt-3">This may take 15–30 seconds…</p>
          </div>
        )}

        {/* Error */}
        {stage === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-8 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Extraction failed</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Result */}
        {stage === 'done' && doc && (
          <div className="space-y-4">
            {/* Summary + export bar */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="font-semibold text-slate-900 text-lg leading-tight">{doc.title}</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {platformLabel} · {doc.messageCount} messages
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
                  {copied ? (
                    <CheckCheck className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {copied ? 'Copied!' : 'Copy Markdown'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadMarkdown(doc)}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  .md file
                </Button>
                <Button
                  size="sm"
                  onClick={handlePdfDownload}
                  disabled={pdfLoading}
                  className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
                >
                  {pdfLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {pdfLoading ? 'Building PDF…' : 'Download PDF'}
                </Button>
              </div>
            </div>

            {/* Message accordion */}
            <div className="space-y-2">
              {doc.messages.map((msg, i) => {
                const isUser = msg.role === 'user';
                const isOpen = expanded.has(i);
                const preview =
                  msg.content.slice(0, 160) + (msg.content.length > 160 ? '…' : '');

                return (
                  <div
                    key={i}
                    className={cn(
                      'rounded-xl border bg-white overflow-hidden',
                      isUser ? 'border-violet-100' : 'border-slate-200'
                    )}
                  >
                    <button
                      onClick={() => toggleMessage(i)}
                      className="w-full flex items-start gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
                    >
                      <div
                        className={cn(
                          'w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                          isUser ? 'bg-violet-100' : 'bg-slate-100'
                        )}
                      >
                        {isUser ? (
                          <User className="w-3.5 h-3.5 text-violet-600" />
                        ) : (
                          <Bot className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span
                          className={cn(
                            'text-xs font-semibold uppercase tracking-wide',
                            isUser ? 'text-violet-600' : 'text-slate-500'
                          )}
                        >
                          {isUser ? 'You' : platformLabel}
                        </span>
                        <p className="text-sm text-slate-600 mt-0.5 line-clamp-2">{preview}</p>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                      )}
                    </button>

                    {isOpen && (
                      <div
                        className={cn(
                          'border-t px-4 pb-4',
                          isUser ? 'border-violet-100 bg-violet-50/40' : 'border-slate-100'
                        )}
                      >
                        <div className="ml-10 pt-3">
                          {msg.contentHtml ? (
                            <div
                              className="chat-content"
                              dangerouslySetInnerHTML={{ __html: msg.contentHtml }}
                            />
                          ) : (
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                              {msg.content}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-100 mt-16 py-6">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between text-xs text-slate-400">
          <span>NoteMarker AI — open source</span>
          <span>Supports ChatGPT &amp; Claude share links</span>
        </div>
      </footer>
    </div>
  );
}
