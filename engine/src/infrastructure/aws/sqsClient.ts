import { SQSClient } from "@aws-sdk/client-sqs";

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error("CRITICAL STARTUP ERROR: AWS Credentials missing in environment variables!");
}

if (!process.env.SQS_REGION && !process.env.AWS_REGION) {
    console.warn("WARNING: SQS_REGION is missing. Defaulting to 'us-east-1'.");
}

export const sqsClient = new SQSClient({
    region: process.env.AWS_REGION || process.env.SQS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    maxAttempts: 3
});