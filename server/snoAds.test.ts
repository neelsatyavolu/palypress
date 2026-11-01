import assert from "node:assert/strict";

import { isAllowedArticleUrl, parseSnoAdSpot } from "./snoAds";

// --- isAllowedArticleUrl (SSRF guard) ---

assert.equal(
  isAllowedArticleUrl("https://thecampanile.org/36566/opinion/the-cost/"),
  true,
  "known publication domains are allowed",
);

assert.equal(
  isAllowedArticleUrl("https://www.thecampanile.org/x/"),
  true,
  "subdomains of known publications are allowed",
);

assert.equal(
  isAllowedArticleUrl("https://evil.example.com/x"),
  false,
  "unknown domains are rejected",
);

assert.equal(
  isAllowedArticleUrl("file:///etc/passwd"),
  false,
  "non-http protocols are rejected",
);

assert.equal(
  isAllowedArticleUrl("not a url"),
  false,
  "malformed urls are rejected",
);

// --- parseSnoAdSpot ---

const pageWithAd = `
  <article>
    <p>First paragraph.</p>
    <p>Second paragraph.</p>
    <p>Third paragraph.</p>
    <p>Fourth paragraph.</p>
    <div class="sno-network">
      <div class="ad-heading">Story continues below advertisement</div>
      <div class="ad-image"><div class='snodnetwork'><div class='sidebar-spot'>
        <div class="sidebarimage snods_sidebar" data-spot_id="5915" data-fill="" data-sno_client_id="2101"></div>
      </div></div></div>
    </div>
    <p>Fifth paragraph.</p>
  </article>
`;

const detected = parseSnoAdSpot(pageWithAd);
assert.ok(detected, "an in-content ad spot should be detected");
assert.equal(detected!.spotId, "5915", "extracts the in-content spot id");
assert.equal(detected!.clientId, "2101", "extracts the client id");
assert.equal(
  detected!.paragraphOffset,
  4,
  "counts the four paragraphs before the ad",
);

assert.equal(
  parseSnoAdSpot("<article><p>No ads here.</p></article>"),
  null,
  "pages without a sno-network container detect no ad",
);

// A sidebar/footer-only spot (no sno-network container) is intentionally ignored.
assert.equal(
  parseSnoAdSpot(
    `<div class="snods_footer" data-spot_id="5030" data-sno_client_id="1548"></div>`,
  ),
  null,
  "non in-content ad spots are ignored",
);

console.log("snoAds.test.ts: all assertions passed");
