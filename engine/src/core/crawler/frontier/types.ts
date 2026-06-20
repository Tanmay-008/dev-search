export interface URLDeduplicator {

    isDuplicate(url: string): Promise<boolean>;

    markAsSeen(url: string): Promise<void>;

    add(url: string): Promise<boolean>;
}