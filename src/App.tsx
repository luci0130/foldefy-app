import { useEffect } from "react";
import { OnboardingCarousel } from "@/components/onboarding/OnboardingCarousel";
import { ProfileSetup } from "@/components/profile/ProfileSetup";
import { MainLayout } from "@/components/layout/MainLayout";
import { useUserStore } from "@/stores/userStore";
import { useAppStore } from "@/stores/appStore";
import { useScanStore } from "@/stores/scanStore";

function App() {
  const { profile } = useUserStore();
  const {
    showOnboarding,
    showProfileSetup,
    setShowOnboarding,
    setShowProfileSetup,
  } = useAppStore();
  const { setScanMode, startScan, isScanning } = useScanStore();

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

  // Handle profile setup completion -> go to dashboard + start background scan
  const handleProfileComplete = (scanMode: "entire" | "folder") => {
    setShowProfileSetup(false);
    setScanMode(scanMode);
    // Start background scan after a brief delay to let the dashboard mount
    setTimeout(() => {
      if (!isScanning) {
        startScan();
      }
    }, 100);
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

  // Show main application (dashboard with background scanning)
  return <MainLayout />;
}

export default App;
