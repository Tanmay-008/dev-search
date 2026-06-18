import * as dotenv from "dotenv";
dotenv.config();

import { SendMessageBatchCommand } from "@aws-sdk/client-sqs";
import { sqsClient } from "../infrastructure/aws/index.js";

const QUEUE_URL = process.env.SQS_URL;

const SEED_URLS = [
    "https://en.wikipedia.org/wiki/Web_crawler",
    "https://news.ycombinator.com/",
    "https://github.com/",
    "https://example.com/",
    "https://developer.mozilla.org/en-US/"
];

async function injectSeeds() {
    if (!QUEUE_URL) {
        throw new Error("SQS_URL is not defined in .env");
    }

    console.log(`Injecting ${SEED_URLS.length} seed URLs into SQS...`);

    const entries = SEED_URLS.map((url, index) => ({
        Id: `seed-${index}-${Date.now()}`,
        MessageBody: JSON.stringify({ url })
    }));

    const command = new SendMessageBatchCommand({
        QueueUrl: QUEUE_URL,
        Entries: entries
    });

    try {
        const response = await sqsClient.send(command);
        console.log(`Successfully injected ${response.Successful?.length || 0} URLs.`);
        if (response.Failed && response.Failed.length > 0) {
            console.error("Failed to inject some URLs:", response.Failed);
        }
    } catch (error) {
        console.error("Error injecting seeds:", error);
    }
}

injectSeeds().then(() => {
    console.log("Seed injection complete.");
    process.exit(0);
});
