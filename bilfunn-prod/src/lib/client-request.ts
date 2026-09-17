export function clientRequest(url: string, options: RequestInit = {}) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(15_000) });
}

export function retryMessage(response: Response) {
  const header = response.headers.get("Retry-After");
  const seconds =
    header && /^\d+$/.test(header)
      ? Number(header)
      : header
        ? Math.ceil((Date.parse(header) - Date.now()) / 1000)
        : NaN;
  return Number.isFinite(seconds)
    ? `For mange forsøk. Vent ${Math.max(1, seconds)} sekunder før du prøver igjen.`
    : "For mange forsøk. Prøv igjen senere.";
}
