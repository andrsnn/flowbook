import Anthropic from '@anthropic-ai/sdk';
import { FlowchartData, FlowNode, FlowEdge, GeneratedRunbook, AnalysisResult, AnalysisProgressEvent } from '@/types/schema';

// Initialize Anthropic client
const getClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set in environment variables. Please add it to your .env.local file.');
  }
  
  if (apiKey === 'sk-ant-your-key-here') {
    throw new Error('Please replace the placeholder API key in .env.local with your actual Anthropic API key');
  }
  
  return new Anthropic({ apiKey });
};

const ANALYSIS_SYSTEM_PROMPT = `You are an expert at analyzing complex technical runbooks and documentation. Your task is to:

1. ANALYZE the markdown runbook to identify:
   - Decision points (questions that determine which path to take)
   - Individual tasks/procedures that can be isolated into simple runbooks
   - Overlapping concepts that appear in multiple places
   - The logical flow between decisions and tasks

2. DECOMPOSE the runbook into:
   - A flowchart of scoping questions (yes/no or multiple choice decisions)
   - Individual simplified runbooks (each is a simple "execute this task" procedure)
   
3. The FLOWCHART should:
   - Start with an entry point
   - Ask scoping questions to narrow down the situation
   - Each question leads to either another question or a specific runbook
   - Minimize conditional logic within individual runbooks
   - Handle edge cases through the flowchart, not within runbooks

4. Each SIMPLIFIED RUNBOOK should:
   - Be focused on ONE specific task
   - Have clear, numbered steps
   - Contain NO conditional branching or debugging
   - Be executable by following steps in order
   - Reference other runbooks if needed (not inline the content)

5. SOURCE REFERENCES (CRITICAL):
   - For EVERY question node, include a sourceRef with:
     - quote: The EXACT text from the original markdown that prompted this question
     - section: The heading/section it came from
     - reasoning: Why this text led to this specific question
   - This helps users understand WHY each question exists

6. END STATES:
   - Use endStateType to categorize endings:
     - "resolved": Issue is fixed, user is unblocked
     - "escalate": Needs engineering/higher tier support
     - "manual": Requires manual intervention or external action
     - "blocked": Cannot proceed, waiting on something external

CRITICAL: The goal is to move ALL reasoning and decision-making into the flowchart, leaving runbooks as pure execution checklists.`;

const OUTPUT_FORMAT = `Return your response as a JSON object with this exact structure:

\`\`\`json
{
  "reasoning": "Your explanation of how you analyzed and decomposed the runbook",
  "flowchart": {
    "nodes": [
      {
        "id": "start",
        "type": "start",
        "label": "Start",
        "description": "Entry point - What issue is the user experiencing?"
      },
      {
        "id": "q1",
        "type": "question",
        "label": "Short question label",
        "question": "Full question text to ask the support person",
        "description": "Context for this decision point",
        "sourceRef": {
          "quote": "Exact quote from the original markdown that led to this question",
          "section": "Section heading this came from",
          "reasoning": "Why this quote implies we need to ask this question"
        }
      },
      {
        "id": "rb1",
        "type": "runbook",
        "label": "Runbook title",
        "runbookId": "runbook-1",
        "description": "Brief description of when to use this"
      },
      {
        "id": "end-resolved",
        "type": "end",
        "label": "Issue Resolved",
        "endStateType": "resolved",
        "description": "User is unblocked"
      },
      {
        "id": "end-escalate",
        "type": "end",
        "label": "Escalate to Engineering",
        "endStateType": "escalate",
        "description": "Issue requires engineering investigation"
      }
    ],
    "edges": [
      {
        "id": "e1",
        "source": "start",
        "target": "q1",
        "label": ""
      },
      {
        "id": "e2",
        "source": "q1",
        "target": "rb1",
        "label": "Yes"
      }
    ],
    "runbooks": [
      {
        "id": "runbook-1",
        "title": "Clear, specific title",
        "description": "When to use this runbook",
        "prerequisites": ["Any required access or tools"],
        "steps": [
          {
            "order": 1,
            "instruction": "Do this specific thing",
            "details": "Additional context if needed",
            "toolsRequired": ["Atlas", "Admin Panel"]
          }
        ],
        "notes": ["Important notes"],
        "relatedRunbookIds": ["runbook-2"],
        "sourceRef": {
          "quote": "Original text this runbook was derived from",
          "section": "Section name",
          "reasoning": "How this became a standalone runbook"
        }
      }
    ],
    "metadata": {
      "title": "Flowchart title",
      "description": "Overall description",
      "version": "1.0"
    }
  }
}
\`\`\`

IMPORTANT: 
- Generate unique IDs for all nodes and edges
- Ensure all runbookIds in nodes match actual runbook IDs
- Every path through the flowchart should eventually reach either a runbook or end node
- Keep question labels short (for display) but include full question text in the question field
- ALWAYS include sourceRef for question nodes - this is critical for transparency
- Use appropriate endStateType for all end nodes`;

export async function analyzeRunbook(markdown: string): Promise<AnalysisResult> {
  console.log('[Anthropic] Starting runbook analysis...');
  console.log(`[Anthropic] Input length: ${markdown.length} characters`);
  
  try {
    const client = getClient();
    
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      system: ANALYSIS_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analyze this runbook and create a decision flowchart with simplified runbooks:

${markdown}

${OUTPUT_FORMAT}`
        }
      ]
    });
    
    console.log('[Anthropic] Response received');
    console.log(`[Anthropic] Stop reason: ${message.stop_reason}`);
    console.log(`[Anthropic] Input tokens: ${message.usage.input_tokens}`);
    console.log(`[Anthropic] Output tokens: ${message.usage.output_tokens}`);
    
    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }
    
    // Parse the JSON response
    const jsonMatch = content.text.match(/```json\n?([\s\S]*?)\n?```/);
    if (!jsonMatch) {
      console.error('[Anthropic] Could not find JSON in response');
      console.log('[Anthropic] Response:', content.text.substring(0, 1000));
      throw new Error('Could not parse JSON from Claude response');
    }
    
    const parsed = JSON.parse(jsonMatch[1]);
    
    // Add positions and depth to nodes using layout algorithm
    const nodesWithPositions = layoutNodes(parsed.flowchart.nodes, parsed.flowchart.edges);
    
    const flowchartData: FlowchartData = {
      nodes: nodesWithPositions,
      edges: parsed.flowchart.edges,
      runbooks: parsed.flowchart.runbooks,
      metadata: {
        ...parsed.flowchart.metadata,
        originalMarkdown: markdown,
        generatedAt: new Date().toISOString(),
      }
    };
    
    console.log('[Anthropic] Analysis complete');
    console.log(`[Anthropic] Generated ${flowchartData.nodes.length} nodes, ${flowchartData.edges.length} edges, ${flowchartData.runbooks.length} runbooks`);
    
    return {
      success: true,
      flowchart: flowchartData,
      reasoning: parsed.reasoning,
    };
    
  } catch (error) {
    console.error('[Anthropic] Error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        return { success: false, error: 'Invalid API key. Please check your ANTHROPIC_API_KEY.' };
      }
      if (error.message.includes('429')) {
        return { success: false, error: 'Rate limited. Please wait a moment and try again.' };
      }
      return { success: false, error: error.message };
    }
    
    return { success: false, error: 'Unknown error occurred during analysis' };
  }
}

// Streaming analysis for progress updates
export async function* analyzeRunbookStream(markdown: string): AsyncGenerator<AnalysisProgressEvent> {
  console.log('[Anthropic] Starting streaming runbook analysis...');
  
  yield {
    type: 'progress',
    stage: 'parsing',
    message: 'Parsing markdown structure...',
    percent: 5,
  };
  
  try {
    const client = getClient();
    
    yield {
      type: 'progress',
      stage: 'identifying',
      message: 'Identifying decision points and procedures...',
      percent: 15,
    };
    
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      system: ANALYSIS_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analyze this runbook and create a decision flowchart with simplified runbooks:

${markdown}

${OUTPUT_FORMAT}`
        }
      ]
    });
    
    let fullText = '';
    let lastPercent = 15;
    
    yield {
      type: 'progress',
      stage: 'structuring',
      message: 'Building flowchart structure...',
      percent: 25,
    };
    
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        fullText += event.delta.text;
        
        // Update progress based on content length (rough estimate)
        const estimatedProgress = Math.min(25 + (fullText.length / 200), 85);
        if (estimatedProgress > lastPercent + 5) {
          lastPercent = estimatedProgress;
          
          // Try to extract partial info for progress updates
          const nodesMatch = fullText.match(/"nodes"\s*:\s*\[/);
          const runbooksMatch = fullText.match(/"runbooks"\s*:\s*\[/);
          
          let detail = 'Processing...';
          if (runbooksMatch) {
            detail = 'Generating runbooks...';
          } else if (nodesMatch) {
            detail = 'Creating flowchart nodes...';
          }
          
          yield {
            type: 'progress',
            stage: 'generating',
            message: detail,
            percent: Math.round(estimatedProgress),
          };
        }
      }
    }
    
    yield {
      type: 'progress',
      stage: 'generating',
      message: 'Finalizing flowchart...',
      percent: 90,
    };
    
    // Parse the complete response
    const jsonMatch = fullText.match(/```json\n?([\s\S]*?)\n?```/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from Claude response');
    }
    
    const parsed = JSON.parse(jsonMatch[1]);
    const nodesWithPositions = layoutNodes(parsed.flowchart.nodes, parsed.flowchart.edges);
    
    const flowchartData: FlowchartData = {
      nodes: nodesWithPositions,
      edges: parsed.flowchart.edges,
      runbooks: parsed.flowchart.runbooks,
      metadata: {
        ...parsed.flowchart.metadata,
        originalMarkdown: markdown,
        generatedAt: new Date().toISOString(),
      }
    };
    
    yield {
      type: 'complete',
      message: `Generated ${flowchartData.nodes.length} nodes and ${flowchartData.runbooks.length} runbooks`,
      percent: 100,
      partialNodes: flowchartData.nodes,
      partialRunbooks: flowchartData.runbooks,
    };
    
  } catch (error) {
    console.error('[Anthropic] Streaming error:', error);
    yield {
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// Hierarchical layout algorithm with better spacing
function layoutNodes(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
  const NODE_WIDTH = 280;
  const NODE_HEIGHT = 120;
  const HORIZONTAL_SPACING = 80;
  const VERTICAL_SPACING = 150;
  
  // Build adjacency list
  const children: Map<string, string[]> = new Map();
  const parents: Map<string, string[]> = new Map();
  
  for (const edge of edges) {
    if (!children.has(edge.source)) children.set(edge.source, []);
    children.get(edge.source)!.push(edge.target);
    
    if (!parents.has(edge.target)) parents.set(edge.target, []);
    parents.get(edge.target)!.push(edge.source);
  }
  
  // Find root nodes (no parents)
  const roots = nodes.filter(n => !parents.has(n.id) || parents.get(n.id)!.length === 0);
  
  // BFS to assign levels (depth)
  const levels: Map<string, number> = new Map();
  const queue: string[] = roots.map(n => n.id);
  roots.forEach(n => levels.set(n.id, 0));
  
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const level = levels.get(nodeId)!;
    
    const nodeChildren = children.get(nodeId) || [];
    for (const childId of nodeChildren) {
      if (!levels.has(childId)) {
        levels.set(childId, level + 1);
        queue.push(childId);
      }
    }
  }
  
  // Group nodes by level
  const nodesByLevel: Map<number, string[]> = new Map();
  for (const [nodeId, level] of levels) {
    if (!nodesByLevel.has(level)) nodesByLevel.set(level, []);
    nodesByLevel.get(level)!.push(nodeId);
  }
  
  // Assign positions with better spacing
  const positions: Map<string, { x: number; y: number }> = new Map();
  const maxLevel = Math.max(...Array.from(levels.values()), 0);
  
  for (let level = 0; level <= maxLevel; level++) {
    const nodesAtLevel = nodesByLevel.get(level) || [];
    const totalWidth = nodesAtLevel.length * NODE_WIDTH + (nodesAtLevel.length - 1) * HORIZONTAL_SPACING;
    const startX = -totalWidth / 2;
    
    nodesAtLevel.forEach((nodeId, index) => {
      positions.set(nodeId, {
        x: startX + index * (NODE_WIDTH + HORIZONTAL_SPACING),
        y: level * (NODE_HEIGHT + VERTICAL_SPACING),
      });
    });
  }
  
  // Apply positions and depth to nodes
  return nodes.map(node => ({
    ...node,
    position: positions.get(node.id) || { x: 0, y: 0 },
    depth: levels.get(node.id) || 0,
    collapsed: (levels.get(node.id) || 0) > 1, // Collapse nodes deeper than level 1
  }));
}

// Generate Mermaid diagram syntax from flowchart data
export function generateMermaidDiagram(flowchart: FlowchartData): string {
  const lines: string[] = ['flowchart TD'];
  
  // Add nodes
  for (const node of flowchart.nodes) {
    const label = node.label.replace(/"/g, "'");
    
    switch (node.type) {
      case 'start':
        lines.push(`    ${node.id}(["🚀 ${label}"])`);
        break;
      case 'question':
        lines.push(`    ${node.id}{"❓ ${label}"}`);
        break;
      case 'runbook':
        lines.push(`    ${node.id}["📋 ${label}"]`);
        break;
      case 'end':
        const emoji = node.endStateType === 'resolved' ? '✅' :
                      node.endStateType === 'escalate' ? '🔺' :
                      node.endStateType === 'blocked' ? '🚫' : '📌';
        lines.push(`    ${node.id}([["${emoji} ${label}"]])`);
        break;
    }
  }
  
  lines.push('');
  
  // Add edges
  for (const edge of flowchart.edges) {
    if (edge.label) {
      lines.push(`    ${edge.source} -->|${edge.label}| ${edge.target}`);
    } else {
      lines.push(`    ${edge.source} --> ${edge.target}`);
    }
  }
  
  lines.push('');
  
  // Add styling
  lines.push('    classDef startNode fill:#8957e5,stroke:#8957e5,color:#fff');
  lines.push('    classDef questionNode fill:#238636,stroke:#238636,color:#fff');
  lines.push('    classDef runbookNode fill:#1f6feb,stroke:#1f6feb,color:#fff');
  lines.push('    classDef endResolved fill:#3fb950,stroke:#3fb950,color:#fff');
  lines.push('    classDef endEscalate fill:#f85149,stroke:#f85149,color:#fff');
  lines.push('    classDef endBlocked fill:#6e7681,stroke:#6e7681,color:#fff');
  lines.push('    classDef endManual fill:#d29922,stroke:#d29922,color:#fff');
  
  // Apply classes
  const startNodes = flowchart.nodes.filter(n => n.type === 'start').map(n => n.id);
  const questionNodes = flowchart.nodes.filter(n => n.type === 'question').map(n => n.id);
  const runbookNodes = flowchart.nodes.filter(n => n.type === 'runbook').map(n => n.id);
  const endResolved = flowchart.nodes.filter(n => n.type === 'end' && n.endStateType === 'resolved').map(n => n.id);
  const endEscalate = flowchart.nodes.filter(n => n.type === 'end' && n.endStateType === 'escalate').map(n => n.id);
  const endBlocked = flowchart.nodes.filter(n => n.type === 'end' && n.endStateType === 'blocked').map(n => n.id);
  const endManual = flowchart.nodes.filter(n => n.type === 'end' && (!n.endStateType || n.endStateType === 'manual')).map(n => n.id);
  
  if (startNodes.length) lines.push(`    class ${startNodes.join(',')} startNode`);
  if (questionNodes.length) lines.push(`    class ${questionNodes.join(',')} questionNode`);
  if (runbookNodes.length) lines.push(`    class ${runbookNodes.join(',')} runbookNode`);
  if (endResolved.length) lines.push(`    class ${endResolved.join(',')} endResolved`);
  if (endEscalate.length) lines.push(`    class ${endEscalate.join(',')} endEscalate`);
  if (endBlocked.length) lines.push(`    class ${endBlocked.join(',')} endBlocked`);
  if (endManual.length) lines.push(`    class ${endManual.join(',')} endManual`);
  
  return lines.join('\n');
}

// Generate markdown export of all runbooks
export function generateRunbooksMarkdown(flowchart: FlowchartData): string {
  const lines: string[] = [];
  
  lines.push(`# ${flowchart.metadata.title}`);
  lines.push('');
  lines.push(flowchart.metadata.description);
  lines.push('');
  lines.push(`*Generated: ${new Date(flowchart.metadata.generatedAt).toLocaleString()}*`);
  lines.push('');
  lines.push('---');
  lines.push('');
  
  for (const runbook of flowchart.runbooks) {
    lines.push(`## ${runbook.title}`);
    lines.push('');
    lines.push(runbook.description);
    lines.push('');
    
    if (runbook.sourceRef) {
      lines.push('> **Source:** ' + runbook.sourceRef.quote.substring(0, 100) + '...');
      lines.push('');
    }
    
    if (runbook.prerequisites && runbook.prerequisites.length > 0) {
      lines.push('### Prerequisites');
      lines.push('');
      for (const prereq of runbook.prerequisites) {
        lines.push(`- ${prereq}`);
      }
      lines.push('');
    }
    
    lines.push('### Steps');
    lines.push('');
    for (const step of runbook.steps) {
      lines.push(`${step.order}. **${step.instruction}**`);
      if (step.details) {
        lines.push(`   - ${step.details}`);
      }
      if (step.warning) {
        lines.push(`   - ⚠️ ${step.warning}`);
      }
      if (step.toolsRequired && step.toolsRequired.length > 0) {
        lines.push(`   - Tools: ${step.toolsRequired.join(', ')}`);
      }
    }
    lines.push('');
    
    if (runbook.notes && runbook.notes.length > 0) {
      lines.push('### Notes');
      lines.push('');
      for (const note of runbook.notes) {
        lines.push(`> ${note}`);
      }
      lines.push('');
    }
    
    if (runbook.relatedRunbookIds && runbook.relatedRunbookIds.length > 0) {
      const relatedTitles = runbook.relatedRunbookIds
        .map(id => flowchart.runbooks.find(r => r.id === id)?.title)
        .filter(Boolean);
      if (relatedTitles.length > 0) {
        lines.push(`**Related:** ${relatedTitles.join(', ')}`);
        lines.push('');
      }
    }
    
    lines.push('---');
    lines.push('');
  }
  
  return lines.join('\n');
}

// Regenerate a single node (question or runbook)
export async function regenerateNode(
  nodeId: string, 
  flowchart: FlowchartData, 
  feedback?: string
): Promise<{ node?: FlowNode; runbook?: GeneratedRunbook; error?: string }> {
  const node = flowchart.nodes.find(n => n.id === nodeId);
  if (!node) {
    return { error: 'Node not found' };
  }
  
  try {
    const client = getClient();
    
    const context = `Original flowchart context:
Title: ${flowchart.metadata.title}
Description: ${flowchart.metadata.description}

Current node to regenerate:
- ID: ${node.id}
- Type: ${node.type}
- Label: ${node.label}
- Description: ${node.description || 'N/A'}
${node.question ? `- Question: ${node.question}` : ''}
${node.sourceRef ? `- Source quote: "${node.sourceRef.quote}"` : ''}

${feedback ? `User feedback: ${feedback}` : ''}

Original markdown excerpt that may be relevant:
${flowchart.metadata.originalMarkdown.substring(0, 2000)}`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `Regenerate this ${node.type} node with improved content. Keep the same ID.

${context}

Return JSON only:
\`\`\`json
{
  "node": {
    "id": "${node.id}",
    "type": "${node.type}",
    "label": "Improved short label",
    "description": "Improved description",
    ${node.type === 'question' ? '"question": "Improved full question",' : ''}
    ${node.type === 'question' ? '"sourceRef": { "quote": "...", "section": "...", "reasoning": "..." },' : ''}
    ${node.type === 'runbook' ? `"runbookId": "${node.runbookId}",` : ''}
    ${node.type === 'end' ? `"endStateType": "${node.endStateType || 'resolved'}",` : ''}
  }
  ${node.type === 'runbook' && node.runbookId ? `, "runbook": { ... full runbook object ... }` : ''}
}
\`\`\``
        }
      ]
    });
    
    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response');
    }
    
    const jsonMatch = content.text.match(/```json\n?([\s\S]*?)\n?```/);
    if (!jsonMatch) {
      throw new Error('Could not parse response');
    }
    
    const result = JSON.parse(jsonMatch[1]);
    return {
      node: { ...result.node, position: node.position, depth: node.depth },
      runbook: result.runbook,
    };
    
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to regenerate' };
  }
}
