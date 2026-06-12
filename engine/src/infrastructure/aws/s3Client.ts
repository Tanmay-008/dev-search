import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Fail Fast: Agar credentials miss hue toh yahi crash hoga
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error("CRITICAL: AWS credentials missing in environment variables.");
}

const s3Client = new S3Client({
    region: process.env.AWS_REGION || "ap-south-1",

    // Explicitly mapping credentials (Hardcoding the resolution path)
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },

    maxAttempts: 3
});

export default s3Client;