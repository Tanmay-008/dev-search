import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand, ChangeMessageVisibilityCommand } from "@aws-sdk/client-sqs";
import { FetchTask, IUrlSource } from "../../core/crawler/fetcher/types";

export class SqsUrlSourceAdapter implements IUrlSource {
    private sqsClient: SQSClient;
    private queueUrl: string;

    constructor() {
        this.queueUrl = process.env.SQS_URL || "";
        this.sqsClient = new SQSClient({
            region: process.env.SQS_REGION || "eu-north-1",
            credentials: {
                accessKeyId: process.env.SQS_ACCESSKEYID || "",
                secretAccessKey: process.env.SQS_SECREATEACCESSKEY || ""
            }
        });
    }

    async getNextTasks(limit: number): Promise<FetchTask[]> {
        if (!this.queueUrl) throw new Error("SQS_URL is not configured.");

        const command = new ReceiveMessageCommand({
            QueueUrl: this.queueUrl,
            MaxNumberOfMessages: Math.min(limit, 10), // AWS SQS allows a max batch size of 10
            WaitTimeSeconds: 20 // Long polling to prevent rapid empty requests
        });

        const response = await this.sqsClient.send(command);

        if (!response.Messages || response.Messages.length === 0) {
            return [];
        }

        // Map the SQS messages to the generic FetchTask interface expected by Core
        return response.Messages.map(msg => ({
            taskId: msg.ReceiptHandle || "",
            url: msg.Body || ""
        })).filter(task => task.taskId && task.url);
    }

    async markTaskComplete(taskId: string): Promise<void> {
        if (!this.queueUrl) return;

        const command = new DeleteMessageCommand({
            QueueUrl: this.queueUrl,
            ReceiptHandle: taskId
        });

        await this.sqsClient.send(command);
    }

    async markTaskFailed(taskId: string): Promise<void> {
        if (!this.queueUrl) return;

        // Change visibility to 0 so the message instantly becomes available again for retry
        const command = new ChangeMessageVisibilityCommand({
            QueueUrl: this.queueUrl,
            ReceiptHandle: taskId,
            VisibilityTimeout: 0
        });

        await this.sqsClient.send(command);
    }
}
