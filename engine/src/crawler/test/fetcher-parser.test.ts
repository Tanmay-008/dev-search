import { Fetcher } from "../core/fetcher/fetcher";
import { UndiciHtmlFetcher } from "../core/fetcher/http/html-fetcher";
import { Parser } from "../core/Parser/parser";

describe("Fetcher and Parser Integration Test", () => {
    // Increase timeout since we are making real HTTP requests
    jest.setTimeout(30000);

    const urls = [
        "https://react.dev/",
        "https://nginx.org/en/docs/",
        "https://dev.mysql.com/doc/",
        "https://grpc.io/docs/",
        "https://httpd.apache.org/docs/"
    ];

    const htmlFetcher = new UndiciHtmlFetcher();
    const fetcher = new Fetcher(htmlFetcher);
    const parser = new Parser();

    urls.forEach(url => {
        it(`should successfully fetch and parse: ${url}`, async () => {
            console.log(`Fetching: ${url}`);
            const fetchResult = await fetcher.fetchWebPage(url);
            
            // Check if the fetch was successful
            expect(fetchResult.success).toBe(true);
            expect(fetchResult.status).toBe(200);
            expect(fetchResult.html).toBeDefined();
            expect(fetchResult.html.length).toBeGreaterThan(0);

            console.log(`Parsing HTML of: ${url}`);
            const rawData = {
                s3Key: `raw/${Buffer.from(url).toString("base64")}.html`,
                html: fetchResult.html
            };

            const parsedData = parser.parseHtml(rawData);

            // Verify the parsed data structure
            expect(parsedData).toBeDefined();
            expect(parsedData.s3Key).toBe(rawData.s3Key);
            expect(typeof parsedData.text).toBe("string");
            expect(parsedData.text.length).toBeGreaterThan(0);
            
            // Should extract some links/urls
            expect(Array.isArray(parsedData.extractedUrls)).toBe(true);
            expect(parsedData.extractedUrls.length).toBeGreaterThan(0);

            // Verify that metadata is present
            expect(parsedData.metadata).toBeDefined();
            expect(typeof parsedData.metadata.title).toBe("string");
            expect(parsedData.metadata.title.length).toBeGreaterThan(0);
            
            console.log(`Successfully tested ${url}. Extracted URL count: ${parsedData.extractedUrls.length}, Title: "${parsedData.metadata.title}"`);
        });
    });
});
