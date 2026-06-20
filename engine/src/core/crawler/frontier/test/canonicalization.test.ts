import { normalize } from "../normalize";
import { canonicalize } from "../canonicalize";

function normalizeAndCanonicalize(url: string, baseUrl?: string): string | null {
  const normalized = normalize(url, baseUrl);
  if (normalized === null) return null;
  return canonicalize(normalized);
}

describe("URL Normalization and Canonicalization", () => {

  describe("normalize and canonicalize flow", () => {

    it("should enforce https scheme", () => {
      const url = "http://example.com";
      const result = normalizeAndCanonicalize(url);
      expect(result).toBe("https://example.com/");
    });

    it("should strip 'www.' subdomain", () => {
      const url = "https://www.example.com";
      const result = normalizeAndCanonicalize(url);
      expect(result).toBe("https://example.com/");
    });

    it("should remove default ports (80, 443)", () => {
      const url1 = "https://example.com:80/path";
      expect(normalizeAndCanonicalize(url1)).toBe("https://example.com/path");

      const url2 = "https://example.com:443/path";
      expect(normalizeAndCanonicalize(url2)).toBe("https://example.com/path");
      
      const paramUrl = "https://example.com:3000/path";
      expect(normalizeAndCanonicalize(paramUrl)).toBe("https://example.com:3000/path");
    });

    it("should remove multiple slashes in the path", () => {
      const url = "https://example.com/foo//bar///baz";
      const result = normalizeAndCanonicalize(url);
      expect(result).toBe("https://example.com/foo/bar/baz");
    });

    it("should remove '/index.html' from the end of the path", () => {
      const url = "https://example.com/about/index.html";
      const result = normalizeAndCanonicalize(url);
      expect(result).toBe("https://example.com/about");
    });

    it("should remove trailing slashes from the path", () => {
      const url = "https://example.com/path/to/page/";
      const result = normalizeAndCanonicalize(url);
      expect(result).toBe("https://example.com/path/to/page");
    });

    it("should remove known tracking parameters", () => {
      const url = "https://example.com/page?utm_source=google&valid=1&fbclid=abc";
      const result = normalizeAndCanonicalize(url);
      expect(result).toBe("https://example.com/page?valid=1");
    });

    it("should alphabetically sort search parameters", () => {
      const url = "https://example.com/page?z=1&b=2&a=3";
      const result = normalizeAndCanonicalize(url);
      expect(result).toBe("https://example.com/page?a=3&b=2&z=1");
    });

    it("should remove URL fragments (hashes)", () => {
      const url = "https://example.com/page#section2";
      const result = normalizeAndCanonicalize(url);
      expect(result).toBe("https://example.com/page");
    });

    it("should handle relative URLs if baseUrl is provided", () => {
      const rawUrl = "/path/to/resource?sort=asc";
      const baseUrl = "https://www.example.com";
      const result = normalizeAndCanonicalize(rawUrl, baseUrl);
      expect(result).toBe("https://example.com/path/to/resource?sort=asc");
    });

    it("should return null for completely invalid URLs", () => {
      const url = "not-a-valid-url";
      const result = normalizeAndCanonicalize(url);
      expect(result).toBeNull();
    });

    it("should handle a complex URL correctly", () => {
      const url = "http://www.example.com:80/path//to//page/index.html?utm_campaign=sale&b=2&a=1#top";
      const expected = "https://example.com/path/to/page?a=1&b=2";
      expect(normalizeAndCanonicalize(url)).toBe(expected);
    });

  });
});
