import type { Product } from '../types/catalog';

const STORAGE_KEY = 'xedap22h.recently-viewed-product-slugs';
const MAX_RECENT_PRODUCTS = 10;

const canUseStorage = (): boolean => typeof window !== 'undefined';

const normalizeSlugs = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((slug): slug is string => typeof slug === 'string')
        .map((slug) => slug.trim())
        .filter(Boolean),
    ),
  ).slice(0, MAX_RECENT_PRODUCTS);
};

export const getRecentlyViewedProductSlugs = (): string[] => {
  if (!canUseStorage()) {
    return [];
  }

  try {
    return normalizeSlugs(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]'));
  } catch {
    return [];
  }
};

export const rememberRecentlyViewedProduct = (product: Pick<Product, 'slug'>): void => {
  if (!canUseStorage() || !product.slug.trim()) {
    return;
  }

  const nextSlugs = [
    product.slug,
    ...getRecentlyViewedProductSlugs().filter((slug) => slug !== product.slug),
  ].slice(0, MAX_RECENT_PRODUCTS);

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSlugs));
  } catch {
    // The storefront remains usable if browser storage is unavailable.
  }
};

export const clearRecentlyViewedProducts = (): void => {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // No visible action is needed when storage is unavailable.
  }
};
