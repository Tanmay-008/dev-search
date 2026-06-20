export interface FetchResult {
    url: string;
    status: number;
    html: string;
    error?: string;
    success: boolean;
}

export interface IHtmlFetcher {
    downloadHtml(url: string): Promise<FetchResult>;
}

export interface FetchTask {
    taskId: string;
    url: string;
}

export class ProviderOfflineError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ProviderOfflineError";
    }
}

export class TaskAcknowledgmentError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "TaskAcknowledgmentError";
    }
}

export interface IUrlSource {
    getNextTasks(limit: number): Promise<FetchTask[]>;
    markTaskComplete(taskId: string): Promise<void>;
    markTaskFailed(taskId: string): Promise<void>;
}


export interface urlStorage {
    saveRawHtml(url: string, html: string): Promise<string | void>;
}
