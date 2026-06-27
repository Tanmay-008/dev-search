import * as cheerio from "cheerio";
import { RawData, ParsedData } from "./types";
import { tracer } from "../../observability/traces/traces";
import { SpanStatusCode, Span } from "@opentelemetry/api";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import s3Client from "../../../infrastructure/aws/s3Client";

export class Parser {
    public async parseHtml(rawData: RawData): Promise<ParsedData> {
        return tracer.startActiveSpan("Parser.parseHtml", async (span: Span) => {
            span.setAttribute("s3Key", rawData.s3Key);
            try {
                const rawhtml = cheerio.load(rawData.html);

                const images: string[] = [];
                rawhtml('img').each((_, element) => {
                    const src = rawhtml(element).attr('src');
                    if (src) {
                        images.push(src.trim());
                    }
                });

                const videos: string[] = [];
                rawhtml('video source, video').each((_, element) => {
                    const src = rawhtml(element).attr('src');
                    if (src) {
                        videos.push(src.trim());
                    }
                });

                const mediaS3Key = `media-metadata/${rawData.s3Key.split('/').pop()?.replace('.html', '') || Date.now().toString()}.json`;
                await s3Client.send(new PutObjectCommand({
                    Bucket: 'tanmay-serchengine-text-data',
                    Key: mediaS3Key,
                    Body: JSON.stringify({ images, videos }),
                    ContentType: 'application/json'
                }));

                const title = rawhtml('title').text().trim() || "";

                const description = rawhtml('meta[name="description"]').attr('content')?.trim() || "";

                rawhtml('script, style').remove();
                const text = rawhtml('body').text().replace(/\s+/g, ' ').trim();

                const urls: string[] = [];
                rawhtml('a').each((_, element) => {
                    const href = rawhtml(element).attr('href');
                    if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
                        urls.push(href.trim());
                    }
                });

                span.setAttribute("parser.extracted_urls_count", urls.length);
                span.setAttribute("parser.text_length", text.length);
                span.setStatus({ code: SpanStatusCode.OK });

                return {
                    s3Key: rawData.s3Key,
                    text,
                    extractedUrls: urls,
                    metadata: {
                        title,
                        description,
                        media_s3_key: mediaS3Key
                    }
                };
            } catch (err: any) {
                span.recordException(err);
                span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
                throw err;
            } finally {
                span.end();
            }
        });
    }
}