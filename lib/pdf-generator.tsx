import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { ChatDocument, ChatMessage } from '@/types/chat';
import { htmlToPdf } from './html-to-pdf';

const PURPLE = '#7c3aed';
const PURPLE_LIGHT = '#ede9fe';
const GRAY_50 = '#f9fafb';
const GRAY_100 = '#f3f4f6';
const GRAY_200 = '#e5e7eb';
const GRAY_500 = '#6b7280';
const GRAY_700 = '#374151';
const GRAY_900 = '#111827';
const CODE_BG = '#1e1e2e';
const CODE_FG = '#cdd6f4';

const styles = StyleSheet.create({
  page: {
    paddingTop: 52,
    paddingBottom: 72,
    paddingHorizontal: 52,
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 28,
    paddingBottom: 18,
    borderBottomWidth: 2,
    borderBottomColor: PURPLE,
  },
  logo: {
    fontSize: 9,
    color: PURPLE,
    fontWeight: 'bold',
    marginBottom: 8,
    letterSpacing: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: GRAY_900,
    marginBottom: 6,
  },
  meta: {
    fontSize: 9,
    color: GRAY_500,
  },
  userBubble: {
    marginBottom: 14,
    marginLeft: 28,
    backgroundColor: PURPLE_LIGHT,
    padding: 14,
    borderRadius: 8,
  },
  assistantBubble: {
    marginBottom: 14,
    backgroundColor: GRAY_50,
    padding: 14,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: PURPLE,
  },
  roleLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  userLabel: { color: PURPLE },
  assistantLabel: { color: GRAY_500 },

  // Passed to html-to-pdf renderer
  text: { fontSize: 10.5, lineHeight: 1.7, color: GRAY_700 },
  bold: { fontWeight: 'bold' },
  italic: { fontStyle: 'italic' },
  inlineCode: {
    fontFamily: 'Courier',
    fontSize: 9.5,
    backgroundColor: GRAY_200,
    color: '#c026d3',
  },
  codeBlock: {
    backgroundColor: CODE_BG,
    borderRadius: 6,
    padding: 12,
    marginVertical: 6,
  },
  codeText: {
    fontFamily: 'Courier',
    fontSize: 9,
    color: CODE_FG,
    lineHeight: 1.6,
  },
  h1: {
    fontSize: 16,
    fontWeight: 'bold',
    color: GRAY_900,
    marginTop: 10,
    marginBottom: 6,
  },
  h2: {
    fontSize: 13,
    fontWeight: 'bold',
    color: GRAY_900,
    marginTop: 8,
    marginBottom: 5,
  },
  h3: {
    fontSize: 11,
    fontWeight: 'bold',
    color: GRAY_700,
    marginTop: 6,
    marginBottom: 4,
  },
  paragraph: { marginBottom: 6 },
  list: { marginVertical: 4, marginLeft: 8 },
  listItem: { flexDirection: 'row', marginBottom: 3 },
  bullet: { fontSize: 10.5, color: GRAY_500, width: 14 },
  listText: { fontSize: 10.5, color: GRAY_700, flex: 1, lineHeight: 1.6 },
  divider: { borderTopWidth: 1, borderTopColor: GRAY_200, marginVertical: 8 },

  footer: {
    position: 'absolute',
    bottom: 28,
    left: 52,
    right: 52,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: GRAY_100,
    paddingTop: 8,
  },
  footerBrand: { fontSize: 8, color: PURPLE, fontWeight: 'bold' },
  footerPage: { fontSize: 8, color: GRAY_500 },
});

function MessageBlock({ message, platformLabel }: { message: ChatMessage; platformLabel: string }) {
  const isUser = message.role === 'user';
  const html = message.contentHtml;

  return (
    <View style={isUser ? styles.userBubble : styles.assistantBubble}>
      <Text style={[styles.roleLabel, isUser ? styles.userLabel : styles.assistantLabel]}>
        {isUser ? 'YOU' : platformLabel.toUpperCase()}
      </Text>
      {html
        ? htmlToPdf(html)
        : <Text style={styles.text}>{message.content}</Text>
      }
    </View>
  );
}

export function ChatPDF({ doc }: { doc: ChatDocument }) {
  const platformLabel =
    doc.platform === 'chatgpt' ? 'ChatGPT' : doc.platform === 'claude' ? 'Claude' : 'Assistant';
  const date = new Date(doc.exportedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <Document title={doc.title} author="NoteMarker AI" creator="NoteMarker AI">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.logo}>NOTEMARKER AI</Text>
          <Text style={styles.title}>{doc.title}</Text>
          <Text style={styles.meta}>
            {platformLabel} · {doc.messageCount} messages · Exported {date}
          </Text>
        </View>

        {doc.messages.map((msg, i) => (
          <MessageBlock key={i} message={msg} platformLabel={platformLabel} />
        ))}

        <View style={styles.footer} fixed>
          <Text style={styles.footerBrand}>NoteMarker AI</Text>
          <Text
            style={styles.footerPage}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
