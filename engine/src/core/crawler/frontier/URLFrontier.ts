import { seedUrls } from "./seeds";
import { FrontierTask, IQueueProvider } from "./interfaces/queue-provider.interface";
import { tracer } from "../../observability/traces/traces";
import { SpanStatusCode, Span } from "@opentelemetry/api";
import { URLDeduplicator } from "./types";
import { normalize } from "./normalize";
import { canonicalize } from "./canonicalize";
import { SqsQueueProvider } from "./queues/sqsQueueProvider";
import { RedisBloomDeduplicatorAdapter } from "../../../infrastructure/redis/redis-bloom-deduplicator.adapter";
import { redisClient } from "../../../infrastructure/redis/redisClient";

export class URLFrontier {
  private localQueue: string[];
  private queueProvider: IQueueProvider;
  private urlDeduplicator: URLDeduplicator;

  constructor(queueProvider: IQueueProvider, urlDeduplicator: URLDeduplicator) {
    this.localQueue = [...seedUrls];
    this.queueProvider = queueProvider;
    this.urlDeduplicator = urlDeduplicator;
  }

  public static create(): URLFrontier {
    const queueProvider = new SqsQueueProvider();
    const urlDeduplicator = new RedisBloomDeduplicatorAdapter(redisClient);
    return new URLFrontier(queueProvider, urlDeduplicator);
  }

  public async getNextUrl(): Promise<string | FrontierTask[]> {
    return tracer.startActiveSpan("URLFrontier.getNextUrl", async (span: Span) => {
      try {
        if (this.localQueue.length > 0) {
          const next = this.localQueue.shift()!;
          span.setAttribute("frontier.source", "localQueue");
          span.setAttribute("frontier.url", next);
          span.setStatus({ code: SpanStatusCode.OK });
          return next;
        }
        const url = await this.queueProvider.fetchURL(10);
        span.setAttribute("frontier.source", "queueProvider");
        span.setAttribute("frontier.count", Array.isArray(url) ? url.length : 1);
        span.setStatus({ code: SpanStatusCode.OK });
        return url;
      } catch (err: any) {
        span.recordException(err);
        span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
        throw err;
      } finally {
        span.end();
      }
    });
  }

  public async addUrls(url: string): Promise<void> {
    return tracer.startActiveSpan("URLFrontier.addUrls", async (span: Span) => {
      span.setAttribute("url", url);
      try {
        const normalizedUrl = normalize(url);
        if (normalizedUrl === null) {
          span.setAttribute("frontier.skip_reason", "invalid_url");
          span.setStatus({ code: SpanStatusCode.OK });
          return;
        }

        const canonicalUrl = canonicalize(normalizedUrl);
        if (canonicalUrl === null) {
          span.setAttribute("frontier.skip_reason", "invalid_url");
          span.setStatus({ code: SpanStatusCode.OK });
          return;
        }
        span.setAttribute("canonical_url", canonicalUrl);

        if (await this.urlDeduplicator.isDuplicate(canonicalUrl)) {
          span.setAttribute("frontier.skip_reason", "duplicate");
          span.setStatus({ code: SpanStatusCode.OK });
          return;
        }

        await this.urlDeduplicator.markAsSeen(canonicalUrl);
        await this.queueProvider.publishURL(canonicalUrl);
        span.setAttribute("frontier.status", "added");
        span.setStatus({ code: SpanStatusCode.OK });
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