'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, Sparkles, AlertCircle, X, FolderOpen } from 'lucide-react';
import { SavedProject, FlowchartData } from '@/types/schema';

interface MarkdownInputProps {
  onAnalyze: (markdown: string) => void;
  onLoadProject: (project: SavedProject) => void;
  isAnalyzing: boolean;
}

export default function MarkdownInput({ onAnalyze, onLoadProject, isAnalyzing }: MarkdownInputProps) {
  const [markdown, setMarkdown] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback((file: File) => {
    if (!file.name.endsWith('.md') && !file.name.endsWith('.markdown') && !file.name.endsWith('.txt')) {
      setError('Please upload a Markdown (.md) or text (.txt) file');
      return;
    }

    if (file.size > 500000) { // 500KB limit
      setError('File is too large. Maximum size is 500KB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setMarkdown(content);
      setFileName(file.name);
      setError(null);
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    // Reset input so same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileUpload]);

  const handleSubmit = () => {
    if (!markdown.trim()) {
      setError('Please enter or upload a runbook');
      return;
    }
    setError(null);
    onAnalyze(markdown);
  };

  const clearFile = () => {
    setFileName(null);
    setMarkdown('');
    setError(null);
  };

  const handleProjectLoad = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);
        
        // Check if it's a SavedProject or raw FlowchartData
        if (data.version && data.flowchart) {
          // It's a SavedProject
          onLoadProject(data as SavedProject);
        } else if (data.nodes && data.edges && data.runbooks) {
          // It's raw FlowchartData
          onLoadProject({
            version: '1.0',
            savedAt: new Date().toISOString(),
            flowchart: data as FlowchartData,
          });
        } else {
          throw new Error('Invalid project file format');
        }
      } catch (err) {
        setError(`Failed to load project: ${err instanceof Error ? err.message : 'Invalid file'}`);
      }
    };
    reader.readAsText(file);
    
    // Reset input
    if (projectInputRef.current) {
      projectInputRef.current.value = '';
    }
  }, [onLoadProject]);

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8 animate-slide-up">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-tertiary)] bg-clip-text text-transparent">
          Runbook Flow
        </h1>
        <p className="text-[var(--color-text-secondary)] text-lg max-w-2xl mx-auto">
          Transform complex runbooks into interactive decision flowcharts. 
          Paste your markdown or upload a file to get started.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-4 bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 rounded-lg flex items-start gap-3 animate-fade-in">
          <AlertCircle size={20} className="text-[var(--color-error)] flex-shrink-0" />
          <p className="text-sm text-[var(--color-error)]">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="ml-auto p-1 hover:bg-[var(--color-error)]/20 rounded"
          >
            <X size={16} className="text-[var(--color-error)]" />
          </button>
        </div>
      )}

      {/* Input Area */}
      <div 
        className={`relative rounded-xl border-2 border-dashed transition-colors ${
          dragOver 
            ? 'border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/5' 
            : 'border-[var(--color-border)] hover:border-[var(--color-border)]'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {/* File name badge */}
        {fileName && (
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 bg-[var(--color-bg-elevated)] rounded-lg border border-[var(--color-border)]">
            <FileText size={14} className="text-[var(--color-accent-primary)]" />
            <span className="text-sm text-[var(--color-text-primary)]">{fileName}</span>
            <button
              onClick={clearFile}
              className="p-0.5 hover:bg-[var(--color-bg-tertiary)] rounded"
            >
              <X size={14} className="text-[var(--color-text-muted)]" />
            </button>
          </div>
        )}

        {/* Textarea */}
        <textarea
          value={markdown}
          onChange={(e) => {
            setMarkdown(e.target.value);
            setFileName(null);
            setError(null);
          }}
          placeholder="Paste your runbook markdown here...

# Example Runbook: Duplicate Account Resolution

## Purpose
Help users who have multiple accounts or need to free up an email address.

## Step 1: Find the Accounts
- Search by email or First Name + Last Name + DOB
- Note the User IDs for all matches

## Step 2: Identify the Situation
| Situation | Action |
|-----------|--------|
| Provider wants patient email | Go to Scenario A |
| Provider created patient account by mistake | Go to Scenario B |

..."
          className="w-full h-80 p-4 pt-14 bg-transparent text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] resize-none focus:outline-none font-mono text-sm"
          disabled={isAnalyzing}
        />

        {/* Drop overlay */}
        {dragOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg-primary)]/80 rounded-xl">
            <div className="text-center">
              <Upload size={48} className="mx-auto mb-2 text-[var(--color-accent-primary)]" />
              <p className="text-[var(--color-text-primary)] font-medium">Drop your file here</p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,.txt"
            onChange={handleFileInputChange}
            className="hidden"
          />
          <input
            ref={projectInputRef}
            type="file"
            accept=".json"
            onChange={handleProjectLoad}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-secondary"
            disabled={isAnalyzing}
          >
            <Upload size={18} />
            Upload Runbook
          </button>
          <button
            onClick={() => projectInputRef.current?.click()}
            className="btn btn-ghost"
            disabled={isAnalyzing}
            title="Load a previously saved project"
          >
            <FolderOpen size={18} />
            Load Project
          </button>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!markdown.trim() || isAnalyzing}
          className="btn btn-primary"
        >
          {isAnalyzing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles size={18} />
              Generate Flowchart
            </>
          )}
        </button>
      </div>

      {/* Tips */}
      <div className="mt-8 p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border-subtle)]">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
          Tips for best results
        </h3>
        <ul className="text-sm text-[var(--color-text-secondary)] space-y-1">
          <li>• Include clear headings and sections in your runbook</li>
          <li>• Use tables for decision matrices (the AI will convert these to flowchart branches)</li>
          <li>• Mark scenarios with labels like &quot;Scenario A&quot;, &quot;Case 1&quot;, etc.</li>
          <li>• Include step-by-step instructions for each resolution path</li>
        </ul>
      </div>
    </div>
  );
}

