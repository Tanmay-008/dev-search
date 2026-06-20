export function normalize(rawUrl: string, baseUrl?: string): string | null {
  try {
    const url = new URL(rawUrl, baseUrl);

    if (url.protocol === "http:") url.protocol = "https:";
    
    if ((url.port === "80" || url.port === "443")) url.port = "";

    let pathname = url.pathname;
    if (pathname.includes("//")) pathname = pathname.replace(/\/{2,}/g, "/");
    if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);
    
    url.pathname = pathname;
    return url.toString();
  } catch (err) {
    return null;
  }
}
