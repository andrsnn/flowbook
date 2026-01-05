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

