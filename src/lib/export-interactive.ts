import { FlowchartData, GeneratedRunbook } from '@/types/schema';
import { generateMermaidDiagram } from './anthropic';

/**
 * Generate a Mermaid Live Editor URL
 */
export function generateMermaidLiveUrl(flowchart: FlowchartData): string {
  const mermaidCode = generateMermaidDiagram(flowchart);
  
  // Mermaid Live uses base64 encoded JSON state
  const state = {
    code: mermaidCode,
    mermaid: { theme: 'dark' },
    autoSync: true,
    updateDiagram: true,
  };
  
  const encoded = btoa(JSON.stringify(state));
  return `https://mermaid.live/edit#base64:${encoded}`;
}

/**
 * Generate a self-contained interactive HTML file
 */
export function generateInteractiveHtml(flowchart: FlowchartData): string {
  const mermaidCode = generateMermaidDiagram(flowchart);
  const runbooksJson = JSON.stringify(flowchart.runbooks);
  const nodesJson = JSON.stringify(flowchart.nodes);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${flowchart.metadata.title} - Interactive Flowchart</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    :root {
      --bg-primary: #0a0e14;
      --bg-secondary: #11151c;
      --bg-elevated: #1a1f2a;
      --text-primary: #e6edf3;
      --text-secondary: #8b949e;
      --text-muted: #484f58;
      --accent: #58a6ff;
      --border: #30363d;
      --success: #3fb950;
      --warning: #d29922;
      --error: #f85149;
    }
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    
    header {
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border);
      padding: 1rem 2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    header h1 {
      font-size: 1.25rem;
      font-weight: 600;
    }
    
    header p {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin-top: 0.25rem;
    }
    
    .stats {
      display: flex;
      gap: 1rem;
      font-size: 0.875rem;
      color: var(--text-muted);
    }
    
    .stats span {
      padding: 0.25rem 0.75rem;
      background: var(--bg-elevated);
      border-radius: 999px;
    }
    
    main {
      flex: 1;
      display: flex;
      overflow: hidden;
    }
    
    #flowchart-container {
      flex: 1;
      overflow: auto;
      padding: 2rem;
      display: flex;
      justify-content: center;
      align-items: flex-start;
    }
    
    #flowchart-container svg {
      max-width: 100%;
      height: auto;
    }
    
    /* Make nodes clickable */
    .node { cursor: pointer; }
    .node:hover rect, .node:hover polygon, .node:hover circle {
      filter: brightness(1.2);
    }
    
    #sidebar {
      width: 400px;
      background: var(--bg-secondary);
      border-left: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    }
    
    #sidebar.open {
      transform: translateX(0);
    }
    
    #sidebar-header {
      padding: 1rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
    }
    
    #sidebar-header h2 {
      font-size: 1.125rem;
      font-weight: 600;
    }
    
    #sidebar-header p {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin-top: 0.25rem;
    }
    
    #close-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 0.5rem;
    }
    
    #close-btn:hover {
      background: var(--bg-elevated);
      color: var(--text-primary);
    }
    
    #sidebar-content {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
    }
    
    .section {
      margin-bottom: 1.5rem;
    }
    
    .section h3 {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.75rem;
    }
    
    .prereq-list, .notes-list {
      list-style: none;
    }
    
    .prereq-list li, .notes-list li {
      padding: 0.5rem 0.75rem;
      background: var(--bg-elevated);
      border-radius: 0.5rem;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }
    
    .step {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    
    .step-number {
      width: 1.5rem;
      height: 1.5rem;
      background: var(--accent);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 700;
      flex-shrink: 0;
    }
    
    .step-content {
      flex: 1;
    }
    
    .step-instruction {
      font-weight: 500;
      margin-bottom: 0.25rem;
    }
    
    .step-details {
      font-size: 0.875rem;
      color: var(--text-secondary);
      padding-left: 0.75rem;
      border-left: 2px solid var(--border);
      margin-top: 0.5rem;
    }
    
    .step-warning {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.75rem;
      background: rgba(248, 81, 73, 0.1);
      border: 1px solid rgba(248, 81, 73, 0.3);
      border-radius: 0.5rem;
      margin-top: 0.5rem;
      font-size: 0.875rem;
      color: var(--error);
    }
    
    .tools {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    
    .tool-badge {
      padding: 0.25rem 0.5rem;
      background: rgba(88, 166, 255, 0.15);
      color: var(--accent);
      border-radius: 999px;
      font-size: 0.75rem;
    }
    
    .source-ref {
      padding: 1rem;
      background: var(--bg-primary);
      border-radius: 0.5rem;
      border-left: 3px solid var(--accent);
    }
    
    .source-ref blockquote {
      font-style: italic;
      color: var(--text-primary);
      margin-bottom: 0.5rem;
    }
    
    .source-ref .reasoning {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }
    
    #empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--text-muted);
      text-align: center;
      padding: 2rem;
    }
    
    #empty-state svg {
      width: 48px;
      height: 48px;
      margin-bottom: 1rem;
      opacity: 0.5;
    }
    
    /* End state badges */
    .end-state {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.75rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 500;
      margin-top: 0.5rem;
    }
    
    .end-state.resolved { background: rgba(63, 185, 80, 0.15); color: var(--success); }
    .end-state.escalate { background: rgba(248, 81, 73, 0.15); color: var(--error); }
    .end-state.manual { background: rgba(210, 153, 34, 0.15); color: var(--warning); }
    .end-state.blocked { background: rgba(110, 118, 129, 0.15); color: var(--text-muted); }
    
    /* Instructions banner */
    .instructions {
      background: var(--bg-elevated);
      padding: 0.75rem 2rem;
      text-align: center;
      font-size: 0.875rem;
      color: var(--text-secondary);
      border-bottom: 1px solid var(--border);
    }
    
    .instructions strong {
      color: var(--accent);
    }
    
    @media (max-width: 768px) {
      main { flex-direction: column; }
      #sidebar { 
        width: 100%; 
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: 50vh;
        transform: translateY(100%);
        border-left: none;
        border-top: 1px solid var(--border);
      }
      #sidebar.open { transform: translateY(0); }
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>${escapeHtml(flowchart.metadata.title)}</h1>
      <p>${escapeHtml(flowchart.metadata.description)}</p>
    </div>
    <div class="stats">
      <span>${flowchart.nodes.length} nodes</span>
      <span>${flowchart.runbooks.length} runbooks</span>
    </div>
  </header>
  
  <div class="instructions">
    <strong>Click on any node</strong> to view details. Blue nodes are runbooks with step-by-step instructions.
  </div>
  
  <main>
    <div id="flowchart-container">
      <pre class="mermaid">
${mermaidCode}
      </pre>
    </div>
    
    <aside id="sidebar">
      <div id="sidebar-header">
        <div>
          <h2 id="sidebar-title">Select a node</h2>
          <p id="sidebar-description">Click on a node in the flowchart to view details</p>
        </div>
        <button id="close-btn" onclick="closeSidebar()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div id="sidebar-content">
        <div id="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <p>Click on a node to view its details</p>
        </div>
        <div id="node-content" style="display: none;"></div>
      </div>
    </aside>
  </main>

  <script>
    // Data
    const runbooks = ${runbooksJson};
    const nodes = ${nodesJson};
    
    // Initialize Mermaid
    mermaid.initialize({
      startOnLoad: true,
      theme: 'dark',
      themeVariables: {
        primaryColor: '#1f6feb',
        primaryTextColor: '#e6edf3',
        primaryBorderColor: '#30363d',
        lineColor: '#30363d',
        secondaryColor: '#238636',
        tertiaryColor: '#8957e5',
      },
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
      },
    });
    
    // Wait for Mermaid to render, then add click handlers
    setTimeout(() => {
      document.querySelectorAll('.node').forEach(node => {
        node.addEventListener('click', () => {
          const nodeId = node.id.replace('flowchart-', '').split('-')[0];
          showNodeDetails(nodeId);
        });
      });
    }, 1000);
    
    function showNodeDetails(nodeId) {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;
      
      const sidebar = document.getElementById('sidebar');
      const title = document.getElementById('sidebar-title');
      const description = document.getElementById('sidebar-description');
      const content = document.getElementById('node-content');
      const empty = document.getElementById('empty-state');
      
      sidebar.classList.add('open');
      title.textContent = node.label;
      description.textContent = node.description || '';
      empty.style.display = 'none';
      content.style.display = 'block';
      
      let html = '';
      
      // Question node with source reference
      if (node.type === 'question') {
        if (node.question) {
          html += '<div class="section"><h3>Question</h3><p style="font-size: 1rem; color: var(--text-primary);">' + escapeHtml(node.question) + '</p></div>';
        }
        if (node.sourceRef) {
          html += '<div class="section"><h3>Source Reference</h3><div class="source-ref">';
          html += '<blockquote>"' + escapeHtml(node.sourceRef.quote.substring(0, 200)) + (node.sourceRef.quote.length > 200 ? '...' : '') + '"</blockquote>';
          if (node.sourceRef.section) {
            html += '<p style="font-size: 0.75rem; color: var(--accent); margin-bottom: 0.5rem;">From: ' + escapeHtml(node.sourceRef.section) + '</p>';
          }
          html += '<p class="reasoning"><strong>Why this question:</strong> ' + escapeHtml(node.sourceRef.reasoning) + '</p>';
          html += '</div></div>';
        }
      }
      
      // End node
      if (node.type === 'end') {
        const stateLabels = { resolved: '✅ Resolved', escalate: '🔺 Escalate', manual: '⏱ Manual', blocked: '🚫 Blocked' };
        const state = node.endStateType || 'resolved';
        html += '<div class="end-state ' + state + '">' + stateLabels[state] + '</div>';
      }
      
      // Runbook node
      if (node.type === 'runbook' && node.runbookId) {
        const runbook = runbooks.find(r => r.id === node.runbookId);
        if (runbook) {
          if (runbook.prerequisites && runbook.prerequisites.length > 0) {
            html += '<div class="section"><h3>Prerequisites</h3><ul class="prereq-list">';
            runbook.prerequisites.forEach(p => {
              html += '<li>' + escapeHtml(p) + '</li>';
            });
            html += '</ul></div>';
          }
          
          html += '<div class="section"><h3>Steps</h3>';
          runbook.steps.forEach(step => {
            html += '<div class="step">';
            html += '<div class="step-number">' + step.order + '</div>';
            html += '<div class="step-content">';
            html += '<div class="step-instruction">' + escapeHtml(step.instruction) + '</div>';
            if (step.details) {
              html += '<div class="step-details">' + escapeHtml(step.details) + '</div>';
            }
            if (step.warning) {
              html += '<div class="step-warning">⚠️ ' + escapeHtml(step.warning) + '</div>';
            }
            if (step.toolsRequired && step.toolsRequired.length > 0) {
              html += '<div class="tools">';
              step.toolsRequired.forEach(t => {
                html += '<span class="tool-badge">' + escapeHtml(t) + '</span>';
              });
              html += '</div>';
            }
            html += '</div></div>';
          });
          html += '</div>';
          
          if (runbook.notes && runbook.notes.length > 0) {
            html += '<div class="section"><h3>Notes</h3><ul class="notes-list">';
            runbook.notes.forEach(n => {
              html += '<li>' + escapeHtml(n) + '</li>';
            });
            html += '</ul></div>';
          }
        }
      }
      
      content.innerHTML = html || '<p style="color: var(--text-muted);">No additional details for this node.</p>';
    }
    
    function closeSidebar() {
      document.getElementById('sidebar').classList.remove('open');
    }
    
    function escapeHtml(text) {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  </script>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate Confluence compatible DOCX file
 * This format can be directly imported via Confluence's "Import Word Document" feature
 */
export async function generateConfluenceDocx(flowchart: FlowchartData): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } = await import('docx');
  
  const mermaidCode = generateMermaidDiagram(flowchart);
  
  // Helper to create a styled paragraph
  const createParagraph = (text: string, options: { bold?: boolean; italic?: boolean; size?: number; color?: string } = {}) => {
    return new Paragraph({
      children: [
        new TextRun({
          text,
          bold: options.bold,
          italics: options.italic,
          size: options.size || 24,
          color: options.color,
        }),
      ],
    });
  };
  
  type DocElement = InstanceType<typeof Paragraph> | InstanceType<typeof Table>;
  
  const children: DocElement[] = [
    // Title
    new Paragraph({
      text: flowchart.metadata.title,
      heading: HeadingLevel.TITLE,
    }),
    
    // Description
    createParagraph(flowchart.metadata.description),
    createParagraph(
      `Generated: ${new Date(flowchart.metadata.generatedAt).toLocaleString()} • ${flowchart.nodes.length} nodes • ${flowchart.runbooks.length} runbooks`,
      { italic: true, color: '666666' }
    ),
    new Paragraph({ text: '' }),
    
    // Confluence tip
    createParagraph(
      '💡 After importing to Confluence: Select each runbook section and use Insert → Expand macro to make sections collapsible.',
      { italic: true, color: '0052CC' }
    ),
    new Paragraph({ text: '' }),
  ];
  
  // Flowchart Diagram Section
  children.push(new Paragraph({
    text: 'Flowchart Diagram',
    heading: HeadingLevel.HEADING_1,
  }));
  
  children.push(createParagraph('Copy this Mermaid code into a Mermaid macro (or paste at mermaid.live):'));
  children.push(new Paragraph({ text: '' }));
  
  // Mermaid code as monospace
  for (const line of mermaidCode.split('\n')) {
    children.push(new Paragraph({
      children: [
        new TextRun({
          text: line,
          font: 'Courier New',
          size: 20,
        }),
      ],
    }));
  }
  children.push(new Paragraph({ text: '' }));
  
  // Decision Points Section
  children.push(new Paragraph({
    text: 'Decision Points',
    heading: HeadingLevel.HEADING_1,
  }));
  
  const questionNodes = flowchart.nodes.filter(n => n.type === 'question');
  for (const node of questionNodes) {
    children.push(new Paragraph({
      text: node.label,
      heading: HeadingLevel.HEADING_2,
    }));
    children.push(createParagraph(node.description || node.question || ''));
    if (node.sourceRef) {
      children.push(createParagraph(
        `"${node.sourceRef.quote.substring(0, 200)}${node.sourceRef.quote.length > 200 ? '...' : ''}"`,
        { italic: true, color: '666666' }
      ));
    }
    children.push(new Paragraph({ text: '' }));
  }
  
  // Runbooks Section
  children.push(new Paragraph({
    text: 'Runbooks',
    heading: HeadingLevel.HEADING_1,
  }));
  
  children.push(createParagraph(
    '📌 TIP: After import, wrap each runbook in an Expand macro for collapsibility.',
    { italic: true, color: '0052CC' }
  ));
  children.push(new Paragraph({ text: '' }));
  
  for (const runbook of flowchart.runbooks) {
    children.push(new Paragraph({
      text: `📋 ${runbook.title}`,
      heading: HeadingLevel.HEADING_2,
    }));
    children.push(createParagraph(runbook.description));
    children.push(new Paragraph({ text: '' }));
    
    // Prerequisites
    if (runbook.prerequisites && runbook.prerequisites.length > 0) {
      children.push(new Paragraph({
        text: 'Prerequisites',
        heading: HeadingLevel.HEADING_3,
      }));
      for (const prereq of runbook.prerequisites) {
        children.push(new Paragraph({
          children: [new TextRun({ text: `• ${prereq}` })],
        }));
      }
      children.push(new Paragraph({ text: '' }));
    }
    
    // Steps
    children.push(new Paragraph({
      text: 'Steps',
      heading: HeadingLevel.HEADING_3,
    }));
    
    for (const step of runbook.steps) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `${step.order}. `, bold: true }),
          new TextRun({ text: step.instruction, bold: true }),
        ],
      }));
      
      if (step.details) {
        children.push(new Paragraph({
          children: [new TextRun({ text: `    ${step.details}`, color: '666666' })],
        }));
      }
      
      if (step.warning) {
        children.push(new Paragraph({
          children: [new TextRun({ text: `    ⚠️ Warning: ${step.warning}`, color: 'DE350B' })],
        }));
      }
      
      if (step.toolsRequired && step.toolsRequired.length > 0) {
        children.push(new Paragraph({
          children: [new TextRun({ text: `    Tools: ${step.toolsRequired.join(', ')}`, italics: true, color: '0052CC' })],
        }));
      }
    }
    children.push(new Paragraph({ text: '' }));
    
    // Notes
    if (runbook.notes && runbook.notes.length > 0) {
      children.push(new Paragraph({
        text: 'Notes',
        heading: HeadingLevel.HEADING_3,
      }));
      for (const note of runbook.notes) {
        children.push(new Paragraph({
          children: [new TextRun({ text: `ℹ️ ${note}`, color: '00875A' })],
        }));
      }
      children.push(new Paragraph({ text: '' }));
    }
    
    // Separator between runbooks
    children.push(new Paragraph({
      children: [new TextRun({ text: '─'.repeat(50), color: 'CCCCCC' })],
    }));
    children.push(new Paragraph({ text: '' }));
  }
  
  // End States Section
  children.push(new Paragraph({
    text: 'End States',
    heading: HeadingLevel.HEADING_1,
  }));
  
  const endNodes = flowchart.nodes.filter(n => n.type === 'end');
  
  const tableRows = [
    new TableRow({
      children: [
        new TableCell({
          children: [createParagraph('State', { bold: true })],
          width: { size: 40, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [createParagraph('Type', { bold: true })],
          width: { size: 20, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [createParagraph('Description', { bold: true })],
          width: { size: 40, type: WidthType.PERCENTAGE },
        }),
      ],
    }),
  ];
  
  for (const node of endNodes) {
    const stateEmoji = node.endStateType === 'resolved' ? '✅' :
                       node.endStateType === 'escalate' ? '🔺' :
                       node.endStateType === 'blocked' ? '🚫' : '📌';
    tableRows.push(new TableRow({
      children: [
        new TableCell({
          children: [createParagraph(`${stateEmoji} ${node.label}`)],
        }),
        new TableCell({
          children: [createParagraph(node.endStateType || 'resolved')],
        }),
        new TableCell({
          children: [createParagraph(node.description || '')],
        }),
      ],
    }));
  }
  
  children.push(new Table({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  }));
  
  // Create the document
  const doc = new Document({
    sections: [{
      properties: {},
      children,
    }],
  });
  
  return await Packer.toBlob(doc);
}

/**
 * Generate Confluence Storage Format (XHTML) with expand macros for collapsible sections
 */
export function generateConfluenceStorageFormat(flowchart: FlowchartData): string {
  const mermaidCode = generateMermaidDiagram(flowchart);
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<ac:confluence xmlns:ac="http://atlassian.com/content" xmlns:ri="http://atlassian.com/resource/identifier">

<h1>${escapeHtml(flowchart.metadata.title)}</h1>
<p>${escapeHtml(flowchart.metadata.description)}</p>
<p><em>Generated: ${new Date(flowchart.metadata.generatedAt).toLocaleString()}</em></p>

<hr/>

<h2>Flowchart Diagram</h2>
<ac:structured-macro ac:name="code">
  <ac:parameter ac:name="language">mermaid</ac:parameter>
  <ac:plain-text-body><![CDATA[${mermaidCode}]]></ac:plain-text-body>
</ac:structured-macro>

<p><strong>Tip:</strong> If Mermaid doesn't render, install the "Mermaid Diagrams for Confluence" app or paste this code into <a href="https://mermaid.live">mermaid.live</a></p>

<hr/>

<h2>Decision Flow Overview</h2>
`;

  // Add nodes overview
  const questionNodes = flowchart.nodes.filter(n => n.type === 'question');
  if (questionNodes.length > 0) {
    xml += `
<ac:structured-macro ac:name="expand">
  <ac:parameter ac:name="title">Decision Points (${questionNodes.length})</ac:parameter>
  <ac:rich-text-body>
    <table>
      <tbody>
        <tr>
          <th>Question</th>
          <th>Description</th>
        </tr>`;
    
    for (const node of questionNodes) {
      xml += `
        <tr>
          <td><strong>${escapeHtml(node.label)}</strong></td>
          <td>${escapeHtml(node.description || node.question || '')}</td>
        </tr>`;
    }
    
    xml += `
      </tbody>
    </table>
  </ac:rich-text-body>
</ac:structured-macro>
`;
  }

  // Add runbooks as collapsible sections
  xml += `
<hr/>

<h2>Runbooks</h2>
`;

  for (const runbook of flowchart.runbooks) {
    xml += `
<ac:structured-macro ac:name="expand">
  <ac:parameter ac:name="title">📋 ${escapeHtml(runbook.title)}</ac:parameter>
  <ac:rich-text-body>
    <p>${escapeHtml(runbook.description)}</p>
`;

    // Prerequisites
    if (runbook.prerequisites && runbook.prerequisites.length > 0) {
      xml += `
    <h3>Prerequisites</h3>
    <ul>`;
      for (const prereq of runbook.prerequisites) {
        xml += `
      <li>${escapeHtml(prereq)}</li>`;
      }
      xml += `
    </ul>
`;
    }

    // Steps
    xml += `
    <h3>Steps</h3>
    <ol>`;
    for (const step of runbook.steps) {
      xml += `
      <li>
        <strong>${escapeHtml(step.instruction)}</strong>`;
      if (step.details) {
        xml += `
        <p>${escapeHtml(step.details)}</p>`;
      }
      if (step.warning) {
        xml += `
        <ac:structured-macro ac:name="warning">
          <ac:rich-text-body><p>${escapeHtml(step.warning)}</p></ac:rich-text-body>
        </ac:structured-macro>`;
      }
      if (step.toolsRequired && step.toolsRequired.length > 0) {
        xml += `
        <p><em>Tools: ${step.toolsRequired.map(t => escapeHtml(t)).join(', ')}</em></p>`;
      }
      xml += `
      </li>`;
    }
    xml += `
    </ol>
`;

    // Notes
    if (runbook.notes && runbook.notes.length > 0) {
      xml += `
    <h3>Notes</h3>
    <ac:structured-macro ac:name="info">
      <ac:rich-text-body>
        <ul>`;
      for (const note of runbook.notes) {
        xml += `
          <li>${escapeHtml(note)}</li>`;
      }
      xml += `
        </ul>
      </ac:rich-text-body>
    </ac:structured-macro>
`;
    }

    xml += `
  </ac:rich-text-body>
</ac:structured-macro>
`;
  }

  // End states
  const endNodes = flowchart.nodes.filter(n => n.type === 'end');
  if (endNodes.length > 0) {
    xml += `
<hr/>

<h2>End States</h2>
<table>
  <tbody>
    <tr>
      <th>State</th>
      <th>Type</th>
      <th>Description</th>
    </tr>`;
    
    for (const node of endNodes) {
      const stateEmoji = node.endStateType === 'resolved' ? '✅' :
                         node.endStateType === 'escalate' ? '🔺' :
                         node.endStateType === 'blocked' ? '🚫' : '📌';
      xml += `
    <tr>
      <td>${stateEmoji} ${escapeHtml(node.label)}</td>
      <td>${escapeHtml(node.endStateType || 'resolved')}</td>
      <td>${escapeHtml(node.description || '')}</td>
    </tr>`;
    }
    
    xml += `
  </tbody>
</table>
`;
  }

  xml += `
</ac:confluence>`;

  return xml;
}

/**
 * Generate Confluence Wiki Markup with {expand} syntax
 */
export function generateConfluenceWikiMarkup(flowchart: FlowchartData): string {
  const mermaidCode = generateMermaidDiagram(flowchart);
  
  let wiki = `h1. ${flowchart.metadata.title}

${flowchart.metadata.description}

_Generated: ${new Date(flowchart.metadata.generatedAt).toLocaleString()}_

----

h2. Flowchart Diagram

{code:language=mermaid}
${mermaidCode}
{code}

{tip}If Mermaid doesn't render, install the "Mermaid Diagrams for Confluence" app or paste this code into [mermaid.live|https://mermaid.live]{tip}

----

h2. Decision Flow Overview

`;

  // Add nodes overview in expand
  const questionNodes = flowchart.nodes.filter(n => n.type === 'question');
  if (questionNodes.length > 0) {
    wiki += `{expand:title=Decision Points (${questionNodes.length})}
||Question||Description||
`;
    for (const node of questionNodes) {
      wiki += `|*${node.label}*|${node.description || node.question || ''}|\n`;
    }
    wiki += `{expand}

`;
  }

  // Runbooks
  wiki += `----

h2. Runbooks

`;

  for (const runbook of flowchart.runbooks) {
    wiki += `{expand:title=📋 ${runbook.title}}
${runbook.description}

`;

    // Prerequisites
    if (runbook.prerequisites && runbook.prerequisites.length > 0) {
      wiki += `h3. Prerequisites
`;
      for (const prereq of runbook.prerequisites) {
        wiki += `* ${prereq}\n`;
      }
      wiki += `
`;
    }

    // Steps
    wiki += `h3. Steps
`;
    for (const step of runbook.steps) {
      wiki += `# *${step.instruction}*\n`;
      if (step.details) {
        wiki += `** ${step.details}\n`;
      }
      if (step.warning) {
        wiki += `{warning}${step.warning}{warning}\n`;
      }
      if (step.toolsRequired && step.toolsRequired.length > 0) {
        wiki += `** _Tools: ${step.toolsRequired.join(', ')}_\n`;
      }
    }
    wiki += `
`;

    // Notes
    if (runbook.notes && runbook.notes.length > 0) {
      wiki += `h3. Notes
{info}
`;
      for (const note of runbook.notes) {
        wiki += `* ${note}\n`;
      }
      wiki += `{info}
`;
    }

    wiki += `{expand}

`;
  }

  // End states
  const endNodes = flowchart.nodes.filter(n => n.type === 'end');
  if (endNodes.length > 0) {
    wiki += `----

h2. End States

||State||Type||Description||
`;
    for (const node of endNodes) {
      const stateEmoji = node.endStateType === 'resolved' ? '✅' :
                         node.endStateType === 'escalate' ? '🔺' :
                         node.endStateType === 'blocked' ? '🚫' : '📌';
      wiki += `|${stateEmoji} ${node.label}|${node.endStateType || 'resolved'}|${node.description || ''}|\n`;
    }
  }

  return wiki;
}

/**
 * Generate Google Docs HTML optimized for Pageless collapsible headings
 */
export function generateGoogleDocsHtml(flowchart: FlowchartData): string {
  const mermaidCode = generateMermaidDiagram(flowchart);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(flowchart.metadata.title)}</title>
  <style>
    body {
      font-family: 'Google Sans', Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      color: #202124;
    }
    h1 { color: #1a73e8; border-bottom: 2px solid #1a73e8; padding-bottom: 0.5rem; }
    h2 { color: #185abc; margin-top: 2rem; border-bottom: 1px solid #dadce0; padding-bottom: 0.25rem; }
    h3 { color: #5f6368; margin-top: 1.5rem; }
    .notice {
      background: #e8f0fe;
      border-left: 4px solid #1a73e8;
      padding: 1rem;
      margin: 1rem 0;
      border-radius: 0 4px 4px 0;
    }
    .warning {
      background: #fce8e6;
      border-left: 4px solid #d93025;
      padding: 0.75rem 1rem;
      margin: 0.5rem 0;
      border-radius: 0 4px 4px 0;
    }
    .mermaid-code {
      background: #f8f9fa;
      border: 1px solid #dadce0;
      border-radius: 4px;
      padding: 1rem;
      overflow-x: auto;
      font-family: 'Roboto Mono', monospace;
      font-size: 0.875rem;
      white-space: pre;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1rem 0;
    }
    th, td {
      border: 1px solid #dadce0;
      padding: 0.75rem;
      text-align: left;
    }
    th {
      background: #f8f9fa;
      font-weight: 500;
    }
    ol { padding-left: 1.5rem; }
    ol li { margin-bottom: 1rem; }
    ul { padding-left: 1.5rem; }
    .step-title { font-weight: 500; }
    .step-details { color: #5f6368; margin-top: 0.25rem; padding-left: 1rem; border-left: 2px solid #dadce0; }
    .tools { color: #1a73e8; font-size: 0.875rem; margin-top: 0.25rem; }
    .prereq-list { background: #f8f9fa; padding: 1rem; border-radius: 4px; }
    .notes { background: #e6f4ea; padding: 1rem; border-radius: 4px; margin-top: 1rem; }
    .end-state { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.875rem; }
    .end-resolved { background: #e6f4ea; color: #137333; }
    .end-escalate { background: #fce8e6; color: #c5221f; }
    .end-manual { background: #fef7e0; color: #b06000; }
    .end-blocked { background: #f1f3f4; color: #5f6368; }
    .metadata { color: #5f6368; font-size: 0.875rem; margin-bottom: 2rem; }
  </style>
</head>
<body>

<div class="notice">
  <strong>💡 Tip:</strong> To enable collapsible sections, go to <strong>File → Page setup → Pageless</strong>. 
  Then hover over any heading to reveal the collapse/expand triangle.
</div>

<h1>${escapeHtml(flowchart.metadata.title)}</h1>

<p class="metadata">
  ${escapeHtml(flowchart.metadata.description)}<br>
  <em>Generated: ${new Date(flowchart.metadata.generatedAt).toLocaleString()}</em> • 
  ${flowchart.nodes.length} nodes • ${flowchart.runbooks.length} runbooks
</p>

<h2>Flowchart Diagram</h2>

<p>Copy this Mermaid code to <a href="https://mermaid.live">mermaid.live</a> to view/edit the diagram:</p>

<div class="mermaid-code">${escapeHtml(mermaidCode)}</div>

<h2>Decision Points</h2>

${flowchart.nodes.filter(n => n.type === 'question').map(node => `
<h3>${escapeHtml(node.label)}</h3>
<p>${escapeHtml(node.description || node.question || '')}</p>
${node.sourceRef ? `<blockquote><em>"${escapeHtml(node.sourceRef.quote.substring(0, 200))}${node.sourceRef.quote.length > 200 ? '...' : ''}"</em></blockquote>` : ''}
`).join('')}

<h2>Runbooks</h2>

${flowchart.runbooks.map(runbook => `
<h3>📋 ${escapeHtml(runbook.title)}</h3>

<p>${escapeHtml(runbook.description)}</p>

${runbook.prerequisites && runbook.prerequisites.length > 0 ? `
<h4>Prerequisites</h4>
<div class="prereq-list">
<ul>
${runbook.prerequisites.map(p => `<li>${escapeHtml(p)}</li>`).join('\n')}
</ul>
</div>
` : ''}

<h4>Steps</h4>
<ol>
${runbook.steps.map(step => `
<li>
  <span class="step-title">${escapeHtml(step.instruction)}</span>
  ${step.details ? `<div class="step-details">${escapeHtml(step.details)}</div>` : ''}
  ${step.warning ? `<div class="warning">⚠️ ${escapeHtml(step.warning)}</div>` : ''}
  ${step.toolsRequired && step.toolsRequired.length > 0 ? `<div class="tools">Tools: ${step.toolsRequired.map(t => escapeHtml(t)).join(', ')}</div>` : ''}
</li>
`).join('')}
</ol>

${runbook.notes && runbook.notes.length > 0 ? `
<div class="notes">
<strong>Notes:</strong>
<ul>
${runbook.notes.map(n => `<li>${escapeHtml(n)}</li>`).join('\n')}
</ul>
</div>
` : ''}
`).join('\n<hr>\n')}

<h2>End States</h2>

<table>
<tr>
  <th>State</th>
  <th>Type</th>
  <th>Description</th>
</tr>
${flowchart.nodes.filter(n => n.type === 'end').map(node => {
  const stateClass = node.endStateType === 'resolved' ? 'end-resolved' :
                     node.endStateType === 'escalate' ? 'end-escalate' :
                     node.endStateType === 'blocked' ? 'end-blocked' : 'end-manual';
  const stateEmoji = node.endStateType === 'resolved' ? '✅' :
                     node.endStateType === 'escalate' ? '🔺' :
                     node.endStateType === 'blocked' ? '🚫' : '📌';
  return `<tr>
  <td>${stateEmoji} ${escapeHtml(node.label)}</td>
  <td><span class="${stateClass}">${escapeHtml(node.endStateType || 'resolved')}</span></td>
  <td>${escapeHtml(node.description || '')}</td>
</tr>`;
}).join('\n')}
</table>

</body>
</html>`;
}

/**
 * Generate Google Docs Markdown with clean heading structure
 */
export function generateGoogleDocsMarkdown(flowchart: FlowchartData): string {
  const mermaidCode = generateMermaidDiagram(flowchart);
  
  let md = `# ${flowchart.metadata.title}

${flowchart.metadata.description}

*Generated: ${new Date(flowchart.metadata.generatedAt).toLocaleString()}* • ${flowchart.nodes.length} nodes • ${flowchart.runbooks.length} runbooks

---

> 💡 **Tip:** To enable collapsible sections in Google Docs, go to **File → Page setup → Pageless**. Then hover over any heading to reveal the collapse/expand triangle.

---

## Flowchart Diagram

Copy this Mermaid code to [mermaid.live](https://mermaid.live) to view/edit the diagram:

\`\`\`mermaid
${mermaidCode}
\`\`\`

---

## Decision Points

`;

  // Decision points
  const questionNodes = flowchart.nodes.filter(n => n.type === 'question');
  for (const node of questionNodes) {
    md += `### ${node.label}

${node.description || node.question || ''}

`;
    if (node.sourceRef) {
      md += `> *"${node.sourceRef.quote.substring(0, 200)}${node.sourceRef.quote.length > 200 ? '...' : ''}"*

`;
    }
  }

  md += `---

## Runbooks

`;

  // Runbooks
  for (const runbook of flowchart.runbooks) {
    md += `### 📋 ${runbook.title}

${runbook.description}

`;

    // Prerequisites
    if (runbook.prerequisites && runbook.prerequisites.length > 0) {
      md += `#### Prerequisites

`;
      for (const prereq of runbook.prerequisites) {
        md += `- ${prereq}\n`;
      }
      md += `
`;
    }

    // Steps
    md += `#### Steps

`;
    for (const step of runbook.steps) {
      md += `${step.order}. **${step.instruction}**\n`;
      if (step.details) {
        md += `   - ${step.details}\n`;
      }
      if (step.warning) {
        md += `   - ⚠️ **Warning:** ${step.warning}\n`;
      }
      if (step.toolsRequired && step.toolsRequired.length > 0) {
        md += `   - *Tools: ${step.toolsRequired.join(', ')}*\n`;
      }
    }
    md += `
`;

    // Notes
    if (runbook.notes && runbook.notes.length > 0) {
      md += `#### Notes

`;
      for (const note of runbook.notes) {
        md += `- ${note}\n`;
      }
      md += `
`;
    }

    md += `---

`;
  }

  // End states
  md += `## End States

| State | Type | Description |
|-------|------|-------------|
`;

  const endNodes = flowchart.nodes.filter(n => n.type === 'end');
  for (const node of endNodes) {
    const stateEmoji = node.endStateType === 'resolved' ? '✅' :
                       node.endStateType === 'escalate' ? '🔺' :
                       node.endStateType === 'blocked' ? '🚫' : '📌';
    md += `| ${stateEmoji} ${node.label} | ${node.endStateType || 'resolved'} | ${node.description || ''} |\n`;
  }

  return md;
}

/**
 * Generate Google Docs compatible DOCX file
 * This format produces a professional two-part guide with:
 * - Part 1: Diagnostic Decision Tree with internal links
 * - Part 2: Named Resolution Runbooks (A, B, C...)
 */
export async function generateGoogleDocsDocx(flowchart: FlowchartData): Promise<Blob> {
  const { 
    Document, 
    Packer, 
    Paragraph, 
    TextRun, 
    HeadingLevel, 
    Table, 
    TableRow, 
    TableCell, 
    WidthType, 
    Bookmark,
    InternalHyperlink,
    AlignmentType,
    convertInchesToTwip,
  } = await import('docx');
  
  const mermaidCode = generateMermaidDiagram(flowchart);
  
  // Generate letter names for runbooks (A, B, C, ..., Z, AA, AB, ...)
  const getRunbookLetter = (index: number): string => {
    let result = '';
    let n = index;
    while (n >= 0) {
      result = String.fromCharCode(65 + (n % 26)) + result;
      n = Math.floor(n / 26) - 1;
    }
    return result;
  };
  
  // Create a map of runbook IDs to their letter names and bookmark IDs
  const runbookMap = new Map<string, { letter: string; bookmarkId: string; title: string }>();
  flowchart.runbooks.forEach((runbook, index) => {
    const letter = getRunbookLetter(index);
    runbookMap.set(runbook.id, {
      letter,
      bookmarkId: `runbook-${letter.toLowerCase()}`,
      title: runbook.title,
    });
  });
  
  // Build adjacency list for graph traversal
  const childEdges = new Map<string, Array<{ target: string; label: string }>>();
  for (const edge of flowchart.edges) {
    if (!childEdges.has(edge.source)) {
      childEdges.set(edge.source, []);
    }
    childEdges.get(edge.source)!.push({ target: edge.target, label: edge.label || '' });
  }
  
  // Find start node
  const startNode = flowchart.nodes.find(n => n.type === 'start');
  
  // Build decision tree structure by traversing the graph
  interface DecisionBranch {
    node: typeof flowchart.nodes[0];
    children: Array<{
      answer: string;
      targetNode: typeof flowchart.nodes[0] | undefined;
      runbookInfo?: { letter: string; bookmarkId: string; title: string };
    }>;
  }
  
  // Collect questions in order (BFS from start)
  const orderedQuestions: DecisionBranch[] = [];
  const visitedNodes = new Set<string>();
  const queue: string[] = startNode ? [startNode.id] : [];
  
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visitedNodes.has(nodeId)) continue;
    visitedNodes.add(nodeId);
    
    const node = flowchart.nodes.find(n => n.id === nodeId);
    if (!node) continue;
    
    // Process question nodes
    if (node.type === 'question') {
      const branch: DecisionBranch = { node, children: [] };
      const edges = childEdges.get(nodeId) || [];
      
      for (const edge of edges) {
        const targetNode = flowchart.nodes.find(n => n.id === edge.target);
        
        // Check if this leads to a runbook
        let runbookInfo: { letter: string; bookmarkId: string; title: string } | undefined;
        if (targetNode?.type === 'runbook' && targetNode.runbookId) {
          runbookInfo = runbookMap.get(targetNode.runbookId);
        } else if (targetNode?.type === 'answer') {
          // Check if the answer leads to a runbook
          const answerEdges = childEdges.get(targetNode.id) || [];
          for (const answerEdge of answerEdges) {
            const nextNode = flowchart.nodes.find(n => n.id === answerEdge.target);
            if (nextNode?.type === 'runbook' && nextNode.runbookId) {
              runbookInfo = runbookMap.get(nextNode.runbookId);
            }
          }
        }
        
        branch.children.push({
          answer: edge.label || targetNode?.label || '',
          targetNode,
          runbookInfo,
        });
        
        if (targetNode) {
          queue.push(targetNode.id);
        }
      }
      
      orderedQuestions.push(branch);
    } else {
      // Continue traversal for non-question nodes
      const edges = childEdges.get(nodeId) || [];
      for (const edge of edges) {
        queue.push(edge.target);
      }
    }
  }
  
  // Group questions by their categorical context (first question splits)
  const categorizedQuestions = new Map<string, DecisionBranch[]>();
  let currentCategory = 'General';
  
  for (const branch of orderedQuestions) {
    // Detect category-defining questions
    const labelLower = branch.node.label.toLowerCase();
    if (labelLower.includes('type') || labelLower.includes('who') || labelLower.includes('user')) {
      // This is likely a categorical split - use children as categories
      for (const child of branch.children) {
        if (child.answer) {
          currentCategory = child.answer;
          if (!categorizedQuestions.has(currentCategory)) {
            categorizedQuestions.set(currentCategory, []);
          }
        }
      }
    }
    
    if (!categorizedQuestions.has(currentCategory)) {
      categorizedQuestions.set(currentCategory, []);
    }
    categorizedQuestions.get(currentCategory)!.push(branch);
  }
  
  // Default font for the document
  const FONT = 'Calibri';
  const FONT_SIZE_BODY = 24; // 12pt
  const FONT_SIZE_SMALL = 20; // 10pt
  
  type DocElement = InstanceType<typeof Paragraph> | InstanceType<typeof Table>;
  
  // Helper to create styled paragraphs with Calibri font
  const createParagraph = (text: string, options: { 
    bold?: boolean; 
    italic?: boolean; 
    size?: number; 
    color?: string;
    spacing?: { before?: number; after?: number };
  } = {}): InstanceType<typeof Paragraph> => {
    return new Paragraph({
      children: [
        new TextRun({
          text,
          font: FONT,
          bold: options.bold,
          italics: options.italic,
          size: options.size || FONT_SIZE_BODY,
          color: options.color,
        }),
      ],
      spacing: options.spacing,
    });
  };
  
  // Helper to create bullet point with optional internal link
  const createBulletWithLink = (
    prefix: string, 
    linkText: string, 
    bookmarkId: string,
    suffix?: string
  ): InstanceType<typeof Paragraph> => {
    const children: (InstanceType<typeof TextRun> | InstanceType<typeof InternalHyperlink>)[] = [
      new TextRun({ text: `• ${prefix}`, font: FONT, size: FONT_SIZE_BODY }),
    ];
    
    children.push(
      new InternalHyperlink({
        anchor: bookmarkId,
        children: [
          new TextRun({
            text: linkText,
            font: FONT,
            size: FONT_SIZE_BODY,
            color: '1155CC',
            underline: { type: 'single' as const },
          }),
        ],
      })
    );
    
    if (suffix) {
      children.push(new TextRun({ text: suffix, font: FONT, size: FONT_SIZE_BODY }));
    }
    
    return new Paragraph({ 
      children,
      indent: { left: convertInchesToTwip(0.25) },
    });
  };
  
  // Helper to create a simple bullet point
  const createBullet = (text: string, indent: number = 0.25): InstanceType<typeof Paragraph> => {
    return new Paragraph({
      children: [
        new TextRun({ text: `• ${text}`, font: FONT, size: FONT_SIZE_BODY }),
      ],
      indent: { left: convertInchesToTwip(indent) },
    });
  };
  
  // Helper to create sub-bullet with circle marker
  const createSubBullet = (text: string): InstanceType<typeof Paragraph> => {
    return new Paragraph({
      children: [
        new TextRun({ text: `○ ${text}`, font: FONT, size: FONT_SIZE_BODY }),
      ],
      indent: { left: convertInchesToTwip(0.5) },
    });
  };
  
  // Build document sections
  const children: DocElement[] = [];
  
  // ============================================
  // TITLE SECTION
  // ============================================
  children.push(new Paragraph({
    children: [
      new TextRun({
        text: flowchart.metadata.title,
        font: FONT,
        bold: true,
        size: 56, // 28pt
      }),
    ],
    spacing: { after: 200 },
  }));
  
  // Description
  children.push(createParagraph(flowchart.metadata.description));
  children.push(createParagraph(
    `Generated: ${new Date(flowchart.metadata.generatedAt).toLocaleString()} • ${flowchart.nodes.length} nodes • ${flowchart.runbooks.length} runbooks`,
    { italic: true, color: '666666', size: FONT_SIZE_SMALL }
  ));
  children.push(new Paragraph({ text: '' }));
  
  // Tip box
  children.push(new Paragraph({
    children: [
      new TextRun({
        text: '💡 Tip: ',
        font: FONT,
        italics: true,
        size: FONT_SIZE_SMALL,
        color: '1a73e8',
      }),
      new TextRun({
        text: 'To enable collapsible sections, go to File → Page setup → Pageless. Then hover over any heading to reveal the collapse/expand triangle.',
        font: FONT,
        italics: true,
        size: FONT_SIZE_SMALL,
        color: '5f6368',
      }),
    ],
  }));
  children.push(new Paragraph({ text: '' }));
  
  // ============================================
  // FLOWCHART DIAGRAM SECTION (Brief)
  // ============================================
  children.push(new Paragraph({
    children: [
      new TextRun({
        text: 'Flowchart Diagram',
        font: FONT,
        bold: true,
        size: 32, // 16pt
        color: '1a73e8',
      }),
    ],
    spacing: { before: 300, after: 100 },
  }));
  
  children.push(createParagraph('Copy this Mermaid code to mermaid.live to view/edit the diagram:', { size: FONT_SIZE_SMALL }));
  children.push(new Paragraph({ text: '' }));
  
  // Mermaid code as monospace (condensed)
  const mermaidLines = mermaidCode.split('\n').slice(0, 30); // Limit to first 30 lines
  for (const line of mermaidLines) {
    children.push(new Paragraph({
      children: [
        new TextRun({
          text: line,
          font: 'Consolas',
          size: 16, // 8pt
          color: '333333',
        }),
      ],
    }));
  }
  if (mermaidCode.split('\n').length > 30) {
    children.push(createParagraph('... (diagram continues)', { italic: true, size: 16, color: '666666' }));
  }
  children.push(new Paragraph({ text: '' }));
  
  // ============================================
  // PART 1: DIAGNOSTIC DECISION TREE
  // ============================================
  children.push(new Paragraph({
    children: [
      new TextRun({
        text: 'Part 1: Diagnostic Decision Tree (Start Here)',
        font: FONT,
        bold: true,
        size: 44, // 22pt
        color: '202124',
      }),
    ],
    spacing: { before: 400, after: 200 },
  }));
  
  children.push(createParagraph(
    'Follow the questions below to identify the correct path, then click the link to jump to the specific resolution runbook in Part 2.',
    { size: FONT_SIZE_BODY }
  ));
  children.push(new Paragraph({ text: '' }));
  
  // Generate decision tree sections
  let questionNumber = 1;
  
  for (const branch of orderedQuestions) {
    // Question heading
    const questionLabel = branch.node.question || branch.node.label;
    children.push(new Paragraph({
      children: [
        new TextRun({
          text: `${questionNumber}. ${questionLabel}`,
          font: FONT,
          bold: true,
          size: 28, // 14pt
        }),
      ],
      spacing: { before: 200, after: 100 },
    }));
    
    // Add description if available
    if (branch.node.description && branch.node.description !== branch.node.question) {
      children.push(createParagraph(branch.node.description, { color: '5f6368', size: FONT_SIZE_SMALL }));
    }
    
    // Add answer options as bullet points
    for (const child of branch.children) {
      if (!child.answer) continue;
      
      if (child.runbookInfo) {
        // This answer leads to a runbook - create a linked bullet
        children.push(createBulletWithLink(
          `${child.answer}: `,
          `Go to Runbook ${child.runbookInfo.letter}: ${child.runbookInfo.title}`,
          child.runbookInfo.bookmarkId,
          '.'
        ));
      } else if (child.targetNode) {
        // This answer leads to another question or node
        const targetDescription = child.targetNode.type === 'question' 
          ? `Go to Question ${orderedQuestions.findIndex(q => q.node.id === child.targetNode?.id) + 1}`
          : child.targetNode.type === 'end'
          ? `${child.targetNode.endStateType === 'resolved' ? '✅ Resolved' : child.targetNode.endStateType === 'escalate' ? '🔺 Escalate' : '📌 ' + child.targetNode.label}`
          : child.targetNode.label;
        
        children.push(createBullet(`${child.answer}: ${targetDescription}`));
      } else {
        children.push(createBullet(child.answer));
      }
    }
    
    children.push(new Paragraph({ text: '' }));
    questionNumber++;
  }
  
  // ============================================
  // PART 2: RESOLUTION RUNBOOKS
  // ============================================
  children.push(new Paragraph({
    children: [
      new TextRun({
        text: 'Part 2: Resolution Runbooks',
        font: FONT,
        bold: true,
        size: 44, // 22pt
        color: '202124',
      }),
    ],
    spacing: { before: 400, after: 200 },
  }));
  
  // Generate runbooks with letter names and bookmarks
  for (let i = 0; i < flowchart.runbooks.length; i++) {
    const runbook = flowchart.runbooks[i];
    const runbookInfo = runbookMap.get(runbook.id)!;
    
    // Runbook heading with bookmark
    children.push(new Paragraph({
      children: [
        new Bookmark({
          id: runbookInfo.bookmarkId,
          children: [
            new TextRun({
              text: `Runbook ${runbookInfo.letter}: ${runbook.title}`,
              font: FONT,
              bold: true,
              size: 32, // 16pt
              color: '1a73e8',
            }),
          ],
        }),
      ],
      spacing: { before: 300, after: 100 },
    }));
    
    // Description
    children.push(createParagraph(runbook.description));
    children.push(new Paragraph({ text: '' }));
    
    // Prerequisites
    if (runbook.prerequisites && runbook.prerequisites.length > 0) {
      children.push(new Paragraph({
        children: [
          new TextRun({
            text: 'Prerequisites',
            font: FONT,
            bold: true,
            size: 26, // 13pt
          }),
        ],
      }));
      for (const prereq of runbook.prerequisites) {
        children.push(createBullet(prereq));
      }
      children.push(new Paragraph({ text: '' }));
    }
    
    // Steps
    children.push(new Paragraph({
      children: [
        new TextRun({
          text: 'Steps',
          font: FONT,
          bold: true,
          size: 26, // 13pt
        }),
      ],
    }));
    
    for (const step of runbook.steps) {
      // Step instruction (bold numbered)
      children.push(new Paragraph({
        children: [
          new TextRun({ 
            text: `${step.order}. ${step.instruction}`, 
            font: FONT, 
            bold: true,
            size: FONT_SIZE_BODY,
          }),
        ],
        spacing: { before: 100 },
      }));
      
      // Step details
      if (step.details) {
        children.push(new Paragraph({
          children: [
            new TextRun({ 
              text: step.details, 
              font: FONT, 
              size: FONT_SIZE_BODY,
              color: '5f6368',
            }),
          ],
          indent: { left: convertInchesToTwip(0.25) },
        }));
      }
      
      // Warning
      if (step.warning) {
        children.push(new Paragraph({
          children: [
            new TextRun({ 
              text: `⚠️ Warning: ${step.warning}`, 
              font: FONT, 
              size: FONT_SIZE_BODY,
              color: 'd93025',
            }),
          ],
          indent: { left: convertInchesToTwip(0.25) },
        }));
      }
      
      // Tools
      if (step.toolsRequired && step.toolsRequired.length > 0) {
        children.push(new Paragraph({
          children: [
            new TextRun({ 
              text: `Tools: ${step.toolsRequired.join(', ')}`, 
              font: FONT, 
              italics: true,
              size: FONT_SIZE_SMALL,
              color: '1a73e8',
            }),
          ],
          indent: { left: convertInchesToTwip(0.25) },
        }));
      }
    }
    children.push(new Paragraph({ text: '' }));
    
    // Notes
    if (runbook.notes && runbook.notes.length > 0) {
      children.push(new Paragraph({
        children: [
          new TextRun({
            text: 'Notes',
            font: FONT,
            bold: true,
            size: 26, // 13pt
          }),
        ],
      }));
      for (const note of runbook.notes) {
        children.push(new Paragraph({
          children: [
            new TextRun({ 
              text: `📝 ${note}`, 
              font: FONT, 
              size: FONT_SIZE_BODY,
              color: '137333',
            }),
          ],
          indent: { left: convertInchesToTwip(0.25) },
        }));
      }
      children.push(new Paragraph({ text: '' }));
    }
    
    // Separator between runbooks
    if (i < flowchart.runbooks.length - 1) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: '─'.repeat(60), color: 'CCCCCC' }),
        ],
      }));
      children.push(new Paragraph({ text: '' }));
    }
  }
  
  // ============================================
  // END STATES SECTION
  // ============================================
  children.push(new Paragraph({
    children: [
      new TextRun({
        text: 'End States Reference',
        font: FONT,
        bold: true,
        size: 32, // 16pt
        color: '202124',
      }),
    ],
    spacing: { before: 400, after: 200 },
  }));
  
  const endNodes = flowchart.nodes.filter(n => n.type === 'end');
  
  // Create table for end states
  const tableRows = [
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: 'State', font: FONT, bold: true, size: FONT_SIZE_BODY })],
          })],
          width: { size: 35, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: 'Type', font: FONT, bold: true, size: FONT_SIZE_BODY })],
          })],
          width: { size: 20, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: 'Description', font: FONT, bold: true, size: FONT_SIZE_BODY })],
          })],
          width: { size: 45, type: WidthType.PERCENTAGE },
        }),
      ],
    }),
  ];
  
  for (const node of endNodes) {
    const stateEmoji = node.endStateType === 'resolved' ? '✅' :
                       node.endStateType === 'escalate' ? '🔺' :
                       node.endStateType === 'blocked' ? '🚫' : '📌';
    tableRows.push(new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: `${stateEmoji} ${node.label}`, font: FONT, size: FONT_SIZE_BODY })],
          })],
        }),
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: node.endStateType || 'resolved', font: FONT, size: FONT_SIZE_BODY })],
          })],
        }),
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: node.description || '', font: FONT, size: FONT_SIZE_BODY })],
          })],
        }),
      ],
    }));
  }
  
  if (tableRows.length > 1) {
    children.push(new Table({
      rows: tableRows,
      width: { size: 100, type: WidthType.PERCENTAGE },
    }));
  }
  
  // Create the document with proper font defaults
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT,
            size: FONT_SIZE_BODY,
          },
        },
      },
    },
    sections: [{
      properties: {},
      children,
    }],
  });
  
  // Generate blob
  return await Packer.toBlob(doc);
}

