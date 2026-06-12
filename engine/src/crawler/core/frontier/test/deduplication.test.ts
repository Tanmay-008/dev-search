import { BloomMath } from "../deduplication/BloomMath";
import { HashFunctions } from "../deduplication/HashFunctions";
import { BloomFilterDeduplicator } from "../deduplication/BloomFilter";

/* ═══════════════════════════════════════════════
   1. BloomMath — Pure math helpers
   ═══════════════════════════════════════════════ */

describe("BloomMath", () => {

    describe("calculateBitArraySize", () => {

        it("should return a positive integer for valid inputs", () => {
            const m = BloomMath.calculateBitArraySize(1000, 0.01);
            expect(m).toBeGreaterThan(0);
            expect(Number.isInteger(m)).toBe(true);
        });

        it("should increase bit array size when false-positive rate decreases", () => {
            const mLoose = BloomMath.calculateBitArraySize(1000, 0.1);
            const mTight = BloomMath.calculateBitArraySize(1000, 0.001);

            expect(mTight).toBeGreaterThan(mLoose);
        });

        it("should increase bit array size when expected items increase", () => {
            const mSmall = BloomMath.calculateBitArraySize(100, 0.01);
            const mLarge = BloomMath.calculateBitArraySize(10_000, 0.01);

            expect(mLarge).toBeGreaterThan(mSmall);
        });

        it("should match the theoretical formula m = -(n*ln(p)) / (ln2)^2", () => {
            const n = 5000;
            const p = 0.01;
            const expected = Math.ceil(-(n * Math.log(p)) / (Math.log(2) ** 2));

            expect(BloomMath.calculateBitArraySize(n, p)).toBe(expected);
        });
    });

    describe("calculateHashCount", () => {

        it("should return a positive integer", () => {
            const m = BloomMath.calculateBitArraySize(1000, 0.01);
            const k = BloomMath.calculateHashCount(m, 1000);

            expect(k).toBeGreaterThan(0);
            expect(Number.isInteger(k)).toBe(true);
        });

        it("should match the theoretical formula k = (m/n) * ln2", () => {
            const n = 1000;
            const m = BloomMath.calculateBitArraySize(n, 0.01);
            const expected = Math.ceil((m / n) * Math.log(2));

            expect(BloomMath.calculateHashCount(m, n)).toBe(expected);
        });
    });

    describe("calculateFalsePositiveProbability", () => {

        it("should return a value between 0 and 1", () => {
            const n = 1000;
            const m = BloomMath.calculateBitArraySize(n, 0.01);
            const k = BloomMath.calculateHashCount(m, n);

            const fp = BloomMath.calculateFalsePositiveProbability(m, k, n);

            expect(fp).toBeGreaterThanOrEqual(0);
            expect(fp).toBeLessThanOrEqual(1);
        });

        it("should stay close to the target false-positive rate", () => {
            const n = 10_000;
            const targetFP = 0.01;
            const m = BloomMath.calculateBitArraySize(n, targetFP);
            const k = BloomMath.calculateHashCount(m, n);

            const actualFP = BloomMath.calculateFalsePositiveProbability(m, k, n);

            // Because we ceil m and k, the actual rate should be ≤ target (plus small rounding tolerance)
            expect(actualFP).toBeLessThanOrEqual(targetFP + 0.005);
        });
    });
});

/* ═══════════════════════════════════════════════
   2. HashFunctions — FNV-based double hashing
   ═══════════════════════════════════════════════ */

describe("HashFunctions", () => {

    describe("hash1 and hash2", () => {

        it("should be deterministic — same input always yields same output", () => {
            const url = "https://example.com/page";

            expect(HashFunctions.hash1(url)).toBe(HashFunctions.hash1(url));
            expect(HashFunctions.hash2(url)).toBe(HashFunctions.hash2(url));
        });

        it("should return non-negative integers", () => {
            const urls = [
                "https://a.com",
                "",
                "https://example.com/path?q=1&r=2#frag",
            ];

            for (const url of urls) {
                expect(HashFunctions.hash1(url)).toBeGreaterThanOrEqual(0);
                expect(HashFunctions.hash2(url)).toBeGreaterThanOrEqual(0);
            }
        });

        it("should produce different values for hash1 vs hash2 on typical URLs", () => {
            const url = "https://example.com/unique-path";

            // Different seeds should almost always produce different hashes
            expect(HashFunctions.hash1(url)).not.toBe(HashFunctions.hash2(url));
        });

        it("should produce different hashes for different URLs", () => {
            const h1a = HashFunctions.hash1("https://a.com");
            const h1b = HashFunctions.hash1("https://b.com");

            expect(h1a).not.toBe(h1b);
        });
    });

    describe("getIndexes", () => {

        it("should return exactly k indexes", () => {
            const indexes = HashFunctions.getIndexes("https://example.com", 7, 1000);
            expect(indexes).toHaveLength(7);
        });

        it("should return indexes within [0, m)", () => {
            const m = 4800;
            const indexes = HashFunctions.getIndexes("https://example.com/test", 5, m);

            for (const idx of indexes) {
                expect(idx).toBeGreaterThanOrEqual(0);
                expect(idx).toBeLessThan(m);
            }
        });

        it("should be deterministic for the same input", () => {
            const a = HashFunctions.getIndexes("https://example.com", 5, 1000);
            const b = HashFunctions.getIndexes("https://example.com", 5, 1000);

            expect(a).toEqual(b);
        });

        it("should produce different index sets for different URLs", () => {
            const a = HashFunctions.getIndexes("https://a.com", 5, 10000);
            const b = HashFunctions.getIndexes("https://b.com", 5, 10000);

            expect(a).not.toEqual(b);
        });
    });
});


describe("BloomFilterDeduplicator", () => {

    let filter: BloomFilterDeduplicator;

    beforeEach(() => {
        // Suppress the constructor's console.log during tests
        jest.spyOn(console, "log").mockImplementation(() => { });

        filter = new BloomFilterDeduplicator(1000, 0.01);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    /* ---------- isDuplicate ---------- */

    describe("isDuplicate", () => {

        it("should return false for a URL that was never added", async () => {
            expect(await filter.isDuplicate("https://never-seen.com")).toBe(false);
        });

        it("should return true after the URL has been marked as seen", async () => {
            await filter.markAsSeen("https://example.com");
            expect(await filter.isDuplicate("https://example.com")).toBe(true);
        });

        it("should treat URLs as case-sensitive (raw string matching)", async () => {
            await filter.markAsSeen("https://example.com/Page");

            expect(await filter.isDuplicate("https://example.com/Page")).toBe(true);
            expect(await filter.isDuplicate("https://example.com/page")).toBe(false);
        });
    });

    /* ---------- markAsSeen ---------- */

    describe("markAsSeen", () => {

        it("should make all subsequent isDuplicate checks return true", async () => {
            const urls = [
                "https://a.com",
                "https://b.com/path",
                "https://c.org?q=1",
            ];

            for (const url of urls) {
                await filter.markAsSeen(url);
            }

            for (const url of urls) {
                expect(await filter.isDuplicate(url)).toBe(true);
            }
        });

        it("should be idempotent — marking twice does not cause errors", async () => {
            await filter.markAsSeen("https://example.com");
            await filter.markAsSeen("https://example.com");

            expect(await filter.isDuplicate("https://example.com")).toBe(true);
        });
    });

    /* ---------- add (atomic) ---------- */

    describe("add", () => {

        it("should return true when adding a new URL", async () => {
            expect(await filter.add("https://new-url.com")).toBe(true);
        });

        it("should return false when adding a duplicate URL", async () => {
            await filter.add("https://example.com");
            expect(await filter.add("https://example.com")).toBe(false);
        });

        it("should mark the URL as seen after a successful add", async () => {
            await filter.add("https://example.com");
            expect(await filter.isDuplicate("https://example.com")).toBe(true);
        });

        it("should NOT modify state when the URL already exists", async () => {
            await filter.add("https://example.com");

            // Second add returns false and the filter state stays consistent
            const result = await filter.add("https://example.com");
            expect(result).toBe(false);
            expect(await filter.isDuplicate("https://example.com")).toBe(true);
        });
    });

    /* ---------- False-positive rate ---------- */

    describe("false-positive rate", () => {

        it("should stay below the configured threshold for a realistic workload", async () => {
            const expectedItems = 10_000;
            const targetFP = 0.01;
            const largeFilter = new BloomFilterDeduplicator(expectedItems, targetFP);

            // Insert exactly `expectedItems` unique URLs
            for (let i = 0; i < expectedItems; i++) {
                await largeFilter.markAsSeen(`https://example.com/page/${i}`);
            }

            // Probe with URLs that were never inserted
            const probeCount = 10_000;
            let falsePositives = 0;

            for (let i = 0; i < probeCount; i++) {
                if (await largeFilter.isDuplicate(`https://other-domain.com/path/${i}`)) {
                    falsePositives++;
                }
            }

            const observedRate = falsePositives / probeCount;

            // Allow 2× headroom over the target to account for statistical variance
            expect(observedRate).toBeLessThanOrEqual(targetFP * 2);
        });
    });

    /* ---------- Zero false-negatives guarantee ---------- */

    describe("zero false-negatives", () => {

        it("should never report a previously-added URL as not-duplicate", async () => {
            const urls = Array.from(
                { length: 500 },
                (_, i) => `https://site.com/article/${i}`
            );

            for (const url of urls) {
                await filter.markAsSeen(url);
            }

            for (const url of urls) {
                expect(await filter.isDuplicate(url)).toBe(true);
            }
        });
    });

    /* ---------- Edge cases ---------- */

    describe("edge cases", () => {

        it("should handle an empty string URL", async () => {
            expect(await filter.isDuplicate("")).toBe(false);
            await filter.markAsSeen("");
            expect(await filter.isDuplicate("")).toBe(true);
        });

        it("should handle very long URLs", async () => {
            const longUrl = "https://example.com/" + "a".repeat(5000);

            expect(await filter.isDuplicate(longUrl)).toBe(false);
            await filter.markAsSeen(longUrl);
            expect(await filter.isDuplicate(longUrl)).toBe(true);
        });

        it("should handle URLs with special characters", async () => {
            const specialUrl = "https://example.com/path?q=hello&world=true#section-1";

            await filter.markAsSeen(specialUrl);
            expect(await filter.isDuplicate(specialUrl)).toBe(true);
        });

        it("should distinguish between URLs that differ only by fragment", async () => {
            await filter.markAsSeen("https://example.com/page#section1");

            // Different fragment — Bloom filter treats them as separate strings
            expect(await filter.isDuplicate("https://example.com/page#section2")).toBe(false);
        });

        it("should distinguish between URLs that differ only by trailing slash", async () => {
            await filter.markAsSeen("https://example.com/path");
            expect(await filter.isDuplicate("https://example.com/path/")).toBe(false);
        });
    });
});
