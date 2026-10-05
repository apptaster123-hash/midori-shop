// Midori store — cart, wishlist and UI overlay state (PRD §7.3).
// Persist middleware writes ONLY { cart, wishlist } to localStorage under "midori-store";
// UI state resets on reload.
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine } from "./products";

const MAX_QTY = 99;

type StoreState = {
  cart: CartLine[];
  wishlist: string[];
  // UI state — not persisted
  cartOpen: boolean;
  wishlistOpen: boolean;
  searchOpen: boolean;
  chatOpen: boolean;
  quickViewProductId: string | null;

  addToCart: (productId: string, qty?: number) => void;
  removeFromCart: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  toggleWishlist: (productId: string) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  openWishlist: () => void;
  closeWishlist: () => void;
  openSearch: () => void;
  closeSearch: () => void;
  openChat: () => void;
  closeChat: () => void;
  openQuickView: (productId: string) => void;
  closeQuickView: () => void;
};

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      cart: [],
      wishlist: [],
      cartOpen: false,
      wishlistOpen: false,
      searchOpen: false,
      chatOpen: false,
      quickViewProductId: null,

      addToCart: (productId, qty = 1) =>
        set((state) => {
          const step = Math.max(1, Math.floor(qty));
          const existing = state.cart.find((line) => line.productId === productId);
          const cart = existing
            ? state.cart.map((line) =>
                line.productId === productId
                  ? { ...line, quantity: Math.min(MAX_QTY, line.quantity + step) }
                  : line,
              )
            : [...state.cart, { productId, quantity: Math.min(MAX_QTY, step) }];
          return { cart };
        }),

      removeFromCart: (productId) =>
        set((state) => ({
          cart: state.cart.filter((line) => line.productId !== productId),
        })),

      setQty: (productId, qty) =>
        set((state) => {
          if (qty <= 0) {
            return { cart: state.cart.filter((line) => line.productId !== productId) };
          }
          const next = Math.min(MAX_QTY, Math.floor(qty));
          return {
            cart: state.cart.map((line) =>
              line.productId === productId ? { ...line, quantity: next } : line,
            ),
          };
        }),

      toggleWishlist: (productId) =>
        set((state) => ({
          wishlist: state.wishlist.includes(productId)
            ? state.wishlist.filter((id) => id !== productId)
            : [...state.wishlist, productId],
        })),

      clearCart: () => set({ cart: [] }),

      openCart: () => set({ cartOpen: true }),
      closeCart: () => set({ cartOpen: false }),
      openWishlist: () => set({ wishlistOpen: true }),
      closeWishlist: () => set({ wishlistOpen: false }),
      openSearch: () => set({ searchOpen: true }),
      closeSearch: () => set({ searchOpen: false }),
      openChat: () => set({ chatOpen: true }),
      closeChat: () => set({ chatOpen: false }),
      openQuickView: (productId) => set({ quickViewProductId: productId }),
      closeQuickView: () => set({ quickViewProductId: null }),
    }),
    {
      name: "midori-store",
      partialize: (state) => ({ cart: state.cart, wishlist: state.wishlist }),
    },
  ),
);
