import { createClient } from "redis";

if (!process.env.REDIS_URL) {
  throw new Error(
    "CRITICAL STARTUP ERROR: REDIS_URL is missing in environment variables!"
  );
}

export const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient.on("error", (err) =>
  console.error("Redis Client Error:", err)
);
