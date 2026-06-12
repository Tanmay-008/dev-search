import { Fetcher } from "../fetcher";
import { FetcherDaemon } from "../fetcher-daemon";
import { UndiciHtmlFetcher } from "../http/html-fetcher";
import { UrlBufferQueue } from "../url-buffer-queue";
import { FetchTask, IUrlSource, IStorage } from "../types";

class MockStorage implements IStorage {
    async saveRawHtml(url: string, html: string): Promise<void> {
        console.log(`  💾 [MockStorage] Saved ${html.length} bytes for ${url}`);
    }
}

class MockFrontierSource implements IUrlSource {
    private urlPool: string[] = [
        "https://en.wikipedia.org/wiki/Distributed_computing",
        "https://news.ycombinator.com/",
        "https://developer.mozilla.org/en-US/docs/Web/HTTP",
        "https://lite.cnn.com/",
        "https://books.toscrape.com/catalogue/category/books/travel_2/index.html",
        "https://books.toscrape.com/catalogue/category/books/mystery_3/index.html",
        "https://quotes.toscrape.com/page/1/",
        "https://quotes.toscrape.com/page/2/",
        "https://react.dev/",
        "https://angular.io/",
        "https://www.tesla.com/",
        "https://auth0.com/"
    ];
    private counter = 0;

    async getNextTasks(limit: number): Promise<FetchTask[]> {
        const batch = this.urlPool.splice(0, limit);
        return batch.map(url => ({
            taskId: `task-${++this.counter}`,
            url
        }));
    }

    async markTaskComplete(taskId: string): Promise<void> {
        console.log(`  ✅ ACK Complete: ${taskId}`);
    }

    async markTaskFailed(taskId: string): Promise<void> {
        console.log(`  ❌ ACK Failed: ${taskId}`);
    }
}

async function testFetcherDaemon() {
    const mockSource = new MockFrontierSource();
    const mockStorage = new MockStorage();
    const queue = new UrlBufferQueue(mockSource, 4, 8);
    const htmlFetcher = new UndiciHtmlFetcher();
    const fetcher = new Fetcher(htmlFetcher);
    const daemon = new FetcherDaemon(queue, fetcher, mockSource, mockStorage);

    console.log(`🚀 Starting FetcherDaemon Test with 12 real URLs...`);

    const daemonPromise = daemon.start();

    setTimeout(() => {
        console.log("\n⏱️ 60s limit reached. Stopping daemon...");
        daemon.stop();
    }, 60_000);

    await daemonPromise;
    console.log("🏁 FetcherDaemon Test Finished.");
}

testFetcherDaemon();
