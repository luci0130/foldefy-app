import { useEffect } from "react";
import { OnboardingCarousel } from "@/components/onboarding/OnboardingCarousel";
import { ProfileSetup } from "@/components/profile/ProfileSetup";
import { MainLayout } from "@/components/layout/MainLayout";
import { StorageScanSetup } from "@/components/scanning/StorageScanSetup";
import { AIRecommendation } from "@/components/ai/AIRecommendation";
import { useUserStore } from "@/stores/userStore";
import { useAppStore } from "@/stores/appStore";
import { useScanStore } from "@/stores/scanStore";

function App() {
  const { profile } = useUserStore();
  const {
    showOnboarding,
    showProfileSetup,
    showStorageScan,
    showAIRecommendation,
    setShowOnboarding,
    setShowProfileSetup,
    setShowStorageScan,
    setShowAIRecommendation,
    setCurrentPage,
  } = useAppStore();
  const { setScanMode } = useScanStore();

  // Check if user has completed onboarding
  useEffect(() => {
    if (profile?.onboarding_completed) {
      setShowOnboarding(false);
      setShowProfileSetup(false);
    }
  }, [profile, setShowOnboarding, setShowProfileSetup]);

  // Handle onboarding completion
  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setShowProfileSetup(true);
  };

  // Handle onboarding skip
  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
    setShowProfileSetup(true);
  };

  // Profile setup complete -> guided storage scan -> AI recommendation
  const handleProfileComplete = (scanMode: "entire" | "folder") => {
    setShowProfileSetup(false);
    setScanMode(scanMode);
    setShowStorageScan(true);
  };

  // Handle profile setup skip
  const handleProfileSkip = () => {
    setShowProfileSetup(false);
  };

  // Show onboarding if not completed
  if (showOnboarding && !profile?.onboarding_completed) {
    return (
      <OnboardingCarousel
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    );
  }

  // Show profile setup after onboarding
  if (showProfileSetup && !profile?.onboarding_completed) {
    return (
      <ProfileSetup
        onComplete={handleProfileComplete}
        onSkip={handleProfileSkip}
      />
    );
  }

  // Guided storage scan (after profile setup, or re-triggered later)
  if (showStorageScan) {
    return (
      <StorageScanSetup
        onComplete={() => {
          setShowStorageScan(false);
          setShowAIRecommendation(true);
        }}
        onSkip={() => setShowStorageScan(false)}
      />
    );
  }

  // AI structure recommendation (after scan, or from the Dashboard)
  if (showAIRecommendation) {
    return (
      <AIRecommendation
        onComplete={() => setShowAIRecommendation(false)}
        onSkip={() => {
          setShowAIRecommendation(false);
          setCurrentPage("marketplace");
        }}
      />
    );
  }

  // Show main application
  return <MainLayout />;
}

export default App;
