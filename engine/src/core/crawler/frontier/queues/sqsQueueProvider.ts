import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { sqsClient } from "../../../../infrastructure/aws/sqsClient";
import { IQueueProvider, FrontierTask } from "../interfaces/queue-provider.interface";

export class SqsQueueProvider implements IQueueProvider {
    private queueUrl: string;

    constructor() {
        this.queueUrl = process.env.SQS_URL || "";
    }

    async publishURL(url: string): Promise<void> {
        if (!this.queueUrl) return;
        const command = new SendMessageCommand({
            QueueUrl: this.queueUrl,
            MessageBody: JSON.stringify({ url })
        });
        try {
            await sqsClient.send(command);
            console.log(`[SQS Queue Provider] Successfully published URL to SQS: ${url}`);
        } catch (error: any) {
            console.error(`[SQS Queue Provider] Error publishing to SQS: ${error.message}`);
            throw error;
        }
    }

    async fetchURL(limit: number): Promise<FrontierTask[]> {
        return [];
    }

    async markComplete(taskId: string): Promise<void> { }
    async markFailed(taskId: string): Promise<void> { }
}
