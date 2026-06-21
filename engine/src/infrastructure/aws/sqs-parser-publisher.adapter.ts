import { UrlPublisher } from "../../core/crawler/Parser/types";
import { URLFrontier } from "../../core/crawler/frontier";

export class SqsParserPublisherAdapter implements UrlPublisher {
    private frontier: URLFrontier;

    constructor() {
        this.frontier = URLFrontier.create();
    }

    async publishUrls(urls: string[]): Promise<void> {
        if (urls.length === 0) return;

        console.log(`[Parser Publisher] Processing ${urls.length} extracted URLs through the Frontier pipeline...`);
        for (const url of urls) {
            await this.frontier.addUrls(url);
        }
    }
}
