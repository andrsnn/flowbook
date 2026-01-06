import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { AISearchResponse, AIReference } from '@/types/schema';

// Initialize Anthropic client
const getClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }
  
  return new Anthropic({ apiKey });
};

interface SearchResultContext {
  type: string;
  title: string;
  content: string;
  nodeId?: string;
  runbookId?: string;
  score: number;
}

interface RequestBody {
  query: string;
  searchResults: SearchResultContext[];
  flowchartTitle: string;
}

const SYSTEM_PROMPT = `You are a helpful assistant that answers questions about flowcharts and runbooks. You provide clear, concise answers based on the provided search results.

Your responses should:
1. Directly answer the user's question
2. Reference specific nodes, runbooks, or source content when relevant
3. Use markdown formatting for clarity
4. Be concise but thorough
5. If the search results don't contain enough information, acknowledge this

Format your response as a JSON object with this structure:
{
  "answer": "Your markdown-formatted answer here",
  "references": [
    {
      "type": "node" | "runbook" | "source",
      "id": "the nodeId or runbookId if applicable, or a generated id for source",
      "title": "Title of the reference",
      "snippet": "Brief relevant quote from this reference"
    }
  ]
}

IMPORTANT: Your entire response must be valid JSON. Do not include any text before or after the JSON object.`;

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { query, searchResults, flowchartTitle } = body;

    if (!query || !searchResults) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const client = getClient();

    // Build context from search results
    const contextParts: string[] = [];
    
    for (const result of searchResults) {
      contextParts.push(`[${result.type.toUpperCase()}] ${result.title} (relevance: ${Math.round(result.score * 100)}%)`);
      contextParts.push(result.content);
      if (result.nodeId) contextParts.push(`Node ID: ${result.nodeId}`);
      if (result.runbookId) contextParts.push(`Runbook ID: ${result.runbookId}`);
      contextParts.push('---');
    }

    const userMessage = `Flowchart: "${flowchartTitle}"

User Question: ${query}

Search Results (ordered by relevance):
${contextParts.join('\n')}

Based on these search results, please answer the user's question. Include references to the most relevant nodes, runbooks, or source content.`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    // Extract text content
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from AI');
    }

    // Parse JSON response
    let parsedResponse: { answer: string; references: AIReference[] };
    try {
      parsedResponse = JSON.parse(textContent.text);
    } catch {
      // If JSON parsing fails, create a structured response from the raw text
      parsedResponse = {
        answer: textContent.text,
        references: searchResults.slice(0, 3).map((r, i) => ({
          type: r.type as 'node' | 'runbook' | 'source',
          id: r.nodeId || r.runbookId || `ref-${i}`,
          title: r.title,
          snippet: r.content.substring(0, 100) + '...',
        })),
      };
    }

    const aiResponse: AISearchResponse = {
      answer: parsedResponse.answer,
      references: parsedResponse.references,
      query,
    };

    return NextResponse.json(aiResponse);
  } catch (error) {
    console.error('Search response error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate response' },
      { status: 500 }
    );
  }
}


