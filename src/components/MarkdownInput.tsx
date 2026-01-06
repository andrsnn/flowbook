'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, Sparkles, AlertCircle, X, FolderOpen } from 'lucide-react';
import { SavedProject, FlowchartData } from '@/types/schema';

interface UploadedFile {
  name: string;
  content: string;
  size: number;
}

interface MarkdownInputProps {
  onAnalyze: (markdown: string) => void;
  onLoadProject: (project: SavedProject) => void;
  isAnalyzing: boolean;
}

export default function MarkdownInput({ onAnalyze, onLoadProject, isAnalyzing }: MarkdownInputProps) {
  const [markdown, setMarkdown] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const handleFilesUpload = useCallback(async (files: FileList) => {
    const errors: string[] = [];
    const newFiles: UploadedFile[] = [];
    const seenNames = new Set<string>();
    
    for (const file of Array.from(files)) {
      // Validate file type
      if (!file.name.endsWith('.md') && !file.name.endsWith('.markdown') && !file.name.endsWith('.txt')) {
        errors.push(`${file.name}: Must be .md or .txt file`);
        continue;
      }

      // Validate file size
      if (file.size > 500000) {
        errors.push(`${file.name}: Exceeds 500KB limit`);
        continue;
      }

      // Skip duplicates within this batch
      if (seenNames.has(file.name)) {
        continue;
      }
      seenNames.add(file.name);

      try {
        const content = await readFileAsText(file);
        newFiles.push({
          name: file.name,
          content,
          size: file.size,
        });
      } catch {
        errors.push(`${file.name}: Failed to read`);
      }
    }

    // Update state - filter out any files that already exist
    if (newFiles.length > 0) {
      setUploadedFiles(prev => {
        const existingNames = new Set(prev.map(f => f.name));
        const uniqueNewFiles = newFiles.filter(f => !existingNames.has(f.name));
        if (uniqueNewFiles.length < newFiles.length) {
          const skipped = newFiles.length - uniqueNewFiles.length;
          errors.push(`${skipped} file(s) already uploaded`);
        }
        return [...prev, ...uniqueNewFiles];
      });
    }

    if (errors.length > 0) {
      setError(errors.join('; '));
    } else {
      setError(null);
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearAllFiles = useCallback(() => {
    setUploadedFiles([]);
    setError(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFilesUpload(files);
    }
  }, [handleFilesUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFilesUpload(files);
    }
    // Reset input so same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFilesUpload]);

  const handleSubmit = () => {
    const hasContent = markdown.trim() || uploadedFiles.length > 0;
    if (!hasContent) {
      setError('Please enter or upload a runbook');
      return;
    }
    setError(null);
    
    // Combine textarea content + all uploaded files with separators
    const parts: string[] = [];
    
    if (markdown.trim()) {
      parts.push(markdown.trim());
    }
    
    for (const file of uploadedFiles) {
      parts.push(`\n\n---\n# Source: ${file.name}\n---\n\n${file.content}`);
    }
    
    const combined = parts.join('');
    onAnalyze(combined);
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
          Paste your markdown or upload files to get started.
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
        {/* Uploaded files list */}
        {uploadedFiles.length > 0 && (
          <div className="absolute top-3 left-3 right-3 z-10 flex items-center gap-2 overflow-x-auto pb-1">
            {uploadedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-bg-elevated)] rounded-lg border border-[var(--color-border)] flex-shrink-0"
              >
                <FileText size={14} className="text-[var(--color-accent-primary)]" />
                <span className="text-sm text-[var(--color-text-primary)] max-w-[150px] truncate">
                  {file.name}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {(file.size / 1024).toFixed(1)}KB
                </span>
                <button
                  onClick={() => removeFile(index)}
                  className="p-0.5 hover:bg-[var(--color-bg-tertiary)] rounded"
                  title="Remove file"
                >
                  <X size={14} className="text-[var(--color-text-muted)]" />
                </button>
              </div>
            ))}
            {uploadedFiles.length > 1 && (
              <button
                onClick={clearAllFiles}
                className="flex items-center gap-1 px-2 py-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 rounded-lg flex-shrink-0 transition-colors"
                title="Clear all files"
              >
                <X size={12} />
                Clear all
              </button>
            )}
          </div>
        )}

        {/* Textarea */}
        <textarea
          value={markdown}
          onChange={(e) => {
            setMarkdown(e.target.value);
            setError(null);
          }}
          placeholder="Paste your runbook markdown here...

# Example Runbook: Account Issue Resolution

## Purpose
Help users who have account access issues or need email changes.

## Step 1: Identify the Account
- Search by email or username
- Note the account ID and status

## Step 2: Identify the Situation
| Situation | Action |
|-----------|--------|
| User needs email changed | Go to Scenario A |
| User has duplicate accounts | Go to Scenario B |

..."
          className={`w-full h-80 p-4 bg-transparent text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] resize-none focus:outline-none font-mono text-sm ${
            uploadedFiles.length > 0 ? 'pt-14' : 'pt-4'
          }`}
          disabled={isAnalyzing}
        />

        {/* Drop overlay */}
        {dragOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg-primary)]/80 rounded-xl">
            <div className="text-center">
              <Upload size={48} className="mx-auto mb-2 text-[var(--color-accent-primary)]" />
              <p className="text-[var(--color-text-primary)] font-medium">Drop your files here</p>
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
            multiple
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
            Upload Files
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
          disabled={(!markdown.trim() && uploadedFiles.length === 0) || isAnalyzing}
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

