import { GoogleGenerativeAI } from '@google/generative-ai';
import { FlowchartData, FlowchartImageResult } from '@/types/schema';
import { generateMermaidDiagram } from './anthropic';

// Initialize Google AI client
const getClient = () => {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY is not set. Please add it to your .env.local file.');
  }
  
  if (apiKey === 'your-google-ai-key-here') {
    throw new Error('Please replace the placeholder Google AI API key in .env.local');
  }
  
  return new GoogleGenerativeAI(apiKey);
};

/**
 * Generate a beautiful flowchart image using Gemini's image generation
 * Uses the Pro model for high quality output
 */
export async function generateFlowchartImage(
  flowchart: FlowchartData
): Promise<FlowchartImageResult> {
  console.log('[Gemini] Starting flowchart image generation...');
  
  try {
    const client = getClient();
    
    // Generate a detailed description of the flowchart for the image model
    const mermaidDiagram = generateMermaidDiagram(flowchart);
    
    // Build a detailed prompt describing the flowchart
    const flowchartDescription = buildFlowchartDescription(flowchart);
    
    const prompt = `Generate a PREMIUM QUALITY technical infographic flowchart. This must be visually stunning and publication-ready.

═══════════════════════════════════════════════════════════════════════════════
⚠️ CRITICAL: TEXT ACCURACY REQUIREMENTS ⚠️
═══════════════════════════════════════════════════════════════════════════════

YOU MUST COPY THE TEXT EXACTLY AS PROVIDED. DO NOT PARAPHRASE, ABBREVIATE, OR MODIFY ANY TEXT.

Each node label below must appear VERBATIM in the image. Spell every word correctly.
If you cannot render text accurately, use simple short labels but NEVER show incorrect text.

═══════════════════════════════════════════════════════════════════════════════
FLOWCHART DATA (RENDER EXACTLY AS SPECIFIED)
═══════════════════════════════════════════════════════════════════════════════

${flowchartDescription}

═══════════════════════════════════════════════════════════════════════════════
STRUCTURAL REFERENCE (Mermaid Diagram)
═══════════════════════════════════════════════════════════════════════════════

${mermaidDiagram}

═══════════════════════════════════════════════════════════════════════════════
VISUAL DESIGN SPECIFICATIONS (Premium Infographic Style)
═══════════════════════════════════════════════════════════════════════════════

OVERALL AESTHETIC:
- Style: Modern tech infographic / premium dashboard visualization
- Quality: 4K resolution, crisp edges, anti-aliased
- Background: Rich dark gradient from #0d1117 to #161b22 (GitHub dark theme inspired)
- Add subtle grid pattern or dot matrix in background for depth
- Include subtle ambient glow effects around important nodes

NODE DESIGN (Shape + Color + Typography):

1. START NODES 🟣
   - Shape: Pill/stadium shape with soft glow effect
   - Color: Vibrant purple gradient (#8957e5 → #a371f7)
   - Border: 2px lighter purple (#c297ff) with subtle outer glow
   - Icon: Play button or rocket icon inside
   - Text: Bold, white, centered

2. QUESTION NODES ❓ (Decision Points)
   - Shape: Diamond OR rounded rectangle with question mark accent
   - Color: Rich green gradient (#238636 → #2ea043)
   - Border: 2px bright green (#3fb950) with glow
   - Icon: Question mark badge in corner
   - Text: White, bold title + lighter description below
   - Size: Larger than other nodes (these are key decision points)

3. ANSWER NODES 💬 (Selected Choices)
   - Shape: Compact rounded rectangle / tag shape
   - Color: Slate gray gradient (#475569 → #64748b)
   - Border: 1px subtle border (#94a3b8)
   - Text: White, medium weight
   - Size: Smaller than question nodes
   - Style: Appears as "selected option" badge

4. RUNBOOK/ACTION NODES 📋 (Procedures)
   - Shape: Rectangle with rounded corners + document icon
   - Color: Bright blue gradient (#1f6feb → #388bfd)
   - Border: 2px sky blue (#58a6ff) with soft glow
   - Icon: Clipboard or checklist icon
   - Text: White, bold title
   - Badge: Small "RUNBOOK" label in corner

5. END NODES (Terminal States):
   - Shape: Double-bordered rectangle or octagon
   
   ✅ RESOLVED:
   - Color: Success green gradient (#22c55e → #4ade80)
   - Icon: Checkmark
   - Border: Bright green glow
   
   🔺 ESCALATE:
   - Color: Alert red gradient (#f85149 → #ff7b72)
   - Icon: Arrow up or warning triangle
   - Border: Red glow effect
   
   📌 MANUAL:
   - Color: Warning amber gradient (#eab308 → #fbbf24)
   - Icon: Hand or tool icon
   - Border: Amber glow
   
   🚫 BLOCKED:
   - Color: Neutral gray (#6e7681 → #8b949e)
   - Icon: X or stop icon

CONNECTORS & ARROWS:
- Style: Smooth bezier curves, not straight lines
- Color: Gradient from source node color to target node color
- Arrow heads: Modern triangular, filled
- Line width: 3px with subtle glow/shadow
- Animated feel: Add subtle directional indicators
- Labels on arrows: Rounded pill background, contrasting text

LAYOUT & COMPOSITION:
- Arrangement: Top-to-bottom hierarchical tree
- Spacing: Generous whitespace between nodes (min 40px)
- Alignment: Perfect grid alignment, symmetrical where possible
- Flow: Clear visual hierarchy from START to END states
- Balance: Distribute nodes evenly, avoid clustering

TYPOGRAPHY:
- Font style: Clean sans-serif (like Inter, SF Pro, or Segoe UI)
- Node titles: Bold, 14-16pt equivalent
- Descriptions: Regular weight, 11-12pt, slightly transparent
- Edge labels: Medium weight, 10-11pt, high contrast background
- ALL TEXT MUST BE PERFECTLY LEGIBLE AND SPELLED CORRECTLY

POLISH & EFFECTS:
- Drop shadows: Subtle, 4px blur, 20% opacity black
- Glassmorphism: Slight frosted glass effect on nodes
- Depth: Nodes should appear to float above background
- Icons: Use simple, recognizable glyphs (not detailed illustrations)
- Consistency: All nodes same border radius, shadow intensity

═══════════════════════════════════════════════════════════════════════════════
FINAL OUTPUT REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════════

Generate a COMPLETE flowchart showing EVERY node and connection listed above.
This should look like a premium infographic you'd see in a tech company's documentation.
The image must be immediately understandable and visually impressive.

REMEMBER: Text accuracy is paramount. Every label must be spelled correctly and match the data exactly.`;

    // Try image generation models (Gemini's native image generation)
    // gemini-3-pro-image-preview = "Nano Banana Pro" (higher fidelity, 4K capable) - default
    // gemini-2.5-flash-image = "Nano Banana" (fast/efficient) - fallback
    const modelsToTry = [
      'gemini-3-pro-image-preview',
      'gemini-2.5-flash-image',
    ];
    
    for (const modelName of modelsToTry) {
      try {
        console.log(`[Gemini] Trying model: ${modelName}`);
        const model = client.getGenerativeModel({ model: modelName });
        
        const result = await model.generateContent([prompt]);
        const response = result.response;
        
        // Check for image in response
        for (const candidate of response.candidates || []) {
          for (const part of candidate.content?.parts || []) {
            if ('inlineData' in part && part.inlineData) {
              console.log(`[Gemini] Image generated successfully with ${modelName}!`);
              return {
                success: true,
                imageBase64: part.inlineData.data,
                mimeType: part.inlineData.mimeType,
              };
            }
          }
        }
        
        console.log(`[Gemini] No image in response from ${modelName}, trying next...`);
      } catch (error) {
        console.warn(`[Gemini] Model ${modelName} failed:`, error instanceof Error ? error.message : error);
      }
    }
    
    return {
      success: false,
      error: 'All image generation models failed. The flowchart is still available in the interactive view.',
    };
    
  } catch (error) {
    console.error('[Gemini] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

function buildFlowchartDescription(flowchart: FlowchartData): string {
  const lines: string[] = [];
  
  lines.push(`Title: ${flowchart.metadata.title}`);
  lines.push(`Description: ${flowchart.metadata.description}`);
  lines.push('');
  lines.push('NODES:');
  
  for (const node of flowchart.nodes) {
    const typeEmoji = {
      start: '🟣',
      question: '🟢',
      answer: '⚪',
      runbook: '🔵',
      end: '🔴',
    }[node.type];
    
    lines.push(`${typeEmoji} [${node.id}] ${node.type.toUpperCase()}: "${node.label}"`);
    if (node.question) {
      lines.push(`   Question: "${node.question}"`);
    }
    if (node.description) {
      lines.push(`   Context: ${node.description}`);
    }
  }
  
  lines.push('');
  lines.push('CONNECTIONS:');
  
  for (const edge of flowchart.edges) {
    const sourceNode = flowchart.nodes.find(n => n.id === edge.source);
    const targetNode = flowchart.nodes.find(n => n.id === edge.target);
    const label = edge.label ? ` --[${edge.label}]-->` : ' -->';
    lines.push(`"${sourceNode?.label}"${label} "${targetNode?.label}"`);
  }
  
  return lines.join('\n');
}

/**
 * Use Gemini to enhance or validate the flowchart structure
 */
export async function validateFlowchart(flowchart: FlowchartData): Promise<{
  isValid: boolean;
  issues: string[];
  suggestions: string[];
}> {
  try {
    const client = getClient();
    const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const mermaidDiagram = generateMermaidDiagram(flowchart);
    
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: `Analyze this flowchart for a support runbook decision tree. Check for:
1. Unreachable nodes
2. Dead ends (nodes with no outgoing edges except end nodes)
3. Missing decision paths
4. Logical inconsistencies
5. Overly complex decision paths

Flowchart:
${mermaidDiagram}

Nodes: ${flowchart.nodes.length}
Edges: ${flowchart.edges.length}
Runbooks: ${flowchart.runbooks.length}

Respond in JSON format:
{
  "isValid": true/false,
  "issues": ["list of issues found"],
  "suggestions": ["list of improvement suggestions"]
}`
        }]
      }]
    });
    
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return {
      isValid: true,
      issues: [],
      suggestions: ['Could not parse validation response'],
    };
    
  } catch (error) {
    console.error('[Gemini] Validation error:', error);
    return {
      isValid: true,
      issues: [],
      suggestions: ['Validation check failed'],
    };
  }
}

