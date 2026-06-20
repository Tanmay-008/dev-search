import { IHtmlFetcher, FetchResult } from "./types";
import { tracer } from "../../observability/traces/traces";
import { SpanStatusCode, Span } from "@opentelemetry/api";

export class Fetcher {
    constructor(private readonly htmlFetcher: IHtmlFetcher) { }

    async fetchWebPage(url: string): Promise<FetchResult> {
        return tracer.startActiveSpan("Fetcher.fetchWebPage", async (span: Span) => {
            span.setAttribute("url", url);
            try {
                const result = await this.htmlFetcher.downloadHtml(url);
                span.setAttribute("http.status_code", result.status);
                span.setAttribute("fetch.success", result.success);
                if (result.error) {
                    span.setStatus({ code: SpanStatusCode.ERROR, message: result.error });
                } else {
                    span.setStatus({ code: SpanStatusCode.OK });
                }
                return result;
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
