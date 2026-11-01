export interface ParsedElement {
  type:
    | "text"
    | "paragraph"
    | "heading"
    | "link"
    | "list"
    | "listItem"
    | "bold"
    | "italic"
    | "image"
    | "blockquote"
    | "break"
    | "advertisement"
    | "publicationAd"
    | "gallery";
  content?: string;
  level?: number;
  href?: string;
  src?: string;
  alt?: string;
  children?: ParsedElement[];
  images?: { src: string; alt: string; credit?: string; caption?: string }[];
  // Populated for "publicationAd" elements — identifies the SNO ad spot to serve
  spotId?: string;
  clientId?: string;
}

function decodeHtmlEntities(text: string): string {
  if (!text) return "";
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#8230;/g, "...")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

function extractAttribute(tag: string, attr: string): string | null {
  const regex = new RegExp(`${attr}=["']([^"']*)["']`, "i");
  const match = tag.match(regex);
  return match ? decodeHtmlEntities(match[1]) : null;
}

function getBestSrcFromSrcSet(srcSet: string): string | null {
  const candidates = srcSet
    .split(",")
    .map((entry) => entry.trim())
    .map((entry) => {
      const [urlPart, descriptor] = entry.split(/\s+/, 2);
      if (!urlPart) return null;

      const widthMatch = descriptor?.match(/^(\d+)w$/i);
      if (widthMatch) {
        return { url: urlPart, score: parseInt(widthMatch[1], 10) };
      }

      const densityMatch = descriptor?.match(/^(\d+(?:\.\d+)?)x$/i);
      if (densityMatch) {
        return { url: urlPart, score: parseFloat(densityMatch[1]) * 1000 };
      }

      return { url: urlPart, score: 0 };
    })
    .filter((item): item is { url: string; score: number } => Boolean(item));

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].url || null;
}

function getPreferredImageUrlFromTag(tag: string): string | null {
  const preferredCandidates = [
    extractAttribute(tag, "data-orig-file"),
    extractAttribute(tag, "data-large-file"),
    extractAttribute(tag, "data-srcset"),
    extractAttribute(tag, "srcset"),
  ];

  for (const candidate of preferredCandidates) {
    if (!candidate) continue;
    const srcFromSet = getBestSrcFromSrcSet(candidate);
    if (srcFromSet) return srcFromSet;
    if (candidate.trim()) return candidate.trim();
  }

  return extractAttribute(tag, "data-src") || extractAttribute(tag, "src");
}

function parseInlineContent(html: string): ParsedElement[] {
  const elements: ParsedElement[] = [];
  let remaining = html;

  while (remaining.length > 0) {
    const linkMatch = remaining.match(
      /<a\s+[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/i,
    );
    const boldMatch = remaining.match(/<(strong|b)>([\s\S]*?)<\/\1>/i);
    const italicMatch = remaining.match(/<(em|i)>([\s\S]*?)<\/\1>/i);
    const brMatch = remaining.match(/<br\s*\/?>/i);

    const matches = [
      linkMatch
        ? { type: "link", index: linkMatch.index!, match: linkMatch }
        : null,
      boldMatch
        ? { type: "bold", index: boldMatch.index!, match: boldMatch }
        : null,
      italicMatch
        ? { type: "italic", index: italicMatch.index!, match: italicMatch }
        : null,
      brMatch ? { type: "break", index: brMatch.index!, match: brMatch } : null,
    ]
      .filter(Boolean)
      .sort((a, b) => a!.index - b!.index);

    if (matches.length === 0) {
      const text = decodeHtmlEntities(remaining.replace(/<[^>]*>/g, ""));
      if (text) {
        elements.push({ type: "text", content: text });
      }
      break;
    }

    const first = matches[0]!;

    if (first.index > 0) {
      const textBefore = decodeHtmlEntities(
        remaining.substring(0, first.index).replace(/<[^>]*>/g, ""),
      );
      if (textBefore) {
        elements.push({ type: "text", content: textBefore });
      }
    }

    if (first.type === "link") {
      const href = first.match[1];
      const linkText = decodeHtmlEntities(
        first.match[2].replace(/<[^>]*>/g, ""),
      );
      elements.push({ type: "link", content: linkText, href });
      remaining = remaining.substring(first.index + first.match[0].length);
    } else if (first.type === "bold") {
      const boldText = decodeHtmlEntities(
        first.match[2].replace(/<[^>]*>/g, ""),
      );
      elements.push({ type: "bold", content: boldText });
      remaining = remaining.substring(first.index + first.match[0].length);
    } else if (first.type === "italic") {
      const italicText = decodeHtmlEntities(
        first.match[2].replace(/<[^>]*>/g, ""),
      );
      elements.push({ type: "italic", content: italicText });
      remaining = remaining.substring(first.index + first.match[0].length);
    } else if (first.type === "break") {
      elements.push({ type: "break" });
      remaining = remaining.substring(first.index + first.match[0].length);
    }
  }

  return elements;
}

interface BlockMatch {
  start: number;
  end: number;
  element: ParsedElement;
}

function isOverlapping(
  block: BlockMatch,
  consumed: [number, number][],
): boolean {
  for (const [start, end] of consumed) {
    if (block.start >= start && block.start < end) return true;
    if (block.end > start && block.end <= end) return true;
    if (block.start <= start && block.end >= end) return true;
  }
  return false;
}

function parseBlockquoteContent(html: string): ParsedElement[] {
  const children: ParsedElement[] = [];

  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match;
  const paragraphs: { index: number; content: string }[] = [];

  while ((match = pRegex.exec(html)) !== null) {
    paragraphs.push({ index: match.index, content: match[1] });
  }

  if (paragraphs.length > 0) {
    paragraphs.sort((a, b) => a.index - b.index);
    for (const p of paragraphs) {
      const inlineElements = parseInlineContent(p.content);
      if (inlineElements.length > 0) {
        children.push({ type: "paragraph", children: inlineElements });
      }
    }
  } else {
    const inlineElements = parseInlineContent(html);
    if (inlineElements.length > 0) {
      children.push({ type: "paragraph", children: inlineElements });
    }
  }

  return children;
}

export function parseWordPressHtml(html: string): ParsedElement[] {
  if (!html) return [];

  let cleaned = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "")
    .replace(/<input[^>]*>/gi, "")
    .replace(/<button[\s\S]*?<\/button>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "");

  const blocks: BlockMatch[] = [];
  let match: RegExpExecArray | null;

  const headingRegex = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  while ((match = headingRegex.exec(cleaned)) !== null) {
    const level = parseInt(match[1], 10);
    const content = match[2];
    const textContent = decodeHtmlEntities(content.replace(/<[^>]*>/g, ""));
    if (textContent.trim()) {
      blocks.push({
        start: match.index,
        end: match.index + match[0].length,
        element: {
          type: "heading",
          level,
          content: textContent,
          children: parseInlineContent(content),
        },
      });
    }
  }

  const blockquoteRegex = /<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi;
  while ((match = blockquoteRegex.exec(cleaned)) !== null) {
    const content = match[1];
    const blockquoteChildren = parseBlockquoteContent(content);
    if (blockquoteChildren.length > 0) {
      blocks.push({
        start: match.index,
        end: match.index + match[0].length,
        element: { type: "blockquote", children: blockquoteChildren },
      });
    }
  }

  const ulRegex = /<ul[^>]*>([\s\S]*?)<\/ul>/gi;
  while ((match = ulRegex.exec(cleaned)) !== null) {
    const content = match[1];
    const listItems: ParsedElement[] = [];
    const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let liMatch;
    while ((liMatch = liRegex.exec(content)) !== null) {
      const itemText = decodeHtmlEntities(
        liMatch[1].replace(/<[^>]*>/g, ""),
      ).trim();
      if (itemText) {
        listItems.push({
          type: "listItem",
          children: parseInlineContent(liMatch[1]),
        });
      }
    }
    if (listItems.length > 0) {
      blocks.push({
        start: match.index,
        end: match.index + match[0].length,
        element: { type: "list", children: listItems },
      });
    }
  }

  const olRegex = /<ol[^>]*>([\s\S]*?)<\/ol>/gi;
  while ((match = olRegex.exec(cleaned)) !== null) {
    const content = match[1];
    const listItems: ParsedElement[] = [];
    const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let liMatch;
    while ((liMatch = liRegex.exec(content)) !== null) {
      const itemText = decodeHtmlEntities(
        liMatch[1].replace(/<[^>]*>/g, ""),
      ).trim();
      if (itemText) {
        listItems.push({
          type: "listItem",
          children: parseInlineContent(liMatch[1]),
        });
      }
    }
    if (listItems.length > 0) {
      blocks.push({
        start: match.index,
        end: match.index + match[0].length,
        element: { type: "list", children: listItems },
      });
    }
  }

  const figureRegex = /<figure[^>]*>([\s\S]*?)<\/figure>/gi;
  while ((match = figureRegex.exec(cleaned)) !== null) {
    const figureContent = match[1];
    const imgMatch = figureContent.match(/<img[^>]*>/i);
    if (imgMatch) {
      const src = getPreferredImageUrlFromTag(imgMatch[0]);
      if (!src) continue;
      let alt = extractAttribute(imgMatch[0], "alt") || "";
      const captionMatch = figureContent.match(
        /<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i,
      );
      if (captionMatch) {
        alt =
          decodeHtmlEntities(captionMatch[1].replace(/<[^>]*>/g, "")).trim() ||
          alt;
      }
      blocks.push({
        start: match.index,
        end: match.index + match[0].length,
        element: { type: "image", src, alt },
      });
    }
  }

  // Parse WordPress SFI Photo Gallery custom markup
  // This matches the outer photowrap div that contains the gallery
  const galleryRegex =
    /<div[^>]*class=["'][^"']*photowrap[^"']*["'][^>]*>([\s\S]*?)<div[^>]*class=["']photobottom["'][^>]*>/gi;
  while ((match = galleryRegex.exec(cleaned)) !== null) {
    const galleryContent = match[1];
    const images: {
      src: string;
      alt: string;
      credit?: string;
      caption?: string;
    }[] = [];

    // Try to extract photo IDs from data-photo-ids attribute for multi-image galleries
    const photoIdsMatch = galleryContent.match(
      /data-photo-ids=["']([^"']+)["']/,
    );
    const photoIds = photoIdsMatch
      ? photoIdsMatch[1].split(",").map((id) => id.trim())
      : [];

    // Extract the visible image from slideshow (this is the first/main image)
    const imgRegex2 = /<img[^>]*>/gi;
    let imgMatch;
    while ((imgMatch = imgRegex2.exec(galleryContent)) !== null) {
      const src = getPreferredImageUrlFromTag(imgMatch[0]);
      if (!src) continue;
      const alt = extractAttribute(imgMatch[0], "alt") || "";
      images.push({ src, alt });
    }

    // If we found photo IDs but only one image tag, this is a multi-image gallery
    // We need to construct URLs for the other images
    if (photoIds.length > 1 && images.length === 1) {
      // Extract base URL pattern from the first image
      // Example: https://anthromagazine.org/wp-content/uploads/2026/01/J81A0583-1200x800.jpg
      const firstImageUrl = images[0].src;
      const baseUrlMatch = firstImageUrl.match(
        /(.*\/wp-content\/uploads\/\d{4}\/\d{2}\/)/,
      );

      if (baseUrlMatch) {
        const baseUrl = baseUrlMatch[1];

        // For now, we can only guarantee the first image works
        // The other images would need to be fetched from the WordPress media API
        // which requires authentication or a custom endpoint
        //
        // We'll add a placeholder noting there are more images
        // This can be enhanced later with a server-side proxy endpoint
        images[0].alt = images[0].alt || `Gallery (${photoIds.length} photos)`;
      }
    }

    // Extract photo credit
    const creditMatch = galleryContent.match(
      /<div[^>]*class=["']photocredit["'][^>]*>([\s\S]*?)<\/div>/i,
    );
    const credit = creditMatch
      ? decodeHtmlEntities(creditMatch[1].replace(/<[^>]*>/g, "")).trim()
      : undefined;

    // Extract caption
    const captionMatch = galleryContent.match(
      /<div[^>]*class=["']photocaption["'][^>]*>([\s\S]*?)<\/div>/i,
    );
    const caption = captionMatch
      ? decodeHtmlEntities(captionMatch[1].replace(/<[^>]*>/g, "")).trim()
      : undefined;

    // Apply credit and caption to all images in gallery
    if (credit || caption) {
      images.forEach((img) => {
        if (credit) img.credit = credit;
        if (caption) img.caption = caption;
      });
    }

    if (images.length > 0) {
      blocks.push({
        start: match.index,
        end: match.index + match[0].length,
        element: { type: "gallery", images },
      });
    }
  }

  const imgRegex = /<img[^>]*>/gi;
  while ((match = imgRegex.exec(cleaned)) !== null) {
    const src = getPreferredImageUrlFromTag(match[0]);
    if (!src) continue;
    const alt = extractAttribute(match[0], "alt") || "";
    blocks.push({
      start: match.index,
      end: match.index + match[0].length,
      element: { type: "image", src, alt },
    });
  }

  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  while ((match = pRegex.exec(cleaned)) !== null) {
    const content = match[1].trim();
    if (content && !content.match(/^\s*<img[^>]*\/?>\s*$/i)) {
      const textContent = decodeHtmlEntities(
        content.replace(/<[^>]*>/g, ""),
      ).trim();
      if (textContent) {
        blocks.push({
          start: match.index,
          end: match.index + match[0].length,
          element: { type: "paragraph", children: parseInlineContent(content) },
        });
      }
    }
  }

  blocks.sort((a, b) => a.start - b.start);

  const consumed: [number, number][] = [];
  const elements: ParsedElement[] = [];

  for (const block of blocks) {
    if (!isOverlapping(block, consumed)) {
      elements.push(block.element);
      consumed.push([block.start, block.end]);
    }
  }

  if (elements.length === 0) {
    const plainText = decodeHtmlEntities(
      cleaned.replace(/<[^>]*>/g, "").trim(),
    );
    if (plainText) {
      const lines = plainText.split(/\n\n+/).filter((line) => line.trim());
      for (const line of lines) {
        elements.push({
          type: "paragraph",
          children: [{ type: "text", content: line.trim() }],
        });
      }
    }
  }

  return elements;
}
