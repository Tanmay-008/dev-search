import { PutObjectCommand } from "@aws-sdk/client-s3";
import s3Client from "../../../../infrastructure/aws/s3Client";
import { ParsedData } from "../types";

export class S3ParsedDataStorageAdapter {
    private bucketName: string;

    constructor() {
        // Hardcoding based on user specification
        this.bucketName = 'tanmay-serchengine-text-data';
    }

    async saveParsedData(parsedData: ParsedData): Promise<string> {
        // Derive the json key from the raw HTML S3 key
        // E.g. "raw-html/abc123xyz.html" -> "parsed-data/abc123xyz.json"
        const hash = parsedData.s3Key.split('/').pop()?.replace('.html', '') || Date.now().toString();
        const key = `parsed-data/${hash}.json`;

        // Omit extractedUrls so they aren't stored in S3
        const { extractedUrls, ...dataToSave } = parsedData;
        const jsonString = JSON.stringify(dataToSave, null, 2);

        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            Body: jsonString,
            ContentType: "application/json"
        });

        try {
            await s3Client.send(command);
            console.log(`[S3 Storage] Successfully saved parsed JSON to s3://${this.bucketName}/${key}`);
            return key;
        } catch (error: any) {
            console.error("[S3 Storage] AWS S3 PutObject Error:", error.message);
            throw new Error(`Failed to save parsed JSON to S3.`);
        }
    }
}
