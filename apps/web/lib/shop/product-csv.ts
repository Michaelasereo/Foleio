/** Minimal CSV helpers for shop product bulk import (quoted fields supported). */

export const PRODUCT_CSV_HEADERS = [
  'name',
  'description',
  'price',
  'stock',
  'weight_kg',
] as const;

export const PRODUCT_CSV_TEMPLATE = `${PRODUCT_CSV_HEADERS.join(',')}
Bakers cake,Fresh baked cake,11000,20,1.5
Vanilla cupcake box,Box of 6,3500,50,
`;

export const MAX_CSV_PRODUCT_ROWS = 15;

export type ParsedProductCsvRow = {
  rowNumber: number;
  name: string;
  description: string;
  price: number | null;
  stock: number | null;
  weight: number | null;
  error: string | null;
};

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ',') {
      fields.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  fields.push(current);
  return fields.map((field) => field.trim());
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

function parseOptionalNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  if (!Number.isFinite(num)) return NaN;
  return num;
}

export function validateProductCsvRow(input: {
  rowNumber: number;
  name: string;
  description: string;
  priceRaw: string;
  stockRaw: string;
  weightRaw: string;
}): ParsedProductCsvRow {
  const name = input.name.trim();
  const description = input.description.trim();
  const price = parseOptionalNumber(input.priceRaw);
  const stockNum = parseOptionalNumber(input.stockRaw);
  const weight = parseOptionalNumber(input.weightRaw);

  let error: string | null = null;
  if (!name) error = 'Product name is required';
  else if (price === null || Number.isNaN(price) || price <= 0) {
    error = 'Price must be greater than 0';
  } else if (
    stockNum === null ||
    Number.isNaN(stockNum) ||
    !Number.isInteger(stockNum) ||
    stockNum < 0
  ) {
    error = 'Stock is required and must be a whole number (0 or more)';
  } else if (weight !== null && (Number.isNaN(weight) || weight < 0)) {
    error = 'Weight must be a valid number';
  }

  return {
    rowNumber: input.rowNumber,
    name,
    description,
    price: price !== null && !Number.isNaN(price) ? price : null,
    stock: stockNum !== null && !Number.isNaN(stockNum) ? Math.floor(stockNum) : null,
    weight: weight !== null && !Number.isNaN(weight) ? weight : null,
    error,
  };
}

export function parseProductCsv(text: string): {
  rows: ParsedProductCsvRow[];
  error: string | null;
} {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { rows: [], error: 'CSV is empty' };
  }

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  const required = ['name', 'price', 'stock'] as const;
  for (const key of required) {
    if (!headers.includes(key)) {
      return {
        rows: [],
        error: `Missing required column: ${key}`,
      };
    }
  }

  const nameIdx = headers.indexOf('name');
  const descIdx = headers.indexOf('description');
  const priceIdx = headers.indexOf('price');
  const stockIdx = headers.indexOf('stock');
  const weightIdx = headers.indexOf('weight_kg');

  const dataLines = lines.slice(1);
  if (dataLines.length === 0) {
    return { rows: [], error: 'CSV has a header but no product rows' };
  }
  if (dataLines.length > MAX_CSV_PRODUCT_ROWS) {
    return {
      rows: [],
      error: `You can import at most ${MAX_CSV_PRODUCT_ROWS} products at a time`,
    };
  }

  const rows = dataLines.map((line, i) => {
    const fields = parseCsvLine(line);
    return validateProductCsvRow({
      rowNumber: i + 2,
      name: fields[nameIdx] || '',
      description: descIdx >= 0 ? fields[descIdx] || '' : '',
      priceRaw: fields[priceIdx] || '',
      stockRaw: fields[stockIdx] || '',
      weightRaw: weightIdx >= 0 ? fields[weightIdx] || '' : '',
    });
  });

  return { rows, error: null };
}

export function downloadProductCsvTemplate() {
  const blob = new Blob([PRODUCT_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'foleio-products-template.csv';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
