export function commentAuthorKey(
  publicationId: string,
  authorId: number | undefined | null,
  authorName: string,
): string {
  if (authorId && authorId > 0) {
    return `${publicationId}:id:${authorId}`;
  }
  return `${publicationId}:name:${authorName.trim().toLowerCase()}`;
}

export const COMMENT_REPORT_REASONS = [
  "harassment",
  "hate",
  "spam",
  "sexual",
  "other",
] as const;

export type CommentReportReason = (typeof COMMENT_REPORT_REASONS)[number];
