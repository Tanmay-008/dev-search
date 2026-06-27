import { TextModel } from "./models/text.model";
import crypto from "crypto";

export class TextDatabaseAdapter {
    async saveTextData(data: {
        url: string;
        title: string;
        description: string;
        chunk_text: string;
        s3_parsed_key: string;
        media_s3_key?: string;
    }): Promise<void> {
        try {
            // Generate a unique hash for this chunk using URL and text
            const chunk_hash = crypto.createHash('sha256').update(data.url + data.chunk_text).digest('hex');
            
            const textDoc = new TextModel({
                ...data,
                chunk_hash
            });
            
            await textDoc.save();
            console.log(`[Database] Successfully saved parsed data to MongoDB for URL: ${data.url}`);
        } catch (error: any) {
            console.error("[Database] Error saving to MongoDB:", error.message);
            throw error;
        }
    }
}
