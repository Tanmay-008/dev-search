import { ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";
import { sqsClient } from "../../../../infrastructure/aws";
import { IUrlSource, FetchTask, ProviderOfflineError, TaskAcknowledgmentError } from "../types";

export class SqsAdapter implements IUrlSource {
    private queueUrl: string;

    constructor() {
        if (!process.env.SQS_URL) {
            throw new Error("CRITICAL: SQS_URL missing in environment.");
        }
        this.queueUrl = process.env.SQS_URL;
    }
    markTaskFailed(taskId: string): Promise<void> {
        throw new Error("Method not implemented.");
    }

    async getNextTasks(limit: number): Promise<FetchTask[]> {
        const fetchCount = Math.min(limit, 10);

        const command = new ReceiveMessageCommand({
            QueueUrl: this.queueUrl,
            MaxNumberOfMessages: fetchCount,
            WaitTimeSeconds: 20,
            VisibilityTimeout: 60
        });

        try {
            const response = await sqsClient.send(command);

            if (!response.Messages || response.Messages.length === 0) {
                return [];
            }

            const tasks: FetchTask[] = [];

            for (const msg of response.Messages) {
                if (msg.Body && msg.ReceiptHandle) {
                    try {
                        const payload = JSON.parse(msg.Body);

                        if (payload.url) {
                            tasks.push({
                                taskId: msg.ReceiptHandle,
                                url: payload.url
                            });
                        }
                    } catch (e) {
                        console.error(`Invalid JSON in SQS message: ${msg.MessageId}`);
                    }
                }
            }

            return tasks;

        } catch (error: any) {
            console.error("AWS SQS Error:", error.message);
            throw new ProviderOfflineError("Failed to fetch URLs from queue. Queue might be down.");
        }
    }

    async markTaskComplete(taskId: string): Promise<void> {
        const command = new DeleteMessageCommand({
            QueueUrl: this.queueUrl,
            ReceiptHandle: taskId
        });

        try {
            await sqsClient.send(command);
        } catch (error: any) {
            console.error("AWS SQS Delete Error:", error.message);
            throw new TaskAcknowledgmentError(`Failed to delete task ${taskId} from queue.`);
        }
    }
}
