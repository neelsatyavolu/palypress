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
