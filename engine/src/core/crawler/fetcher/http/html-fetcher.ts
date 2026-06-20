import { request, Agent, buildConnector } from 'undici';
import { CachedDnsResolver } from './dns-resolution';
import { FetchResult, IHtmlFetcher } from '../types';

const dnsResolver = new CachedDnsResolver();

const connector = buildConnector({
    timeout: 5000,
    lookup: dnsResolver.getLookupFunction() as any
});

const httpAgent = new Agent({
    connections: 50,
    pipelining: 1,
    keepAliveTimeout: 30000,
    connect: connector
});

const CONFIG = {
    MAX_RETRIES: 3,
    TIMEOUT_MS: 10000,
    USER_AGENT: 'TanmaySearchBot/1.0'
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class UndiciHtmlFetcher implements IHtmlFetcher {

    async downloadHtml(url: string, attempt: number = 1): Promise<FetchResult> {
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), CONFIG.TIMEOUT_MS);

        try {
            const { statusCode, body, headers } = await request(url, {
                dispatcher: httpAgent,
                method: 'GET',
                signal: abortController.signal,
                headers: {
                    'User-Agent': CONFIG.USER_AGENT,
                    'Accept': 'text/html,application/xhtml+xml'
                }
            });

            clearTimeout(timeoutId);

            const contentType = headers['content-type']?.toString() || '';
            if (!contentType.includes("text/html")) {
                await body.dump();
                return { url, status: statusCode, html: "", error: `Unsupported content-type: ${contentType}`, success: false };
            }

            if (statusCode === 429 || statusCode >= 500) {
                await body.dump();
                throw new Error(`Transient Error: ${statusCode}`);
            }

            if (statusCode >= 400 && statusCode < 500) {
                await body.dump();
                return { url, status: statusCode, html: "", error: `Client Error: ${statusCode}`, success: false };
            }

            const htmlContent = await body.text();
            return { url, status: statusCode, html: htmlContent, success: true };

        } catch (error: unknown) {
            clearTimeout(timeoutId);
            const err = error instanceof Error ? error : new Error(String(error));

            if (attempt < CONFIG.MAX_RETRIES) {
                await sleep(Math.pow(2, attempt) * 1000);
                return this.downloadHtml(url, attempt + 1);
            }

            return { url, status: 500, html: "", error: err.message, success: false };
        }
    }
}
