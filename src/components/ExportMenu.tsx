'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, Image, Code, FileText, FileJson, ChevronDown, Loader2, Save, FolderOpen, ExternalLink, Globe, BookOpen } from 'lucide-react';
import { toPng, toSvg } from 'html-to-image';
import { saveAs } from 'file-saver';
import { FlowchartData, ExportFormat, SavedProject } from '@/types/schema';
import { generateMermaidDiagram, generateRunbooksMarkdown } from '@/lib/anthropic';
import { 
  generateMermaidLiveUrl, 
  generateInteractiveHtml,
  generateConfluenceDocx,
  generateConfluenceWikiMarkup,
  generateGoogleDocsHtml,
  generateGoogleDocsMarkdown,
  generateGoogleDocsDocx
} from '@/lib/export-interactive';

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
  const [exportProgress, setExportProgress] = useState<string | null>(null);
  const [cachedEnrichedRunbooks, setCachedEnrichedRunbooks] = useState<FlowchartData | null>(null);
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

  // Helper to enrich runbooks with more detailed content for documentation exports
  // Uses cache to avoid re-enriching (saves API costs)
  const enrichFlowchartRunbooks = async (fc: FlowchartData): Promise<FlowchartData> => {
    // Check if we have a cached enriched version
    if (cachedEnrichedRunbooks) {
      setExportProgress('Using cached enriched content...');
      return cachedEnrichedRunbooks;
    }
    
    try {
      setExportProgress('Enriching runbooks with Claude AI (this may take 10-15 seconds)...');
      
      const response = await fetch('/api/enrich-runbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runbooks: fc.runbooks }),
      });
      
      const result = await response.json();
      
      if (!result.success || !result.runbooks) {
        console.warn('Runbook enrichment failed, using original content');
        setExportProgress('Enrichment failed, using original content...');
        return fc;
      }
      
      // Return flowchart with enriched runbooks and cache it
      const enrichedFlowchart = {
        ...fc,
        runbooks: result.runbooks,
      };
      
      setCachedEnrichedRunbooks(enrichedFlowchart);
      setExportProgress('Generating document...');
      
      return enrichedFlowchart;
    } catch (error) {
      console.error('Failed to enrich runbooks:', error);
      setExportProgress('Enrichment failed, using original content...');
      // Return original flowchart if enrichment fails
      return fc;
    }
  };
  
  // Clear cache when flowchart changes
  useEffect(() => {
    setCachedEnrichedRunbooks(null);
  }, [flowchart]);

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(format);
    
    try {
      const filename = getFilename();

      switch (format) {
        case 'png': {
          // Use Gemini AI to generate a full flowchart image
          const response = await fetch('/api/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ flowchart }),
          });
          
          const result = await response.json();
          
          if (!result.success) {
            throw new Error(result.error || 'Failed to generate image');
          }
          
          // Convert base64 to blob and download
          const byteCharacters = atob(result.imageBase64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: result.mimeType || 'image/png' });
          saveAs(blob, `${filename}-flowchart.png`);
          break;
        }

        case 'screenshot' as ExportFormat: {
          if (!flowchartRef.current) {
            throw new Error('Flowchart element not found');
          }
          
          // Calculate bounds from all nodes in flowchart data
          const nodeWidth = 300;
          const nodeHeight = 120;
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          
          for (const node of flowchart.nodes) {
            const pos = node.position || { x: 0, y: 0 };
            minX = Math.min(minX, pos.x);
            minY = Math.min(minY, pos.y);
            maxX = Math.max(maxX, pos.x + nodeWidth);
            maxY = Math.max(maxY, pos.y + nodeHeight);
          }
          
          if (!isFinite(minX)) {
            minX = 0; minY = 0; maxX = 1200; maxY = 800;
          }
          
          const padding = 60;
          const contentWidth = maxX - minX + padding * 2;
          const contentHeight = maxY - minY + padding * 2;
          
          // Get the viewport and save original transform
          const viewport = flowchartRef.current.querySelector('.react-flow__viewport') as HTMLElement;
          if (!viewport) {
            throw new Error('Viewport not found');
          }
          
          const originalTransform = viewport.style.transform;
          const container = flowchartRef.current;
          const originalWidth = container.style.width;
          const originalHeight = container.style.height;
          const originalOverflow = container.style.overflow;
          
          // Temporarily resize container and reset viewport to show all content
          container.style.width = `${contentWidth}px`;
          container.style.height = `${contentHeight}px`;
          container.style.overflow = 'visible';
          viewport.style.transform = `translate(${-minX + padding}px, ${-minY + padding}px) scale(1)`;
          
          // Wait for reflow
          await new Promise(resolve => setTimeout(resolve, 50));
          
          try {
            const pngDataUrl = await toPng(flowchartRef.current, {
              backgroundColor: '#0a0e14',
              pixelRatio: 2,
              width: contentWidth,
              height: contentHeight,
              cacheBust: true,
              filter: (node) => {
                const className = node.className?.toString() || '';
                if (className.includes('react-flow__controls')) return false;
                if (className.includes('react-flow__minimap')) return false;
                return true;
              },
            });
            saveAs(pngDataUrl, `${filename}-flowchart.png`);
          } finally {
            // Restore original state
            viewport.style.transform = originalTransform;
            container.style.width = originalWidth;
            container.style.height = originalHeight;
            container.style.overflow = originalOverflow;
          }
          break;
        }

        case 'svg': {
          if (!flowchartRef.current) {
            throw new Error('Flowchart element not found');
          }
          
          // Calculate bounds from all nodes in flowchart data
          const svgNodeWidth = 300;
          const svgNodeHeight = 120;
          let svgMinX = Infinity, svgMinY = Infinity, svgMaxX = -Infinity, svgMaxY = -Infinity;
          
          for (const node of flowchart.nodes) {
            const pos = node.position || { x: 0, y: 0 };
            svgMinX = Math.min(svgMinX, pos.x);
            svgMinY = Math.min(svgMinY, pos.y);
            svgMaxX = Math.max(svgMaxX, pos.x + svgNodeWidth);
            svgMaxY = Math.max(svgMaxY, pos.y + svgNodeHeight);
          }
          
          if (!isFinite(svgMinX)) {
            svgMinX = 0; svgMinY = 0; svgMaxX = 1200; svgMaxY = 800;
          }
          
          const svgPadding = 60;
          const svgContentWidth = svgMaxX - svgMinX + svgPadding * 2;
          const svgContentHeight = svgMaxY - svgMinY + svgPadding * 2;
          
          // Get the viewport and save original transform
          const svgViewport = flowchartRef.current.querySelector('.react-flow__viewport') as HTMLElement;
          if (!svgViewport) {
            throw new Error('Viewport not found');
          }
          
          const svgOriginalTransform = svgViewport.style.transform;
          const svgContainer = flowchartRef.current;
          const svgOriginalWidth = svgContainer.style.width;
          const svgOriginalHeight = svgContainer.style.height;
          const svgOriginalOverflow = svgContainer.style.overflow;
          
          // Temporarily resize container and reset viewport to show all content
          svgContainer.style.width = `${svgContentWidth}px`;
          svgContainer.style.height = `${svgContentHeight}px`;
          svgContainer.style.overflow = 'visible';
          svgViewport.style.transform = `translate(${-svgMinX + svgPadding}px, ${-svgMinY + svgPadding}px) scale(1)`;
          
          // Wait for reflow
          await new Promise(resolve => setTimeout(resolve, 50));
          
          try {
            const dataUrl = await toSvg(flowchartRef.current, {
              backgroundColor: '#0a0e14',
              width: svgContentWidth,
              height: svgContentHeight,
              cacheBust: true,
              filter: (node) => {
                const className = node.className?.toString() || '';
                if (className.includes('react-flow__controls')) return false;
                if (className.includes('react-flow__minimap')) return false;
                return true;
              },
            });
            saveAs(dataUrl, `${filename}-flowchart.svg`);
          } finally {
            // Restore original state
            svgViewport.style.transform = svgOriginalTransform;
            svgContainer.style.width = svgOriginalWidth;
            svgContainer.style.height = svgOriginalHeight;
            svgContainer.style.overflow = svgOriginalOverflow;
          }
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

        case 'confluence-storage': {
          // Enrich runbooks with more detailed content for documentation
          const enrichedForConfluenceStorage = await enrichFlowchartRunbooks(flowchart);
          setExportProgress('Generating Confluence DOCX...');
          const confluenceDocxBlob = await generateConfluenceDocx(enrichedForConfluenceStorage);
          saveAs(confluenceDocxBlob, `${filename}-confluence.docx`);
          break;
        }

        case 'confluence-wiki': {
          const enrichedForConfluenceWiki = await enrichFlowchartRunbooks(flowchart);
          setExportProgress('Generating wiki markup...');
          const confluenceWiki = generateConfluenceWikiMarkup(enrichedForConfluenceWiki);
          const blob = new Blob([confluenceWiki], { type: 'text/plain;charset=utf-8' });
          saveAs(blob, `${filename}-confluence.txt`);
          break;
        }

        case 'gdocs-html': {
          const enrichedForGdocsHtml = await enrichFlowchartRunbooks(flowchart);
          setExportProgress('Generating DOCX file...');
          const docxBlob = await generateGoogleDocsDocx(enrichedForGdocsHtml);
          saveAs(docxBlob, `${filename}-gdocs.docx`);
          break;
        }

        case 'gdocs-md': {
          const enrichedForGdocsMd = await enrichFlowchartRunbooks(flowchart);
          setExportProgress('Generating markdown...');
          const gdocsMd = generateGoogleDocsMarkdown(enrichedForGdocsMd);
          const blob = new Blob([gdocsMd], { type: 'text/markdown;charset=utf-8' });
          saveAs(blob, `${filename}-gdocs.md`);
          break;
        }
      }

      setIsOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(null);
      setExportProgress(null);
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
    { format: 'confluence-storage' as ExportFormat, icon: BookOpen, label: 'Confluence (DOCX)', desc: 'Import via Word Document', section: 'docs' },
    { format: 'confluence-wiki' as ExportFormat, icon: BookOpen, label: 'Confluence (Wiki)', desc: 'Wiki markup to paste', section: 'docs' },
    { format: 'gdocs-html' as ExportFormat, icon: FileText, label: 'Google Docs (DOCX)', desc: 'Import directly to Google Docs', section: 'docs' },
    { format: 'gdocs-md' as ExportFormat, icon: FileText, label: 'Google Docs (MD)', desc: 'Markdown for import', section: 'docs' },
    { format: 'png' as ExportFormat, icon: Image, label: 'AI Generated PNG', desc: 'Artistic flowchart via Gemini AI', section: 'export' },
    { format: 'screenshot' as ExportFormat, icon: Image, label: 'Export PNG', desc: 'Full flowchart as PNG image', section: 'export' },
    { format: 'svg' as ExportFormat, icon: Image, label: 'Export SVG', desc: 'Full flowchart as vector graphic', section: 'export' },
    { format: 'mermaid' as ExportFormat, icon: Code, label: 'Mermaid Code', desc: 'Diagram syntax (.mmd)', section: 'export' },
    { format: 'markdown' as ExportFormat, icon: FileText, label: 'Runbooks (MD)', desc: 'All runbooks as markdown', section: 'export' },
    { format: 'json' as ExportFormat, icon: FileJson, label: 'JSON Data', desc: 'Raw flowchart data', section: 'export' },
  ];

  return (
    <div ref={menuRef} className="relative flex items-center gap-1">
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
        className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] transition-colors"
        title="Load Project"
      >
        <FolderOpen size={18} />
      </button>

      {/* Export Dropdown */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors text-sm font-medium"
      >
        <Download size={16} />
        <span className="hidden sm:inline">Export</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="fixed top-14 right-2 w-72 max-h-[calc(100vh-4rem)] overflow-y-auto bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg shadow-lg z-[100] animate-fade-in">
          {/* Progress indicator */}
          {exportProgress && (
            <div className="px-4 py-3 bg-[var(--color-bg-tertiary)] border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <Loader2 size={16} className="text-[var(--color-warning)] animate-spin" />
                <span className="text-sm text-[var(--color-warning)]">{exportProgress}</span>
              </div>
            </div>
          )}
          
          {/* Cache indicator */}
          {cachedEnrichedRunbooks && !exportProgress && (
            <div className="px-4 py-2 bg-[var(--color-success)]/10 border-b border-[var(--color-border)]">
              <span className="text-xs text-[var(--color-success)]">✓ Enriched runbooks cached (saves API costs)</span>
            </div>
          )}
          
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

          {/* Documentation Section */}
          <div className="px-3 py-2 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide bg-[var(--color-bg-tertiary)] border-t border-[var(--color-border)]">
            Documentation
          </div>
          {exportOptions.filter(o => o.section === 'docs').map(({ format, icon: Icon, label, desc }) => (
            <button
              key={format}
              onClick={() => handleExport(format)}
              disabled={isExporting !== null}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[var(--color-bg-tertiary)] transition-colors text-left disabled:opacity-50"
            >
              {isExporting === format ? (
                <Loader2 size={18} className="text-[var(--color-warning)] animate-spin" />
              ) : (
                <Icon size={18} className="text-[var(--color-warning)]" />
              )}
              <div>
                <div className="text-sm font-medium text-[var(--color-warning)]">{label}</div>
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
