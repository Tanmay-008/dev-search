export interface URLDeduplicator {

    isDuplicate(url: string): Promise<boolean>;

    markAsSeen(url: string): Promise<void>;

    add(url: string): Promise<boolean>;
}

export interface CrawlHistoryStore {
    hasSeenURL(url: string): Promise<boolean>;
    markURLAsSeen(url: string): Promise<void>;
    saveDomainStats(domain: string, data: any): Promise<void>;
}

export interface FrontierTask {
    taskId: string;
    url: string;
}

export interface QueueProvider {
    /**
     * Pushes a newly discovered URL into the external queue.
     */
    publishURL(url: string): Promise<void>;

    /**
     * Pulls a batch of pending URLs from the external queue.
     */
    fetchURL(limit: number): Promise<FrontierTask[]>;

    /**
     * Acknowledges that a task is successfully processed.
     */
    markComplete(taskId: string): Promise<void>;

    /**
     * Acknowledges that a task failed, effectively returning it to the queue.
     */
    markFailed(taskId: string): Promise<void>;
}


