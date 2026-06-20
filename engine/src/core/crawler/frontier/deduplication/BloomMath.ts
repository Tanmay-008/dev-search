export class BloomMath {

  static calculateBitArraySize(n: number, p: number): number {
    const m = -(n * Math.log(p)) / (Math.log(2) ** 2);
    return Math.ceil(m);
  }

  static calculateHashCount(m: number, n: number): number {
    const k = (m / n) * Math.log(2);
    return Math.ceil(k);
  }

  static calculateFalsePositiveProbability(
    m: number,
    k: number,
    n: number
  ): number {

    return (1 - Math.pow(1 - 1 / m, k * n)) ** k;
  }
}
