import { URLDeduplicator } from "../core/frontier/types";
import { redisClient } from "../../infrastructure/redis/redisClient";

export class RedisSetDeduplicatorAdapter implements URLDeduplicator {
  private client: typeof redisClient;
  private readonly setKey: string;

  constructor(client: typeof redisClient, setKey: string = "url_dedup_set") {
    this.client = client;
    this.setKey = setKey;
  }

  private async ensureConnected(): Promise<void> {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  async isDuplicate(url: string): Promise<boolean> {
    await this.ensureConnected();
    const isMember = await this.client.sIsMember(this.setKey, url);
    return !!isMember;
  }

  async markAsSeen(url: string): Promise<void> {
    await this.ensureConnected();
    await this.client.sAdd(this.setKey, url);
  }

  async add(url: string): Promise<boolean> {
    await this.ensureConnected();
    const result = await this.client.sAdd(this.setKey, url);
    return result > 0;
  }
}
