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

export const useCommerceStore = create<CommerceState>((set) => ({
  cartItemCount: 0,
  wishlistCount: 0,
  isRefreshingCounts: false,

  setCart: (cart) => set({ cartItemCount: cart.totalItems }),
  setWishlist: (wishlist) => set({ wishlistCount: wishlist.count }),

  refreshCounts: async () => {
    set({ isRefreshingCounts: true });

    try {
      const [cart, wishlist] = await Promise.all([
        cartService.getMine(),
        wishlistService.getMine(),
      ]);
      set({
        cartItemCount: cart.totalItems,
        wishlistCount: wishlist.count,
        isRefreshingCounts: false,
      });
    } catch {
      // Individual screens present request errors. Header badges should not keep
      // stale values after an expired session or a failed initial request.
      set({ cartItemCount: 0, wishlistCount: 0, isRefreshingCounts: false });
    }
  },

  reset: () =>
    set({ cartItemCount: 0, wishlistCount: 0, isRefreshingCounts: false }),
}));
