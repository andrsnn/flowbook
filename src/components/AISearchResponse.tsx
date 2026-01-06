'use client';

import React, { memo } from 'react';
import {
  ArrowLeft,
  Sparkles,
  GitBranch,
  FileText,
  BookOpen,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { AISearchResponse, AIReference } from '@/types/schema';

interface AISearchResponseProps {
  response: AISearchResponse | null;
  isLoading: boolean;
  onNavigateToNode: (nodeId: string) => void;
  onNavigateToRunbook: (runbookId: string) => void;
  onBack: () => void;
  onClose: () => void;
}

export default function AISearchResponseComponent({
  response,
  isLoading,
  onNavigateToNode,
  onNavigateToRunbook,
  onBack,
  onClose,
}: AISearchResponseProps) {
  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-xl border border-purple-500/30">
          <Sparkles size={24} className="text-purple-400 animate-pulse" />
          <div className="text-left">
            <p className="font-medium text-[var(--color-text-primary)]">Generating AI Response...</p>
            <p className="text-sm text-[var(--color-text-muted)]">Analyzing search results</p>
          </div>
          <Loader2 size={20} className="text-blue-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (!response) {
    return null;
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)] bg-gradient-to-r from-purple-600/10 to-blue-600/10">
        <button
          onClick={onBack}
          className="p-1 hover:bg-[var(--color-bg-elevated)] rounded transition-colors"
        >
          <ArrowLeft size={18} className="text-[var(--color-text-muted)]" />
        </button>
        <Sparkles size={18} className="text-purple-400" />
        <span className="font-medium text-[var(--color-text-primary)]">AI Response</span>
        <span className="text-xs text-[var(--color-text-muted)] ml-auto">
          Based on your query: &ldquo;{response.query}&rdquo;
        </span>
      </div>

      {/* Answer Content */}
      <div className="p-4">
        <div className="prose prose-sm max-w-none">
          <MarkdownRenderer content={response.answer} />
        </div>
      </div>

      {/* References */}
      {response.references && response.references.length > 0 && (
        <div className="px-4 pb-4">
          <h4 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3 flex items-center gap-2">
            <BookOpen size={14} />
            Sources & References
          </h4>
          <div className="space-y-2">
            {response.references.map((ref, index) => (
              <ReferenceCard
                key={index}
                reference={ref}
                onNavigateToNode={onNavigateToNode}
                onNavigateToRunbook={onNavigateToRunbook}
                onClose={onClose}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Simple Markdown Renderer
const MarkdownRenderer = memo(({ content }: { content: string }) => {
  // Basic markdown parsing
  const lines = content.split('\n');
  const elements: React.ReactElement[] = [];
  let listItems: string[] = [];
  let inCodeBlock = false;
  let codeContent: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 mb-3">
          {listItems.map((item, i) => (
            <li key={i} className="text-[var(--color-text-secondary)]">{item}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  const flushCode = () => {
    if (codeContent.length > 0) {
      elements.push(
        <pre key={`code-${elements.length}`} className="bg-[var(--color-bg-primary)] border border-[var(--color-border-subtle)] rounded-lg p-3 overflow-x-auto mb-3">
          <code className="text-sm text-[var(--color-text-secondary)]">
            {codeContent.join('\n')}
          </code>
        </pre>
      );
      codeContent = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        flushCode();
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent.push(line);
      continue;
    }

    // Headers
    if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <h4 key={`h3-${i}`} className="text-base font-semibold text-[var(--color-text-primary)] mt-4 mb-2">
          {line.replace('### ', '')}
        </h4>
      );
      continue;
    }

    if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h3 key={`h2-${i}`} className="text-lg font-semibold text-[var(--color-text-primary)] mt-4 mb-2">
          {line.replace('## ', '')}
        </h3>
      );
      continue;
    }

    // List items
    if (line.match(/^[-*]\s/)) {
      listItems.push(line.replace(/^[-*]\s/, ''));
      continue;
    }

    if (line.match(/^\d+\.\s/)) {
      listItems.push(line.replace(/^\d+\.\s/, ''));
      continue;
    }

    // Blockquotes
    if (line.startsWith('> ')) {
      flushList();
      elements.push(
        <blockquote key={`quote-${i}`} className="border-l-2 border-[var(--color-accent-primary)] pl-3 italic text-[var(--color-text-secondary)] my-3">
          {line.replace('> ', '')}
        </blockquote>
      );
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      flushList();
      continue;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={`p-${i}`} className="text-[var(--color-text-secondary)] mb-3 leading-relaxed">
        <InlineMarkdown text={line} />
      </p>
    );
  }

  flushList();
  flushCode();

  return <>{elements}</>;
});
MarkdownRenderer.displayName = 'MarkdownRenderer';

// Inline markdown (bold, italic, code, links)
const InlineMarkdown = memo(({ text }: { text: string }) => {
  // Process inline markdown
  const parts: (string | React.ReactElement)[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    if (boldMatch && boldMatch.index !== undefined) {
      if (boldMatch.index > 0) {
        parts.push(remaining.substring(0, boldMatch.index));
      }
      parts.push(
        <strong key={key++} className="font-semibold text-[var(--color-text-primary)]">
          {boldMatch[1]}
        </strong>
      );
      remaining = remaining.substring(boldMatch.index + boldMatch[0].length);
      continue;
    }

    // Inline code
    const codeMatch = remaining.match(/`([^`]+)`/);
    if (codeMatch && codeMatch.index !== undefined) {
      if (codeMatch.index > 0) {
        parts.push(remaining.substring(0, codeMatch.index));
      }
      parts.push(
        <code key={key++} className="px-1.5 py-0.5 bg-[var(--color-bg-elevated)] rounded text-sm font-mono text-[var(--color-accent-primary)]">
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.substring(codeMatch.index + codeMatch[0].length);
      continue;
    }

    // No more matches
    parts.push(remaining);
    break;
  }

  return <>{parts}</>;
});
InlineMarkdown.displayName = 'InlineMarkdown';

// Reference Card Component
interface ReferenceCardProps {
  reference: AIReference;
  onNavigateToNode: (nodeId: string) => void;
  onNavigateToRunbook: (runbookId: string) => void;
  onClose: () => void;
}

const ReferenceCard = memo(({ reference, onNavigateToNode, onNavigateToRunbook, onClose }: ReferenceCardProps) => {
  const handleClick = () => {
    if (reference.type === 'node') {
      onNavigateToNode(reference.id);
      onClose();
    } else if (reference.type === 'runbook') {
      onNavigateToRunbook(reference.id);
      onClose();
    }
  };

  const isClickable = reference.type === 'node' || reference.type === 'runbook';

  const Icon = reference.type === 'node' ? GitBranch : reference.type === 'runbook' ? FileText : BookOpen;
  const typeLabel = reference.type === 'node' ? 'Node' : reference.type === 'runbook' ? 'Runbook' : 'Source';

  return (
    <button
      onClick={isClickable ? handleClick : undefined}
      disabled={!isClickable}
      className={`w-full text-left p-3 rounded-lg border border-[var(--color-border-subtle)] transition-colors ${
        isClickable
          ? 'hover:bg-[var(--color-bg-elevated)] hover:border-[var(--color-border)] cursor-pointer'
          : 'cursor-default'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="p-1.5 bg-[var(--color-bg-elevated)] rounded">
          <Icon size={14} className="text-[var(--color-accent-primary)]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-text-muted)] uppercase">{typeLabel}</span>
            {isClickable && <ExternalLink size={12} className="text-[var(--color-text-muted)]" />}
          </div>
          <p className="font-medium text-sm text-[var(--color-text-primary)] truncate">
            {reference.title}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 mt-1">
            {reference.snippet}
          </p>
        </div>
      </div>
    </button>
  );
});
ReferenceCard.displayName = 'ReferenceCard';

