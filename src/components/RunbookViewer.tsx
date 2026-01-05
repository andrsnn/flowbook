'use client';

import { X, FileText, AlertTriangle, Link, Wrench, ChevronRight } from 'lucide-react';
import { GeneratedRunbook, FlowchartData } from '@/types/schema';

interface RunbookViewerProps {
  runbook: GeneratedRunbook;
  flowchart: FlowchartData;
  onClose: () => void;
  onNavigateToRunbook?: (runbookId: string) => void;
}

export default function RunbookViewer({ 
  runbook, 
  flowchart, 
  onClose, 
  onNavigateToRunbook 
}: RunbookViewerProps) {
  const relatedRunbooks = runbook.relatedRunbookIds
    ?.map(id => flowchart.runbooks.find(r => r.id === id))
    .filter(Boolean) as GeneratedRunbook[] | undefined;

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg-secondary)] border-l border-[var(--color-border)]">
      {/* Header */}
      <div className="p-4 border-b border-[var(--color-border)] flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <FileText size={20} className="text-blue-400" />
          </div>
          <div>
            <h2 className="font-semibold text-lg text-[var(--color-text-primary)]">
              {runbook.title}
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              {runbook.description}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-[var(--color-bg-elevated)] rounded-lg transition-colors"
        >
          <X size={20} className="text-[var(--color-text-muted)]" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Prerequisites */}
        {runbook.prerequisites && runbook.prerequisites.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
              <Wrench size={16} className="text-[var(--color-warning)]" />
              Prerequisites
            </h3>
            <ul className="space-y-2">
              {runbook.prerequisites.map((prereq, index) => (
                <li 
                  key={index}
                  className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]"
                >
                  <ChevronRight size={16} className="text-[var(--color-text-muted)] flex-shrink-0 mt-0.5" />
                  {prereq}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Steps */}
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">
            Steps
          </h3>
          <ol className="space-y-4">
            {runbook.steps.map((step) => (
              <li key={step.order} className="relative pl-8">
                {/* Step number */}
                <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-[var(--color-accent-primary)] flex items-center justify-center text-xs font-bold text-white">
                  {step.order}
                </div>
                
                <div className="space-y-2">
                  <p className="font-medium text-[var(--color-text-primary)]">
                    {step.instruction}
                  </p>
                  
                  {step.details && (
                    <p className="text-sm text-[var(--color-text-secondary)] pl-4 border-l-2 border-[var(--color-border)]">
                      {step.details}
                    </p>
                  )}
                  
                  {step.warning && (
                    <div className="flex items-start gap-2 p-3 bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 rounded-lg">
                      <AlertTriangle size={16} className="text-[var(--color-warning)] flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-[var(--color-warning)]">{step.warning}</p>
                    </div>
                  )}
                  
                  {step.toolsRequired && step.toolsRequired.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-[var(--color-text-muted)]">Tools:</span>
                      {step.toolsRequired.map((tool, idx) => (
                        <span 
                          key={idx}
                          className="badge badge-accent text-xs"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Notes */}
        {runbook.notes && runbook.notes.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
              Notes
            </h3>
            <div className="space-y-2">
              {runbook.notes.map((note, index) => (
                <div 
                  key={index}
                  className="p-3 bg-[var(--color-bg-elevated)] rounded-lg text-sm text-[var(--color-text-secondary)] border-l-2 border-[var(--color-info)]"
                >
                  {note}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related Runbooks */}
        {relatedRunbooks && relatedRunbooks.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
              <Link size={16} className="text-[var(--color-accent-primary)]" />
              Related Runbooks
            </h3>
            <div className="space-y-2">
              {relatedRunbooks.map((related) => (
                <button
                  key={related.id}
                  onClick={() => onNavigateToRunbook?.(related.id)}
                  className="w-full p-3 bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-tertiary)] rounded-lg text-left transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-primary)]">
                      {related.title}
                    </span>
                    <ChevronRight size={16} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-accent-primary)]" />
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    {related.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

