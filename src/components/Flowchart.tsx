'use client';

import { useCallback, useRef, useMemo, useEffect } from 'react';
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  ConnectionMode,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { nodeTypes } from './FlowchartNode';
import { FlowchartData, FlowNode } from '@/types/schema';

interface FlowchartProps {
  data: FlowchartData;
  onNodeClick?: (node: FlowNode) => void;
  onNodeAction?: (action: 'view' | 'regenerate' | 'delete', node: FlowNode) => void;
  expandedNodes: Set<string>;
  onToggleExpand: (nodeId: string) => void;
  currentPath: string[];
  guidedMode: boolean;
}

function FlowchartInner({ 
  data, 
  onNodeClick, 
  onNodeAction,
  expandedNodes, 
  onToggleExpand,
  currentPath,
  guidedMode 
}: FlowchartProps) {
  const flowRef = useRef<HTMLDivElement>(null);
  const { fitView } = useReactFlow();
  
  // Build parent-child relationships
  const { childrenMap, parentMap } = useMemo(() => {
    const children = new Map<string, string[]>();
    const parents = new Map<string, string[]>();
    
    for (const edge of data.edges) {
      if (!children.has(edge.source)) children.set(edge.source, []);
      children.get(edge.source)!.push(edge.target);
      
      if (!parents.has(edge.target)) parents.set(edge.target, []);
      parents.get(edge.target)!.push(edge.source);
    }
    
    return { childrenMap: children, parentMap: parents };
  }, [data.edges]);
  
  // Get all visible node IDs based on expanded state
  const visibleNodeIds = useMemo(() => {
    if (!guidedMode) {
      // Show all nodes when not in guided mode
      return new Set(data.nodes.map(n => n.id));
    }
    
    const visible = new Set<string>();
    
    // Always show start nodes
    const startNodes = data.nodes.filter(n => n.type === 'start');
    startNodes.forEach(n => visible.add(n.id));
    
    // BFS to find visible nodes based on expanded state
    const queue = [...startNodes.map(n => n.id)];
    
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      visible.add(nodeId);
      
      // If this node is expanded, show its children
      if (expandedNodes.has(nodeId)) {
        const children = childrenMap.get(nodeId) || [];
        children.forEach(childId => {
          if (!visible.has(childId)) {
            queue.push(childId);
          }
        });
      }
    }
    
    // Also show all nodes on the current path
    currentPath.forEach(id => visible.add(id));
    
    return visible;
  }, [data.nodes, guidedMode, expandedNodes, currentPath, childrenMap]);
  
  // Check if a node has hidden children
  const hasHiddenChildren = useCallback((nodeId: string) => {
    const children = childrenMap.get(nodeId) || [];
    return children.some(childId => !visibleNodeIds.has(childId));
  }, [childrenMap, visibleNodeIds]);
  
  // Convert our FlowNode to React Flow Node format
  const initialNodes: Node[] = useMemo(() => 
    data.nodes
      .filter(node => visibleNodeIds.has(node.id))
      .map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position || { x: 0, y: 0 },
        data: {
          ...node,
          onNodeClick,
          onNodeAction,
          isOnPath: currentPath.includes(node.id),
          isExpanded: expandedNodes.has(node.id),
          hasHiddenChildren: hasHiddenChildren(node.id),
          onToggleExpand,
        },
        hidden: !visibleNodeIds.has(node.id),
      })),
    [data.nodes, visibleNodeIds, onNodeClick, onNodeAction, currentPath, expandedNodes, hasHiddenChildren, onToggleExpand]
  );
  
  // Convert our FlowEdge to React Flow Edge format (only show edges between visible nodes)
  const initialEdges: Edge[] = useMemo(() =>
    data.edges
      .filter(edge => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target))
      .map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        type: 'smoothstep',
        animated: currentPath.includes(edge.source) && currentPath.includes(edge.target),
        style: { 
          stroke: currentPath.includes(edge.source) && currentPath.includes(edge.target) 
            ? '#58a6ff' 
            : '#30363d', 
          strokeWidth: currentPath.includes(edge.source) && currentPath.includes(edge.target) ? 3 : 2,
        },
        labelStyle: {
          fill: '#e6edf3',
          fontWeight: 600,
          fontSize: 12,
        },
        labelBgStyle: {
          fill: '#11151c',
          fillOpacity: 0.95,
        },
        labelBgPadding: [8, 4] as [number, number],
        labelBgBorderRadius: 4,
      })),
    [data.edges, visibleNodeIds, currentPath]
  );
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  // Update nodes when data or visibility changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);
  
  // Fit view when nodes change
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.2, duration: 300 });
    }, 100);
    return () => clearTimeout(timer);
  }, [visibleNodeIds, fitView]);
  
  const onNodeClickHandler = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const flowNode = data.nodes.find(n => n.id === node.id);
      if (flowNode && onNodeClick) {
        onNodeClick(flowNode);
      }
    },
    [data.nodes, onNodeClick]
  );

  return (
    <div ref={flowRef} className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClickHandler}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Controls 
          className="!bg-[var(--color-bg-secondary)] !border-[var(--color-border)] !rounded-lg"
          showInteractive={false}
        />
        <MiniMap 
          className="!bg-[var(--color-bg-secondary)] !border-[var(--color-border)] !rounded-lg"
          nodeColor={(node) => {
            const isOnPath = currentPath.includes(node.id);
            if (isOnPath) return '#58a6ff';
            switch (node.type) {
              case 'start': return '#8957e5';
              case 'question': return '#238636';
              case 'runbook': return '#1f6feb';
              case 'end': return '#f85149';
              default: return '#30363d';
            }
          }}
          maskColor="rgba(10, 14, 20, 0.8)"
        />
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1} 
          color="#21262d" 
        />
      </ReactFlow>
    </div>
  );
}

// Wrapper with ReactFlowProvider
export default function Flowchart(props: FlowchartProps) {
  return (
    <ReactFlowProvider>
      <FlowchartInner {...props} />
    </ReactFlowProvider>
  );
}

export type FlowchartRef = HTMLDivElement;
