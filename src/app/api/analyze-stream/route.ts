import { NextRequest } from 'next/server';
import { analyzeRunbookStream } from '@/lib/anthropic';
import { FlowchartData } from '@/types/schema';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const { markdown } = await request.json();
  
  if (!markdown || typeof markdown !== 'string') {
    return new Response(
      JSON.stringify({ error: 'Markdown content is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let flowchartData: FlowchartData | null = null;
        
        for await (const event of analyzeRunbookStream(markdown)) {
          // Store flowchart data from complete event
          if (event.type === 'complete' && event.partialNodes && event.partialRunbooks) {
            flowchartData = {
              nodes: event.partialNodes,
              edges: [], // Will be filled by the complete parsing
              runbooks: event.partialRunbooks,
              metadata: {
                title: '',
                description: '',
                originalMarkdown: markdown,
                generatedAt: new Date().toISOString(),
                version: '1.0',
              },
            };
          }
          
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
          
          if (event.type === 'error') {
            controller.close();
            return;
          }
        }
        
        controller.close();
      } catch (error) {
        const errorEvent = {
          type: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
        controller.close();
      }
    },
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

