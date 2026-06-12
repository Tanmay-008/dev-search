import { createClient, RedisClientType } from "redis";
import { URLDeduplicator } from "../core/frontier/types";
import { redisClient } from "../../infrastructure/redis/redisClient";

export class RedisBloomDeduplicatorAdapter implements URLDeduplicator {
  private client: typeof redisClient;
  private readonly filterKey: string;

  constructor(client: typeof redisClient, filterKey: string = "url_dedup_bloom") {
    this.client = client;
    this.filterKey = filterKey;
  }

  private async ensureConnected(): Promise<void> {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  async isDuplicate(url: string): Promise<boolean> {
    await this.ensureConnected();
    return this.client.bf.exists(this.filterKey, url);
  }

  async markAsSeen(url: string): Promise<void> {
    await this.ensureConnected();
    await this.client.bf.add(this.filterKey, url);
  }

  async add(url: string): Promise<boolean> {
    await this.ensureConnected();
    return this.client.bf.add(this.filterKey, url);
  }
}
