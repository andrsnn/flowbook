'use client';

import { pipeline, FeatureExtractionPipeline } from '@xenova/transformers';
import { FlowchartData, SearchDocument, SearchResult } from '@/types/schema';

// Singleton for the embedding model
let embeddingPipeline: FeatureExtractionPipeline | null = null;
let isLoadingModel = false;
let modelLoadPromise: Promise<FeatureExtractionPipeline> | null = null;

// Model loading with progress callback
export async function loadEmbeddingModel(
  onProgress?: (progress: { status: string; progress?: number }) => void
): Promise<FeatureExtractionPipeline> {
  if (embeddingPipeline) {
    return embeddingPipeline;
  }

  if (modelLoadPromise) {
    return modelLoadPromise;
  }

  isLoadingModel = true;
  
  modelLoadPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
    progress_callback: (data: { status: string; progress?: number }) => {
      if (onProgress) {
        onProgress(data);
      }
    },
  }).then((pipe) => {
    embeddingPipeline = pipe as FeatureExtractionPipeline;
    isLoadingModel = false;
    return embeddingPipeline;
  });

  return modelLoadPromise;
}

export function isModelLoading(): boolean {
  return isLoadingModel;
}

export function isModelLoaded(): boolean {
  return embeddingPipeline !== null;
}

// Generate embedding for text
async function generateEmbedding(text: string): Promise<number[]> {
  const model = await loadEmbeddingModel();
  const output = await model(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data as Float32Array);
}

// Cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

// Create a snippet from content
function createSnippet(content: string, maxLength: number = 150): string {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength).trim() + '...';
}

// Parse markdown into sections
function parseMarkdownSections(markdown: string): { title: string; content: string }[] {
  const sections: { title: string; content: string }[] = [];
  const lines = markdown.split('\n');
  
  let currentTitle = 'Introduction';
  let currentContent: string[] = [];
  
  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      // Save previous section if it has content
      if (currentContent.length > 0) {
        const content = currentContent.join('\n').trim();
        if (content) {
          sections.push({ title: currentTitle, content });
        }
      }
      currentTitle = headingMatch[2];
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }
  
  // Save last section
  if (currentContent.length > 0) {
    const content = currentContent.join('\n').trim();
    if (content) {
      sections.push({ title: currentTitle, content });
    }
  }
  
  return sections;
}

// Search Index class
export class SearchIndex {
  private documents: SearchDocument[] = [];
  private isIndexed: boolean = false;

  constructor() {}

  // Build the index from flowchart data
  async buildIndex(
    flowchartData: FlowchartData,
    onProgress?: (message: string, percent: number) => void
  ): Promise<void> {
    this.documents = [];
    this.isIndexed = false;

    const allDocs: SearchDocument[] = [];

    // 1. Index nodes
    onProgress?.('Indexing flowchart nodes...', 10);
    for (const node of flowchartData.nodes) {
      const contentParts = [node.label];
      if (node.description) contentParts.push(node.description);
      if (node.question) contentParts.push(node.question);
      if (node.sourceRef?.quote) contentParts.push(node.sourceRef.quote);
      
      const content = contentParts.join(' ');
      
      allDocs.push({
        id: `node-${node.id}`,
        type: 'node',
        nodeId: node.id,
        title: node.label,
        content,
        snippet: createSnippet(node.description || node.question || node.label),
      });
    }

    // 2. Index runbooks
    onProgress?.('Indexing runbooks...', 30);
    for (const runbook of flowchartData.runbooks) {
      const stepText = runbook.steps
        .map(s => `${s.instruction}${s.details ? ' ' + s.details : ''}`)
        .join(' ');
      
      const contentParts = [
        runbook.title,
        runbook.description,
        stepText,
      ];
      if (runbook.prerequisites) contentParts.push(runbook.prerequisites.join(' '));
      if (runbook.notes) contentParts.push(runbook.notes.join(' '));
      if (runbook.sourceRef?.quote) contentParts.push(runbook.sourceRef.quote);
      
      const content = contentParts.join(' ');
      
      allDocs.push({
        id: `runbook-${runbook.id}`,
        type: 'runbook',
        runbookId: runbook.id,
        title: runbook.title,
        content,
        snippet: createSnippet(runbook.description),
      });
    }

    // 3. Index original markdown sections
    onProgress?.('Indexing source content...', 50);
    const sections = parseMarkdownSections(flowchartData.metadata.originalMarkdown);
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      allDocs.push({
        id: `markdown-${i}`,
        type: 'markdown_section',
        title: section.title,
        content: section.content,
        snippet: createSnippet(section.content),
      });
    }

    // 4. Generate embeddings for all documents
    onProgress?.('Loading embedding model...', 60);
    await loadEmbeddingModel((progress) => {
      if (progress.progress !== undefined) {
        onProgress?.(`Loading model: ${progress.status}`, 60 + (progress.progress * 0.3));
      }
    });

    onProgress?.('Generating embeddings...', 90);
    const totalDocs = allDocs.length;
    for (let i = 0; i < allDocs.length; i++) {
      const doc = allDocs[i];
      doc.embedding = await generateEmbedding(doc.content);
      
      const progressPercent = 90 + ((i / totalDocs) * 10);
      onProgress?.(`Embedding document ${i + 1}/${totalDocs}`, progressPercent);
    }

    this.documents = allDocs;
    this.isIndexed = true;
    onProgress?.('Index ready!', 100);
  }

  // Search the index
  async search(query: string, topK: number = 10): Promise<SearchResult[]> {
    if (!this.isIndexed || this.documents.length === 0) {
      return [];
    }

    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);

    // Calculate similarities
    const results: SearchResult[] = [];
    for (const doc of this.documents) {
      if (!doc.embedding) continue;
      
      const score = cosineSimilarity(queryEmbedding, doc.embedding);
      results.push({
        document: doc,
        score,
        highlights: this.extractHighlights(doc.content, query),
      });
    }

    // Sort by score descending and return top K
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  // Extract relevant highlights from content
  private extractHighlights(content: string, query: string): string[] {
    const highlights: string[] = [];
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const sentences = content.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (words.some(word => lowerSentence.includes(word))) {
        const trimmed = sentence.trim();
        if (trimmed.length > 10 && trimmed.length < 200) {
          highlights.push(trimmed);
        }
      }
    }
    
    return highlights.slice(0, 3);
  }

  // Get documents by type
  getDocumentsByType(type: SearchDocument['type']): SearchDocument[] {
    return this.documents.filter(d => d.type === type);
  }

  // Check if indexed
  isReady(): boolean {
    return this.isIndexed;
  }

  // Get document count
  getDocumentCount(): number {
    return this.documents.length;
  }

  // Clear the index
  clear(): void {
    this.documents = [];
    this.isIndexed = false;
  }
}

// Singleton search index instance
let searchIndexInstance: SearchIndex | null = null;

export function getSearchIndex(): SearchIndex {
  if (!searchIndexInstance) {
    searchIndexInstance = new SearchIndex();
  }
  return searchIndexInstance;
}

export function resetSearchIndex(): void {
  if (searchIndexInstance) {
    searchIndexInstance.clear();
  }
  searchIndexInstance = null;
}


