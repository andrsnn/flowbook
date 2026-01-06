'use client';

import { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { 
  Play, 
  HelpCircle, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock,
  ChevronDown,
  ChevronRight,
  Quote,
  MoreVertical,
  RefreshCw,
  Trash2,
  Eye
} from 'lucide-react';
import { FlowNode, EndStateType } from '@/types/schema';

interface CustomNodeData extends FlowNode {
  onNodeClick?: (node: FlowNode) => void;
  onNodeAction?: (action: 'view' | 'regenerate' | 'expand' | 'delete', node: FlowNode) => void;
  isOnPath?: boolean;
  isExpanded?: boolean;
  hasHiddenChildren?: boolean;
  onToggleExpand?: (nodeId: string) => void;
}

// Node action menu
const NodeMenu = memo(({ node, onAction }: { 
  node: FlowNode; 
  onAction: (action: 'view' | 'regenerate' | 'expand' | 'delete') => void 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="absolute -top-1 -right-1 z-10">
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="p-1 rounded bg-black/50 hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <MoreVertical size={14} className="text-white" />
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 bg-[#1a1f2a] border border-[#30363d] rounded-lg shadow-lg overflow-hidden min-w-[160px]">
          {node.type === 'runbook' && (
            <button
              onClick={(e) => { e.stopPropagation(); onAction('view'); setIsOpen(false); }}
              className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-[#232a38]"
            >
              <Eye size={14} /> View Runbook
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onAction('expand'); setIsOpen(false); }}
            className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-[#232a38] text-blue-400"
          >
            <FileText size={14} /> Expand Details
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onAction('regenerate'); setIsOpen(false); }}
            className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-[#232a38]"
          >
            <RefreshCw size={14} /> Regenerate
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onAction('delete'); setIsOpen(false); }}
            className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-[#232a38] text-red-400"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </div>
  );
});
NodeMenu.displayName = 'NodeMenu';

// Source reference tooltip
const SourceRefBadge = memo(({ sourceRef }: { sourceRef: FlowNode['sourceRef'] }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  if (!sourceRef) return null;
  
  return (
    <div className="relative">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={(e) => { e.stopPropagation(); setShowTooltip(!showTooltip); }}
        className="flex items-center gap-1 text-xs text-white/60 hover:text-white/90 transition-colors mt-2"
      >
        <Quote size={10} />
        <span>Source</span>
      </button>
      {showTooltip && (
        <div className="absolute left-0 top-full mt-2 p-3 bg-[#0a0e14] border border-[#30363d] rounded-lg shadow-xl z-50 w-72">
          <div className="text-xs text-[#8b949e] mb-2">
            {sourceRef.section && <span className="text-[#58a6ff]">{sourceRef.section}</span>}
          </div>
          <blockquote className="text-xs italic text-[#e6edf3] border-l-2 border-[#58a6ff] pl-2 mb-2">
            &ldquo;{sourceRef.quote.length > 150 ? sourceRef.quote.substring(0, 150) + '...' : sourceRef.quote}&rdquo;
          </blockquote>
          <p className="text-xs text-[#8b949e]">
            <span className="text-[#3fb950]">Why:</span> {sourceRef.reasoning}
          </p>
        </div>
      )}
    </div>
  );
});
SourceRefBadge.displayName = 'SourceRefBadge';

// Expand/collapse button
const ExpandButton = memo(({ isExpanded, hasChildren, onClick }: {
  isExpanded: boolean;
  hasChildren: boolean;
  onClick: () => void;
}) => {
  if (!hasChildren) return null;
  
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="absolute -bottom-3 left-1/2 -translate-x-1/2 p-1 rounded-full bg-[#30363d] hover:bg-[#484f58] transition-colors z-10"
    >
      {isExpanded ? (
        <ChevronDown size={14} className="text-white" />
      ) : (
        <ChevronRight size={14} className="text-white" />
      )}
    </button>
  );
});
ExpandButton.displayName = 'ExpandButton';

// Start Node
export const StartNode = memo(({ data }: NodeProps<CustomNodeData>) => {
  const isOnPath = data.isOnPath;
  
  return (
    <div 
      className={`group relative px-6 py-4 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-800 border-2 shadow-lg cursor-pointer transition-all ${
        isOnPath ? 'border-purple-300 shadow-purple-500/40 scale-105' : 'border-purple-400 shadow-purple-500/20 hover:shadow-purple-500/40'
      }`}
      onClick={() => data.onNodeClick?.(data)}
    >
      {data.onNodeAction && <NodeMenu node={data} onAction={(a) => data.onNodeAction!(a, data)} />}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-400/20 rounded-lg">
          <Play size={20} className="text-white" />
        </div>
        <div>
          <div className="font-semibold text-white text-sm">{data.label}</div>
          {data.description && (
            <div className="text-purple-200 text-xs mt-1 max-w-48">{data.description}</div>
          )}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-purple-400 !border-purple-200 !w-3 !h-3"
      />
      <ExpandButton 
        isExpanded={data.isExpanded ?? true} 
        hasChildren={data.hasHiddenChildren ?? false}
        onClick={() => data.onToggleExpand?.(data.id)}
      />
    </div>
  );
});
StartNode.displayName = 'StartNode';

// Question Node
export const QuestionNode = memo(({ data }: NodeProps<CustomNodeData>) => {
  const isOnPath = data.isOnPath;
  
  return (
    <div 
      className={`group relative cursor-pointer`}
      onClick={() => data.onNodeClick?.(data)}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-green-400 !border-green-200 !w-3 !h-3"
      />
      {data.onNodeAction && <NodeMenu node={data} onAction={(a) => data.onNodeAction!(a, data)} />}
      <div className={`px-6 py-4 rounded-2xl bg-gradient-to-br from-green-600 to-green-800 border-2 shadow-lg transition-all min-w-[220px] max-w-[320px] ${
        isOnPath ? 'border-green-300 shadow-green-500/40 scale-105' : 'border-green-400 shadow-green-500/20 group-hover:shadow-green-500/40'
      }`}>
        <div className="flex items-start gap-3">
          <div className="p-2 bg-green-400/20 rounded-lg flex-shrink-0">
            <HelpCircle size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-white text-sm">{data.label}</div>
            {data.question && (
              <div className="text-green-200 text-xs mt-2 leading-relaxed">{data.question}</div>
            )}
            <SourceRefBadge sourceRef={data.sourceRef} />
          </div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="a"
        className="!bg-green-400 !border-green-200 !w-3 !h-3 !left-[30%]"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="b"
        className="!bg-green-400 !border-green-200 !w-3 !h-3 !left-[70%]"
      />
      <ExpandButton 
        isExpanded={data.isExpanded ?? true} 
        hasChildren={data.hasHiddenChildren ?? false}
        onClick={() => data.onToggleExpand?.(data.id)}
      />
    </div>
  );
});
QuestionNode.displayName = 'QuestionNode';

// Answer Node - Shows the selected answer/path choice
export const AnswerNode = memo(({ data }: NodeProps<CustomNodeData>) => {
  const isOnPath = data.isOnPath;
  
  return (
    <div 
      className={`group relative cursor-pointer`}
      onClick={() => data.onNodeClick?.(data)}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-slate-400 !border-slate-200 !w-3 !h-3"
      />
      {data.onNodeAction && <NodeMenu node={data} onAction={(a) => data.onNodeAction!(a, data)} />}
      <div className={`px-4 py-2 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border-2 shadow-md transition-all min-w-[140px] max-w-[240px] ${
        isOnPath ? 'border-slate-300 shadow-slate-500/40 scale-105' : 'border-slate-500 shadow-slate-500/20 group-hover:shadow-slate-500/40'
      }`}>
        <div className="text-center">
          <div className="font-medium text-white text-sm">{data.label}</div>
          {data.description && (
            <div className="text-slate-300 text-xs mt-1">{data.description}</div>
          )}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-slate-400 !border-slate-200 !w-3 !h-3"
      />
      <ExpandButton 
        isExpanded={data.isExpanded ?? true} 
        hasChildren={data.hasHiddenChildren ?? false}
        onClick={() => data.onToggleExpand?.(data.id)}
      />
    </div>
  );
});
AnswerNode.displayName = 'AnswerNode';

// Runbook Node
export const RunbookNode = memo(({ data }: NodeProps<CustomNodeData>) => {
  const isOnPath = data.isOnPath;
  
  return (
    <div 
      className="group relative cursor-pointer"
      onClick={() => data.onNodeClick?.(data)}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-blue-400 !border-blue-200 !w-3 !h-3"
      />
      {data.onNodeAction && <NodeMenu node={data} onAction={(a) => data.onNodeAction!(a, data)} />}
      <div className={`px-6 py-4 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 border-2 shadow-lg transition-all min-w-[200px] max-w-[300px] ${
        isOnPath ? 'border-blue-300 shadow-blue-500/40 scale-105' : 'border-blue-400 shadow-blue-500/20 group-hover:shadow-blue-500/40'
      }`}>
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-400/20 rounded-lg flex-shrink-0">
            <FileText size={20} className="text-white" />
          </div>
          <div>
            <div className="font-semibold text-white text-sm">{data.label}</div>
            {data.description && (
              <div className="text-blue-200 text-xs mt-2 leading-relaxed max-w-48">{data.description}</div>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-blue-300">
          <span className="px-2 py-1 bg-blue-900/50 rounded">Click to view</span>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-blue-400 !border-blue-200 !w-3 !h-3"
      />
      <ExpandButton 
        isExpanded={data.isExpanded ?? true} 
        hasChildren={data.hasHiddenChildren ?? false}
        onClick={() => data.onToggleExpand?.(data.id)}
      />
    </div>
  );
});
RunbookNode.displayName = 'RunbookNode';

// End Node with different state types
export const EndNode = memo(({ data }: NodeProps<CustomNodeData>) => {
  const isOnPath = data.isOnPath;
  
  const stateConfig: Record<EndStateType, { 
    gradient: string; 
    border: string; 
    shadow: string;
    icon: typeof CheckCircle;
    iconBg: string;
  }> = {
    resolved: {
      gradient: 'from-green-600 to-green-800',
      border: isOnPath ? 'border-green-300' : 'border-green-400',
      shadow: isOnPath ? 'shadow-green-500/40 scale-105' : 'shadow-green-500/20 hover:shadow-green-500/40',
      icon: CheckCircle,
      iconBg: 'bg-green-400/20',
    },
    escalate: {
      gradient: 'from-red-600 to-red-800',
      border: isOnPath ? 'border-red-300' : 'border-red-400',
      shadow: isOnPath ? 'shadow-red-500/40 scale-105' : 'shadow-red-500/20 hover:shadow-red-500/40',
      icon: AlertTriangle,
      iconBg: 'bg-red-400/20',
    },
    blocked: {
      gradient: 'from-gray-600 to-gray-800',
      border: isOnPath ? 'border-gray-300' : 'border-gray-400',
      shadow: isOnPath ? 'shadow-gray-500/40 scale-105' : 'shadow-gray-500/20 hover:shadow-gray-500/40',
      icon: XCircle,
      iconBg: 'bg-gray-400/20',
    },
    manual: {
      gradient: 'from-yellow-600 to-yellow-800',
      border: isOnPath ? 'border-yellow-300' : 'border-yellow-400',
      shadow: isOnPath ? 'shadow-yellow-500/40 scale-105' : 'shadow-yellow-500/20 hover:shadow-yellow-500/40',
      icon: Clock,
      iconBg: 'bg-yellow-400/20',
    },
  };
  
  const config = stateConfig[data.endStateType || 'resolved'];
  const Icon = config.icon;
  
  return (
    <div 
      className={`group relative px-6 py-4 rounded-2xl bg-gradient-to-br ${config.gradient} border-2 ${config.border} shadow-lg ${config.shadow} cursor-pointer transition-all`}
      onClick={() => data.onNodeClick?.(data)}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-white/50 !border-white/30 !w-3 !h-3"
      />
      {data.onNodeAction && <NodeMenu node={data} onAction={(a) => data.onNodeAction!(a, data)} />}
      <div className="flex items-center gap-3">
        <div className={`p-2 ${config.iconBg} rounded-lg`}>
          <Icon size={20} className="text-white" />
        </div>
        <div>
          <div className="font-semibold text-white text-sm">{data.label}</div>
          {data.description && (
            <div className="text-white/70 text-xs mt-1 max-w-48">{data.description}</div>
          )}
          <div className="mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-full bg-white/20 text-white`}>
              {data.endStateType || 'resolved'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
EndNode.displayName = 'EndNode';

// Export node types map for React Flow
export const nodeTypes = {
  start: StartNode,
  question: QuestionNode,
  answer: AnswerNode,
  runbook: RunbookNode,
  end: EndNode,
};
