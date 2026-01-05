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
    
    const prompt = `Create a clean, professional flowchart diagram visualization.

FLOWCHART STRUCTURE:
${flowchartDescription}

MERMAID DIAGRAM REFERENCE:
${mermaidDiagram}

DESIGN REQUIREMENTS:
- Clean, modern design with rounded rectangles for nodes
- Use these colors:
  - Purple (#8957e5) for START nodes
  - Green (#238636) for QUESTION/decision nodes (diamond shape)
  - Blue (#1f6feb) for RUNBOOK/action nodes (rectangles)
  - Red (#f85149) for END nodes
- White text on colored backgrounds
- Clear arrows connecting nodes
- Labels on arrows where specified (Yes/No, etc.)
- Dark background (#0a0e14) to match a developer tool aesthetic
- Professional, technical documentation style
- Hierarchical top-to-bottom layout
- All text should be clearly readable

Generate a high-quality, detailed flowchart diagram image.`;

    // Try the Pro model first (better quality)
    const modelsToTry = [
      'gemini-3-pro-image-preview',
      'gemini-2.5-flash-image',
      'gemini-2.0-flash-exp-image-generation',
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
    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
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

