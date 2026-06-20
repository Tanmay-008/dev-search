import { FetchTask, IUrlSource } from "./types";
import { seedUrls } from "../frontier/seeds";

export class SeedAdapter implements IUrlSource {
    private seeds: string[] = [...seedUrls];

    async getNextTasks(limit: number): Promise<FetchTask[]> {
        const tasks: FetchTask[] = [];
        const fetchCount = Math.min(limit, this.seeds.length);

        for (let i = 0; i < fetchCount; i++) {
            const url = this.seeds.shift()!;
            tasks.push({ taskId: `seed-${Date.now()}-${i}`, url });
        }

        return tasks;
    }

    async markTaskComplete(taskId: string): Promise<void> {
        // No-op for seeds, they don't need to be deleted from an external queue
    }

    async markTaskFailed(taskId: string): Promise<void> {
        // No-op for seeds, maybe retry logic later, but for now just drop
    }

    hasRemainingSeeds(): boolean {
        return this.seeds.length > 0;
    }
}
