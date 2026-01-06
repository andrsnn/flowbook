import { NextRequest, NextResponse } from 'next/server';
import { enrichRunbooksForExport } from '@/lib/anthropic';
import { GeneratedRunbook } from '@/types/schema';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { runbooks } = body as { runbooks: GeneratedRunbook[] };
    
    if (!runbooks || !Array.isArray(runbooks)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request: runbooks array required' },
        { status: 400 }
      );
    }
    
    console.log(`[API] Enriching ${runbooks.length} runbooks...`);
    
    const enrichedRunbooks = await enrichRunbooksForExport(runbooks);
    
    return NextResponse.json({
      success: true,
      runbooks: enrichedRunbooks,
    });
    
  } catch (error) {
    console.error('[API] Error enriching runbooks:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to enrich runbooks' 
      },
      { status: 500 }
    );
  }
}

