import type { Product } from './catalog';

export interface AddCartItemPayload {
  productId: string;
  variantId: string;
  quantity: number;
}

export interface UpdateCartItemPayload {
  quantity: number;
}

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  thumbnail: string;
  productSku: string;
  variantId: string;
  color: string;
  colorHex?: string;
  size: string;
  sku: string;
  stock: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isAvailable: boolean;
}

export interface Cart {
  id?: string;
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  hasUnavailableItems: boolean;
}

export interface WishlistItem {
  product: Product;
  addedAt: string;
}

export interface Wishlist {
  id?: string;
  items: WishlistItem[];
  count: number;
}

export interface MoveWishlistToCartPayload {
  variantId: string;
  quantity: number;
}

export interface WishlistMoveToCartResult {
  cart: Cart;
  wishlist: Wishlist;
}
