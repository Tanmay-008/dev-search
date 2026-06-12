import { sqsClient } from "./SQSCliint";
import { SqsMessageQueue } from "./sqsMessageQueue";
export class QueueFactory {
    private readonly client = sqsClient; 

    getQueue(name: 'discovery' | 'failed' | 'priority') {
        const urls = {
            discovery: process.env.DISCOVERY_Q!,
            failed: process.env.FAILED_Q!,
            priority: process.env.PRIORITY_Q!
        };

        return new SqsMessageQueue(this.client, urls[name]);
    }
}