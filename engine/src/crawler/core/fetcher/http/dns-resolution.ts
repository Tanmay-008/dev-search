import dns from 'node:dns';
import CacheableLookup from 'cacheable-lookup';
import { LRUCache } from 'lru-cache';

export interface IDnsResolver {
    getLookupFunction(): any;
    clearCache(domain?: string): void;
}

export class CachedDnsResolver implements IDnsResolver {
    private cacheable: CacheableLookup;

    constructor() {
        const lruCache = new LRUCache<string, any>({ max: 10000 });

        const cacheAdapter = {
            get: (hostname: string) => lruCache.get(hostname),
            set: (hostname: string, entries: any[], ttl: number) => {
                lruCache.set(hostname, entries, { ttl: ttl * 1000 });
                return true;
            },
            delete: (hostname: string) => lruCache.delete(hostname),
            clear: () => lruCache.clear()
        };

        this.cacheable = new CacheableLookup({
            cache: cacheAdapter,
            maxTtl: 300,
            errorTtl: 0.15,
            fallbackDuration: 0,
        });
    }

    public getLookupFunction(): any {
        return this.cacheable.lookup.bind(this.cacheable);
    }

    public clearCache(domain?: string): void {
        if (domain) this.cacheable.clear(domain);
        else this.cacheable.clear();
    }
}