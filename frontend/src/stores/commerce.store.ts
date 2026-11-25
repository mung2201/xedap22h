import { create } from 'zustand';
import { cartService } from '../api/services/cart.service';
import { wishlistService } from '../api/services/wishlist.service';
import type { Cart, Wishlist } from '../types/commerce';

interface CommerceState {
  cartItemCount: number;
  wishlistCount: number;
  isRefreshingCounts: boolean;
  setCart: (cart: Cart) => void;
  setWishlist: (wishlist: Wishlist) => void;
  refreshCounts: () => Promise<void>;
  reset: () => void;
}

export const useCommerceStore = create<CommerceState>((set) => {
  let refreshVersion = 0;
  let cartVersion = 0;
  let wishlistVersion = 0;

  return {
    cartItemCount: 0,
    wishlistCount: 0,
    isRefreshingCounts: false,

    setCart: (cart) => {
      cartVersion += 1;
      set({ cartItemCount: cart.totalItems });
    },
    setWishlist: (wishlist) => {
      wishlistVersion += 1;
      set({ wishlistCount: wishlist.count });
    },

    refreshCounts: async () => {
      const requestVersion = ++refreshVersion;
      const requestedCartVersion = cartVersion;
      const requestedWishlistVersion = wishlistVersion;
      set({ isRefreshingCounts: true });

      const [cart, wishlist] = await Promise.allSettled([
        cartService.getMine(),
        wishlistService.getMine(),
      ]);
      if (requestVersion !== refreshVersion) return;

      // A screen mutation or logout takes precedence over an older badge refresh.
      // Keep each known count when only the other service succeeds.
      set((state) => ({
        cartItemCount: requestedCartVersion === cartVersion && cart.status === 'fulfilled'
          ? cart.value.totalItems : state.cartItemCount,
        wishlistCount: requestedWishlistVersion === wishlistVersion && wishlist.status === 'fulfilled'
          ? wishlist.value.count : state.wishlistCount,
        isRefreshingCounts: false,
      }));
    },

    reset: () => {
      refreshVersion += 1;
      cartVersion += 1;
      wishlistVersion += 1;
      set({ cartItemCount: 0, wishlistCount: 0, isRefreshingCounts: false });
    },
  };
});
