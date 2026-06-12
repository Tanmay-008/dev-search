import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';
import CacheableLookup from 'cacheable-lookup';
import { LRUCache } from 'lru-cache'; 


class RoundRobinResolver {
    private resolvers: dns.promises.Resolver[];
    private counter: number = 0;

    constructor(servers: string[]) {
       
        this.resolvers = servers.map(ip => {
            const resolver = new dns.promises.Resolver();
            resolver.setServers([ip]);
            return resolver;
        });
    }

    // CacheableLookup internally yeh call karega jab cache miss hoga
    async resolve4(hostname: string, options?: any) {
        const index = this.counter % this.resolvers.length;
        
        // Overflow protection: Counter ko reset karte raho taaki infinite uptime pe app crash na ho
        this.counter = (this.counter + 1) % Number.MAX_SAFE_INTEGER;
        
        const selectedResolver = this.resolvers[index];
        return selectedResolver.resolve4(hostname, options);
    }

    // Performance constraint: Crawler ko strictly IPv4 pe rakhna hai
    async resolve6(hostname: string, options?: any) {
         throw new Error("IPv6 resolution is disabled to save network overhead.");
    }
}

export class CachedDnsResolver {
    private cacheable: CacheableLookup;
    private httpAgent: http.Agent;
    private httpsAgent: https.Agent;

    constructor() {
        // 2. TTL-AWARE CACHE IMPLEMENTATION
        const lruCache = new LRUCache<string, any>({ 
            max: 10000 
            // TTL is set dynamically per record inside the adapter below
        });

        const cacheAdapter = {
            get: (hostname: string) => lruCache.get(hostname),
            set: (hostname: string, entries: any[], ttl: number) => {
                // BUG FIXED: Ab TTL strictly apply hoga (lru-cache expects milliseconds)
                lruCache.set(hostname, entries, { ttl: ttl * 1000 });
                return true; 
            },
            delete: (hostname: string) => lruCache.delete(hostname),
            clear: () => lruCache.clear()
        };

        const customRRResolver = new RoundRobinResolver([
            '8.8.8.8',      // Google
            '1.1.1.1',      // Cloudflare
            '9.9.9.9',      // Quad9
            '208.67.222.222'// OpenDNS
        ]);

        this.cacheable = new CacheableLookup({
            cache: cacheAdapter, 
            resolver: customRRResolver as any, // Type cast to bypass strict interface, it only needs resolve4/6
            maxTtl: 300,        // 5 minutes max cache 
            errorTtl: 0.15,     // Cache failed lookups for a few seconds to prevent spam
            fallbackDuration: 0, 
        });

        this.httpAgent = new http.Agent({ keepAlive: true, maxSockets: 1000 });
        this.httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 1000 });

        this.cacheable.install(this.httpAgent);
        this.cacheable.install(this.httpsAgent);
    }

    public getHttpAgent(): http.Agent {
        return this.httpAgent;
    }

    public getHttpsAgent(): https.Agent {
        return this.httpsAgent;
    }

    public clearCache(domain?: string): void {
        if (domain) {
            this.cacheable.clear(domain);
        } else {
            this.cacheable.clear();
        }
    }
}