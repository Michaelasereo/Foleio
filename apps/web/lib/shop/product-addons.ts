import { nairaInputToKobo } from '@/lib/shop/money';

export type AddonOption = {
  id: string;
  name: string;
  price: number; // kobo
};

export type AddonCategory = {
  id: string;
  name: string;
  required: boolean;
  options: AddonOption[];
};

type RawOption = {
  id?: string;
  name?: string;
  price?: number | string;
};

type RawCategory = {
  id?: string;
  name?: string;
  required?: boolean;
  options?: RawOption[];
  price?: number | string;
};

function isCategorized(raw: unknown[]): boolean {
  return raw.some(
    (row) =>
      row &&
      typeof row === 'object' &&
      Array.isArray((row as RawCategory).options)
  );
}

function parseOptionKobo(raw: RawOption): AddonOption | null {
  const id = String(raw?.id || '').trim() || crypto.randomUUID();
  const name = String(raw?.name || '').trim();
  if (!name) return null;
  const price = Math.max(0, Math.round(Number(raw?.price) || 0));
  return { id, name, price };
}

function parseOptionNaira(raw: RawOption): AddonOption | null {
  const id = String(raw?.id || '').trim() || crypto.randomUUID();
  const name = String(raw?.name || '').trim();
  if (!name) return null;
  const price = Math.max(0, nairaInputToKobo(raw?.price));
  return { id, name, price };
}

/** Parse product.addons JSON from DB (prices in kobo). Supports legacy flat list. */
export function parseAddonCategories(raw: unknown): AddonCategory[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  if (isCategorized(raw)) {
    return (raw as RawCategory[])
      .map((category) => {
        const id = String(category?.id || '').trim() || crypto.randomUUID();
        const name = String(category?.name || '').trim();
        const options = Array.isArray(category?.options)
          ? category.options
              .map(parseOptionKobo)
              .filter((option): option is AddonOption => Boolean(option))
          : [];
        if (!name || options.length === 0) return null;
        return {
          id,
          name,
          required: Boolean(category?.required),
          options,
        };
      })
      .filter((category): category is AddonCategory => Boolean(category));
  }

  const options = (raw as RawOption[])
    .map(parseOptionKobo)
    .filter((option): option is AddonOption => Boolean(option));
  if (options.length === 0) return [];
  return [
    {
      id: 'legacy-addons',
      name: 'Add-ons',
      required: false,
      options,
    },
  ];
}

export function flattenAddonOptions(categories: AddonCategory[]): AddonOption[] {
  return categories.flatMap((category) => category.options);
}

/**
 * Parse add-ons from creator form / API body.
 * Option prices are in Naira unless `pricesInKobo` is true.
 */
export function normalizeAddonCategoriesInput(
  raw: unknown,
  pricesInKobo = false
): AddonCategory[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const parseOption = pricesInKobo ? parseOptionKobo : parseOptionNaira;

  if (isCategorized(raw)) {
    return (raw as RawCategory[])
      .map((category) => {
        const id = String(category?.id || '').trim() || crypto.randomUUID();
        const name = String(category?.name || '').trim();
        const options = Array.isArray(category?.options)
          ? category.options
              .map(parseOption)
              .filter((option): option is AddonOption => Boolean(option))
          : [];
        if (!name || options.length === 0) return null;
        return {
          id,
          name,
          required: Boolean(category?.required),
          options,
        };
      })
      .filter((category): category is AddonCategory => Boolean(category));
  }

  const options = (raw as RawOption[])
    .map(parseOption)
    .filter((option): option is AddonOption => Boolean(option));
  if (options.length === 0) return [];
  return [
    {
      id: crypto.randomUUID(),
      name: 'Add-ons',
      required: false,
      options,
    },
  ];
}

export function validateRequiredAddons(
  categories: AddonCategory[],
  selectedOptionIds: string[]
): string | null {
  const selected = new Set(selectedOptionIds);
  for (const category of categories) {
    if (!category.required) continue;
    const picked = category.options.filter((option) => selected.has(option.id));
    if (picked.length !== 1) {
      return `Select ${category.name}`;
    }
  }
  return null;
}
