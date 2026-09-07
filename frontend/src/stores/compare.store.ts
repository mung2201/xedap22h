import { create } from 'zustand';
import { ProductType, type Product } from '../types/catalog';

export interface CompareProductReference {
  id: string;
  slug: string;
  name: string;
  thumbnail: string;
}

export type CompareAddResult =
  | 'added'
  | 'already-added'
  | 'limit-reached'
  | 'unsupported';

const storageKey = 'xedap22h.compare-products';
const compareLimit = 3;

const readStoredItems = (): CompareProductReference[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? '[]');
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item): item is CompareProductReference =>
        Boolean(
          item &&
            typeof item === 'object' &&
            typeof (item as CompareProductReference).id === 'string' &&
            typeof (item as CompareProductReference).slug === 'string' &&
            typeof (item as CompareProductReference).name === 'string' &&
            typeof (item as CompareProductReference).thumbnail === 'string',
        ),
    ).slice(0, compareLimit);
  } catch {
    return [];
  }
};

const persist = (items: CompareProductReference[]): void => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(storageKey, JSON.stringify(items));
  }
};

interface CompareState {
  items: CompareProductReference[];
  add: (product: Product) => CompareAddResult;
  remove: (productId: string) => void;
  clear: () => void;
}

export const useCompareStore = create<CompareState>((set, get) => ({
  items: readStoredItems(),

  add: (product) => {
    if (product.productType !== ProductType.BICYCLE) {
      return 'unsupported';
    }

    const currentItems = get().items;
    if (currentItems.some((item) => item.id === product.id)) {
      return 'already-added';
    }
    if (currentItems.length >= compareLimit) {
      return 'limit-reached';
    }

    const nextItems = [
      ...currentItems,
      {
        id: product.id,
        slug: product.slug,
        name: product.name,
        thumbnail: product.thumbnail,
      },
    ];
    persist(nextItems);
    set({ items: nextItems });
    return 'added';
  },

  remove: (productId) => {
    const nextItems = get().items.filter((item) => item.id !== productId);
    persist(nextItems);
    set({ items: nextItems });
  },

  clear: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(storageKey);
    }
    set({ items: [] });
  },
}));
