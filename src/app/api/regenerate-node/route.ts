import { NextRequest, NextResponse } from 'next/server';
import { regenerateNode } from '@/lib/anthropic';
import { FlowchartData } from '@/types/schema';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { nodeId, flowchart, feedback, mode } = await request.json() as {
      nodeId: string;
      flowchart: FlowchartData;
      feedback?: string;
      mode?: 'regenerate' | 'expand';
    };
    
    if (!nodeId || !flowchart) {
      return NextResponse.json(
        { success: false, error: 'nodeId and flowchart are required' },
        { status: 400 }
      );
    }
    
    const result = await regenerateNode(nodeId, flowchart, feedback, mode || 'regenerate');
    
    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      node: result.node,
      runbook: result.runbook,
    });
    
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

