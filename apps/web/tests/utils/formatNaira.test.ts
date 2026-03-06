import { describe, expect, it } from 'vitest';
import { formatNaira } from '@foleio/utils';

describe('formatNaira', () => {
  it('formats whole numbers correctly', () => {
    expect(formatNaira(1000)).toBe('₦1,000');
    expect(formatNaira(5000)).toBe('₦5,000');
  });

  it('formats decimal numbers correctly', () => {
    expect(formatNaira(1500.5)).toBe('₦1,500.50');
    expect(formatNaira(2999.99)).toBe('₦2,999.99');
  });

  it('handles zero correctly', () => {
    expect(formatNaira(0)).toBe('₦0');
  });
});

