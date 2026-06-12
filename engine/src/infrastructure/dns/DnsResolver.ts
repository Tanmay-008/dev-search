import http from 'node:http';
import https from 'node:https';

export interface IDnsResolver {
    getHttpAgent(): http.Agent;
    getHttpsAgent(): https.Agent;
    clearCache(domain?: string): void;
}