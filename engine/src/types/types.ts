export interface Document {
  id: string
  title: string
  content: string
  source: string
  url: string
  tags?: string[]
  crawledAt: Date
}


export interface QueueMessage {
  url: any;
  priority?: number;
  depth?: number;
  metadata?: Record<string, unknown>;
  id:string|undefined,
}