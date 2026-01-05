'use client';

import { CheckCircle, Loader2, Circle, GitBranch } from 'lucide-react';
import { AnalysisProgressEvent } from '@/types/schema';

interface AnalysisProgressProps {
  events: AnalysisProgressEvent[];
  currentPercent: number;
}

const stages = [
  { id: 'parsing', label: 'Parsing markdown structure' },
  { id: 'identifying', label: 'Identifying decision points' },
  { id: 'structuring', label: 'Building flowchart structure' },
  { id: 'generating', label: 'Generating runbooks' },
];

export default function AnalysisProgress({ events, currentPercent }: AnalysisProgressProps) {
  const latestEvent = events[events.length - 1];
  const isComplete = latestEvent?.type === 'complete';
  const currentStage = latestEvent?.stage || 'parsing';
  
  // Determine stage status
  const getStageStatus = (stageId: string) => {
    // If analysis is complete, all stages are complete
    if (isComplete) return 'complete';
    
    const stageIndex = stages.findIndex(s => s.id === stageId);
    const currentIndex = stages.findIndex(s => s.id === currentStage);
    
    if (stageIndex < currentIndex) return 'complete';
    if (stageIndex === currentIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-[var(--color-accent-primary)]/20 rounded-full" />
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="48"
              cy="48"
              r="44"
              fill="none"
              stroke="var(--color-accent-primary)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 44}`}
              strokeDashoffset={`${2 * Math.PI * 44 * (1 - currentPercent / 100)}`}
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <GitBranch size={32} className="text-[var(--color-accent-primary)]" />
          </div>
        </div>
        <h2 className="text-xl font-semibold mb-2">Analyzing Runbook</h2>
        <p className="text-[var(--color-text-secondary)]">
          {latestEvent?.message || 'Starting analysis...'}
        </p>
        <div className="text-sm text-[var(--color-accent-primary)] mt-2 font-mono">
          {currentPercent}%
        </div>
      </div>

      {/* Stage Progress */}
      <div className="space-y-3">
        {stages.map((stage, index) => {
          const status = getStageStatus(stage.id);
          
          return (
            <div
              key={stage.id}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                status === 'active' 
                  ? 'bg-[var(--color-accent-primary)]/10 border border-[var(--color-accent-primary)]/30' 
                  : status === 'complete'
                  ? 'bg-[var(--color-success)]/10'
                  : 'opacity-50'
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex-shrink-0">
                {status === 'complete' ? (
                  <CheckCircle size={20} className="text-[var(--color-success)]" />
                ) : status === 'active' ? (
                  <Loader2 size={20} className="text-[var(--color-accent-primary)] animate-spin" />
                ) : (
                  <Circle size={20} className="text-[var(--color-text-muted)]" />
                )}
              </div>
              <div className="flex-1">
                <div className={`text-sm font-medium ${
                  status === 'active' ? 'text-[var(--color-text-primary)]' : 
                  status === 'complete' ? 'text-[var(--color-success)]' : 
                  'text-[var(--color-text-muted)]'
                }`}>
                  {stage.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Log */}
      {events.length > 0 && (
        <div className="mt-6 p-3 bg-[var(--color-bg-primary)] rounded-lg border border-[var(--color-border-subtle)] max-h-32 overflow-y-auto">
          <div className="text-xs font-mono text-[var(--color-text-muted)] space-y-1">
            {events.slice(-5).map((event, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[var(--color-text-muted)]">›</span>
                <span className={
                  event.type === 'error' ? 'text-[var(--color-error)]' :
                  event.type === 'complete' ? 'text-[var(--color-success)]' :
                  'text-[var(--color-text-secondary)]'
                }>
                  {event.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

