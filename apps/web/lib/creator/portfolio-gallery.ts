export const MAX_GALLERY_ITEMS = 6;
export const MAX_CATEGORY_NAME_LENGTH = 12;

type SectionLike = { id: string; orderIndex?: number };

/** Row rules for one gallery: hide if <3; show 3 if 3–5; show 6 if exactly 6. */
export function applyGalleryVisibility<T extends { orderIndex?: number }>(
  items: T[]
): T[] {
  const sorted = [...items]
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
    .slice(0, MAX_GALLERY_ITEMS);

  if (sorted.length < 3) return [];
  if (sorted.length < 6) return sorted.slice(0, 3);
  return sorted.slice(0, 6);
}

/**
 * Flatten public gallery items across sections (legacy single-grid).
 * Prefer per-section visibility via `publicVisibleSections` when tabs are used.
 */
export function publicGalleryItems<T extends { orderIndex?: number }>(
  sections: Array<{ items: T[] }>
): T[] {
  const items = sections
    .flatMap((section) => section.items)
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
    .slice(0, MAX_GALLERY_ITEMS);

  return applyGalleryVisibility(items);
}

/** Sections that pass per-section visibility (non-empty after row rules). */
export function publicVisibleSections<
  TItem extends { orderIndex?: number },
  TSection extends { id: string; items: TItem[]; orderIndex?: number },
>(sections: TSection[]): Array<TSection & { visibleItems: TItem[] }> {
  const ordered = [...sections].sort(
    (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
  );

  return ordered
    .map((section) => ({
      ...section,
      visibleItems: applyGalleryVisibility(section.items),
    }))
    .filter((section) => section.visibleItems.length > 0);
}

export function isHomeSection(
  sections: SectionLike[],
  section: SectionLike
): boolean {
  if (sections.length === 0) return false;
  const home = [...sections].sort(
    (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
  )[0];
  return home?.id === section.id;
}

export function categorySections<T extends SectionLike>(sections: T[]): T[] {
  if (sections.length === 0) return [];
  const ordered = [...sections].sort(
    (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
  );
  return ordered.slice(1);
}

export function homeSectionId(sections: SectionLike[]): string | null {
  if (sections.length === 0) return null;
  return (
    [...sections].sort(
      (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
    )[0]?.id ?? null
  );
}
