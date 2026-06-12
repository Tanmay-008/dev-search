export interface IDatabaseProvider {
    /**
     * Checks if a URL has already been crawled or scheduled.
     */
    hasSeenURL(url: string): Promise<boolean>;
    
    /**
     * Marks a URL as seen in the persistent storage to prevent duplicate crawling.
     */
    markURLAsSeen(url: string): Promise<void>;
    
    /**
     * Optional: Update specific metrics/stats for a domain.
     */
    saveDomainStats(domain: string, data: any): Promise<void>;
}
