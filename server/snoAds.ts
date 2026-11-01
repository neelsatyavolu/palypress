// Auto-detects a publication's SNO Distribution Network (SNOD) in-content ad
// spot by reading the article's rendered web page. The spot id / client id live
// only in the rendered HTML (injected by the SNO theme), not in the WordPress
// REST API the app reads — so this fills that gap without per-publication config.

// SSRF guard: only fetch pages from known PALY publication domains.
const ALLOWED_HOSTS = [
  "palyvoice.com",
  "infocusnews.tv",
  "thecampanile.org",
  "verdemagazine.com",
  "cmagazine.org",
  "vikingsportsmag.com",
  "anthromagazine.org",
  "inkliterarymag.org",
  "palyveritas.com",
];

export interface DetectedSnoAd {
  spotId: string;
  clientId: string;
  // Number of article paragraphs before the in-content ad, so the app can
  // place it where the website does instead of a fixed guess.
  paragraphOffset: number;
}

export function isAllowedArticleUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    return ALLOWED_HOSTS.some(
      (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
}

// Parses the in-content SNOD ad spot out of a rendered article page.
// The in-content ad is wrapped in <div class="sno-network"> (sidebar and
// footer ad spots use different classes and are intentionally ignored).
export function parseSnoAdSpot(html: string): DetectedSnoAd | null {
  const adIndex = html.search(
    /<div[^>]*class=["'][^"']*\bsno-network\b[^"']*["']/i,
  );
  if (adIndex < 0) return null;

  const block = html.slice(adIndex, adIndex + 800);
  const spotId = block.match(/data-spot_id=["'](\d+)["']/i)?.[1];
  const clientId = block.match(/data-sno_client_id=["'](\d+)["']/i)?.[1];
  if (!spotId || !clientId) return null;

  const paragraphOffset = (
    html.slice(0, adIndex).match(/<p[\s>]/gi) || []
  ).length;

  return { spotId, clientId, paragraphOffset };
}

export async function detectSnoAd(url: string): Promise<DetectedSnoAd | null> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "PalyJournalismApp/1.0 (+https://palymac.org/incubator/)",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return parseSnoAdSpot(await response.text());
}
