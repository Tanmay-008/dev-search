import * as dotenv from 'dotenv';
dotenv.config();

import { HtmlFetcher } from "../../fetcher/http/html-fetcher";
import { S3StorageAdapter } from "../../../../infrastructure/aws/s3-storage";
import { S3ParserAdapter } from "../../../../infrastructure/aws/s3-parser.adapter";
import { S3ParsedDataStorageAdapter } from "../../../../infrastructure/aws/s3-parsed-data.adapter";
import { SqsParserPublisherAdapter } from "../../../../infrastructure/aws/sqs-parser-publisher.adapter";
import { Parser } from "../parser";
import { mongodbConnection } from "../../../../config/db";
import { TextDatabaseAdapter } from "../../../../infrastructure/database/text-database.adapter";
import mongoose from "mongoose";

const TEST_URL = "https://react.dev/"; // CSR URL to test fallback

async function runTest() {
    try {
        console.log(`\n🚀 Starting End-to-End Test for: ${TEST_URL}\n`);

        // 1. Initialize Adapters
        const fetcher = new HtmlFetcher();
        const rawStorage = new S3StorageAdapter();
        const parserS3Adapter = new S3ParserAdapter();
        const parser = new Parser();
        const parsedStorage = new S3ParsedDataStorageAdapter();
        const sqsPublisher = new SqsParserPublisherAdapter();
        const textDbAdapter = new TextDatabaseAdapter();

        console.log("🔌 Connecting to MongoDB...");
        await mongodbConnection();

        // 2. Fetch the Web Page
        console.log("📥 Step 1: Fetching Web Page...");
        const fetchResult = await fetcher.downloadHtml(TEST_URL);
        if (!fetchResult.success) {
            throw new Error(`Failed to fetch: ${fetchResult.error}`);
        }
        console.log(`✅ Fetched successfully. HTML length: ${fetchResult.html.length} characters.`);

        // 3. Save Raw HTML to S3
        console.log("\n💾 Step 2: Saving Raw HTML to S3...");
        const s3Key = await rawStorage.saveRawHtml(TEST_URL, fetchResult.html);
        console.log(`✅ Saved Raw HTML to S3 with key: ${s3Key}`);

        // 4. Parser gets data from S3
        console.log("\n🔍 Step 3: Parser fetching Raw HTML from S3...");
        const rawData = await parserS3Adapter.getRawData(s3Key);
        console.log(`✅ Retrieved HTML from S3. Length: ${rawData.html.length}`);

        // 5. Parse the HTML
        console.log("\n⚙️  Step 4: Parsing the HTML...");
        const parsedData = await parser.parseHtml(rawData);
        console.log(`✅ Parsed successfully!`);
        console.log(`   - Title: ${parsedData.metadata.title}`);
        console.log(`   - Description: ${parsedData.metadata.description}`);
        console.log(`   - Text length: ${parsedData.text.length} characters.`);
        console.log(`   - Extracted URLs (Absolute): ${parsedData.extractedUrls.length} found.`);

        // 6. Save Parsed JSON to S3
        console.log("\n📦 Step 5: Saving Parsed Data to S3 (JSON)...");
        const parsedKey = await parsedStorage.saveParsedData(parsedData);
        console.log(`✅ Saved Parsed JSON to S3 with key: ${parsedKey}`);

        // 7. Push URLs to SQS
        console.log("\n🚀 Step 6: Pushing Extracted URLs to SQS...");
        if (parsedData.extractedUrls.length > 0) {
            await sqsPublisher.publishUrls(parsedData.extractedUrls);
            console.log(`✅ Successfully published URLs to SQS.`);
        } else {
            console.log(`⚠️ No URLs to publish.`);
        }
        // 8. Save to MongoDB
        console.log("\n🗄️  Step 7: Saving Text Document to MongoDB...");
        await textDbAdapter.saveTextData({
            url: TEST_URL,
            title: parsedData.metadata.title,
            description: parsedData.metadata.description,
            chunk_text: parsedData.text,
            s3_parsed_key: parsedKey,
            media_s3_key: parsedData.metadata.media_s3_key
        });
        console.log(`✅ Successfully saved parsed document to MongoDB.`);

        console.log("\n🎉 End-to-End Test Completed Successfully!\n");
    } catch (error) {
        console.error("\n❌ Test Failed:", error);
    } finally {
        await mongoose.disconnect();
        console.log("🔌 MongoDB disconnected.");
    }
}

runTest();
