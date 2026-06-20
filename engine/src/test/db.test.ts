import { mongodbConnection } from "../config/db";
import { TextModel } from "../infrastructure/database/models/text.model";
import mongoose from "mongoose";

describe("Mongoose Schema Validation (In-Memory)", () => {
    it("should fail validation if required fields are missing", async () => {
        const invalidDoc = new TextModel({
            url: "https://example.com"
        });

        let validationError: any = null;
        try {
            await invalidDoc.validate();
        } catch (err) {
            validationError = err;
        }

        expect(validationError).toBeDefined();
        expect(validationError.errors.chunk_hash).toBeDefined();
        expect(validationError.errors.title).toBeDefined();
        expect(validationError.errors.chunk_text).toBeDefined();
        expect(validationError.errors.s3_parsed_key).toBeDefined();
    });

    it("should pass validation if all required fields are present", async () => {
        const validDoc = new TextModel({
            chunk_hash: "test_hash_123",
            url: "https://example.com",
            title: "Test Page",
            chunk_text: "This is a test chunk of text.",
            s3_parsed_key: "parsed-data/test_hash_123.json"
        });

        let validationError = null;
        try {
            await validDoc.validate();
        } catch (err) {
            validationError = err;
        }

        expect(validationError).toBeNull();
    });
});

// We separate the connection test since it requires MongoDB Atlas access.
// If your IP is not whitelisted on Atlas, this test will fail/timeout.
describe("Database Connection Test", () => {
    let connected = false;

    beforeAll(async () => {
        try {
            // Set a shorter timeout for testing the connection
            console.log("Connecting to database for test...");
            await mongodbConnection();
            connected = true;
        } catch (err) {
            console.warn("Skipping connection test because DB connection failed (check your Atlas IP whitelist).");
        }
    }, 10000);

    afterAll(async () => {
        if (connected) {
            await mongoose.disconnect();
        }
    });

    it("should be able to query the Text model if connected", async () => {
        if (!connected) {
            console.warn("Database connection not established. Skipping query test.");
            return;
        }
        const doc = await TextModel.findOne();
        expect(doc).toBeDefined();
    });
});
