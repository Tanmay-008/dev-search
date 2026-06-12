export interface FrontierTask {
    taskId: string;
    url: string;
}

export interface IQueueProvider {
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
