"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface UserInfo {
  username: string;
  avatar: string | null;
}

export interface UserState {
  userInfo: UserInfo | null;
  isLoggedIn: boolean;
  isLoginModalOpen: boolean;
  login: (username: string) => void;
  logout: () => void;
  openLoginModal: () => void;
  closeLoginModal: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      userInfo: null,
      isLoggedIn: false,
      isLoginModalOpen: false,
      login: (username) =>
        set({
          userInfo: { username, avatar: null },
          isLoggedIn: true,
        }),
      logout: () =>
        set({
          userInfo: null,
          isLoggedIn: false,
        }),
      openLoginModal: () => set({ isLoginModalOpen: true }),
      closeLoginModal: () => set({ isLoginModalOpen: false }),
    }),
    {
      name: "user-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        userInfo: state.userInfo,
        isLoggedIn: state.isLoggedIn,
      }),
    },
  ),
);
