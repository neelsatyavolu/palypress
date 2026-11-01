import assert from "node:assert/strict";

import {
  isExternalPublicationId,
  parseIssuuIssueHtml,
  parseIssuuProfileHtml,
  parseSoundCloudProfileHtml,
  parseSoundCloudTrackHtml,
} from "./externalFeeds";

const soundCloudProfileHtml = `
  <a href="/palyradio/quad-talk-5-21-26">Quad Talk 5/21/26</a>
  <a href="/palyradio/4-30-26">4/30/26</a>
  <a href="/palyradio/likes">KPLY Paly Radio's likes</a>
`;

const soundCloudTrackHtml = `
  <meta name="title" content="Quad Talk 5/21/26">
  <meta name="description" content="Palo Alto High School's online radio station. Tune in for amazing audio content!">
  <meta name="image" content="https://i1.sndcdn.com/artworks-test-t500x500.png">
  <meta name="url" content="https://soundcloud.com/palyradio/quad-talk-5-21-26">
`;

const issuuProfileHtml = `
  <a href="/proofpaly/docs/_pink._spring_2026_da829392fa0cbe">[pink.] spring 2026</a>
  <a href="/proofpaly/docs/_proof_spring_2026">[proof] spring 2026</a>
  <a href="/proofpaly/stacks">Stacks</a>
`;

const issuuIssueHtml = `
  <meta property="og:title" content="[pink.] spring 2026">
  <meta property="og:url" content="https://issuu.com/proofpaly/docs/_pink._spring_2026_da829392fa0cbe">
  <meta property="og:image" content="https://image.isu.pub/example/jpg/page_1_social_preview.jpg">
  <script>window.__DATA__={"datePublished":"2026-04-27T00:00:00.000Z"}</script>
`;

const soundCloudLinks = parseSoundCloudProfileHtml(
  soundCloudProfileHtml,
  "https://soundcloud.com/palyradio",
);

assert.deepEqual(soundCloudLinks, [
  {
    title: "Quad Talk 5/21/26",
    url: "https://soundcloud.com/palyradio/quad-talk-5-21-26",
  },
  {
    title: "4/30/26",
    url: "https://soundcloud.com/palyradio/4-30-26",
  },
]);

const soundCloudArticle = parseSoundCloudTrackHtml(
  soundCloudTrackHtml,
  "kply",
  "KPLY",
  "#FF5500",
);

assert.equal(soundCloudArticle.title.rendered, "Quad Talk 5/21/26");
assert.equal(soundCloudArticle.date, "2026-05-21T00:00:00.000Z");
assert.equal(soundCloudArticle.externalProvider, "soundcloud");
assert.equal(soundCloudArticle.sourceType, "podcast");

const issuuLinks = parseIssuuProfileHtml(
  issuuProfileHtml,
  "https://issuu.com/proofpaly",
);

assert.deepEqual(issuuLinks, [
  {
    title: "[pink.] spring 2026",
    url: "https://issuu.com/proofpaly/docs/_pink._spring_2026_da829392fa0cbe",
  },
  {
    title: "[proof] spring 2026",
    url: "https://issuu.com/proofpaly/docs/_proof_spring_2026",
  },
]);

const issuuArticle = parseIssuuIssueHtml(
  issuuIssueHtml,
  "proof",
  "[proof]",
  "#111827",
);

assert.equal(issuuArticle.title.rendered, "[pink.] spring 2026");
assert.equal(issuuArticle.date, "2026-04-27T00:00:00.000Z");
assert.equal(issuuArticle.externalProvider, "issuu");
assert.equal(issuuArticle.sourceType, "issue");
assert.equal(
  issuuArticle._embedded?.["wp:featuredmedia"]?.[0]?.source_url,
  "https://image.isu.pub/example/jpg/page_1_social_preview.jpg",
);

assert.equal(
  isExternalPublicationId("chomp"),
  false,
  "Chomp should not have an external feed adapter",
);
assert.equal(
  isExternalPublicationId("aperture"),
  false,
  "Aperture should not have an external feed adapter",
);
