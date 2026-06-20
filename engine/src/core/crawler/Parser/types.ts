export interface IRawData {
    s3Key: string;
    html: string;
}

export interface IParserStorage {
    getRawData(s3Key: string): Promise<IRawData>;
}

export interface ParsedData {
    s3Key: string;
    text: string;
    extractedUrls: string[]; // These go to SQS, not S3 JSON
    metadata: Record<string, any>;
}

export interface IUrlPublisher {
    publishUrls(urls: string[]): Promise<void>;
}
