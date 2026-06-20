export class HashFunctions {

  private static baseHash(str: string, seed: number): number {

    let hash = seed;

    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash *= 16777619;
    }

    return Math.abs(hash);
  }

  static hash1(url: string): number {
    return this.baseHash(url, 2166136261);
  }

  static hash2(url: string): number {
    return this.baseHash(url, 16777619);
  }

  static getIndexes(
    url: string,
    k: number,
    m: number
  ): number[] {

    const indexes: number[] = [];

    const h1 = this.hash1(url);
    const h2 = this.hash2(url);

    for (let i = 0; i < k; i++) {
      const index = Math.abs((h1 + i * h2) % m);
      indexes.push(index);
    }

    return indexes;
  }
}
