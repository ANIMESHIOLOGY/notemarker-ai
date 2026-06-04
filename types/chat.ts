export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  contentHtml?: string;
}

export interface ChatDocument {
  title: string;
  platform: 'chatgpt' | 'claude' | 'unknown';
  url: string;
  messages: ChatMessage[];
  exportedAt: string;
  messageCount: number;
}

export type ExportFormat = 'pdf' | 'markdown' | 'json';

export interface ScrapeResult {
  success: boolean;
  data?: ChatDocument;
  error?: string;
}
