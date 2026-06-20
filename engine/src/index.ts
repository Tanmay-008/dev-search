import 'dotenv/config';
import { createFetcherService } from './crawler/core/fetcher/index.js';


async function main() {
    const daemon = createFetcherService();

    await daemon.start();
}

main().catch(err => {
    console.error(" Crawler Service crashed:", err);
    process.exit(1);
});

process.on('SIGINT', () => {
    console.log("\n Gracefully shutting down Crawler Service...");
    process.exit(0);
});
