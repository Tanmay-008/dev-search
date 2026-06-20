import { PutObjectCommand } from "@aws-sdk/client-s3";
import s3Client from "../../../../../infrastructure/aws/s3Client";
import crypto from "crypto";
import { IStorage } from "../types";
import { tracer } from "../../../../observability/traces/traces";
import { SpanStatusCode, Span } from "@opentelemetry/api";

export class S3StorageAdapter implements IStorage {
    private bucketName: string;

    constructor() {
        if (!process.env.S3_BUCKET_NAME) {
            console.warn("WARNING: S3_BUCKET_NAME missing in environment, defaulting to 'search-engine-raw-html'");
        }
        this.bucketName = process.env.S3_BUCKET_NAME || 'search-engine-raw-html';
    }

    async saveRawHtml(url: string, html: string): Promise<string> {
        return tracer.startActiveSpan("S3StorageAdapter.saveRawHtml", async (span: Span) => {
            const hash = crypto.createHash('sha256').update(url).digest('hex');
            const key = `raw-html/${hash}.html`;
            span.setAttribute("url", url);
            span.setAttribute("s3.key", key);
            span.setAttribute("s3.bucket", this.bucketName);

            const command = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: html,
                ContentType: "text/html"
            });

            try {
                await s3Client.send(command);
                console.log(`[S3 Storage] Successfully saved HTML  to s3://${this.bucketName}/${key}`);
                span.setStatus({ code: SpanStatusCode.OK });
                return key;
            } catch (error: any) {
                console.error("[S3 Storage] AWS S3 PutObject Error:", error.message);
                span.recordException(error);
                span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
                throw new Error(`Failed to save HTML  to S3.`);
            } finally {
                span.end();
            }
        });
    }
}
