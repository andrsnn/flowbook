import Anthropic from '@anthropic-ai/sdk';
import { FlowchartData, FlowNode, FlowEdge, GeneratedRunbook, AnalysisResult, AnalysisProgressEvent } from '@/types/schema';

// Chunking constants
const MAX_TOKENS_PER_CHUNK = 100000; // ~400k chars, conservative for prompts/output
const MAX_CHUNKS = 10;
const CHARS_PER_TOKEN = 4;

// Token estimation (conservative: ~4 chars per token)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

// Validate content size and return chunk count
function validateContentSize(markdown: string): { valid: boolean; chunks: number; error?: string } {
  const tokens = estimateTokens(markdown);
  const chunks = Math.ceil(tokens / MAX_TOKENS_PER_CHUNK);
  
  if (chunks > MAX_CHUNKS) {
    return {
      valid: false,
      chunks,
      error: `Content too large: requires ${chunks} chunks (max: ${MAX_CHUNKS}). Please split your runbook into smaller documents.`
    };
  }
  return { valid: true, chunks };
}

// Split markdown into chunks at logical boundaries (headers)
function splitIntoChunks(markdown: string, maxChunkTokens: number = MAX_TOKENS_PER_CHUNK): string[] {
  // If fits in one chunk, return as-is
  if (estimateTokens(markdown) <= maxChunkTokens) {
    return [markdown];
  }
  
  const chunks: string[] = [];
  
  // Extract document preamble (everything before first header)
  const firstHeaderMatch = markdown.match(/^(#+\s)/m);
  const preamble = firstHeaderMatch 
    ? markdown.substring(0, markdown.indexOf(firstHeaderMatch[0])).trim()
    : '';
  
  // Split by top-level headers (# or ##)
  const headerRegex = /^(#{1,2}\s.+)$/gm;
  const sections: { header: string; content: string; startIndex: number }[] = [];
  
  let lastIndex = preamble ? markdown.indexOf(preamble) + preamble.length : 0;
  let match;
  
  // Find all headers and their positions
  const headers: { header: string; index: number }[] = [];
  while ((match = headerRegex.exec(markdown)) !== null) {
    headers.push({ header: match[1], index: match.index });
  }
  
  // Build sections from headers
  for (let i = 0; i < headers.length; i++) {
    const start = headers[i].index;
    const end = i + 1 < headers.length ? headers[i + 1].index : markdown.length;
    const content = markdown.substring(start, end).trim();
    sections.push({ header: headers[i].header, content, startIndex: start });
  }
  
  // If no sections found, fall back to character-based splitting
  if (sections.length === 0) {
    const maxChars = maxChunkTokens * CHARS_PER_TOKEN;
    for (let i = 0; i < markdown.length; i += maxChars) {
      chunks.push(markdown.substring(i, Math.min(i + maxChars, markdown.length)));
    }
    return chunks;
  }
  
  // Group sections into chunks that fit within token limit
  let currentChunk = preamble ? preamble + '\n\n' : '';
  
  for (const section of sections) {
    const sectionTokens = estimateTokens(section.content);
    const currentTokens = estimateTokens(currentChunk);
    
    // If this single section is too large, we need to split it further
    if (sectionTokens > maxChunkTokens) {
      // Save current chunk if not empty
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = preamble ? preamble + '\n\n' : '';
      }
      
      // Split large section by paragraphs or by size
      const maxChars = maxChunkTokens * CHARS_PER_TOKEN;
      const sectionContent = section.content;
      for (let i = 0; i < sectionContent.length; i += maxChars) {
        const part = sectionContent.substring(i, Math.min(i + maxChars, sectionContent.length));
        chunks.push((preamble ? preamble + '\n\n' : '') + part);
      }
      continue;
    }
    
    // If adding this section exceeds limit, start new chunk
    if (currentTokens + sectionTokens > maxChunkTokens) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = (preamble ? preamble + '\n\n' : '') + section.content + '\n\n';
    } else {
      currentChunk += section.content + '\n\n';
    }
  }
  
  // Add final chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

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

const ANALYSIS_SYSTEM_PROMPT = `You are an expert at analyzing complex technical runbooks and creating HIERARCHICAL decision trees. Your goal is to create a well-structured flowchart where questions BUILD ON EACH OTHER and branch logically.

## CRITICAL: USE ANSWER NODES FOR READABILITY

Every question should connect to ANSWER nodes (not directly to other questions). This creates a clear visual flow:

**REQUIRED PATTERN:**
\`\`\`
[Question Node] → [Answer Node] → [Next Question or Runbook]
\`\`\`

## NODE TYPES:
- **start**: Entry point
- **question**: Asks a question (green)
- **answer**: Shows the selected answer/category (gray, smaller) - ALWAYS use between questions!
- **runbook**: Executable procedure (blue)
- **end**: Terminal state

## ⚠️ CRITICAL: ONCE PATHS SPLIT ON A CATEGORY, THEY MUST STAY SEPARATE

This is the #1 mistake to avoid. When you split on a fundamental category (user types, account types, etc.), those paths must NEVER converge back to shared questions.

**BAD PATTERN (NEVER DO THIS):**
\`\`\`
[What type of user/account?]
    → [Type A] ─┐
    → [Type B] ─┴→ [Shared question]  ← WRONG! Paths merged!
\`\`\`

**CORRECT PATTERN:**
\`\`\`
[What type of user/account?]
    → [Type A] → [Type A: What issue?]
                     → [Issue X] → [Type A: Issue X Runbook]
                     → [Issue Y] → [Type A: Issue Y Runbook]
    → [Type B] → [Type B: What issue?]
                     → [Issue X] → [Type B: Issue X Runbook]
                     → [Issue Y] → [Type B: Issue Y Runbook]
\`\`\`

If procedures differ by category (which they usually do), each category gets its OWN complete subtree with category-specific:
- Questions (prefixed or contextualized for that category)
- Runbooks (with category-specific steps)
- End states

The ONLY time paths can share a node is if the procedure is LITERALLY IDENTICAL for all categories.

## ⚠️ CRITICAL: EVERY NODE MUST BE CONNECTED

Every node MUST have:
- At least ONE incoming edge (except the start node)
- At least ONE outgoing edge (except end nodes and some runbooks)

Before finalizing, verify:
1. Start node connects to first question
2. Every answer node connects FROM a question and TO something
3. Every question has at least one answer leading FROM it
4. No orphan nodes exist

## CRITICAL: SEQUENTIAL PROCEDURE DECOMPOSITION

Many support procedures have SEQUENTIAL STEPS that must happen in order. NEVER collapse these into a single question or runbook.

**EXAMPLE - Email Change Request:**

\`\`\`
[What specifically?] 
    → [Change Email] → [Why does user need email changed?]
        → [Lost access to old email] → [Can user prove identity?]
            → [Yes] → [Identity Verification SOP runbook] → [Verification passed?]
                → [Yes] → [Execute Email Change runbook]
                → [No] → [Escalate - Cannot verify identity]
            → [No] → [Escalate - Insufficient proof]
        → [Company email changed] → ...
\`\`\`

## RULE: EVERY PROCEDURE STEP = SEPARATE NODE

If the original runbook says something like:
> "Verify identity using 2 of: phone, member ID, address. Then update email."

This is TWO things:
1. A verification procedure (with its own decision points)
2. An action (update email)

These MUST be separate nodes/runbooks, connected in sequence.

## HIERARCHICAL STRUCTURE

1. **START with CATEGORICAL questions** - Ask the MOST FUNDAMENTAL question first:
   - "What TYPE of user/account is this?" (e.g., Admin vs User, Internal vs External)
   - Then WITHIN each type: "What CATEGORY of issue?"

2. **KEEP CATEGORICAL PATHS SEPARATE** - After the initial split:
   - Each category path has its own questions, runbooks, and end states
   - Different categories do NOT merge back together
   - Only share nodes if procedures are LITERALLY IDENTICAL

3. **THEN drill into SPECIFICS** - After category, ask:
   - "What SPECIFICALLY does the user need?"
   - "WHY do they need this?" (reason affects procedure)

4. **THEN handle PREREQUISITES** - Before any action:
   - "Is X required first?" (identity verification, manager approval, etc.)
   - These should be SEPARATE runbook nodes that must complete before the main action

5. **FINALLY reach the ACTION runbook** - Only after all conditions are verified

## QUESTIONS MUST BE ATOMIC

Each question should ask ONE thing:
- BAD: "Is the user's identity verified for email change?"
- GOOD: "Does this change require identity verification?" → "Has identity been verified?"

## RUNBOOK DESIGN

Each runbook should be ONE atomic action:
- "Verify Identity - Type A" (verification steps for Type A)
- "Verify Identity - Type B" (verification steps for Type B)
- "Update Email - Type A" (email update for Type A)
- "Update Email - Type B" (email update for Type B)

Runbooks should be CATEGORY-SPECIFIC when the procedures differ.

## ⚠️ CRITICAL: RUNBOOKS MUST BE DETAILED AND EXPLICIT

Runbooks are the core deliverable - they must be DETAILED enough for someone unfamiliar to follow:

**REQUIRED for each runbook:**
1. **3-6 detailed steps** (never just 1-2 brief steps)
2. **Explicit instructions**: "Navigate to Settings → Account → Security" NOT "go to settings"
3. **Details for each step**: What to look for, what they should see, why this matters
4. **Verification steps**: "Confirm that [indicator] shows [expected state]"
5. **Warnings**: Common mistakes, edge cases, things to avoid
6. **Contextual notes**: Why the process works this way, related information

**Example of GOOD step detail:**
- instruction: "Guide the user to reset their two-factor authentication settings"
- details: "Navigate to Settings → Security → Two-Factor Authentication. Click 'Reset 2FA'. The user will need to enter their current password to confirm. After reset, they will be logged out and need to re-enroll."
- warning: "User will lose access to their account until they complete re-enrollment"

**Example of BAD step (too brief):**
- instruction: "Reset 2FA"
- details: "" ← Missing!

## SOURCE REFERENCES

For EVERY question node, include a sourceRef with:
- quote: The EXACT text from the original markdown
- section: The heading/section it came from
- reasoning: Why this text led to this question

## END STATES

- "resolved": Issue is fixed
- "escalate": Needs engineering/higher tier
- "manual": Requires manual intervention
- "blocked": Cannot proceed

REMEMBER: 
1. User type paths stay SEPARATE throughout
2. Every node must be connected
3. Each procedure step is a separate node`;

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
        "title": "Clear, specific title describing the action",
        "description": "2-3 sentence description of when to use this runbook and what it accomplishes",
        "prerequisites": ["Specific access requirement with context", "Tool or permission needed"],
        "steps": [
          {
            "order": 1,
            "instruction": "Explicit action: Guide the user to [specific location] by [specific method]",
            "details": "Detailed explanation of what to look for, what they should see, and why this step matters. Include specific UI elements, menu paths, or commands.",
            "warning": "Optional warning about common mistakes or things to avoid",
            "toolsRequired": ["Specific Tool Name"]
          },
          {
            "order": 2,
            "instruction": "Verify the action: Confirm that [specific indicator] shows [expected result]",
            "details": "Explain what success looks like and what to do if the expected result doesn't appear"
          },
          {
            "order": 3,
            "instruction": "Complete the process: [Specific final action with explicit steps]",
            "details": "Include any cleanup steps or confirmation the user should perform"
          }
        ],
        "notes": ["Contextual note explaining why this process works this way or edge cases to watch for", "Additional helpful context"],
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
- Use appropriate endStateType for all end nodes

RUNBOOK DETAIL REQUIREMENTS:
- Each runbook must have 3-6 detailed steps (not just 1-2 brief ones)
- Instructions must be EXPLICIT: "Guide user to Settings → Account → Security" not just "go to settings"
- Details field should explain WHAT to look for, WHAT they should see, and WHY
- Include verification steps: "Confirm that [X] shows [Y]"
- Add warnings for common mistakes or edge cases
- Notes should provide context about WHY the process works this way
- Make runbooks standalone - someone unfamiliar should be able to follow them`;

export async function analyzeRunbook(markdown: string): Promise<AnalysisResult> {
  console.log('[Anthropic] Starting runbook analysis with extended thinking...');
  console.log(`[Anthropic] Input length: ${markdown.length} characters`);
  
  try {
    const client = getClient();
    
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      thinking: {
        type: 'enabled',
        budget_tokens: 10000, // Allow substantial thinking for complex tree planning
      },
      messages: [
        {
          role: 'user',
          content: `${ANALYSIS_SYSTEM_PROMPT}

---

## RUNBOOK TO ANALYZE:

${markdown}

---

## YOUR TASK:

Before generating the flowchart:
1. List all the DIMENSIONS of variability in this runbook (user types, issue categories, etc.)
2. Determine which dimension is MOST FUNDAMENTAL (affects the most downstream decisions)
3. Plan a hierarchical tree where questions BUILD ON previous answers
4. Verify NO question appears in multiple branches

Then generate the flowchart.

${OUTPUT_FORMAT}`
        }
      ]
    });
    
    console.log('[Anthropic] Response received');
    console.log(`[Anthropic] Stop reason: ${message.stop_reason}`);
    console.log(`[Anthropic] Input tokens: ${message.usage.input_tokens}`);
    console.log(`[Anthropic] Output tokens: ${message.usage.output_tokens}`);
    
    // Find the text content block (skip thinking blocks)
    const textContent = message.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }
    
    // Log if thinking was used
    const thinkingBlock = message.content.find(block => block.type === 'thinking');
    if (thinkingBlock) {
      console.log('[Anthropic] Extended thinking was used for planning');
    }
    
    // Parse the JSON response
    const jsonMatch = textContent.text.match(/```json\n?([\s\S]*?)\n?```/);
    if (!jsonMatch) {
      console.error('[Anthropic] Could not find JSON in response');
      console.log('[Anthropic] Response:', textContent.text.substring(0, 1000));
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

// Critic prompt to evaluate flowchart structure
const CRITIC_PROMPT = `You are a flowchart structure critic. Analyze this flowchart for structural problems.

## CRITICAL ISSUES TO CHECK:

1. **MERGED CATEGORICAL PATHS** (MOST CRITICAL):
   If there are different categories (user types, account types, etc.), their paths must stay SEPARATE after the initial split.
   - BAD: [Category?] → [Type A] → [Shared Question] ← Type B also goes here
   - GOOD: [Category?] → [Type A] → [Type A: Issue?] → Type A-specific flow
                       → [Type B] → [Type B: Issue?] → Type B-specific flow
   
   Check: Do any nodes have incoming edges from BOTH category paths? That's a merge = BAD.

2. **DISCONNECTED NODES**:
   Every node must be connected to the graph.
   - Check: Does every node (except start) have at least one incoming edge?
   - Check: Does every non-terminal node have at least one outgoing edge?
   - Orphan nodes = automatic failure

3. **COLLAPSED PROCEDURES**: 
   Multi-step procedures MUST be broken into sequential nodes.
   - BAD: "Is identity verified for email change?" (combines verification + action)
   - GOOD: "Does this require identity verification?" → [Verify Identity runbook] → "Verification passed?" → [Change Email runbook]

4. **MISSING "WHY" QUESTIONS**:
   Before any action, we should understand WHY the user needs it.

5. **PREREQUISITES NOT SEPARATED**:
   If an action requires a prerequisite (verification, approval, etc.), the prerequisite should be its own runbook node BEFORE the action runbook.

6. **SHALLOW PATHS**: 
   Runbooks should NOT connect directly to high-level categorical questions.

## ISSUE TYPES:
- "merged_paths": User type paths converge to shared nodes (CRITICAL)
- "disconnected_node": Node has no incoming or outgoing edges (CRITICAL)
- "collapsed_procedure": Multi-step procedure collapsed into one node
- "missing_why": No question about WHY user needs this
- "unseparated_prerequisite": Prerequisite bundled with action
- "shallow_runbook": Runbook connected too high in tree
- "complex_runbook": Runbook handles multiple scenarios

## YOUR TASK:

1. First, check for merged user type paths - this is the #1 problem
2. Then check for disconnected nodes
3. Then check other issues

A flowchart FAILS review if ANY "merged_paths" or "disconnected_node" issues exist.
A flowchart passes review if score >= 8 and no critical issues exist.`;

// Refinement prompt to fix issues
const REFINE_PROMPT = `You are improving a flowchart based on critic feedback.

## HOW TO FIX EACH ISSUE TYPE:

### MERGED_PATHS (CRITICAL) → Duplicate the shared subtree for each category
Before: [Category?] → [Type A] ─┐
                    → [Type B] ─┴→ [Issue Type?] → shared flow
                     
After:  [Category?] → [Type A] → [Type A: Issue Type?] → Type A-specific flow
                    → [Type B] → [Type B: Issue Type?] → Type B-specific flow

You must CREATE SEPARATE question nodes and runbooks for each category path.
Prefix or contextualize labels: "Type A: Email Change" vs "Type B: Email Change"

### DISCONNECTED_NODE → Connect to appropriate parent/child
Find where the orphan node should connect in the flow and add the missing edge.
Every node must have:
- At least one incoming edge (except start)
- At least one outgoing edge (except end nodes)

### COLLAPSED PROCEDURE → Split into sequential nodes
Before: "Is identity verified for email change?" → [Change Email]
After:  "Requires identity verification?" 
        → Yes → [Verify Identity runbook] → "Verification passed?"
                  → Yes → [Change Email runbook]
                  → No → [Escalate - Failed verification]
        → No → [Change Email runbook]

### MISSING "WHY" → Add reason question
Before: "Email Issue" → [Change Email]
After:  "Email Issue" → "What does user need?"
        → "Change email" → "Why change needed?"
            → "Typo" → [Quick Email Fix runbook]
            → "Lost access" → "Can prove identity?" → ...

### UNSEPARATED PREREQUISITE → Create prerequisite runbook
Before: "Update Account" (runbook with verification steps inside)
After:  [Verify Identity runbook] → "Passed?" → [Update Account runbook]

### SHALLOW PATH → Add qualifying questions
Before: "Account Issue" → [Deactivate Account]
After:  "Account Issue" → "What specifically?"
        → "Deactivate" → "Why deactivating?" → ...

## RULES:
1. Categorical paths MUST stay completely separate - never merge
2. Every node must be connected - no orphans
3. Every runbook should do ONE atomic thing
4. Prerequisites are SEPARATE runbooks that come BEFORE the main action
5. Always ask WHY before taking an action
6. PRESERVE good structure - only fix the identified issues

Return the COMPLETE fixed flowchart with ALL nodes properly connected.`;

interface CriticResult {
  score: number;
  issues: Array<{
    type: string;
    nodeId: string;
    description: string;
    suggestion: string;
  }>;
  passesReview: boolean;
  summary: string;
}

// JSON Schema for flowchart tool (forces structured output)
const FLOWCHART_TOOL: Anthropic.Tool = {
  name: 'generate_flowchart',
  description: 'Generate a decision flowchart from a runbook',
  input_schema: {
    type: 'object' as const,
    properties: {
      reasoning: {
        type: 'string',
        description: 'Explanation of how you analyzed and decomposed the runbook',
      },
      flowchart: {
        type: 'object',
        properties: {
          nodes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                type: { type: 'string', enum: ['start', 'question', 'answer', 'runbook', 'end'] },
                label: { type: 'string' },
                description: { type: 'string' },
                question: { type: 'string' },
                runbookId: { type: 'string' },
                endStateType: { type: 'string', enum: ['resolved', 'escalate', 'manual', 'blocked'] },
                sourceRef: {
                  type: 'object',
                  properties: {
                    quote: { type: 'string' },
                    section: { type: 'string' },
                    reasoning: { type: 'string' },
                  },
                },
              },
              required: ['id', 'type', 'label'],
            },
          },
          edges: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                source: { type: 'string' },
                target: { type: 'string' },
                label: { type: 'string' },
              },
              required: ['id', 'source', 'target'],
            },
          },
          runbooks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                prerequisites: { type: 'array', items: { type: 'string' } },
                steps: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      order: { type: 'number' },
                      instruction: { type: 'string' },
                      details: { type: 'string' },
                      warning: { type: 'string' },
                      toolsRequired: { type: 'array', items: { type: 'string' } },
                    },
                    required: ['order', 'instruction'],
                  },
                },
                notes: { type: 'array', items: { type: 'string' } },
                relatedRunbookIds: { type: 'array', items: { type: 'string' } },
                sourceRef: {
                  type: 'object',
                  properties: {
                    quote: { type: 'string' },
                    section: { type: 'string' },
                    reasoning: { type: 'string' },
                  },
                },
              },
              required: ['id', 'title', 'description', 'steps'],
            },
          },
          metadata: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              version: { type: 'string' },
            },
            required: ['title', 'description'],
          },
        },
        required: ['nodes', 'edges', 'runbooks', 'metadata'],
      },
    },
    required: ['reasoning', 'flowchart'],
  },
};

const CRITIC_TOOL: Anthropic.Tool = {
  name: 'submit_critique',
  description: 'Submit a critique of the flowchart structure',
  input_schema: {
    type: 'object' as const,
    properties: {
      score: { type: 'number', description: 'Score from 1-10' },
      issues: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { 
              type: 'string', 
              enum: ['merged_paths', 'disconnected_node', 'collapsed_procedure', 'missing_why', 'unseparated_prerequisite', 'shallow_runbook', 'complex_runbook'] 
            },
            nodeId: { type: 'string' },
            description: { type: 'string' },
            suggestion: { type: 'string' },
          },
          required: ['type', 'description', 'suggestion'],
        },
      },
      passesReview: { type: 'boolean' },
      summary: { type: 'string' },
    },
    required: ['score', 'issues', 'passesReview', 'summary'],
  },
};

// Helper to generate flowchart using structured output
async function generateInitialFlowchart(
  client: Anthropic, 
  markdown: string
): Promise<{ flowchart: unknown; reasoning: string }> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16000,
    tools: [FLOWCHART_TOOL],
    tool_choice: { type: 'tool', name: 'generate_flowchart' },
    messages: [
      {
        role: 'user',
        content: `${ANALYSIS_SYSTEM_PROMPT}

---

## RUNBOOK TO ANALYZE:

${markdown}

---

## YOUR TASK:

1. List all the DIMENSIONS of variability in this runbook
2. Plan a hierarchical tree where questions BUILD ON previous answers
3. Ensure EVERY runbook has at least 2-3 qualifying questions before it
4. Make the tree DEEP not wide - prefer more specific questions over broad categories

Use the generate_flowchart tool to output your result.`
      }
    ]
  });

  // Extract tool use result
  const toolUse = message.content.find(block => block.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('No tool response from Claude');
  }

  const result = toolUse.input as { reasoning: string; flowchart: unknown };
  return { flowchart: result.flowchart, reasoning: result.reasoning };
}

// Helper to critique flowchart using structured output
async function critiqueFlowchart(
  client: Anthropic,
  flowchart: unknown,
  markdown: string
): Promise<CriticResult> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    tools: [CRITIC_TOOL],
    tool_choice: { type: 'tool', name: 'submit_critique' },
    messages: [
      {
        role: 'user',
        content: `${CRITIC_PROMPT}

## FLOWCHART TO REVIEW:

\`\`\`json
${JSON.stringify(flowchart, null, 2)}
\`\`\`

## ORIGINAL SOURCE (for context):

${markdown.substring(0, 3000)}...

Use the submit_critique tool to provide your analysis.`
      }
    ]
  });

  const toolUse = message.content.find(block => block.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    return { score: 5, issues: [], passesReview: false, summary: 'Could not get critique' };
  }

  return toolUse.input as CriticResult;
}

// Helper to refine flowchart based on critique using structured output
async function refineFlowchart(
  client: Anthropic,
  flowchart: unknown,
  critique: CriticResult,
  markdown: string
): Promise<{ flowchart: unknown; reasoning: string }> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16000,
    tools: [FLOWCHART_TOOL],
    tool_choice: { type: 'tool', name: 'generate_flowchart' },
    messages: [
      {
        role: 'user',
        content: `${REFINE_PROMPT}

## CURRENT FLOWCHART:

\`\`\`json
${JSON.stringify(flowchart, null, 2)}
\`\`\`

## CRITIC FEEDBACK (score: ${critique.score}/10):

${critique.summary}

### Issues to fix:
${critique.issues.map(i => `- [${i.type}] ${i.description}\n  Suggestion: ${i.suggestion}`).join('\n\n')}

## ORIGINAL SOURCE:

${markdown.substring(0, 3000)}...

---

Fix ALL the issues identified by the critic. Use the generate_flowchart tool to output the COMPLETE improved flowchart.`
      }
    ]
  });

  const toolUse = message.content.find(block => block.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('No refinement response');
  }

  const result = toolUse.input as { reasoning: string; flowchart: unknown };
  
  if (!result.flowchart || typeof result.flowchart !== 'object') {
    throw new Error('Refinement produced invalid flowchart');
  }
  
  const refinedFlowchart = result.flowchart as { nodes?: unknown[]; edges?: unknown[] };
  if (!refinedFlowchart.nodes || !Array.isArray(refinedFlowchart.nodes) || refinedFlowchart.nodes.length === 0) {
    throw new Error('Refined flowchart has no nodes');
  }
  
  return { flowchart: result.flowchart, reasoning: result.reasoning };
}

// Tool for concept DAG extraction
const CONCEPT_DAG_TOOL: Anthropic.Tool = {
  name: 'extract_concept_dag',
  description: 'Extract concepts and their relationships from a runbook',
  input_schema: {
    type: 'object' as const,
    properties: {
      principles: {
        type: 'array',
        description: 'Core principles that govern this domain',
        items: { type: 'string' },
      },
      userTypes: {
        type: 'array',
        description: 'Types of users mentioned',
        items: { type: 'string' },
      },
      issueCategories: {
        type: 'array',
        description: 'Categories of issues/requests',
        items: { type: 'string' },
      },
      procedures: {
        type: 'array',
        description: 'Distinct procedures/SOPs mentioned',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            prerequisites: { type: 'array', items: { type: 'string' } },
            steps: { type: 'array', items: { type: 'string' } },
            outcomes: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      decisionPoints: {
        type: 'array',
        description: 'Key decision points that affect routing',
        items: {
          type: 'object',
          properties: {
            question: { type: 'string' },
            dependsOn: { type: 'array', items: { type: 'string' }, description: 'What must be known first' },
            determines: { type: 'array', items: { type: 'string' }, description: 'What this decision affects' },
          },
        },
      },
      conceptOrder: {
        type: 'array',
        description: 'Concepts in dependency order (ask these first → last)',
        items: { type: 'string' },
      },
    },
    required: ['principles', 'userTypes', 'issueCategories', 'procedures', 'decisionPoints', 'conceptOrder'],
  },
};

// Extract concept DAG from runbook
async function extractConceptDAG(
  client: Anthropic,
  markdown: string
): Promise<unknown> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    tools: [CONCEPT_DAG_TOOL],
    tool_choice: { type: 'tool', name: 'extract_concept_dag' },
    messages: [
      {
        role: 'user',
        content: `Analyze this runbook and extract its conceptual structure.

## THINK PRINCIPLE-FIRST:

1. What are the CORE PRINCIPLES governing this domain?
   - e.g., "Identity must be verified before sensitive changes"
   - e.g., "User type determines available actions"

2. What CONCEPTS exist and how do they DEPEND on each other?
   - Build a DAG: which concepts must be known BEFORE others?
   - e.g., "User Type" must be known before "Available Actions"
   - e.g., "Reason for request" must be known before "Required verification level"

3. What are the ATOMIC PROCEDURES?
   - Each procedure should be ONE thing with clear prerequisites
   - e.g., "Verify Identity" is separate from "Change Email"

## RUNBOOK:

${markdown}

Extract the concept DAG using the tool.`
      }
    ]
  });

  const toolUse = message.content.find(block => block.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('No concept DAG response');
  }

  return toolUse.input;
}

// Type definition for concept DAG
interface ConceptDAG {
  principles: string[];
  userTypes: string[];
  issueCategories: string[];
  procedures: Array<{
    name: string;
    prerequisites?: string[];
    steps?: string[];
    outcomes?: string[];
  }>;
  decisionPoints: Array<{
    question: string;
    dependsOn?: string[];
    determines?: string[];
  }>;
  conceptOrder: string[];
}

// Merge multiple concept DAGs from chunked content
function mergeConceptDAGs(dags: unknown[]): ConceptDAG {
  const merged: ConceptDAG = {
    principles: [],
    userTypes: [],
    issueCategories: [],
    procedures: [],
    decisionPoints: [],
    conceptOrder: [],
  };
  
  const seenPrinciples = new Set<string>();
  const seenUserTypes = new Set<string>();
  const seenCategories = new Set<string>();
  const seenProcedures = new Set<string>();
  const seenDecisionPoints = new Set<string>();
  const seenConcepts = new Set<string>();
  
  for (const dag of dags) {
    const d = dag as ConceptDAG;
    
    // Merge principles (dedupe by exact match)
    for (const principle of d.principles || []) {
      if (!seenPrinciples.has(principle)) {
        seenPrinciples.add(principle);
        merged.principles.push(principle);
      }
    }
    
    // Merge user types
    for (const userType of d.userTypes || []) {
      if (!seenUserTypes.has(userType.toLowerCase())) {
        seenUserTypes.add(userType.toLowerCase());
        merged.userTypes.push(userType);
      }
    }
    
    // Merge issue categories
    for (const category of d.issueCategories || []) {
      if (!seenCategories.has(category.toLowerCase())) {
        seenCategories.add(category.toLowerCase());
        merged.issueCategories.push(category);
      }
    }
    
    // Merge procedures (dedupe by name)
    for (const procedure of d.procedures || []) {
      if (!seenProcedures.has(procedure.name.toLowerCase())) {
        seenProcedures.add(procedure.name.toLowerCase());
        merged.procedures.push(procedure);
      }
    }
    
    // Merge decision points (dedupe by question similarity)
    for (const dp of d.decisionPoints || []) {
      const normalized = dp.question.toLowerCase().replace(/[?]/g, '').trim();
      if (!seenDecisionPoints.has(normalized)) {
        seenDecisionPoints.add(normalized);
        merged.decisionPoints.push(dp);
      }
    }
    
    // Merge concept order (preserve order, dedupe)
    for (const concept of d.conceptOrder || []) {
      if (!seenConcepts.has(concept.toLowerCase())) {
        seenConcepts.add(concept.toLowerCase());
        merged.conceptOrder.push(concept);
      }
    }
  }
  
  return merged;
}

// Streaming analysis with concept DAG + single refinement
export async function* analyzeRunbookStream(markdown: string): AsyncGenerator<AnalysisProgressEvent> {
  console.log('[Anthropic] Starting concept-first flowchart generation...');
  
  yield {
    type: 'progress',
    stage: 'parsing',
    message: 'Starting analysis...',
    percent: 5,
  };
  
  try {
    // Early validation: check content size
    const validation = validateContentSize(markdown);
    console.log(`[Anthropic] Content validation: ${validation.chunks} chunk(s) needed`);
    
    if (!validation.valid) {
      yield {
        type: 'error',
        message: validation.error || 'Content too large',
      };
      return;
    }
    
    // Show chunking info if multiple chunks needed
    if (validation.chunks > 1) {
      yield {
        type: 'progress',
        stage: 'parsing',
        message: `📦 Content will be processed in ${validation.chunks} chunks...`,
        percent: 7,
      };
    }
    
    const client = getClient();
    
    // Split content into chunks
    const chunks = splitIntoChunks(markdown);
    console.log(`[Anthropic] Split into ${chunks.length} chunk(s)`);
    
    // Phase 1: Extract concept DAG (potentially from multiple chunks)
    yield {
      type: 'progress',
      stage: 'identifying',
      message: '🧠 Phase 1: Extracting concepts and building dependency graph...',
      percent: 10,
    };
    
    let conceptDAG: unknown;
    
    if (chunks.length === 1) {
      // Single chunk: extract directly
      conceptDAG = await extractConceptDAG(client, markdown);
    } else {
      // Multiple chunks: extract from each and merge
      const extractedDAGs: unknown[] = [];
      const progressPerChunk = 15 / chunks.length;
      
      for (let i = 0; i < chunks.length; i++) {
        yield {
          type: 'progress',
          stage: 'identifying',
          message: `📦 Processing chunk ${i + 1}/${chunks.length}...`,
          percent: 10 + Math.round(i * progressPerChunk),
          detail: `Extracting concepts from section ${i + 1}`,
        };
        
        const chunkDAG = await extractConceptDAG(client, chunks[i]);
        extractedDAGs.push(chunkDAG);
        
        console.log(`[Anthropic] Extracted DAG from chunk ${i + 1}/${chunks.length}`);
      }
      
      // Merge all DAGs
      yield {
        type: 'progress',
        stage: 'identifying',
        message: '🔗 Merging concepts from all chunks...',
        percent: 23,
      };
      
      conceptDAG = mergeConceptDAGs(extractedDAGs);
      console.log('[Anthropic] Merged concept DAGs from all chunks');
    }
    
    const dagData = conceptDAG as { 
      principles: string[]; 
      conceptOrder: string[];
      procedures: Array<{ name: string }>;
      decisionPoints: Array<{ question: string }>;
    };
    
    yield {
      type: 'progress',
      stage: 'identifying',
      message: `✓ Found ${dagData.procedures?.length || 0} procedures, ${dagData.decisionPoints?.length || 0} decision points`,
      percent: 25,
      detail: `Principles: ${dagData.principles?.slice(0, 2).join('; ') || 'none'}`,
    };
    
    // Phase 2: Generate flowchart using concept DAG
    yield {
      type: 'progress',
      stage: 'structuring',
      message: '🔨 Phase 2: Building flowchart from concept graph...',
      percent: 30,
    };
    
    const initial = await generateFlowchartFromDAG(client, markdown, conceptDAG);
    let currentFlowchart = initial.flowchart;
    let reasoning = initial.reasoning;
    
    yield {
      type: 'progress',
      stage: 'structuring',
      message: '✓ Initial flowchart generated',
      percent: 50,
    };
    
    // Phase 3: Single critique pass
    yield {
      type: 'progress',
      stage: 'generating',
      message: '🔍 Phase 3: Reviewing structure for issues...',
      percent: 55,
    };
    
    const critique = await critiqueFlowchart(client, currentFlowchart, markdown);
    
    console.log(`[Anthropic] Critique: score=${critique.score}, issues=${critique.issues.length}`);
    
    // Show issues found
    const issuesSummary = critique.issues.length > 0
      ? critique.issues.slice(0, 3).map(i => `• ${i.type}: ${i.description}`).join('\n')
      : 'No major issues found';
    
    yield {
      type: 'progress',
      stage: 'generating',
      message: `📊 Score: ${critique.score}/10`,
      percent: 65,
      detail: issuesSummary,
    };
    
    // Single refinement if needed
    if (!critique.passesReview && critique.score < 8 && critique.issues.length > 0) {
      yield {
        type: 'progress',
        stage: 'generating',
        message: `🔧 Refining: fixing ${critique.issues.length} issues...`,
        percent: 70,
        detail: critique.issues.slice(0, 2).map(i => i.suggestion).join('; '),
      };
      
      try {
        const refined = await refineFlowchart(client, currentFlowchart, critique, markdown);
        currentFlowchart = refined.flowchart;
        reasoning = refined.reasoning;
        
        yield {
          type: 'progress',
          stage: 'generating',
          message: '✓ Refinement complete',
          percent: 85,
        };
      } catch (refinementError) {
        console.warn('[Anthropic] Refinement failed, using initial flowchart:', refinementError);
        yield {
          type: 'progress',
          stage: 'generating',
          message: '⚠️ Refinement skipped, using initial structure',
          percent: 85,
        };
      }
    } else {
      yield {
        type: 'progress',
        stage: 'generating',
        message: '✅ Structure approved!',
        percent: 85,
      };
    }
    
    yield {
      type: 'progress',
      stage: 'generating',
      message: 'Finalizing layout...',
      percent: 90,
    };
    
    // Validate flowchart before layout
    if (!currentFlowchart || typeof currentFlowchart !== 'object') {
      throw new Error('No valid flowchart was generated');
    }
    
    // Parse and layout the final flowchart
    const flowchartObj = currentFlowchart as {
      nodes: FlowNode[];
      edges: FlowEdge[];
      runbooks: GeneratedRunbook[];
      metadata: { title: string; description: string; version: string };
    };
    
    if (!flowchartObj.nodes || !Array.isArray(flowchartObj.nodes) || flowchartObj.nodes.length === 0) {
      throw new Error('Flowchart has no nodes');
    }
    
    // Rephrase question labels to be actual questions (post-processing step)
    const rephrasedNodes = rephraseQuestionLabels(flowchartObj.nodes);
    const nodesWithPositions = layoutNodes(rephrasedNodes, flowchartObj.edges || []);
    
    const flowchartData: FlowchartData = {
      nodes: nodesWithPositions,
      edges: flowchartObj.edges,
      runbooks: flowchartObj.runbooks,
      metadata: {
        ...flowchartObj.metadata,
        originalMarkdown: markdown,
        generatedAt: new Date().toISOString(),
      }
    };
    
    yield {
      type: 'complete',
      stage: 'generating',
      message: `Generated ${flowchartData.nodes.length} nodes and ${flowchartData.runbooks.length} runbooks`,
      percent: 100,
      partialNodes: flowchartData.nodes,
      partialEdges: flowchartData.edges,
      partialRunbooks: flowchartData.runbooks,
      partialMetadata: {
        title: flowchartData.metadata.title,
        description: flowchartData.metadata.description,
      },
      reasoning,
    };
    
  } catch (error) {
    console.error('[Anthropic] Error:', error);
    yield {
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// Generate flowchart using the concept DAG
async function generateFlowchartFromDAG(
  client: Anthropic,
  markdown: string,
  conceptDAG: unknown
): Promise<{ flowchart: unknown; reasoning: string }> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16000,
    tools: [FLOWCHART_TOOL],
    tool_choice: { type: 'tool', name: 'generate_flowchart' },
    messages: [
      {
        role: 'user',
        content: `Generate a flowchart based on this concept analysis.

## CONCEPT DAG (follow this structure):

\`\`\`json
${JSON.stringify(conceptDAG, null, 2)}
\`\`\`

## ⚠️ CRITICAL RULE #1: CATEGORICAL PATHS MUST STAY SEPARATE

If there are multiple categories (user types, account types, etc.), their paths must NEVER converge back together after splitting.

**WRONG (paths merge):**
\`\`\`
[Category?] → [Type A] ─┐
            → [Type B] ─┴→ [Shared Question]  ← BAD!
\`\`\`

**CORRECT (paths stay separate):**
\`\`\`
[Category?] → [Type A] → [Type A Issue?] → [Type A-specific runbooks]
            → [Type B] → [Type B Issue?] → [Type B-specific runbooks]
\`\`\`

Each category gets its OWN complete decision subtree. Create SEPARATE questions and runbooks for each category unless the procedure is LITERALLY IDENTICAL.

## ⚠️ CRITICAL RULE #2: EVERY NODE MUST BE CONNECTED

Before you finalize, verify:
- Start node has outgoing edge to first question
- Every answer node has incoming edge from question AND outgoing edge to next node
- Every question has at least one answer node connected
- NO ORPHAN NODES - every node must be reachable from start

## REQUIRED PATTERN: USE ANSWER NODES

ALWAYS put an "answer" node between a question and the next step:

[Question] → [Answer] → [Next Question or Runbook]

**DO NOT** connect questions directly to other questions!

## OTHER RULES:

1. **Follow the conceptOrder** - Ask questions in dependency order
2. **Each procedure = separate runbook** - Don't combine procedures  
3. **Prerequisites come BEFORE actions** - Verification before changes
4. **Category-specific runbooks** - If procedures differ by category, create separate runbooks
5. **Preserve ALL detail** - Include all steps from original runbook

## ORIGINAL RUNBOOK:

${markdown}

## NODE TYPES:
- "start": Entry point (1 per flowchart)
- "question": Asks something (green)
- "answer": Selected choice/category (gray, smaller) - USE BETWEEN EVERY QUESTION!
- "runbook": Executable procedure (blue)
- "end": Terminal state

Use the generate_flowchart tool.`
      }
    ]
  });

  const toolUse = message.content.find(block => block.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('No flowchart response');
  }

  const result = toolUse.input as { reasoning: string; flowchart: unknown };
  
  if (!result.flowchart || typeof result.flowchart !== 'object') {
    throw new Error('Generated flowchart is invalid');
  }
  
  const flowchart = result.flowchart as { nodes?: unknown[]; edges?: unknown[] };
  if (!flowchart.nodes || !Array.isArray(flowchart.nodes) || flowchart.nodes.length === 0) {
    throw new Error('Generated flowchart has no nodes');
  }
  
  return { flowchart: result.flowchart, reasoning: result.reasoning };
}

// Post-process question nodes to rephrase labels as proper questions
function rephraseQuestionLabels(nodes: FlowNode[]): FlowNode[] {
  return nodes.map(node => {
    if (node.type !== 'question') return node;
    
    let label = node.label;
    
    // Skip if already phrased as a question
    if (label.endsWith('?')) return node;
    
    // Common patterns to convert statements to questions
    // "MFA Issues" -> "Is this an MFA issue?"
    // "Password Reset" -> "Is this a password reset?"
    // "Email Change Request" -> "Is this an email change request?"
    // "Account Deactivation" -> "Does the user need account deactivation?"
    
    // Remove common suffixes that make it sound like a category
    const cleanLabel = label
      .replace(/\s+Issues?$/i, '')
      .replace(/\s+Request$/i, '')
      .replace(/\s+Problem$/i, '');
    
    // Determine the question prefix based on the content
    const lowerLabel = cleanLabel.toLowerCase();
    
    if (lowerLabel.includes('what') || lowerLabel.includes('which') || lowerLabel.includes('how')) {
      // Already has a question word, just add ?
      label = `${label}?`;
    } else if (lowerLabel.includes('type') || lowerLabel.includes('kind') || lowerLabel.includes('category')) {
      // "What type of..." style
      label = `What ${lowerLabel}?`;
    } else if (lowerLabel.startsWith('is ') || lowerLabel.startsWith('does ') || lowerLabel.startsWith('has ') || lowerLabel.startsWith('can ')) {
      // Already starts with a question word
      label = `${label}?`;
    } else {
      // Default: "Is this [X]?" or "Is this a/an [X] issue?"
      const article = /^[aeiou]/i.test(cleanLabel) ? 'an' : 'a';
      
      // Check if it's a noun phrase that should use "Is this a X issue?"
      if (/^[A-Z]/.test(cleanLabel) && !cleanLabel.includes(' ')) {
        // Single capitalized word like "MFA", "Password" - make it "Is this an MFA issue?"
        label = `Is this ${article} ${cleanLabel} issue?`;
      } else {
        // Multi-word or descriptive - "Is this [X]?"
        label = `Is this ${article} ${cleanLabel.toLowerCase()}?`;
      }
    }
    
    return {
      ...node,
      label,
      // Also update the question field if it matches the old label
      question: node.question === node.label ? label : node.question,
    };
  });
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

// Helper to attempt JSON repair for truncated responses
function tryRepairJson(jsonText: string): string {
  let text = jsonText.trim();
  
  // Remove markdown fences if present
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  
  // If the JSON appears truncated (doesn't end with ] or }), try to repair
  if (!text.endsWith(']') && !text.endsWith('}')) {
    console.log('[JSON Repair] Attempting to repair truncated JSON...');
    
    // Count brackets to determine what's missing
    let openBrackets = 0;
    let openBraces = 0;
    let inString = false;
    let escapeNext = false;
    
    for (const char of text) {
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === '[') openBrackets++;
        if (char === ']') openBrackets--;
        if (char === '{') openBraces++;
        if (char === '}') openBraces--;
      }
    }
    
    // If we're in a string, close it
    if (inString) {
      text += '"';
    }
    
    // Try to find the last complete object and truncate there
    // Look for the last complete runbook (ends with })
    const lastCompleteObjMatch = text.match(/^([\s\S]*\})\s*,?\s*\{[^}]*$/);
    if (lastCompleteObjMatch) {
      text = lastCompleteObjMatch[1];
      openBraces = 0;
      openBrackets = 1; // We're in an array
    }
    
    // Close any remaining open braces/brackets
    while (openBraces > 0) {
      text += '}';
      openBraces--;
    }
    while (openBrackets > 0) {
      text += ']';
      openBrackets--;
    }
    
    console.log('[JSON Repair] Repair attempted');
  }
  
  return text;
}

// Enrich runbooks with more detailed, explicit instructions for documentation export
// Processes in batches to avoid token limits
export async function enrichRunbooksForExport(
  runbooks: GeneratedRunbook[]
): Promise<GeneratedRunbook[]> {
  console.log('[Anthropic] Enriching runbooks for documentation export...');
  
  if (runbooks.length === 0) {
    return runbooks;
  }
  
  // Process in batches of 3 runbooks to avoid output truncation
  const BATCH_SIZE = 3;
  const enrichedRunbooks: GeneratedRunbook[] = [];
  
  try {
    const client = getClient();
    
    for (let i = 0; i < runbooks.length; i += BATCH_SIZE) {
      const batch = runbooks.slice(i, i + BATCH_SIZE);
      console.log(`[Anthropic] Enriching batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(runbooks.length / BATCH_SIZE)} (${batch.length} runbooks)...`);
      
      const batchJson = JSON.stringify(batch, null, 2);
      
      const message = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16000, // Increased for longer outputs
        messages: [
          {
            role: 'user',
            content: `You are expanding runbook instructions for technical documentation. The current instructions are too brief - they need to be more explicit and detailed for standalone documentation.

## Your task:
Take each runbook and expand the instructions to be more explicit and actionable. DO NOT change the structure or add new steps - just make existing content clearer and more detailed.

## Guidelines:
1. **Steps**: Make implicit actions explicit. For example:
   - "guide to settings" → "Guide the user to log in to their account, then navigate to Settings from the main menu"
   - "check the logs" → "Open the logging dashboard, filter by the user's ID, and review entries from the past 24 hours"
   - "reset their password" → "Guide them through the password reset flow: click 'Forgot Password' on the login page, enter their email, and check their inbox for the reset link"

2. **Details**: Expand brief details into fuller explanations. Include what the user should see/expect.

3. **Notes**: Expand notes to provide more context about why something matters or edge cases to watch for.

4. **Keep it generic**: Do not add company-specific details, product names, or URLs that aren't in the original.

5. **Maintain structure**: Keep the same number of steps, same prerequisites, same warnings - just expand the text.

## Input runbooks (${batch.length} total):
\`\`\`json
${batchJson}
\`\`\`

## Output:
Return ONLY a valid JSON array of exactly ${batch.length} enriched runbooks. Keep the exact same structure:
- id (unchanged)
- title (unchanged) 
- description (can expand slightly)
- prerequisites (can expand each item)
- steps (expand instruction and details, keep order/warnings/tools)
- notes (expand each note)
- relatedRunbookIds (unchanged)
- sourceRef (unchanged)

IMPORTANT: Return ONLY the JSON array, no markdown fences, no explanation. Ensure the JSON is complete and valid.`
          }
        ]
      });
      
      const textContent = message.content.find(block => block.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        console.error('[Anthropic] No text response for runbook enrichment batch');
        // Use original runbooks for this batch
        enrichedRunbooks.push(...batch);
        continue;
      }
      
      // Parse the JSON response with repair attempt
      let batchEnriched: GeneratedRunbook[];
      try {
        const repairedJson = tryRepairJson(textContent.text);
        batchEnriched = JSON.parse(repairedJson);
        
        // Validate we got the expected number
        if (!Array.isArray(batchEnriched)) {
          throw new Error('Response is not an array');
        }
        
        if (batchEnriched.length !== batch.length) {
          console.warn(`[Anthropic] Batch returned ${batchEnriched.length} runbooks, expected ${batch.length}. Using originals for missing.`);
          // Use what we got, fill in with originals
          for (let j = 0; j < batch.length; j++) {
            if (batchEnriched[j]) {
              enrichedRunbooks.push(batchEnriched[j]);
            } else {
              enrichedRunbooks.push(batch[j]);
            }
          }
        } else {
          enrichedRunbooks.push(...batchEnriched);
        }
      } catch (parseError) {
        console.error('[Anthropic] Failed to parse enriched batch:', parseError);
        console.error('[Anthropic] Raw response (first 500 chars):', textContent.text.substring(0, 500));
        // Use original runbooks for this batch
        enrichedRunbooks.push(...batch);
      }
    }
    
    console.log(`[Anthropic] Successfully enriched ${enrichedRunbooks.length} runbooks`);
    return enrichedRunbooks;
    
  } catch (error) {
    console.error('[Anthropic] Error enriching runbooks:', error);
    // Return original runbooks if enrichment fails completely
    return runbooks;
  }
}

// Generate Mermaid diagram syntax from flowchart data
export function generateMermaidDiagram(flowchart: FlowchartData): string {
  const lines: string[] = ['flowchart TD'];
  
  // Escape special Mermaid characters in labels
  const escapeLabel = (text: string): string => {
    return text
      .replace(/"/g, "'")      // Replace double quotes with single
      .replace(/\(/g, "❨")     // Replace ( with unicode left paren
      .replace(/\)/g, "❩")     // Replace ) with unicode right paren
      .replace(/\[/g, "⟦")     // Replace [ with unicode bracket
      .replace(/\]/g, "⟧")     // Replace ] with unicode bracket
      .replace(/\{/g, "❴")     // Replace { with unicode brace
      .replace(/\}/g, "❵");    // Replace } with unicode brace
  };
  
  // Add nodes
  for (const node of flowchart.nodes) {
    const label = escapeLabel(node.label);
    
    switch (node.type) {
      case 'start':
        lines.push(`    ${node.id}(["🚀 ${label}"])`);
        break;
      case 'question':
        lines.push(`    ${node.id}{"❓ ${label}"}`);
        break;
      case 'answer':
        lines.push(`    ${node.id}(["${label}"])`);
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
      const edgeLabel = escapeLabel(edge.label);
      lines.push(`    ${edge.source} -->|${edgeLabel}| ${edge.target}`);
    } else {
      lines.push(`    ${edge.source} --> ${edge.target}`);
    }
  }
  
  lines.push('');
  
  // Add styling
  lines.push('    classDef startNode fill:#8957e5,stroke:#8957e5,color:#fff');
  lines.push('    classDef questionNode fill:#238636,stroke:#238636,color:#fff');
  lines.push('    classDef answerNode fill:#475569,stroke:#475569,color:#fff');
  lines.push('    classDef runbookNode fill:#1f6feb,stroke:#1f6feb,color:#fff');
  lines.push('    classDef endResolved fill:#3fb950,stroke:#3fb950,color:#fff');
  lines.push('    classDef endEscalate fill:#f85149,stroke:#f85149,color:#fff');
  lines.push('    classDef endBlocked fill:#6e7681,stroke:#6e7681,color:#fff');
  lines.push('    classDef endManual fill:#d29922,stroke:#d29922,color:#fff');
  
  // Apply classes
  const startNodes = flowchart.nodes.filter(n => n.type === 'start').map(n => n.id);
  const questionNodes = flowchart.nodes.filter(n => n.type === 'question').map(n => n.id);
  const answerNodes = flowchart.nodes.filter(n => n.type === 'answer').map(n => n.id);
  const runbookNodes = flowchart.nodes.filter(n => n.type === 'runbook').map(n => n.id);
  const endResolved = flowchart.nodes.filter(n => n.type === 'end' && n.endStateType === 'resolved').map(n => n.id);
  const endEscalate = flowchart.nodes.filter(n => n.type === 'end' && n.endStateType === 'escalate').map(n => n.id);
  const endBlocked = flowchart.nodes.filter(n => n.type === 'end' && n.endStateType === 'blocked').map(n => n.id);
  const endManual = flowchart.nodes.filter(n => n.type === 'end' && (!n.endStateType || n.endStateType === 'manual')).map(n => n.id);
  
  if (startNodes.length) lines.push(`    class ${startNodes.join(',')} startNode`);
  if (questionNodes.length) lines.push(`    class ${questionNodes.join(',')} questionNode`);
  if (answerNodes.length) lines.push(`    class ${answerNodes.join(',')} answerNode`);
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

// Tool for node regeneration
const REGENERATE_NODE_TOOL: Anthropic.Tool = {
  name: 'regenerate_node',
  description: 'Regenerate a flowchart node with improved or expanded content',
  input_schema: {
    type: 'object' as const,
    properties: {
      node: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string', enum: ['start', 'question', 'answer', 'runbook', 'end'] },
          label: { type: 'string', description: 'Short display label' },
          description: { type: 'string', description: 'Detailed description/context' },
          question: { type: 'string', description: 'Full question text (for question nodes)' },
          sourceRef: {
            type: 'object',
            properties: {
              quote: { type: 'string' },
              section: { type: 'string' },
              reasoning: { type: 'string' },
            },
          },
          runbookId: { type: 'string' },
          endStateType: { type: 'string', enum: ['resolved', 'escalate', 'manual', 'blocked'] },
        },
        required: ['id', 'type', 'label'],
      },
      runbook: {
        type: 'object',
        description: 'Full runbook object if this is a runbook node',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          prerequisites: { type: 'array', items: { type: 'string' } },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                order: { type: 'number' },
                instruction: { type: 'string' },
                details: { type: 'string' },
                warning: { type: 'string' },
                toolsRequired: { type: 'array', items: { type: 'string' } },
              },
              required: ['order', 'instruction'],
            },
          },
          notes: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    required: ['node'],
  },
};

// Regenerate a single node (any type) with optional expand mode
export async function regenerateNode(
  nodeId: string, 
  flowchart: FlowchartData, 
  feedback?: string,
  mode: 'regenerate' | 'expand' = 'regenerate'
): Promise<{ node?: FlowNode; runbook?: GeneratedRunbook; error?: string }> {
  const node = flowchart.nodes.find(n => n.id === nodeId);
  if (!node) {
    return { error: 'Node not found' };
  }
  
  // Find connected runbook if this is a runbook node
  const connectedRunbook = node.type === 'runbook' && node.runbookId
    ? flowchart.runbooks.find(r => r.id === node.runbookId)
    : undefined;
  
  try {
    const client = getClient();
    
    const nodeTypeInstructions: Record<string, string> = {
      start: 'Improve the entry point description to better set context for the decision tree.',
      question: 'Make the question clearer and more specific. Include a detailed description explaining what this decision point is checking for.',
      answer: 'Expand the answer label to be more descriptive. Add context about what this choice means and when it applies.',
      runbook: 'Improve the runbook title and description. If expanding, add more detailed steps with specific instructions, warnings, and tool requirements.',
      end: 'Clarify the end state and what it means for the user. Add description of next steps or resolution details.',
    };
    
    const expandInstructions = mode === 'expand' ? `
## EXPAND MODE - Generate LONGER, MORE DETAILED content:

- Label: Can be longer and more descriptive (up to 50 chars)
- Description: Write 2-3 sentences explaining the context, purpose, and implications
${node.type === 'question' ? '- Question: Write a detailed question with context about what to look for' : ''}
${node.type === 'answer' ? '- Description: Explain what this answer means, when it applies, and what it implies for next steps' : ''}
${node.type === 'runbook' ? `- Steps: Add MORE steps with detailed instructions
- Include specific tool names, menu paths, button names
- Add warnings for common mistakes
- Include verification steps ("Confirm that X shows Y")
- Add notes with helpful context` : ''}
${node.type === 'end' ? '- Description: Explain what resolution means, any follow-up needed, and expected outcomes' : ''}
` : '';

    const context = `## Flowchart Context:
Title: ${flowchart.metadata.title}
Description: ${flowchart.metadata.description}

## Current Node to ${mode === 'expand' ? 'EXPAND' : 'regenerate'}:
- ID: ${node.id}
- Type: ${node.type}
- Current Label: ${node.label}
- Current Description: ${node.description || 'None'}
${node.question ? `- Current Question: ${node.question}` : ''}
${node.sourceRef ? `- Source: "${node.sourceRef.quote}"` : ''}
${connectedRunbook ? `
## Connected Runbook:
- Title: ${connectedRunbook.title}
- Steps: ${connectedRunbook.steps.length}
- Current steps: ${connectedRunbook.steps.map(s => s.instruction).join('; ')}
` : ''}

## Instructions for ${node.type} nodes:
${nodeTypeInstructions[node.type] || 'Improve the content.'}
${expandInstructions}
${feedback ? `\n## User Feedback:\n${feedback}` : ''}

## Original Source Material:
${flowchart.metadata.originalMarkdown.substring(0, 3000)}`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      tools: [REGENERATE_NODE_TOOL],
      tool_choice: { type: 'tool', name: 'regenerate_node' },
      messages: [
        {
          role: 'user',
          content: `${mode === 'expand' ? 'EXPAND' : 'Regenerate'} this ${node.type} node with ${mode === 'expand' ? 'MORE DETAILED, LONGER' : 'improved'} content.

${context}

Keep the same ID (${node.id}) and type (${node.type}).
${node.runbookId ? `Keep the same runbookId (${node.runbookId}).` : ''}
${node.endStateType ? `Keep the same endStateType (${node.endStateType}).` : ''}

Use the regenerate_node tool to output the improved node.`
        }
      ]
    });
    
    const toolUse = message.content.find(block => block.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      throw new Error('No tool response');
    }
    
    const result = toolUse.input as { node: FlowNode; runbook?: GeneratedRunbook };
    return {
      node: { ...result.node, position: node.position, depth: node.depth, collapsed: node.collapsed },
      runbook: result.runbook,
    };
    
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to regenerate' };
  }
}
