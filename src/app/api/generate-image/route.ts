import { NextRequest, NextResponse } from 'next/server';
import { generateFlowchartImage } from '@/lib/gemini';
import { FlowchartData } from '@/types/schema';

export const maxDuration = 60; // Allow up to 60 seconds for image generation

export async function POST(request: NextRequest) {
  try {
    const { flowchart } = await request.json() as { flowchart: FlowchartData };
    
    if (!flowchart || !flowchart.nodes || !flowchart.edges) {
      return NextResponse.json(
        { success: false, error: 'Valid flowchart data is required' },
        { status: 400 }
      );
    }
    
    console.log(`[API] Generating flowchart image (${flowchart.nodes.length} nodes)...`);
    
    const result = await generateFlowchartImage(flowchart);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
    
    console.log('[API] Image generation complete');
    
    return NextResponse.json({
      success: true,
      imageBase64: result.imageBase64,
      mimeType: result.mimeType,
    });
    
  } catch (error) {
    console.error('[API] Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      },
      { status: 500 }
    );
  }
}

