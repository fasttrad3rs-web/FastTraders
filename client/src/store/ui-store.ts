'use client';

import { create } from 'zustand';

/** Ephemeral UI state: drawers, panels and the announcement bar. */

interface UiState {
  mobileNavOpen: boolean;
  cartDrawerOpen: boolean;
  inquiryDrawerOpen: boolean;
  searchOpen: boolean;
  announcementDismissed: boolean;
  setMobileNav: (open: boolean) => void;
  setCartDrawer: (open: boolean) => void;
  setInquiryDrawer: (open: boolean) => void;
  setSearch: (open: boolean) => void;
  dismissAnnouncement: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  mobileNavOpen: false,
  cartDrawerOpen: false,
  inquiryDrawerOpen: false,
  searchOpen: false,
  announcementDismissed: false,

  setMobileNav: (open) => set({ mobileNavOpen: open }),
  setCartDrawer: (open) => set({ cartDrawerOpen: open }),
  setInquiryDrawer: (open) => set({ inquiryDrawerOpen: open }),
  setSearch: (open) => set({ searchOpen: open }),
  dismissAnnouncement: () => set({ announcementDismissed: true }),
}));
