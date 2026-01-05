import { NextRequest, NextResponse } from 'next/server';
import { analyzeRunbook } from '@/lib/anthropic';

export const maxDuration = 60; // Allow up to 60 seconds for analysis

export async function POST(request: NextRequest) {
  try {
    const { markdown } = await request.json();
    
    if (!markdown || typeof markdown !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Markdown content is required' },
        { status: 400 }
      );
    }
    
    if (markdown.length < 50) {
      return NextResponse.json(
        { success: false, error: 'Markdown content is too short. Please provide a more detailed runbook.' },
        { status: 400 }
      );
    }
    
    if (markdown.length > 100000) {
      return NextResponse.json(
        { success: false, error: 'Markdown content is too long. Please provide a shorter runbook (max 100KB).' },
        { status: 400 }
      );
    }
    
    console.log(`[API] Analyzing runbook (${markdown.length} chars)...`);
    
    const result = await analyzeRunbook(markdown);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
    
    console.log('[API] Analysis complete');
    
    return NextResponse.json({
      success: true,
      flowchart: result.flowchart,
      reasoning: result.reasoning,
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

