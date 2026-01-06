'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  X,
  Loader2,
  GitBranch,
  FileText,
  BookOpen,
  Sparkles,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { SearchResult, FlowchartData, AISearchResponse } from '@/types/schema';
import { getSearchIndex, isModelLoaded, isModelLoading } from '@/lib/search';
import AISearchResponseComponent from './AISearchResponse';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  flowchartData: FlowchartData;
  onNavigateToNode: (nodeId: string) => void;
  onNavigateToRunbook: (runbookId: string) => void;
}

export default function SearchModal({
  isOpen,
  onClose,
  flowchartData,
  onNavigateToNode,
  onNavigateToRunbook,
}: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexProgress, setIndexProgress] = useState({ message: '', percent: 0 });
  const [error, setError] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<AISearchResponse | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showAIResponse, setShowAIResponse] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const searchIndex = getSearchIndex();

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Build the search index
  const buildIndex = useCallback(async () => {
    if (isIndexing) return;
    
    setIsIndexing(true);
    setError(null);
    
    try {
      await searchIndex.buildIndex(flowchartData, (message, percent) => {
        setIndexProgress({ message, percent });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to build search index');
    } finally {
      setIsIndexing(false);
    }
  }, [flowchartData, isIndexing, searchIndex]);

  // Build index when modal opens and flowchart data is available
  useEffect(() => {
    if (isOpen && flowchartData && !searchIndex.isReady()) {
      buildIndex();
    }
  }, [isOpen, flowchartData, searchIndex, buildIndex]);

  // Perform search
  const handleSearch = useCallback(async () => {
    if (!query.trim() || !searchIndex.isReady()) return;
    
    setIsSearching(true);
    setError(null);
    setShowAIResponse(false);
    setAiResponse(null);
    
    try {
      const searchResults = await searchIndex.search(query, 15);
      setResults(searchResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  }, [query, searchIndex]);

  // Debounced search on query change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim() && searchIndex.isReady()) {
        handleSearch();
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [query, handleSearch, searchIndex]);

  // Generate AI response
  const generateAIResponse = useCallback(async () => {
    if (results.length === 0 || !query.trim()) return;
    
    setIsGeneratingAI(true);
    setShowAIResponse(true);
    setError(null);
    
    try {
      const response = await fetch('/api/search-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          searchResults: results.slice(0, 8).map(r => ({
            type: r.document.type,
            title: r.document.title,
            content: r.document.content.substring(0, 500),
            nodeId: r.document.nodeId,
            runbookId: r.document.runbookId,
            score: r.score,
          })),
          flowchartTitle: flowchartData.metadata.title,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate AI response');
      }
      
      const data = await response.json();
      setAiResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate AI response');
      setShowAIResponse(false);
    } finally {
      setIsGeneratingAI(false);
    }
  }, [query, results, flowchartData.metadata.title]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && e.metaKey) {
        // Cmd/Ctrl+Enter to generate AI response
        if (results.length > 0) {
          generateAIResponse();
        }
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose, results, generateAIResponse]);

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    if (result.document.type === 'node' && result.document.nodeId) {
      onNavigateToNode(result.document.nodeId);
      onClose();
    } else if (result.document.type === 'runbook' && result.document.runbookId) {
      onNavigateToRunbook(result.document.runbookId);
      onClose();
    }
  };

  // Group results by type
  const nodeResults = results.filter(r => r.document.type === 'node');
  const runbookResults = results.filter(r => r.document.type === 'runbook');
  const markdownResults = results.filter(r => r.document.type === 'markdown_section');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Search Header */}
        <div className="p-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <Search size={20} className="text-[var(--color-text-muted)]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a question about this flowchart..."
              className="flex-1 bg-transparent text-lg text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
              disabled={isIndexing}
            />
            {isSearching && (
              <Loader2 size={20} className="text-[var(--color-accent-primary)] animate-spin" />
            )}
            <button
              onClick={onClose}
              className="p-1 hover:bg-[var(--color-bg-elevated)] rounded transition-colors"
            >
              <X size={20} className="text-[var(--color-text-muted)]" />
            </button>
          </div>
          
          {/* Keyboard hints */}
          <div className="flex items-center gap-4 mt-2 text-xs text-[var(--color-text-muted)]">
            <span><kbd className="px-1.5 py-0.5 bg-[var(--color-bg-elevated)] rounded">Esc</kbd> to close</span>
            <span><kbd className="px-1.5 py-0.5 bg-[var(--color-bg-elevated)] rounded">⌘</kbd>+<kbd className="px-1.5 py-0.5 bg-[var(--color-bg-elevated)] rounded">Enter</kbd> AI response</span>
          </div>
        </div>

        {/* Indexing Progress */}
        {isIndexing && (
          <div className="p-4 bg-[var(--color-bg-primary)]">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 size={16} className="text-[var(--color-accent-primary)] animate-spin" />
              <span className="text-sm text-[var(--color-text-secondary)]">{indexProgress.message}</span>
            </div>
            <div className="w-full h-1.5 bg-[var(--color-bg-elevated)] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[var(--color-accent-primary)] transition-all duration-300"
                style={{ width: `${indexProgress.percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 bg-[var(--color-error)]/10 border-b border-[var(--color-error)]/30">
            <div className="flex items-center gap-2 text-[var(--color-error)]">
              <AlertCircle size={16} />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Results or AI Response */}
        <div className="max-h-[60vh] overflow-y-auto">
          {showAIResponse ? (
            <AISearchResponseComponent
              response={aiResponse}
              isLoading={isGeneratingAI}
              onNavigateToNode={onNavigateToNode}
              onNavigateToRunbook={onNavigateToRunbook}
              onBack={() => setShowAIResponse(false)}
              onClose={onClose}
            />
          ) : (
            <>
              {/* AI Response Button */}
              {results.length > 0 && !isIndexing && (
                <div className="p-3 border-b border-[var(--color-border)]">
                  <button
                    onClick={generateAIResponse}
                    disabled={isGeneratingAI}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg transition-all shadow-lg hover:shadow-xl"
                  >
                    <Sparkles size={18} />
                    <span className="font-medium">Generate AI Response</span>
                    {isGeneratingAI && <Loader2 size={16} className="animate-spin" />}
                  </button>
                </div>
              )}

              {/* Empty state */}
              {!isIndexing && query.trim() === '' && (
                <div className="p-8 text-center">
                  <Search size={40} className="mx-auto mb-4 text-[var(--color-text-muted)]" />
                  <p className="text-[var(--color-text-secondary)]">
                    Search through flowchart nodes, runbooks, and source content
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)] mt-2">
                    Try asking questions like &ldquo;How do I reset a password?&rdquo; or &ldquo;What happens when authentication fails?&rdquo;
                  </p>
                </div>
              )}

              {/* No results */}
              {!isIndexing && query.trim() !== '' && results.length === 0 && !isSearching && (
                <div className="p-8 text-center">
                  <p className="text-[var(--color-text-secondary)]">No results found for &ldquo;{query}&rdquo;</p>
                  <p className="text-sm text-[var(--color-text-muted)] mt-2">Try rephrasing your question</p>
                </div>
              )}

              {/* Node Results */}
              {nodeResults.length > 0 && (
                <ResultSection
                  title="Flowchart Nodes"
                  icon={<GitBranch size={16} />}
                  results={nodeResults}
                  onResultClick={handleResultClick}
                />
              )}

              {/* Runbook Results */}
              {runbookResults.length > 0 && (
                <ResultSection
                  title="Runbooks"
                  icon={<FileText size={16} />}
                  results={runbookResults}
                  onResultClick={handleResultClick}
                />
              )}

              {/* Markdown Results */}
              {markdownResults.length > 0 && (
                <ResultSection
                  title="Source Content"
                  icon={<BookOpen size={16} />}
                  results={markdownResults}
                  onResultClick={handleResultClick}
                  isSourceContent
                />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!showAIResponse && results.length > 0 && (
          <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-bg-primary)]">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
              <span>{results.length} results found</span>
              <span>
                {isModelLoaded() ? '✓ Embedding model loaded' : isModelLoading() ? 'Loading model...' : ''}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Result Section Component
interface ResultSectionProps {
  title: string;
  icon: React.ReactNode;
  results: SearchResult[];
  onResultClick: (result: SearchResult) => void;
  isSourceContent?: boolean;
}

function ResultSection({ title, icon, results, onResultClick, isSourceContent }: ResultSectionProps) {
  return (
    <div className="border-b border-[var(--color-border-subtle)] last:border-b-0">
      <div className="px-4 py-2 bg-[var(--color-bg-primary)] flex items-center gap-2">
        <span className="text-[var(--color-accent-primary)]">{icon}</span>
        <span className="text-sm font-medium text-[var(--color-text-secondary)]">{title}</span>
        <span className="text-xs text-[var(--color-text-muted)]">({results.length})</span>
      </div>
      <div>
        {results.slice(0, 5).map((result) => (
          <button
            key={result.document.id}
            onClick={() => onResultClick(result)}
            className={`w-full px-4 py-3 text-left hover:bg-[var(--color-bg-elevated)] transition-colors border-b border-[var(--color-border-subtle)] last:border-b-0 ${
              isSourceContent ? 'cursor-default' : 'cursor-pointer'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[var(--color-text-primary)] truncate">
                    {result.document.title}
                  </span>
                  {!isSourceContent && (
                    <ChevronRight size={14} className="text-[var(--color-text-muted)] flex-shrink-0" />
                  )}
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1 line-clamp-2">
                  {result.document.snippet}
                </p>
                {result.highlights && result.highlights.length > 0 && (
                  <div className="mt-2 text-xs text-[var(--color-text-muted)] italic">
                    &ldquo;...{result.highlights[0]}...&rdquo;
                  </div>
                )}
              </div>
              <div className="flex-shrink-0">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  result.score > 0.5 
                    ? 'bg-green-500/20 text-green-400' 
                    : result.score > 0.3 
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]'
                }`}>
                  {Math.round(result.score * 100)}%
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

