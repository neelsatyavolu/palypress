import { load } from "cheerio";
import { getArchivePublicationByCode } from "@shared/archive";

export const ARCHIVE_BASE_URL = "https://palyjournalismarchive.pausd.org/";
const ARCHIVE_ENV = "-------en-20--1--txt-txIN-------";

export interface ArchiveSearchResult {
  id: string;
  title: string;
  itemType: string | null;
  dateLabel: string;
  snippet: string;
  originalUrl: string;
}

export interface ArchiveSearchResponse {
  results: ArchiveSearchResult[];
  total: number;
  page: number;
  perPage: number;
  hasMore: boolean;
}

export interface ArchiveArticle {
  id: string;
  title: string;
  issueTitle: string;
  dateLabel: string;
  paragraphs: string[];
  originalUrl: string;
  pdfUrl: string | null;
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function parseTotal(summary: string): number {
  const match = summary.match(/\bof\s+([\d,]+)/i);
  return match ? parseInt(match[1].replace(/,/g, ""), 10) : 0;
}

function parseDateLabel(issueTitle: string): string {
  const matches = issueTitle.match(/\b\d{1,2}\s+[A-Z][a-z]+\s+\d{4}\b/g);
  return matches?.at(-1) ?? "";
}

function splitResultTitle(rawTitle: string): {
  title: string;
  itemType: string | null;
} {
  const typeMatch = rawTitle.match(/\s+\[([^\]]+)\]\s*$/);
  if (!typeMatch || typeMatch.index === undefined) {
    return { title: rawTitle, itemType: null };
  }

  return {
    title: rawTitle.slice(0, typeMatch.index).trim(),
    itemType: typeMatch[1],
  };
}

export function isValidArchiveArticleId(id: string): boolean {
  return /^[A-Za-z0-9.-]+$/.test(id);
}

export function buildArchiveSearchUrl({
  query,
  page,
  perPage,
}: {
  query: string;
  page: number;
  perPage: number;
}): URL {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const safePerPage = Math.max(1, Math.floor(perPage) || 1);
  const url = new URL(ARCHIVE_BASE_URL);

  url.searchParams.set("a", "q");
  url.searchParams.set("hs", "1");
  url.searchParams.set("r", String((safePage - 1) * safePerPage + 1));
  url.searchParams.set("results", "1");
  url.searchParams.set("txq", query);
  url.searchParams.set("dafdq", "");
  url.searchParams.set("dafmq", "");
  url.searchParams.set("dafyq", "");
  url.searchParams.set("datdq", "");
  url.searchParams.set("datmq", "");
  url.searchParams.set("datyq", "");
  url.searchParams.set("puq", "");
  url.searchParams.set("txf", "txIN");
  url.searchParams.set("ssnip", "txt");
  url.searchParams.set("e", ARCHIVE_ENV);

  return url;
}

export function buildArchiveBrowseUrl({
  publicationCode,
  page,
  perPage,
}: {
  publicationCode?: string | null;
  page: number;
  perPage: number;
}): URL {
  const url = buildArchiveSearchUrl({ query: "*", page, perPage });
  url.searchParams.set("sf", "byDA.rev");

  if (publicationCode) {
    const publication = getArchivePublicationByCode(publicationCode);
    if (!publication) {
      throw new Error("Invalid archive publication code");
    }
    url.searchParams.set("puq", publication.code);
  }

  return url;
}

export function buildArchiveArticleUrl(id: string): URL {
  if (!isValidArchiveArticleId(id)) {
    throw new Error("Invalid archive article id");
  }

  const url = new URL(ARCHIVE_BASE_URL);
  url.searchParams.set("a", "d");
  url.searchParams.set("d", id);
  return url;
}

export function buildArchiveSectionTextUrl(id: string): URL {
  if (!isValidArchiveArticleId(id)) {
    throw new Error("Invalid archive article id");
  }

  const url = new URL(ARCHIVE_BASE_URL);
  url.searchParams.set("a", "da");
  url.searchParams.set("command", "getSectionText");
  url.searchParams.set("d", id);
  url.searchParams.set("f", "AJAX");
  url.searchParams.set("e", ARCHIVE_ENV);
  return url;
}

export function parseArchiveSearchHtml(
  html: string,
  {
    query: _query,
    page,
    perPage,
  }: { query: string; page: number; perPage: number },
): ArchiveSearchResponse {
  const $ = load(html);
  const total = parseTotal(cleanText($("#searchresultssummary").text()));
  const results: ArchiveSearchResult[] = [];

  $("#searchpagesearchresults ol.searchresults > li").each((_, element) => {
    if (results.length >= perPage) return false;

    const main = $(element).find(".vlistentrymaincell").first();
    const link = main.find('a[href*="a=d"]').first();
    const href = link.attr("href");
    if (!href) return;

    const resultUrl = new URL(href, ARCHIVE_BASE_URL);
    const id = resultUrl.searchParams.get("d");
    if (!id) return;

    const { title, itemType } = splitResultTitle(cleanText(link.text()));
    const dateLabel = cleanText(
      main
        .children("div")
        .filter((_, child) => {
          const childNode = $(child);
          return (
            !childNode.hasClass("txtsearchsnippet") &&
            childNode.find("a").length === 0
          );
        })
        .first()
        .text(),
    );
    const snippet = cleanText(main.find(".txtsearchsnippet").first().text());

    results.push({
      id,
      title,
      itemType,
      dateLabel,
      snippet,
      originalUrl: resultUrl.toString(),
    });
  });

  return {
    results,
    total,
    page,
    perPage,
    hasMore: page * perPage < total,
  };
}

function parseArchiveSectionTextXml(sectionTextXml?: string): string[] {
  if (!sectionTextXml) return [];

  const $xml = load(sectionTextXml, { xmlMode: true });
  const sectionTextHtml = $xml("SectionText").first().text();
  if (!sectionTextHtml) return [];

  const $section = load(sectionTextHtml);
  return $section("p")
    .map((_, element) => cleanText($section(element).text()))
    .get()
    .filter(Boolean);
}

export function parseArchiveArticleHtml(
  html: string,
  sourceUrl: string,
  sectionTextXml?: string,
): ArchiveArticle {
  const $ = load(html);
  const source = new URL(sourceUrl);
  const id = source.searchParams.get("d") || "";
  if (!id || !isValidArchiveArticleId(id)) {
    throw new Error("Invalid archive article id");
  }

  const inlineParagraphs = $("#documentdisplayleftpanesectiontextcontainer p")
    .map((_, element) => cleanText($(element).text()))
    .get()
    .filter(Boolean);
  const ajaxParagraphs = parseArchiveSectionTextXml(sectionTextXml);
  const rawParagraphs =
    ajaxParagraphs.length > 0 ? ajaxParagraphs : inlineParagraphs;
  const title =
    cleanText($("#sectionleveltabtitlearea h2").first().text()) ||
    rawParagraphs[0] ||
    "";
  const issueTitle = cleanText($("#documentdisplayheader h1").first().text());
  const paragraphs = rawParagraphs.filter(
    (paragraph, index) => index !== 0 || paragraph !== title,
  );

  const persistentLink = cleanText(
    $("#documentdisplayleftpanesectionlevelpersistentlinkcontainer")
      .find(".persistentlinkurl")
      .first()
      .text(),
  );
  const originalUrl = persistentLink
    ? new URL(persistentLink, ARCHIVE_BASE_URL).toString()
    : buildArchiveArticleUrl(id).toString();
  const pdfHref = $("#documentdisplayheader a.pdflink").first().attr("href");

  return {
    id,
    title,
    issueTitle,
    dateLabel: parseDateLabel(issueTitle),
    paragraphs,
    originalUrl,
    pdfUrl: pdfHref ? new URL(pdfHref, ARCHIVE_BASE_URL).toString() : null,
  };
}

export async function fetchArchiveHtml(url: URL): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "PalyJournalismApp/1.0 (+https://palymac.org/incubator/)",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch archive page: ${response.status}`);
  }
  return response.text();
}
