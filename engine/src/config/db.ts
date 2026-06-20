import mongoose from "mongoose";
import "dotenv/config";

const mongodbConnection = async () => {
    try {
        if (!process.env.MONGODB_CONNECTION_STRING) {
            throw new Error("MONGODB_CONNECTION_STRING is not defined in .env");
        }

        const conn = await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
            dbName: process.env.MONGODB_NAME || "dev-search"
        });
        console.log("MongoDB connected via Mongoose");
        return conn.connection;
    } catch (error: any) {
        throw new Error(`Failed to connect to MongoDB: ${error.message}`);
    }
}

export { mongodbConnection }