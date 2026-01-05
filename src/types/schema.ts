// Flowchart node types
export type NodeType = 'start' | 'question' | 'runbook' | 'end';
export type EndStateType = 'resolved' | 'escalate' | 'manual' | 'blocked';

export interface SourceReference {
  quote: string;        // Exact quote from original markdown
  section?: string;     // Section heading it came from
  reasoning: string;    // Why this led to this question/node
}

export interface FlowNode {
  id: string;
  type: NodeType;
  label: string;
  description?: string;
  // For question nodes
  question?: string;
  sourceRef?: SourceReference;  // Where this question came from
  // For runbook nodes
  runbookId?: string;
  // For end nodes
  endStateType?: EndStateType;
  // Position (set by layout algorithm or React Flow)
  position?: { x: number; y: number };
  // UI state
  collapsed?: boolean;
  depth?: number;  // Distance from start node
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string; // e.g., "Yes", "No", or condition text
  type?: 'default' | 'success' | 'failure';
}

export interface GeneratedRunbook {
  id: string;
  title: string;
  description: string;
  steps: RunbookStep[];
  prerequisites?: string[];
  notes?: string[];
  relatedRunbookIds?: string[];
  sourceRef?: SourceReference;  // Where this runbook content came from
}

export interface RunbookStep {
  order: number;
  instruction: string;
  details?: string;
  warning?: string;
  toolsRequired?: string[];
}

export interface FlowchartData {
  nodes: FlowNode[];
  edges: FlowEdge[];
  runbooks: GeneratedRunbook[];
  metadata: {
    title: string;
    description: string;
    originalMarkdown: string;
    generatedAt: string;
    version: string;
  };
}

export interface AnalysisResult {
  success: boolean;
  flowchart?: FlowchartData;
  error?: string;
  reasoning?: string;
}

export interface FlowchartImageResult {
  success: boolean;
  imageBase64?: string;
  mimeType?: string;
  error?: string;
}

// Streaming progress events
export interface AnalysisProgressEvent {
  type: 'progress' | 'complete' | 'error';
  stage?: 'parsing' | 'identifying' | 'structuring' | 'generating';
  message: string;
  detail?: string;
  percent?: number;
  // Partial data as it's generated
  partialNodes?: FlowNode[];
  partialRunbooks?: GeneratedRunbook[];
}

// App state
export interface AppState {
  inputMarkdown: string;
  isAnalyzing: boolean;
  analysisProgress: AnalysisProgressEvent[];
  flowchartData: FlowchartData | null;
  selectedRunbookId: string | null;
  selectedNodeId: string | null;
  expandedNodes: Set<string>;  // Which nodes are expanded
  guidedMode: boolean;         // Whether we're in guided walk-through mode
  currentPath: string[];       // Current path through the flowchart
  error: string | null;
}

export const DEFAULT_APP_STATE: AppState = {
  inputMarkdown: '',
  isAnalyzing: false,
  analysisProgress: [],
  flowchartData: null,
  selectedRunbookId: null,
  selectedNodeId: null,
  expandedNodes: new Set(),
  guidedMode: true,
  currentPath: [],
  error: null,
};

// Export formats
export type ExportFormat = 'png' | 'svg' | 'mermaid' | 'markdown' | 'json' | 'project';

// Project save format
export interface SavedProject {
  version: string;
  savedAt: string;
  flowchart: FlowchartData;
  uiState?: {
    expandedNodes: string[];
    currentPath: string[];
    guidedMode: boolean;
  };
}
