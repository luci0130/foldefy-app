import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserProfile } from "@/lib/tauri";

interface UserState {
  profile: UserProfile | null;
  onboardingStep: number;
  profileSetupStep: number;
  isLoading: boolean;
  setProfile: (profile: UserProfile) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  setOnboardingStep: (step: number) => void;
  setProfileSetupStep: (step: number) => void;
  setLoading: (loading: boolean) => void;
  completeOnboarding: () => void;
  reset: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      profile: null,
      onboardingStep: 0,
      profileSetupStep: 0,
      isLoading: false,

      setProfile: (profile) => set({ profile }),

      updateProfile: (updates) =>
        set((state) => ({
          profile: state.profile
            ? { ...state.profile, ...updates }
            : null,
        })),

      setOnboardingStep: (step) => set({ onboardingStep: step }),

      setProfileSetupStep: (step) => set({ profileSetupStep: step }),

      setLoading: (loading) => set({ isLoading: loading }),

      completeOnboarding: () =>
        set((state) => ({
          profile: state.profile
            ? { ...state.profile, onboarding_completed: true }
            : null,
        })),

      reset: () =>
        set({
          profile: null,
          onboardingStep: 0,
          profileSetupStep: 0,
          isLoading: false,
        }),
    }),
    {
      name: "foldefy-user",
    }
  )
);
