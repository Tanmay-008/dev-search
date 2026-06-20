import { GetObjectCommand } from "@aws-sdk/client-s3";
import s3Client from "../../../../../infrastructure/aws/s3Client";
import { IParserStorage, IRawData } from "../types";

export class S3ParserAdapter implements IParserStorage {
    private bucketName: string;

    constructor() {
        if (!process.env.S3_BUCKET_NAME) {
            console.warn("WARNING: S3_BUCKET_NAME missing in environment, defaulting to 'search-engine-raw-html'");
        }
        this.bucketName = process.env.S3_BUCKET_NAME || 'search-engine-raw-html';
    }

    async getRawData(s3Key: string): Promise<IRawData> {
        const command = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: s3Key,
        });

        try {
            const response = await s3Client.send(command);

            if (!response.Body) {
                throw new Error("S3 object body is empty");
            }

            const html = await response.Body.transformToString();

            return {
                s3Key,
                html
            };
        } catch (error: any) {
            console.error(`[S3 Parser] Error fetching ${s3Key} from S3:`, error.message);
            throw new Error(`Failed to get raw HTML from S3 for key: ${s3Key}`);
        }
    }
}
