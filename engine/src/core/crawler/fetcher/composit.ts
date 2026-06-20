import { FetchTask, IUrlSource } from "./types.js";
import { SeedAdapter } from "./seed.adapter.js";

export class CompositeUrlSource implements IUrlSource {
    constructor(
        private seedSource: SeedAdapter,
        private sqsSource: IUrlSource
    ) { }

    async getNextTasks(limit: number): Promise<FetchTask[]> {
        if (this.seedSource.hasRemainingSeeds()) {
            return this.seedSource.getNextTasks(limit);
        }
        return this.sqsSource.getNextTasks(limit);
    }

    async markTaskComplete(taskId: string): Promise<void> {
        if (taskId.startsWith('seed-')) {
            return this.seedSource.markTaskComplete(taskId);
        }
        return this.sqsSource.markTaskComplete(taskId);
    }

    async markTaskFailed(taskId: string): Promise<void> {
        if (taskId.startsWith('seed-')) {
            return this.seedSource.markTaskFailed(taskId);
        }
        return this.sqsSource.markTaskFailed(taskId);
    }
}
