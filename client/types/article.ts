import type { Publication } from "@/constants/publications";

interface WpTerm {
  id: number;
  name: string;
  slug: string;
  taxonomy: string;
}

export interface Article {
  id: number;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  date: string;
  link?: string;
  externalProvider?: "soundcloud" | "issuu" | "curated";
  sourceType?: "podcast" | "issue" | "article";
  _embedded?: {
    author?: { name: string }[];
    "wp:featuredmedia"?: { source_url: string }[];
    "wp:term"?: WpTerm[][];
  };
}

export interface ArticleWithSource extends Article {
  publicationId: string;
  publicationName: string;
  publicationColor: string;
}

export interface StaffProfile {
  id: number;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  slug: string;
  featured_image_src?: string; // Optional - only Paly Voice has this
  staff_name: number[];
  staff_year: number[];
  _embedded?: {
    "wp:featuredmedia"?: { source_url: string }[];
  };
}

export interface Comment {
  id: number;
  post: number;
  parent: number;
  author: number;
  author_name: string;
  author_email?: string;
  author_avatar_urls: {
    "24": string;
    "48": string;
    "96": string;
  };
  date: string;
  content: { rendered: string };
  status: string;
}

export interface StaffYear {
  id: number;
  name: string;
  slug: string;
  count: number;
}

export type HomeStackParamList = {
  Home: undefined;
  ArticleDetail: {
    article?: Article;
    articleId?: number;
    publicationId?: string;
    source?:
      | "home_feed"
      | "search"
      | "related_article"
      | "saved_article"
      | "staff_article"
      | "notification"
      | "deep_link"
      | "unknown";
    sourceDetail?: string;
  };
  Staff: { publication?: Publication } | undefined;
  AllStaff: undefined;
  StaffDetail: { staff: StaffProfile; publicationId?: string };
  StaffArticleDetail: {
    article?: Article;
    articleId?: number;
    publicationId?: string;
    source?:
      | "home_feed"
      | "search"
      | "related_article"
      | "saved_article"
      | "staff_article"
      | "notification"
      | "deep_link"
      | "unknown";
    sourceDetail?: string;
  };
  Search: { initialQuery?: string } | undefined;
  ArchiveArticleDetail: {
    archiveId: string;
    sourceDetail?: string;
  };
  Comments: { articleId: number; articleTitle: string };
  About: undefined;
  Policies: undefined;
  ContactUs: undefined;
  Corrections: undefined;
  Archives: undefined;
  Advertising: undefined;
  Sponsor: undefined;
  Submit: undefined;
  GeneralInfo: undefined;
  Sponsorships: undefined;
};

export interface AuthorTerm {
  id: number;
  name: string;
  slug: string;
}

export function getArticleAuthorTerms(article: Article): AuthorTerm[] {
  const terms = article._embedded?.["wp:term"];
  if (!terms) return [];

  const authors: AuthorTerm[] = [];
  for (const termArray of terms) {
    for (const term of termArray) {
      if (term.taxonomy === "staff_name") {
        authors.push({ id: term.id, name: term.name, slug: term.slug });
      }
    }
  }
  return authors;
}

export function getArticleAuthors(article: Article): string {
  const authors = getArticleAuthorTerms(article);
  const staffNames = authors.map((a) => a.name);

  if (staffNames.length === 0) return "The Paly Voice";
  if (staffNames.length === 1) return staffNames[0];
  if (staffNames.length === 2) return `${staffNames[0]} and ${staffNames[1]}`;
  return `${staffNames.slice(0, -1).join(", ")}, and ${staffNames[staffNames.length - 1]}`;
}

export function getArticleCategory(article: Article): string | undefined {
  const terms = article._embedded?.["wp:term"];
  if (!terms) return undefined;

  for (const termArray of terms) {
    for (const term of termArray) {
      if (term.taxonomy === "category" && term.name !== "Uncategorized") {
        return term.name;
      }
    }
  }
  return undefined;
}
