import { URLDeduplicator } from "../types";
import { BloomMath } from "./BloomMath";
import { HashFunctions } from "./HashFunctions";

export class BloomFilterDeduplicator
  implements URLDeduplicator {

  private bitArray: Uint32Array;
  private m: number; // total bits
  private k: number; // hash count

  constructor(
    expectedItems: number,
    falsePositiveRate: number
  ) {

    this.m = BloomMath.calculateBitArraySize(
      expectedItems,
      falsePositiveRate
    );

    this.k = BloomMath.calculateHashCount(
      this.m,
      expectedItems
    );

    // 2️⃣ Allocate Uint32 bit array
    this.bitArray = new Uint32Array(
      Math.ceil(this.m / 32)
    );

    console.log(`
Bloom Filter Initialized
m (bits): ${this.m}
k (hashes): ${this.k}
Memory: ${this.bitArray.length * 4} bytes
`);
  }

  /* -----------------------------
     Bit helpers (32-bit packed)
  ------------------------------*/

  private setBit(index: number): void {

    const wordIndex =
      Math.floor(index / 32);

    const bitOffset =
      index % 32;

    this.bitArray[wordIndex] |=
      (1 << bitOffset);
  }

  private getBit(index: number): boolean {

    const wordIndex =
      Math.floor(index / 32);

    const bitOffset =
      index % 32;

    return (
      (this.bitArray[wordIndex] &
        (1 << bitOffset)) !== 0
    );
  }

  /* -----------------------------
     Duplicate check
  ------------------------------*/

  async isDuplicate(url: string): Promise<boolean> {

    const indexes =
      HashFunctions.getIndexes(
        url,
        this.k,
        this.m
      );

    for (const index of indexes) {

      if (!this.getBit(index)) {
        return false; // definitely new
      }

    }

    return true; // maybe duplicate
  }

  /* -----------------------------
     Mark URL as seen
  ------------------------------*/

  async markAsSeen(url: string): Promise<void> {

    const indexes =
      HashFunctions.getIndexes(
        url,
        this.k,
        this.m
      );

    for (const index of indexes) {
      this.setBit(index);
    }
  }

  /* -----------------------------
     Atomic add
  ------------------------------*/

  async add(url: string): Promise<boolean> {

    if (await this.isDuplicate(url)) {
      return false;
    }

    await this.markAsSeen(url);
    return true;
  }
}
