import assert from "node:assert/strict";

import {
  FEED_PUBLICATIONS,
  HOME_PUBLICATION,
  NOTIFICATION_PUBLICATIONS,
  PUBLICATIONS,
  WORDPRESS_PUBLICATIONS,
} from "./publications";
import { PUBLICATION_CONFIGS } from "../../shared/publications";

const INCUBATOR_PUBLICATION_IDS = [
  "anthro",
  "ink",
  "kply",
  "proof",
  "veritas",
  "viaverde",
  "palyvoice",
];

const EXTERNAL_OR_PRINT_ONLY_IDS = ["kply", "proof", "viaverde"];
const ISOLATED_NON_FEED_IDS = ["archive"];

const REMOVED_PUBLICATION_IDS = ["chomp", "aperture"];

const EXPECTED_PUBLICATION_SELECTOR_NAMES = [
  "Home",
  "The Paly Voice",
  "InFocus",
  "The Campanile",
  "Verde Magazine",
  "C Magazine",
  "Viking Sports Magazine",
  "Anthro Magazine",
  "Paly Journalism Archive",
  "Ink Literary Magazine",
  "Veritas",
  "Via Verde",
  "KPLY",
  "[proof]",
];

const VERIFIED_INCUBATOR_LINKS: Record<string, string> = {
  anthro: "anthromagazine.org",
  ink: "inkliterarymag.org",
  kply: "soundcloud.com/palyradio",
  proof: "issuu.com/proofpaly",
  veritas: "palyveritas.com",
  viaverde: "issuu.com/viaverdemag",
  palyvoice: "palyvoice.com",
};

const VERIFIED_PUBLICATION_COLORS: Record<string, string> = {
  palyvoice: "#0D724D",
  archive: "#316D43",
  infocus: "#38A300",
  campanile: "#1A3175",
  verde: "#1AA351",
  cmag: "#4F90BC",
  viking: "#1F4723",
  anthro: "#1E73BE",
  ink: "#008000",
  kply: "#FF5500",
  proof: "#111827",
  veritas: "#990000",
  viaverde: "#1F385C",
};

const publicationIds = PUBLICATIONS.map((publication) => publication.id);
const vikingIndex = publicationIds.indexOf("viking");
const anthroIndex = publicationIds.indexOf("anthro");

assert.deepEqual(
  INCUBATOR_PUBLICATION_IDS.filter((id) => !publicationIds.includes(id)),
  [],
  "all incubator publications should be represented",
);

assert.deepEqual(
  WORDPRESS_PUBLICATIONS.map((publication) => publication.id).sort(),
  PUBLICATIONS.filter((publication) => publication.apiBaseUrl)
    .map((publication) => publication.id)
    .sort(),
  "WordPress publications should be the subset with API feeds",
);

assert.deepEqual(
  NOTIFICATION_PUBLICATIONS.map((publication) => publication.id).sort(),
  FEED_PUBLICATIONS.map((publication) => publication.id).sort(),
  "notification settings should include every publication that can appear in the feed",
);

assert.ok(
  publicationIds.includes("archive"),
  "archive should be available in the publication selector",
);
assert.deepEqual(
  [HOME_PUBLICATION, ...PUBLICATIONS].map((publication) => publication.name),
  EXPECTED_PUBLICATION_SELECTOR_NAMES,
  "publication selector should follow the requested display order",
);
assert.deepEqual(
  ISOLATED_NON_FEED_IDS.filter((id) =>
    FEED_PUBLICATIONS.some((publication) => publication.id === id),
  ),
  [],
  "archive should stay out of home/feed publication lists",
);
assert.deepEqual(
  ISOLATED_NON_FEED_IDS.filter((id) =>
    NOTIFICATION_PUBLICATIONS.some((publication) => publication.id === id),
  ),
  [],
  "archive should stay out of notification publication lists",
);

assert.ok(
  vikingIndex < anthroIndex,
  "Viking should appear above Anthro in publication selectors",
);

for (const id of EXTERNAL_OR_PRINT_ONLY_IDS) {
  const publication = PUBLICATIONS.find((candidate) => candidate.id === id);
  assert.ok(publication, `${id} should exist`);
  assert.equal(
    publication.apiBaseUrl,
    "",
    `${id} should not be treated as a WordPress feed`,
  );
  assert.ok(
    publication.externalFeedType,
    `${id} should declare an external feed type`,
  );
}

for (const id of REMOVED_PUBLICATION_IDS) {
  assert.equal(
    publicationIds.includes(id),
    false,
    `${id} should not be listed as a publication`,
  );
}

for (const [id, domain] of Object.entries(VERIFIED_INCUBATOR_LINKS)) {
  const publication = PUBLICATIONS.find((candidate) => candidate.id === id);
  assert.equal(publication?.domain, domain, `${id} should use verified link`);
}

for (const [id, color] of Object.entries(VERIFIED_PUBLICATION_COLORS)) {
  const publication = PUBLICATIONS.find((candidate) => candidate.id === id);
  assert.equal(
    publication?.primaryColor,
    color,
    `${id} should use its verified publication color`,
  );
}

for (const sharedPublication of PUBLICATION_CONFIGS) {
  const clientPublication = PUBLICATIONS.find(
    (publication) => publication.id === sharedPublication.id,
  );
  assert.equal(
    sharedPublication.primaryColor,
    clientPublication?.primaryColor,
    `${sharedPublication.id} shared color should match client color`,
  );
}
