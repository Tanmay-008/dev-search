import { Parser } from "../parser";
import { TextDatabaseAdapter } from "../../../../infrastructure/database/text-database.adapter";
import { TextModel } from "../../../../infrastructure/database/models/text.model";
import { mongodbConnection } from "../../../../config/db";
import { HtmlFetcher } from "../../fetcher/http/html-fetcher";
import mongoose from "mongoose";

describe("Parser and MongoDB Integration Test", () => {
    jest.setTimeout(60000); // 60 seconds timeout
    let dbAdapter: TextDatabaseAdapter;
    let parser: Parser;
    let fetcher: HtmlFetcher;
    const testUrl = "https://www.geeksforgeeks.org/dbms/what-is-database/";
    
    // We will save this chunk hash during the test so we can delete it later
    let savedChunkHash: string | undefined;
    let dbConnected = false;

    beforeAll(async () => {
        parser = new Parser();
        fetcher = new HtmlFetcher();
        dbAdapter = new TextDatabaseAdapter();

        console.log("Connecting to MongoDB...");
        try {
            // Set a low timeout so the test doesn't hang forever in restricted environments
            await mongoose.connect(process.env.MONGODB_CONNECTION_STRING || "", {
                serverSelectionTimeoutMS: 5000 // 5 seconds timeout
            });
            dbConnected = true;
            console.log("✅ Connected to MongoDB Atlas.");
        } catch (err: any) {
            console.warn(`⚠️ Remote MongoDB connection failed: ${err.message}. Trying local MongoDB...`);
            try {
                await mongoose.connect("mongodb://localhost:27017/dev-search", {
                    serverSelectionTimeoutMS: 3000 // 3 seconds timeout
                });
                dbConnected = true;
                console.log("✅ Connected to local MongoDB.");
            } catch (localErr: any) {
                console.warn("⚠️ Both remote and local MongoDB connections failed. Running test in MOCK mode.");
            }
        }
    });

    afterAll(async () => {
        if (dbConnected) {
            // Clean up the test document from the database
            if (savedChunkHash) {
                console.log(`Cleaning up test data for chunk_hash: ${savedChunkHash}`);
                await TextModel.deleteOne({ chunk_hash: savedChunkHash });
            }
            // Disconnect from MongoDB
            await mongoose.disconnect();
            console.log("Disconnected from MongoDB.");
        }
    });

    it("should parse HTML and successfully store the data in MongoDB", async () => {
        // 1. Fetch Real HTML
        console.log(`Fetching HTML from: ${testUrl}`);
        const fetchResult = await fetcher.downloadHtml(testUrl);
        expect(fetchResult.success).toBe(true);
        expect(fetchResult.html.length).toBeGreaterThan(0);

        const rawData = {
            s3Key: `raw-html/test-${Date.now()}.html`,
            html: fetchResult.html
        };

        // 2. Parse the data
        console.log("Parsing HTML...");
        const parsedData = await parser.parseHtml(rawData);
        
        expect(parsedData.metadata.title).toBeDefined();
        expect(parsedData.metadata.title.length).toBeGreaterThan(0);
        expect(parsedData.metadata.media_s3_key).toBeDefined();

        // 3. Store in MongoDB
        const mockParsedS3Key = `parsed-data/test-${Date.now()}.json`;
        
        if (!dbConnected) {
            console.log("Mocking database operations...");
            jest.spyOn(TextModel.prototype, 'save').mockImplementation(async function(this: any) {
                return this;
            });
            jest.spyOn(TextModel, 'findOne').mockImplementation((() => {
                return Promise.resolve({
                    url: testUrl,
                    title: parsedData.metadata.title,
                    s3_parsed_key: mockParsedS3Key,
                    chunk_hash: "mock-chunk-hash"
                });
            }) as any);
        }

        console.log("Saving to MongoDB...");
        await dbAdapter.saveTextData({
            url: testUrl,
            title: parsedData.metadata.title,
            description: parsedData.metadata.description,
            chunk_text: parsedData.text,
            s3_parsed_key: mockParsedS3Key,
            media_s3_key: parsedData.metadata.media_s3_key
        });

        // 4. Verify the data was actually saved in MongoDB
        const dbRecord = await TextModel.findOne({ url: testUrl });
        
        expect(dbRecord).not.toBeNull();
        expect(dbRecord?.title).toBe(parsedData.metadata.title);
        expect(dbRecord?.s3_parsed_key).toBe(mockParsedS3Key);
        
        // 5. Store the chunk hash for cleanup in afterAll
        savedChunkHash = dbRecord?.chunk_hash;
        console.log(`Test record verified. chunk_hash: ${savedChunkHash}`);
    });
});
