import * as dotenv from 'dotenv';
dotenv.config();

import { SqsAdapter } from "./adapters/sqs.adapter";
import { Fetcher } from "./fetcher";
import { FetcherDaemon } from "./fetcher-daemon";
import { UndiciHtmlFetcher } from "./http/html-fetcher";
import { S3StorageAdapter } from "./adapters/s3-storage.adapter";
import { UrlBufferQueue } from "./url-buffer-queue";

export function createFetcherService(): FetcherDaemon {
    const urlSource = new SqsAdapter();
    const queue = new UrlBufferQueue(urlSource, 4, 50);
    const htmlFetcher = new UndiciHtmlFetcher();
    const fetcher = new Fetcher(htmlFetcher);
    const storage = new S3StorageAdapter();
    const daemon = new FetcherDaemon(queue, fetcher, urlSource, storage);

    return daemon;
}

if (require.main === module) {
    console.log("Starting Fetcher Service...");
    const daemon = createFetcherService();

    daemon.start().catch(err => {
        console.error("Fetcher service crashed!", err);
        process.exit(1);
    });

    process.on('SIGINT', () => {
        console.log("\nShutting down Fetcher Service...");
        daemon.stop();
        setTimeout(() => process.exit(0), 1000);
    });
}
