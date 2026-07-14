export const MAX_GALLERY_ITEMS = 6;

/** Flatten public gallery items with row rules: hide if <3; show 3 if 3–5; show 6 if exactly 6. */
export function publicGalleryItems<T extends { orderIndex?: number }>(
  sections: Array<{ items: T[] }>
): T[] {
  const items = sections
    .flatMap((section) => section.items)
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
    .slice(0, MAX_GALLERY_ITEMS);

  if (items.length < 3) return [];
  if (items.length < 6) return items.slice(0, 3);
  return items.slice(0, 6);
}
