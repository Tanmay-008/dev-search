import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

interface EnvConfig {
  MONGO_URI: string;
  PORT: number;
  NODE_ENV: string;
}

const getEnv = (): EnvConfig => {
  if (!process.env.MONGO_URI) {
    throw new Error("❌ FATAL ERROR: MONGO_URI is missing in .env file");
  }

  return {
    MONGO_URI: process.env.MONGO_URI,
    PORT: Number(process.env.PORT) || 5000,
    NODE_ENV: process.env.NODE_ENV || "development",
  };
};

// 3. Clean object export karo
export const env = getEnv();