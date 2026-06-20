import { UrlBufferQueue } from "./url-buffer-queue";
import { Fetcher } from "./fetcher";
import { IUrlSource, IStorage } from "./types";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class FetcherDaemon {
    private isRunning: boolean = false;
    private readonly CONCURRENCY_LIMIT = 4;

    constructor(
        private readonly queue: UrlBufferQueue,
        private readonly fetcher: Fetcher,
        private readonly urlSource: IUrlSource,
        private readonly storage: IStorage
    ) { }

    public async start() {
        if (this.isRunning) return;
        this.isRunning = true;

        console.log("🚀 Fetcher Daemon Started...");

        while (this.isRunning) {
            try {
                // 1. Queue se ek chunk maango
                const chunk = this.queue.getBatch(this.CONCURRENCY_LIMIT);

                // 2. THE STARVATION CHECK (CPU Saver)
                // Agar queue khali hai, toh CPU ko relax karo
                if (chunk.length === 0) {
                    console.log("[DAEMON] Queue empty. Sleeping for 500ms to prevent CPU burn...");
                    await sleep(500);
                    continue;
                }

                console.log(`[DAEMON] Fired chunk of ${chunk.length} URLs. Buffer remaining: ${this.queue.getLength()}`);

                // 3. Parallel Fetching with Concurrency Limit
                const fetchPromises = chunk.map(task => this.fetcher.fetchWebPage(task.url));
                const results = await Promise.allSettled(fetchPromises);

                // 4. Result Processing + Task Acknowledgment
                for (let i = 0; i < results.length; i++) {
                    const result = results[i];
                    const task = chunk[i];

                    if (result.status === 'fulfilled') {
                        const res = result.value;
                        if (res.status >= 200 && res.status < 300) {
                            console.log(`[SUCCESS] ${task.url} | Status: ${res.status} | Length: ${res.html.length} chars`);
                            try {
                                await this.storage.saveRawHtml(task.url, res.html);
                                await this.urlSource.markTaskComplete(task.taskId);
                            } catch (e: any) {
                                console.error(`[STORAGE ERROR] Failed to save ${task.url}`, e);
                                await this.urlSource.markTaskFailed(task.taskId);
                            }
                        } else {
                            console.log(`[FAILED]  ${task.url} | Status: ${res.status} | Error: ${res.error}`);
                            await this.urlSource.markTaskFailed(task.taskId);
                        }
                    } else {
                        console.log(`[ERROR]   ${task.url} | Unhandled Rejection: ${result.reason}`);
                        await this.urlSource.markTaskFailed(task.taskId);
                    }
                }

            } catch (error) {
                console.error("[DAEMON] Loop error. Sleeping 5s before retry...", error);
                await sleep(5000);
            }
        }

        console.log("🛑 Fetcher Daemon Stopped.");
    }

    public stop() {
        console.log("🛑 Fetcher Daemon Stopping...");
        this.isRunning = false;
    }
}
