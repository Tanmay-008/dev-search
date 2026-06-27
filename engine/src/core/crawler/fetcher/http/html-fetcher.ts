import { request, Agent, buildConnector } from 'undici';
import * as cheerio from 'cheerio';
import { CachedDnsResolver } from './dns-resolution';
import { FetchResult, IHtmlFetcher } from '../types';
import * as puppeteer from "puppeteer"
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

export class HtmlFetcher implements IHtmlFetcher {

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

            // Check if page is CSR (Empty shell)
            if (this.isCsr(htmlContent)) {
                console.log(`[HtmlFetcher] CSR detected for: ${url}. Delegating to Puppeteer...`);
                return this.fetchWithPuppeteer(url);
            }

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

    private isCsr(html: string): boolean {
        const $ = cheerio.load(html);
        const body = $('body');

        // Remove whitespace to get raw text length
        const textContent = body.text().replace(/\s+/g, '').trim();
        const hasScripts = $('script').length > 0;

        // Heuristic 1: If body has very little actual text and has scripts
        if (textContent.length < 200 && hasScripts) {
            return true;
        }

        // Heuristic 2: Empty root containers
        const rootSelectors = ['#root', '#app', '#__next', '.root', '.app'];
        for (const selector of rootSelectors) {
            const rootEl = $(selector);
            if (rootEl.length > 0 && rootEl.text().trim().length < 50) {
                return true;
            }
        }

        return false;
    }

    private async fetchWithPuppeteer(url: string): Promise<FetchResult> {
        let browser: any = null;
        try {
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
            });
            const page = await browser.newPage();

            await page.setUserAgent(CONFIG.USER_AGENT);

            const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

            if (!response) {
                return { url, status: 500, html: "", error: "No response from puppeteer", success: false };
            }

            const statusCode = response.status();

            if (statusCode >= 400 && statusCode < 500) {
                return { url, status: statusCode, html: "", error: `Client Error: ${statusCode}`, success: false };
            }
            if (statusCode >= 500) {
                throw new Error(`Transient Error: ${statusCode}`);
            }

            const htmlContent = await page.content();

            return { url, status: statusCode, html: htmlContent, success: true };
        } catch (error: unknown) {
            const err = error instanceof Error ? error : new Error(String(error));
            return { url, status: 500, html: "", error: err.message, success: false };
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }
}
