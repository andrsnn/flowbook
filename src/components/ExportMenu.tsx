'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, Image, Code, FileText, FileJson, ChevronDown, Loader2, Save, FolderOpen, ExternalLink, Globe } from 'lucide-react';
import { toPng, toSvg } from 'html-to-image';
import { saveAs } from 'file-saver';
import { FlowchartData, ExportFormat, SavedProject } from '@/types/schema';
import { generateMermaidDiagram, generateRunbooksMarkdown } from '@/lib/anthropic';
import { generateMermaidLiveUrl, generateInteractiveHtml } from '@/lib/export-interactive';

interface ExportMenuProps {
  flowchart: FlowchartData;
  flowchartRef: React.RefObject<HTMLDivElement | null>;
  expandedNodes: Set<string>;
  currentPath: string[];
  guidedMode: boolean;
  onLoadProject?: (project: SavedProject) => void;
}

export default function ExportMenu({ 
  flowchart, 
  flowchartRef, 
  expandedNodes,
  currentPath,
  guidedMode,
  onLoadProject 
}: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<ExportFormat | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getFilename = () => {
    return flowchart.metadata.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(format);
    
    try {
      const filename = getFilename();

      switch (format) {
        case 'png': {
          if (!flowchartRef.current) {
            throw new Error('Flowchart element not found');
          }
          const viewport = flowchartRef.current.querySelector('.react-flow__viewport');
          if (!viewport) {
            throw new Error('Flowchart viewport not found');
          }
          const dataUrl = await toPng(viewport as HTMLElement, {
            backgroundColor: '#0a0e14',
            pixelRatio: 2,
          });
          saveAs(dataUrl, `${filename}-flowchart.png`);
          break;
        }

        case 'svg': {
          if (!flowchartRef.current) {
            throw new Error('Flowchart element not found');
          }
          const viewport = flowchartRef.current.querySelector('.react-flow__viewport');
          if (!viewport) {
            throw new Error('Flowchart viewport not found');
          }
          const dataUrl = await toSvg(viewport as HTMLElement, {
            backgroundColor: '#0a0e14',
          });
          saveAs(dataUrl, `${filename}-flowchart.svg`);
          break;
        }

        case 'mermaid': {
          const mermaidCode = generateMermaidDiagram(flowchart);
          const blob = new Blob([mermaidCode], { type: 'text/plain;charset=utf-8' });
          saveAs(blob, `${filename}-flowchart.mmd`);
          break;
        }

        case 'markdown': {
          const markdownContent = generateRunbooksMarkdown(flowchart);
          const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
          saveAs(blob, `${filename}-runbooks.md`);
          break;
        }

        case 'json': {
          const jsonContent = JSON.stringify(flowchart, null, 2);
          const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
          saveAs(blob, `${filename}-data.json`);
          break;
        }

        case 'project': {
          const project: SavedProject = {
            version: '1.0',
            savedAt: new Date().toISOString(),
            flowchart,
            uiState: {
              expandedNodes: Array.from(expandedNodes),
              currentPath,
              guidedMode,
            },
          };
          const jsonContent = JSON.stringify(project, null, 2);
          const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
          saveAs(blob, `${filename}-project.json`);
          break;
        }

        case 'interactive' as ExportFormat: {
          const htmlContent = generateInteractiveHtml(flowchart);
          const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
          saveAs(blob, `${filename}-interactive.html`);
          break;
        }

        case 'mermaid-live' as ExportFormat: {
          const url = generateMermaidLiveUrl(flowchart);
          window.open(url, '_blank');
          break;
        }
      }

      setIsOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(null);
    }
  };

  const handleFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          onLoadProject?.(data as SavedProject);
        } else if (data.nodes && data.edges && data.runbooks) {
          // It's raw FlowchartData
          onLoadProject?.({
            version: '1.0',
            savedAt: new Date().toISOString(),
            flowchart: data as FlowchartData,
          });
        } else {
          throw new Error('Invalid project file format');
        }
        
        setIsOpen(false);
      } catch (error) {
        alert(`Failed to load project: ${error instanceof Error ? error.message : 'Invalid file'}`);
      }
    };
    reader.readAsText(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const exportOptions = [
    { format: 'project' as ExportFormat, icon: Save, label: 'Save Project', desc: 'Full project with UI state', section: 'save' },
    { format: 'interactive' as ExportFormat, icon: Globe, label: 'Interactive HTML', desc: 'Shareable single-file app', section: 'share' },
    { format: 'mermaid-live' as ExportFormat, icon: ExternalLink, label: 'Open in Mermaid Live', desc: 'Edit in browser', section: 'share' },
    { format: 'png' as ExportFormat, icon: Image, label: 'PNG Image', desc: 'High-res flowchart image', section: 'export' },
    { format: 'svg' as ExportFormat, icon: Image, label: 'SVG Vector', desc: 'Scalable vector graphic', section: 'export' },
    { format: 'mermaid' as ExportFormat, icon: Code, label: 'Mermaid Code', desc: 'Diagram syntax (.mmd)', section: 'export' },
    { format: 'markdown' as ExportFormat, icon: FileText, label: 'Runbooks (MD)', desc: 'All runbooks as markdown', section: 'export' },
    { format: 'json' as ExportFormat, icon: FileJson, label: 'JSON Data', desc: 'Raw flowchart data', section: 'export' },
  ];

  return (
    <div ref={menuRef} className="relative flex items-center gap-2">
      {/* Load Project Button */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileLoad}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="btn btn-ghost"
        title="Load Project"
      >
        <FolderOpen size={18} />
      </button>

      {/* Export Dropdown */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-secondary"
      >
        <Download size={18} />
        Export
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg shadow-lg overflow-hidden z-50 animate-fade-in">
          {/* Save Section */}
          <div className="px-3 py-2 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide bg-[var(--color-bg-tertiary)]">
            Save & Load
          </div>
          {exportOptions.filter(o => o.section === 'save').map(({ format, icon: Icon, label, desc }) => (
            <button
              key={format}
              onClick={() => handleExport(format)}
              disabled={isExporting !== null}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[var(--color-bg-tertiary)] transition-colors text-left disabled:opacity-50"
            >
              {isExporting === format ? (
                <Loader2 size={18} className="text-[var(--color-accent-primary)] animate-spin" />
              ) : (
                <Icon size={18} className="text-[var(--color-accent-primary)]" />
              )}
              <div>
                <div className="text-sm font-medium text-[var(--color-accent-primary)]">{label}</div>
                <div className="text-xs text-[var(--color-text-muted)]">{desc}</div>
              </div>
            </button>
          ))}

          {/* Share Section */}
          <div className="px-3 py-2 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide bg-[var(--color-bg-tertiary)] border-t border-[var(--color-border)]">
            Share Interactive
          </div>
          {exportOptions.filter(o => o.section === 'share').map(({ format, icon: Icon, label, desc }) => (
            <button
              key={format}
              onClick={() => handleExport(format)}
              disabled={isExporting !== null}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[var(--color-bg-tertiary)] transition-colors text-left disabled:opacity-50"
            >
              {isExporting === format ? (
                <Loader2 size={18} className="text-[var(--color-success)] animate-spin" />
              ) : (
                <Icon size={18} className="text-[var(--color-success)]" />
              )}
              <div>
                <div className="text-sm font-medium text-[var(--color-success)]">{label}</div>
                <div className="text-xs text-[var(--color-text-muted)]">{desc}</div>
              </div>
            </button>
          ))}

          {/* Export Section */}
          <div className="px-3 py-2 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide bg-[var(--color-bg-tertiary)] border-t border-[var(--color-border)]">
            Export
          </div>
          {exportOptions.filter(o => o.section === 'export').map(({ format, icon: Icon, label, desc }) => (
            <button
              key={format}
              onClick={() => handleExport(format)}
              disabled={isExporting !== null}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[var(--color-bg-tertiary)] transition-colors text-left disabled:opacity-50"
            >
              {isExporting === format ? (
                <Loader2 size={18} className="text-[var(--color-text-muted)] animate-spin" />
              ) : (
                <Icon size={18} className="text-[var(--color-text-muted)]" />
              )}
              <div>
                <div className="text-sm font-medium text-[var(--color-text-primary)]">{label}</div>
                <div className="text-xs text-[var(--color-text-muted)]">{desc}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
