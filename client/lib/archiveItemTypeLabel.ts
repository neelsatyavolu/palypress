export function formatArchiveItemTypeLabel(
  itemType: string | null,
): string | null {
  if (!itemType) return null;

  const label = itemType
    .split("+")
    .map((part) =>
      part
        .trim()
        .split(/[_\s]+/)
        .filter(Boolean)
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
        )
        .join(" "),
    )
    .filter(Boolean)
    .join(" + ");

  return label || null;
}
