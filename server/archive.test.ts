import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  buildArchiveBrowseUrl,
  buildArchiveArticleUrl,
  buildArchiveSearchUrl,
  buildArchiveSectionTextUrl,
  parseArchiveArticleHtml,
  parseArchiveSearchHtml,
} from "./archive";
import { ARCHIVE_PUBLICATIONS } from "../shared/archive";

const searchHtml = `
  <section id="searchpagesearchresults">
    <h2 id="searchresultssummary">Results 1 to 20 of  7,206 for <b>football</b></h2>
    <ol class="vlist searchresults" start="1">
      <li>
        <div class="searchresultmaincell">
          <div class="vlistentrymaincell">
            <div><a href="https://palyjournalismarchive.pausd.org/?a=d&amp;d=CAM19300612-01.2.47&amp;srpos=1&amp;e=-------en-20--1--txt-txIN-football------"><span>Many Great Norsemen Athletes Leave School With Graduating Class</span> [ARTICLE]</a></div>
            <div>The Campanile, Volume XII, Number 31, 12 June 1930</div>
            <div class="txtsearchsnippet">VIKINGS TO LOSE MANY <b>FOOTBALL</b> AND BASKET BALL STARS</div>
          </div>
        </div>
      </li>
      <li>
        <div class="searchresultmaincell">
          <div class="vlistentrymaincell">
            <div><a href="https://palyjournalismarchive.pausd.org/?a=d&amp;d=VIK20141201-01.2.31&amp;srpos=2&amp;e=-------en-20--1--txt-txIN-football------"><span>The Last Word Is the risk really worth it?</span> [ARTICLE+ILLUSTRATION]</a></div>
            <div>The Viking, Volume VIII, Number 3, 1 December 2014</div>
            <div class="txtsearchsnippet">participation in youth flag <b>football</b></div>
          </div>
        </div>
      </li>
    </ol>
  </section>
`;

const articleHtml = `
  <div id="documentdisplayheader">
    <h1>The Campanile, Volume XII, Number 31, 12 June 1930</h1>
    <a class="pdflink" href="https://palyjournalismarchive.pausd.org/?a=is&amp;oid=CAM19300612-01&amp;type=staticpdf&amp;e=-------en-20--1--txt-txIN-football------">Issue PDF</a>
  </div>
  <div id="sectionleveltabtitlearea">
    <h2><span>Many Great Norsemen Athletes Leave School With Graduating Class</span></h2>
  </div>
  <div id="documentdisplayleftpanesectiontextcontainer">
    <p dir="auto">Many Great Norsemen Athletes Leave School With Graduating Class</p>
    <p dir="auto">VIKINGS TO LOSE MANY <b>FOOTBALL</b> AND BASKET BALL STARS</p>
    <p dir="auto">When the senior class files up to receive their diplomas...</p>
  </div>
  <div id="documentdisplayleftpanesectionlevelpersistentlinkcontainer">
    <div class="persistentlinkurl">https://palyjournalismarchive.pausd.org/?a=d&amp;d=CAM19300612-01.2.47</div>
  </div>
`;

const ajaxArticleHtml = `
  <script id="veridiancorejs" data-core-data-json='
    {
      "cgiArgD": "CAM19300612-01.2.47",
      "cgiArgSrpos": "",
      "state": "e=-------en-20--1--txt-txIN-------"
    }
  '></script>
  <div id="documentdisplayheader">
    <h1>The Campanile, Volume XII, Number 31, 12 June 1930</h1>
    <a class="pdflink" href="https://palyjournalismarchive.pausd.org/?a=is&amp;oid=CAM19300612-01&amp;type=staticpdf&amp;e=-------en-20--1--txt-txIN-------">Issue PDF</a>
  </div>
  <div id="sectionleveltabtitlearea"></div>
  <div id="documentdisplayleftpanesectiontextcontainer">
    <!-- Filled by AJAX when a section is selected -->
  </div>
  <div id="documentdisplayleftpanesectionlevelpersistentlinkcontainer">
    <div class="persistentlinkurl">https://palyjournalismarchive.pausd.org/?a=d&amp;d=CAM19300612-01.2.47</div>
  </div>
`;

const ajaxArticleTextXml = `
  <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <VeridianXMLResponse>
    <SectionText type="HTML">&lt;p dir="auto"&gt;Many Great Norsemen Athletes Leave School With Graduating Class&lt;/p&gt;&lt;p dir="auto"&gt;VIKINGS TO LOSE MANY FOOTBALL AND BASKET BALL STARS&lt;/p&gt;&lt;p dir="auto"&gt;When the senior class files up to receive their diplomas...&lt;/p&gt;</SectionText>
  </VeridianXMLResponse>
`;

const searchUrl = buildArchiveSearchUrl({
  query: "flag football",
  page: 3,
  perPage: 20,
});

assert.equal(searchUrl.searchParams.get("a"), "q");
assert.equal(searchUrl.searchParams.get("results"), "1");
assert.equal(searchUrl.searchParams.get("txq"), "flag football");
assert.equal(searchUrl.searchParams.get("txf"), "txIN");
assert.equal(searchUrl.searchParams.get("ssnip"), "txt");
assert.equal(searchUrl.searchParams.get("r"), "41");

const browseUrl = buildArchiveBrowseUrl({
  publicationCode: "CAM",
  page: 2,
  perPage: 20,
});

assert.equal(browseUrl.searchParams.get("a"), "q");
assert.equal(browseUrl.searchParams.get("txq"), "*");
assert.equal(browseUrl.searchParams.get("puq"), "CAM");
assert.equal(browseUrl.searchParams.get("sf"), "byDA.rev");
assert.equal(browseUrl.searchParams.get("r"), "21");
assert.ok(
  ARCHIVE_PUBLICATIONS.some(
    (publication) =>
      publication.code === "CAM" && publication.name === "The Campanile",
  ),
);

const sectionTextUrl = buildArchiveSectionTextUrl("CAM19300612-01.2.47");
assert.equal(sectionTextUrl.searchParams.get("a"), "da");
assert.equal(sectionTextUrl.searchParams.get("command"), "getSectionText");
assert.equal(sectionTextUrl.searchParams.get("d"), "CAM19300612-01.2.47");
assert.equal(sectionTextUrl.searchParams.get("f"), "AJAX");

const parsedSearch = parseArchiveSearchHtml(searchHtml, {
  query: "football",
  page: 1,
  perPage: 20,
});

assert.equal(parsedSearch.total, 7206);
assert.equal(parsedSearch.hasMore, true);
assert.deepEqual(
  parsedSearch.results.map((result) => ({
    id: result.id,
    title: result.title,
    itemType: result.itemType,
    dateLabel: result.dateLabel,
    snippet: result.snippet,
  })),
  [
    {
      id: "CAM19300612-01.2.47",
      title: "Many Great Norsemen Athletes Leave School With Graduating Class",
      itemType: "ARTICLE",
      dateLabel: "The Campanile, Volume XII, Number 31, 12 June 1930",
      snippet: "VIKINGS TO LOSE MANY FOOTBALL AND BASKET BALL STARS",
    },
    {
      id: "VIK20141201-01.2.31",
      title: "The Last Word Is the risk really worth it?",
      itemType: "ARTICLE+ILLUSTRATION",
      dateLabel: "The Viking, Volume VIII, Number 3, 1 December 2014",
      snippet: "participation in youth flag football",
    },
  ],
);

const parsedArticle = parseArchiveArticleHtml(
  articleHtml,
  buildArchiveArticleUrl("CAM19300612-01.2.47").toString(),
);

assert.equal(parsedArticle.id, "CAM19300612-01.2.47");
assert.equal(
  parsedArticle.title,
  "Many Great Norsemen Athletes Leave School With Graduating Class",
);
assert.equal(
  parsedArticle.issueTitle,
  "The Campanile, Volume XII, Number 31, 12 June 1930",
);
assert.equal(parsedArticle.dateLabel, "12 June 1930");
assert.deepEqual(parsedArticle.paragraphs, [
  "VIKINGS TO LOSE MANY FOOTBALL AND BASKET BALL STARS",
  "When the senior class files up to receive their diplomas...",
]);
assert.equal(
  parsedArticle.originalUrl,
  "https://palyjournalismarchive.pausd.org/?a=d&d=CAM19300612-01.2.47",
);
assert.equal(
  parsedArticle.pdfUrl,
  "https://palyjournalismarchive.pausd.org/?a=is&oid=CAM19300612-01&type=staticpdf&e=-------en-20--1--txt-txIN-football------",
);

const parsedAjaxArticle = parseArchiveArticleHtml(
  ajaxArticleHtml,
  buildArchiveArticleUrl("CAM19300612-01.2.47").toString(),
  ajaxArticleTextXml,
);

assert.equal(
  parsedAjaxArticle.title,
  "Many Great Norsemen Athletes Leave School With Graduating Class",
);
assert.deepEqual(parsedAjaxArticle.paragraphs, [
  "VIKINGS TO LOSE MANY FOOTBALL AND BASKET BALL STARS",
  "When the senior class files up to receive their diplomas...",
]);

assert.throws(
  () => buildArchiveArticleUrl("../bad"),
  /Invalid archive article id/,
);

const routesSource = fs.readFileSync(
  path.join(process.cwd(), "server/routes.ts"),
  "utf8",
);
assert.ok(
  /app\.get\("\/api\/archive\/browse"/.test(routesSource),
  "routes should register GET /api/archive/browse",
);

console.log("archive.test.ts: all assertions passed");
