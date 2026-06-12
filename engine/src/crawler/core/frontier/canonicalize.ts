const TRACKING_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "ref", "fbclid", "gclid", "session", "sessionid", "gclsrc", "dclid", "wbraid", "gbraid"
]);

export function canonicalize(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);

    if (url.hostname.startsWith("www.")) url.hostname = url.hostname.slice(4);

    let pathname = url.pathname;
    if (pathname.endsWith("/index.html")) pathname = pathname.slice(0, -11);
    if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);
    url.pathname = pathname;

    const paramsToDelete: string[] = [];
    url.searchParams.forEach((_, key) => {
      if (TRACKING_PARAMS.has(key.toLowerCase())) {
        paramsToDelete.push(key);
      }
    });
    paramsToDelete.forEach(p => url.searchParams.delete(p));

    url.searchParams.sort();
    url.hash = "";

    return url.toString();
  } catch (err) {
    return null;
  }
}
