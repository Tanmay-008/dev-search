export interface RawData {
    s3Key: string;
    html: string;
}

export interface ParserStorage {
    getRawData(s3Key: string): Promise<RawData>;
}

export interface ParsedData {
    s3Key: string;
    text: string;
    extractedUrls: string[];
    metadata: Record<string, any>;
}

export interface ParsedDataStorage {
    saveParsedData(parsedData: ParsedData): Promise<string>;
}

export interface UrlPublisher {
    publishUrls(urls: string[]): Promise<void>;
}

