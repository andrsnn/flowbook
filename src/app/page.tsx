'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  GitBranch, 
  X, 
  AlertCircle, 
  ArrowLeft,
  Info,
  List,
  ChevronRight,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  RefreshCw,
  Search,
  MessageCircleQuestion,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import MarkdownInput from '@/components/MarkdownInput';
import RunbookViewer from '@/components/RunbookViewer';
import ExportMenu from '@/components/ExportMenu';
import AnalysisProgress from '@/components/AnalysisProgress';
import SearchModal from '@/components/SearchModal';
import { resetSearchIndex } from '@/lib/search';
import { 
  FlowchartData, 
  FlowNode, 
  GeneratedRunbook, 
  AnalysisProgressEvent,
  SavedProject 
} from '@/types/schema';

// Dynamic import for Flowchart to avoid SSR issues with React Flow
const Flowchart = dynamic(() => import('@/components/Flowchart'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[var(--color-accent-primary)]/30 border-t-[var(--color-accent-primary)] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[var(--color-text-muted)]">Loading flowchart...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  // Core state
  const [inputMarkdown, setInputMarkdown] = useState('');
  const [flowchartData, setFlowchartData] = useState<FlowchartData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgressEvent[]>([]);
  const [currentPercent, setCurrentPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [analysisReasoning, setAnalysisReasoning] = useState<string | null>(null);
  
  // UI state
  const [selectedRunbook, setSelectedRunbook] = useState<GeneratedRunbook | null>(null);
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [showRunbookList, setShowRunbookList] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [guidedMode, setGuidedMode] = useState(true);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [showRegenDialog, setShowRegenDialog] = useState(false);
  const [regenFeedback, setRegenFeedback] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenMode, setRegenMode] = useState<'regenerate' | 'expand'>('regenerate');
  const [showSearch, setShowSearch] = useState(false);
  
  const flowchartRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut for search (Ctrl/Cmd + F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f' && flowchartData) {
        e.preventDefault();
        setShowSearch(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flowchartData]);

  // Initialize expanded nodes when flowchart changes
  useEffect(() => {
    if (flowchartData) {
      // In guided mode, only expand start nodes initially
      if (guidedMode) {
        const startNodes = flowchartData.nodes.filter(n => n.type === 'start');
        setExpandedNodes(new Set(startNodes.map(n => n.id)));
        setCurrentPath(startNodes.map(n => n.id));
      } else {
        // In full view mode, expand all
        setExpandedNodes(new Set(flowchartData.nodes.map(n => n.id)));
      }
    }
  }, [flowchartData, guidedMode]);

  // Streaming analysis
  const handleAnalyze = useCallback(async (markdown: string) => {
    setInputMarkdown(markdown);
    setIsAnalyzing(true);
    setAnalysisProgress([]);
    setCurrentPercent(0);
    setError(null);
    setAnalysisReasoning(null);
    setFlowchartData(null);

    try {
      // Use streaming endpoint
      const response = await fetch('/api/analyze-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown }),
      });

      if (!response.ok) {
        throw new Error('Failed to start analysis');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response stream');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event: AnalysisProgressEvent = JSON.parse(line.slice(6));
              setAnalysisProgress(prev => [...prev, event]);
              
              if (event.percent !== undefined) {
                setCurrentPercent(event.percent);
              }

              if (event.type === 'error') {
                throw new Error(event.message);
              }

              if (event.type === 'complete') {
                console.log('[UI] Stream complete, received data:', {
                  nodes: event.partialNodes?.length,
                  edges: event.partialEdges?.length,
                  runbooks: event.partialRunbooks?.length,
                });
                
                // Use the data from the stream directly
                if (event.partialNodes && event.partialEdges && event.partialRunbooks) {
                  console.log('[UI] Using streamed data directly');
                  setFlowchartData({
                    nodes: event.partialNodes,
                    edges: event.partialEdges,
                    runbooks: event.partialRunbooks,
                    metadata: {
                      title: event.partialMetadata?.title || 'Runbook Analysis',
                      description: event.partialMetadata?.description || 'Generated decision flowchart',
                      originalMarkdown: markdown,
                      generatedAt: new Date().toISOString(),
                      version: '1.0',
                    },
                  });
                  if (event.reasoning) {
                    setAnalysisReasoning(event.reasoning);
                  }
                } else {
                  console.error('[UI] Stream complete but missing data:', {
                    hasNodes: !!event.partialNodes,
                    hasEdges: !!event.partialEdges,
                    hasRunbooks: !!event.partialRunbooks,
                  });
                }
              }
            } catch (parseError) {
              console.error('Failed to parse SSE:', parseError);
            }
          }
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Node click handler
  const handleNodeClick = useCallback((node: FlowNode) => {
    setSelectedNode(node);
    
    if (node.type === 'runbook' && node.runbookId && flowchartData) {
      const runbook = flowchartData.runbooks.find(r => r.id === node.runbookId);
      if (runbook) {
        setSelectedRunbook(runbook);
        setShowRunbookList(false);
      }
    }
    
    // Update current path in guided mode
    if (guidedMode) {
      setCurrentPath(prev => {
        // If this node is a child of the last node in path, add it
        // Otherwise, find common ancestor and branch from there
        const nodeIndex = prev.indexOf(node.id);
        if (nodeIndex >= 0) {
          // Node is already in path, truncate to this point
          return prev.slice(0, nodeIndex + 1);
        }
        
        // Add node to path
        return [...prev, node.id];
      });
      
      // Auto-expand this node
      setExpandedNodes(prev => {
        const next = new Set(prev);
        next.add(node.id);
        return next;
      });
    }
  }, [flowchartData, guidedMode]);

  // Node action handler (regenerate, expand, delete)
  const handleNodeAction = useCallback((action: 'view' | 'regenerate' | 'expand' | 'delete', node: FlowNode) => {
    if (action === 'view' && node.type === 'runbook' && node.runbookId && flowchartData) {
      const runbook = flowchartData.runbooks.find(r => r.id === node.runbookId);
      if (runbook) {
        setSelectedRunbook(runbook);
      }
    } else if (action === 'regenerate') {
      setSelectedNode(node);
      setRegenMode('regenerate');
      setRegenFeedback('');
      setShowRegenDialog(true);
    } else if (action === 'expand') {
      setSelectedNode(node);
      setRegenMode('expand');
      setRegenFeedback('');
      setShowRegenDialog(true);
    } else if (action === 'delete') {
      if (confirm(`Delete node "${node.label}"? This cannot be undone.`)) {
        setFlowchartData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            nodes: prev.nodes.filter(n => n.id !== node.id),
            edges: prev.edges.filter(e => e.source !== node.id && e.target !== node.id),
          };
        });
      }
    }
  }, [flowchartData]);

  // Regenerate or expand node
  const handleRegenerate = async () => {
    if (!selectedNode || !flowchartData) return;
    
    setIsRegenerating(true);
    try {
      const response = await fetch('/api/regenerate-node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId: selectedNode.id,
          flowchart: flowchartData,
          feedback: regenFeedback,
          mode: regenMode,
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.node) {
        setFlowchartData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            nodes: prev.nodes.map(n => n.id === data.node.id ? { ...n, ...data.node } : n),
            runbooks: data.runbook 
              ? prev.runbooks.map(r => r.id === data.runbook.id ? data.runbook : r)
              : prev.runbooks,
          };
        });
        setShowRegenDialog(false);
        setRegenFeedback('');
      } else {
        throw new Error(data.error || 'Failed to regenerate');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to regenerate');
    } finally {
      setIsRegenerating(false);
    }
  };

  // Toggle node expansion
  const handleToggleExpand = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Expand/collapse all
  const handleExpandAll = useCallback(() => {
    if (flowchartData) {
      setExpandedNodes(new Set(flowchartData.nodes.map(n => n.id)));
    }
  }, [flowchartData]);

  const handleCollapseAll = useCallback(() => {
    if (flowchartData) {
      const startNodes = flowchartData.nodes.filter(n => n.type === 'start');
      setExpandedNodes(new Set(startNodes.map(n => n.id)));
    }
  }, [flowchartData]);

  // Navigate to runbook
  const handleNavigateToRunbook = useCallback((runbookId: string) => {
    if (flowchartData) {
      const runbook = flowchartData.runbooks.find(r => r.id === runbookId);
      if (runbook) {
        setSelectedRunbook(runbook);
        setShowRunbookList(false);
      }
    }
  }, [flowchartData]);

  // Navigate to node (from search results)
  const handleNavigateToNode = useCallback((nodeId: string) => {
    if (flowchartData) {
      const node = flowchartData.nodes.find(n => n.id === nodeId);
      if (node) {
        // Expand the node and its path
        setExpandedNodes(prev => {
          const next = new Set(prev);
          next.add(nodeId);
          return next;
        });
        
        // Add to current path
        setCurrentPath(prev => {
          if (!prev.includes(nodeId)) {
            return [...prev, nodeId];
          }
          return prev;
        });
        
        // Select the node
        setSelectedNode(node);
        
        // If it's a runbook node, open the runbook
        if (node.type === 'runbook' && node.runbookId) {
          const runbook = flowchartData.runbooks.find(r => r.id === node.runbookId);
          if (runbook) {
            setSelectedRunbook(runbook);
          }
        }
      }
    }
  }, [flowchartData]);

  // Load saved project
  const handleLoadProject = useCallback((project: SavedProject) => {
    setFlowchartData(project.flowchart);
    setInputMarkdown(project.flowchart.metadata.originalMarkdown);
    if (project.uiState) {
      setExpandedNodes(new Set(project.uiState.expandedNodes));
      setCurrentPath(project.uiState.currentPath);
      setGuidedMode(project.uiState.guidedMode);
    }
    setError(null);
  }, []);

  // Re-analyze
  const handleReanalyze = useCallback(() => {
    if (inputMarkdown) {
      handleAnalyze(inputMarkdown);
    }
  }, [inputMarkdown, handleAnalyze]);

  // Rephrase category nodes as questions
  const handleRephraseAsQuestions = useCallback(() => {
    if (!flowchartData) return;
    
    const rephrasedNodes = flowchartData.nodes.map(node => {
      // Only rephrase question and answer nodes that don't already end with ?
      if ((node.type !== 'question' && node.type !== 'answer') || node.label.endsWith('?')) {
        return node;
      }
      
      let label = node.label;
      
      // Remove common suffixes
      const cleanLabel = label
        .replace(/\s+Issues?$/i, '')
        .replace(/\s+Request$/i, '')
        .replace(/\s+Problem$/i, '')
        .replace(/\s+Confusion$/i, '');
      
      const lowerLabel = cleanLabel.toLowerCase();
      
      // Already has question words
      if (lowerLabel.includes('what') || lowerLabel.includes('which') || lowerLabel.includes('how') ||
          lowerLabel.startsWith('is ') || lowerLabel.startsWith('does ') || lowerLabel.startsWith('has ') || lowerLabel.startsWith('can ')) {
        label = `${label}?`;
      } else {
        // Convert to question format
        const article = /^[aeiou]/i.test(cleanLabel) ? 'an' : 'a';
        if (/^[A-Z]/.test(cleanLabel) && !cleanLabel.includes(' ')) {
          label = `Is this ${article} ${cleanLabel} issue?`;
        } else {
          label = `Is this ${article} ${cleanLabel.toLowerCase()} issue?`;
        }
      }
      
      return {
        ...node,
        label,
        question: node.question === node.label ? label : node.question,
      };
    });
    
    setFlowchartData({
      ...flowchartData,
      nodes: rephrasedNodes,
    });
  }, [flowchartData]);

  // Reset
  const handleReset = () => {
    setFlowchartData(null);
    setInputMarkdown('');
    setSelectedRunbook(null);
    setSelectedNode(null);
    setAnalysisReasoning(null);
    setShowRunbookList(false);
    setExpandedNodes(new Set());
    setCurrentPath([]);
    setError(null);
    setShowSearch(false);
    resetSearchIndex();
  };

  const dismissError = () => setError(null);

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      {/* Header */}
      <header className="border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)]/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="px-3 sm:px-4">
          <div className="flex items-center justify-between h-14 gap-2">
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleReset}
                className="p-1.5 rounded-lg bg-gradient-to-br from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] hover:opacity-90 transition-opacity"
              >
                <GitBranch size={18} className="text-white" />
              </button>
              <div className="hidden md:block">
                <h1 className="font-mono font-semibold text-sm">Runbook Flow</h1>
              </div>
            </div>

            {flowchartData && (
              <div className="flex items-center gap-1 flex-wrap justify-end">
                {/* Guided Mode Toggle */}
                <button
                  onClick={() => setGuidedMode(!guidedMode)}
                  className={`p-2 rounded-lg transition-colors ${guidedMode ? 'bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)]'}`}
                  title={guidedMode ? 'Guided mode' : 'Full view mode'}
                >
                  {guidedMode ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>

                {/* Expand/Collapse */}
                <button
                  onClick={handleExpandAll}
                  className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] transition-colors"
                  title="Expand all"
                >
                  <Maximize2 size={18} />
                </button>
                <button
                  onClick={handleCollapseAll}
                  className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] transition-colors"
                  title="Collapse all"
                >
                  <Minimize2 size={18} />
                </button>

                {/* Runbook List */}
                <button
                  onClick={() => setShowRunbookList(!showRunbookList)}
                  className={`p-2 rounded-lg transition-colors ${showRunbookList ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)]'}`}
                  title={`Runbooks (${flowchartData.runbooks.length})`}
                >
                  <List size={18} />
                </button>

                {/* Search */}
                <button
                  onClick={() => setShowSearch(true)}
                  className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] transition-colors"
                  title="Search (⌘/Ctrl + F)"
                >
                  <Search size={18} />
                </button>

                {/* Rephrase as Questions */}
                <button
                  onClick={handleRephraseAsQuestions}
                  className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] transition-colors"
                  title="Rephrase nodes as questions"
                >
                  <MessageCircleQuestion size={18} />
                </button>

                {/* Re-analyze */}
                <button
                  onClick={handleReanalyze}
                  className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] transition-colors"
                  title="Re-analyze"
                >
                  <RefreshCw size={18} />
                </button>

                {/* Export */}
                <ExportMenu 
                  flowchart={flowchartData} 
                  flowchartRef={flowchartRef}
                  expandedNodes={expandedNodes}
                  currentPath={currentPath}
                  guidedMode={guidedMode}
                  onLoadProject={handleLoadProject}
                />
                
                {/* New */}
                <button 
                  onClick={handleReset} 
                  className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] transition-colors"
                  title="New flowchart"
                >
                  <ArrowLeft size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Error Toast */}
      {error && (
        <div className="fixed top-16 right-4 z-50 animate-slide-up max-w-md">
          <div className="card bg-[var(--color-error)]/10 border-[var(--color-error)]/30 flex items-start gap-3 pr-2">
            <AlertCircle size={18} className="text-[var(--color-error)] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-[var(--color-error)] flex-1">{error}</p>
            <button onClick={dismissError} className="p-1 hover:bg-[var(--color-error)]/20 rounded flex-shrink-0">
              <X size={14} className="text-[var(--color-error)]" />
            </button>
          </div>
        </div>
      )}

      {/* Regenerate/Expand Dialog */}
      {showRegenDialog && selectedNode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">
              {regenMode === 'expand' ? '✨ Expand Node Details' : '🔄 Regenerate Node'}
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-2">
              {regenMode === 'expand' ? 'Expanding' : 'Regenerating'}: <strong>{selectedNode.label}</strong>
              <span className="text-xs ml-2 px-2 py-0.5 bg-[var(--color-bg-tertiary)] rounded">{selectedNode.type}</span>
            </p>
            {regenMode === 'expand' && (
              <p className="text-xs text-blue-400 mb-4">
                This will generate longer, more detailed text for the label, description, 
                {selectedNode.type === 'question' && ' question text,'}
                {selectedNode.type === 'runbook' && ' and runbook steps with specific instructions.'}
                {selectedNode.type === 'answer' && ' explaining what this choice means.'}
                {selectedNode.type === 'end' && ' including resolution details and next steps.'}
              </p>
            )}
            <textarea
              value={regenFeedback}
              onChange={(e) => setRegenFeedback(e.target.value)}
              placeholder={regenMode === 'expand' 
                ? "Optional: Specific details you want included (e.g., 'Include specific tool names' or 'Add warning about common mistakes')"
                : "Optional: Feedback to guide regeneration (e.g., 'Make clearer' or 'Focus on authentication')"
              }
              className="input h-24 resize-none mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowRegenDialog(false); setRegenFeedback(''); }}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className={regenMode === 'expand' ? 'btn bg-blue-600 hover:bg-blue-700 text-white' : 'btn btn-primary'}
              >
                {isRegenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {regenMode === 'expand' ? 'Expanding...' : 'Regenerating...'}
                  </>
                ) : (
                  regenMode === 'expand' ? '✨ Expand Details' : '🔄 Regenerate'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex">
        {/* Input View */}
        {!flowchartData && !isAnalyzing && (
          <div className="flex-1 flex items-center justify-center p-8">
            <MarkdownInput onAnalyze={handleAnalyze} onLoadProject={handleLoadProject} isAnalyzing={isAnalyzing} />
          </div>
        )}

        {/* Loading View with Progress */}
        {isAnalyzing && (
          <div className="flex-1 flex items-center justify-center p-8">
            <AnalysisProgress events={analysisProgress} currentPercent={currentPercent} />
          </div>
        )}

        {/* Flowchart View */}
        {flowchartData && !isAnalyzing && (
          <div className="flex-1 flex">
            {/* Flowchart Panel */}
            <div className="flex-1 flex flex-col">
              {/* Flowchart Header */}
              <div className="p-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-lg truncate">{flowchartData.metadata.title}</h2>
                    <p className="text-sm text-[var(--color-text-secondary)] truncate">
                      {flowchartData.metadata.description}
                    </p>
                  </div>
                  <div className="text-sm text-[var(--color-text-muted)]">
                    {flowchartData.nodes.length} nodes • {flowchartData.runbooks.length} runbooks
                  </div>
                </div>
                
                {/* AI Reasoning */}
                {analysisReasoning && (
                  <details className="mt-3">
                    <summary className="flex items-center gap-2 text-sm text-[var(--color-accent-primary)] cursor-pointer hover:underline">
                      <Info size={14} />
                      View AI analysis reasoning
                    </summary>
                    <div className="mt-2 p-3 bg-[var(--color-bg-primary)] rounded-lg text-sm text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)] max-h-48 overflow-y-auto">
                      {analysisReasoning}
                    </div>
                  </details>
                )}

                {/* Guided Mode Instructions */}
                {guidedMode && (
                  <div className="mt-3 p-3 bg-[var(--color-accent-primary)]/10 rounded-lg text-sm text-[var(--color-accent-primary)] border border-[var(--color-accent-primary)]/30">
                    <strong>Guided Mode:</strong> Click on nodes to navigate through the decision tree. 
                    Your current path is highlighted. Click the expand buttons to reveal more options.
                  </div>
                )}
              </div>

              {/* Flowchart Canvas */}
              <div ref={flowchartRef} className="flex-1">
                <Flowchart 
                  data={flowchartData} 
                  onNodeClick={handleNodeClick}
                  onNodeAction={handleNodeAction}
                  expandedNodes={expandedNodes}
                  onToggleExpand={handleToggleExpand}
                  currentPath={currentPath}
                  guidedMode={guidedMode}
                />
              </div>
            </div>

            {/* Runbook List Sidebar */}
            {showRunbookList && (
              <div className="w-80 border-l border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex flex-col">
                <div className="p-4 border-b border-[var(--color-border)]">
                  <h3 className="font-semibold">All Runbooks</h3>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    Click a runbook to view details
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {flowchartData.runbooks.map((runbook) => (
                    <button
                      key={runbook.id}
                      onClick={() => {
                        setSelectedRunbook(runbook);
                        setShowRunbookList(false);
                      }}
                      className={`w-full p-3 rounded-lg text-left transition-colors mb-1 ${
                        selectedRunbook?.id === runbook.id
                          ? 'bg-[var(--color-accent-primary)]/10 border border-[var(--color-accent-primary)]/30'
                          : 'hover:bg-[var(--color-bg-elevated)]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-[var(--color-text-primary)]">
                          {runbook.title}
                        </span>
                        <ChevronRight size={16} className="text-[var(--color-text-muted)]" />
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)] mt-1 line-clamp-2">
                        {runbook.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="badge text-xs">
                          {runbook.steps.length} steps
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Runbook Viewer Sidebar */}
            {selectedRunbook && !showRunbookList && (
              <div className="w-[420px]">
                <RunbookViewer
                  runbook={selectedRunbook}
                  flowchart={flowchartData}
                  onClose={() => setSelectedRunbook(null)}
                  onNavigateToRunbook={handleNavigateToRunbook}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer - only show on input page */}
      {!flowchartData && !isAnalyzing && (
        <footer className="border-t border-[var(--color-border-subtle)] py-4">
          <div className="max-w-4xl mx-auto px-4 text-center text-sm text-[var(--color-text-muted)]">
            Powered by Claude AI for analysis • Gemini for visualization
          </div>
        </footer>
      )}

      {/* Search Modal */}
      {flowchartData && (
        <SearchModal
          isOpen={showSearch}
          onClose={() => setShowSearch(false)}
          flowchartData={flowchartData}
          onNavigateToNode={handleNavigateToNode}
          onNavigateToRunbook={handleNavigateToRunbook}
        />
      )}
    </div>
  );
}
