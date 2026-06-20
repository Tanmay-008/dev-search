import { S3StorageAdapter } from "../../../../infrastructure/aws/s3-storage";
import { UndiciHtmlFetcher } from "../http/html-fetcher";
import { Fetcher } from "../fetcher";
import * as fs from "fs";
import * as path from "path";

async function runS3UploadTest() {
     console.log("🚀 Starting S3 Upload Test from Seeds...");

     // 1. Setup fetcher and storage
     const storage = new S3StorageAdapter();
     const htmlFetcher = new UndiciHtmlFetcher();
     const fetcher = new Fetcher(htmlFetcher);

     // 2. Load URLs from seeds.json
     // path to search-engine/backend/seeds.json
     const seedsPath = path.resolve(__dirname, "../../../../../seeds.json");
     let seeds: any[] = [];

     try {
          const rawData = fs.readFileSync(seedsPath, "utf-8");
          seeds = JSON.parse(rawData);
     } catch (error) {
          console.error("❌ Failed to read seeds.json", error);
          return;
     }

     // 3. Take first 2 URLs for testing so it doesn't run forever
     const testSeeds = seeds.slice(0, 10);
     console.log(`Found ${seeds.length} URLs in seeds.json. Testing first ${testSeeds.length}...`);

     for (const seed of testSeeds) {
          const url = seed.url;
          console.log(`\n-----------------------------------`);
          console.log(`🌐 Fetching: ${url}`);

          try {
               // Fetch Web Page
               const result = await fetcher.fetchWebPage(url);

               if (result.success && result.html) {
                    console.log(`✅ Successfully fetched HTML! Length: ${result.html.length} chars`);

                    // Store in S3
                    console.log(`⏳ Uploading to S3...`);
                    const s3ReturnValue = await storage.saveRawHtml(url, result.html);

                    // Log what S3 adapter returns
                    console.log(`💾 S3 Storage Adapter returned S3 Key: ${s3ReturnValue}`);
               } else {
                    console.error(`❌ Fetching failed for ${url}. Error: ${result.error}`);
               }
          } catch (error) {
               console.error(`⚠️ Exception while processing ${url}:`, error);
          }
     }
     console.log(`\n🏁 S3 Upload Test Finished!`);
}

runS3UploadTest();