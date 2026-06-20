import { FetchTask, IUrlSource } from "./types";

export class UrlBufferQueue {
    private tasks: FetchTask[] = [];
    private isFetchingFromFrontier: boolean = false;

    constructor(
        private readonly frontierClient: IUrlSource,
        private readonly lowWatermark: number = 12,
        private readonly fetchBatchSize: number = 50
    ) { }

    public getBatch(size: number): FetchTask[] {
        const batch = this.tasks.splice(0, size);

        this.checkAndRefill();

        return batch;
    }

    public getLength(): number {
        return this.tasks.length;
    }
    private async checkAndRefill() {
        if (this.tasks.length <= this.lowWatermark && !this.isFetchingFromFrontier) {
            this.isFetchingFromFrontier = true;
            try {
                console.log(`[QUEUE] Low watermark hit (${this.tasks.length} left). Fetching max ${this.fetchBatchSize} new tasks from Frontier...`);

                // Naye tasks laao
                const newTasks = await this.frontierClient.getNextTasks(this.fetchBatchSize);

                if (newTasks.length > 0) {
                    this.tasks.push(...newTasks);
                    console.log(`[QUEUE] Refilled! Current Buffer Size: ${this.tasks.length}`);
                }
            } catch (error) {
                console.error("[QUEUE] Frontier is down or failed to fetch new URLs!", error);
            } finally {
                this.isFetchingFromFrontier = false;
            }
        }
    }
}
