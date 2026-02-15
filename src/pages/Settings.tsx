import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useUserStore } from "@/stores/userStore";
import { useAppStore } from "@/stores/appStore";
import { User, Palette, Bell, Shield, RotateCcw } from "lucide-react";

export function Settings() {
  const { profile, reset: resetUser } = useUserStore();
  const { setShowOnboarding } = useAppStore();

  const handleResetOnboarding = () => {
    resetUser();
    setShowOnboarding(true);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Manage your preferences and account settings
        </p>
      </div>

      {/* Profile section */}
      <Card className="bg-surface border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Profile</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile ? (
            <>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Usage Type</p>
                <p className="text-foreground capitalize">{profile.usage_type}</p>
              </div>
              <Separator className="bg-border" />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Activities</p>
                <p className="text-foreground">
                  {profile.activities.length > 0
                    ? profile.activities.join(", ")
                    : "Not specified"}
                </p>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">No profile configured</p>
          )}
        </CardContent>
      </Card>

      {/* Appearance section */}
      <Card className="bg-surface border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Palette className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Appearance</CardTitle>
              <CardDescription>Customize the look and feel</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Theme customization coming soon
          </p>
        </CardContent>
      </Card>

      {/* Notifications section */}
      <Card className="bg-surface border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Notifications</CardTitle>
              <CardDescription>Manage notification preferences</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Notification settings coming soon
          </p>
        </CardContent>
      </Card>

      {/* Privacy section */}
      <Card className="bg-surface border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Privacy & Data</CardTitle>
              <CardDescription>Control your data and privacy settings</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            All your data is stored locally on your device. Foldefy does not
            collect or transmit any personal data.
          </p>
          <Separator className="bg-border" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Reset Onboarding
              </p>
              <p className="text-sm text-muted-foreground">
                Start the onboarding process again
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetOnboarding}
              className="border-border"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
