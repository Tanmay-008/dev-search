import * as cheerio from "cheerio";
import { RawData, ParsedData } from "./types";
import { tracer } from "../../observability/traces/traces";
import { SpanStatusCode, Span } from "@opentelemetry/api";

export class Parser {
    public parseHtml(rawData: RawData): ParsedData {
        return tracer.startActiveSpan("Parser.parseHtml", (span: Span) => {
            span.setAttribute("s3Key", rawData.s3Key);
            try {
                const $ = cheerio.load(rawData.html);

                const title = $('title').text().trim() || "";

                // Extract meta description
                const description = $('meta[name="description"]').attr('content')?.trim() || "";

                // Extract all text (remove scripts and styles first)
                $('script, style').remove();
                const text = $('body').text().replace(/\s+/g, ' ').trim();

                // Extract absolute hrefs
                const urls: string[] = [];
                $('a').each((_, element) => {
                    const href = $(element).attr('href');
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
                        description
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