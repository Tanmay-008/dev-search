import { PutObjectCommand } from "@aws-sdk/client-s3";
import s3Client from "./s3Client";
import { ParsedData, ParsedDataStorage } from "../../core/crawler/Parser/types";

export class S3ParsedDataStorageAdapter implements ParsedDataStorage {
    private bucketName: string;

    constructor() {
        this.bucketName = 'tanmay-serchengine-text-data';
    }

    async saveParsedData(parsedData: ParsedData): Promise<string> {
        const hash = parsedData.s3Key.split('/').pop()?.replace('.html', '') || Date.now().toString();
        const key = `parsed-data/${hash}.json`;

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
