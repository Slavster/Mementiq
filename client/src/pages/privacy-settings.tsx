import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PrivacySettings {
  portfolioShowcase: boolean;
  modelTraining: boolean;
  doNotSell: boolean;
}

// Simple toggle component
function Toggle({
  checked,
  onToggle,
  disabled = false,
}: {
  checked: boolean;
  onToggle: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={() => !disabled && onToggle(!checked)}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out
        ${checked ? "bg-cyan-400" : "bg-gray-600"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
      disabled={disabled}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out
          ${checked ? "translate-x-6" : "translate-x-1"}
        `}
      />
    </button>
  );
}

export default function PrivacySettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [settings, setSettings] = useState<PrivacySettings>({
    portfolioShowcase: false,
    modelTraining: false,
    doNotSell: true, // Default: On (do not sell/share)
  });

  // Fetch privacy settings from API
  const { data: privacyData, isLoading } = useQuery({
    queryKey: ["/api/privacy-settings"],
    enabled: true,
  });

  // Update local state when API data loads
  useEffect(() => {
    if (privacyData?.settings) {
      setSettings(privacyData.settings);
    }
  }, [privacyData]);

  // Mutation to save privacy settings
  const updatePrivacyMutation = useMutation({
    mutationFn: (newSettings: PrivacySettings) =>
      apiRequest("/api/privacy-settings", {
        method: "POST",
        body: { settings: newSettings },
      }),
    onSuccess: (data) => {
      toast({
        title: "Privacy settings updated",
        description: "Your privacy preferences have been saved successfully.",
      });
      
      // Update local state with the final settings (including any automatic adjustments)
      if (data?.settings) {
        setSettings(data.settings);
      }
      
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["/api/privacy-settings"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update settings",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleToggleChange = (
    setting: keyof PrivacySettings,
    value: boolean,
  ) => {
    const newSettings = { ...settings, [setting]: value };
    
    // Automatic logic: if doNotSell is set to true, disable modelTraining
    if (setting === 'doNotSell' && value === true) {
      newSettings.modelTraining = false;
    }
    
    setSettings(newSettings);
    updatePrivacyMutation.mutate(newSettings);
  };

  return (
    <div className="min-h-screen bg-dark text-light">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Link href="/dashboard">
            <Button
              variant="ghost"
              className="mr-4 text-charcoal hover:text-light"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-accent mr-3" />
            <h1 className="text-3xl font-bold text-light">
              Your Privacy & Content Choices
            </h1>
          </div>
        </div>

        {/* Introduction */}
        <div className="mb-8">
          <p className="text-charcoal text-lg">
            You're in control of how we use your content. These settings are
            optional and you can change them anytime. Changes save
            automatically.
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-charcoal">Loading privacy settings...</div>
          </div>
        )}

        {/* Settings Sections */}
        {!isLoading && (
        <div className="space-y-8">
          {/* Divider */}
          <div className="border-t border-charcoal/30 my-8"></div>

          {/* Portfolio Showcase Setting */}
          <div className="bg-charcoal/20 rounded-lg border border-gray-700/50 p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-light mb-2">
                  1) Show Select Work in Our Portfolio
                </h2>
                <p className="text-accent text-base font-medium mb-4">
                  Let Mementiq feature my finished edits in our portfolio
                </p>
              </div>
              <div className="flex items-center ml-6">
                <Toggle
                  checked={settings.portfolioShowcase}
                  onToggle={(checked) =>
                    handleToggleChange("portfolioShowcase", checked)
                  }
                />
                <span className="ml-3 text-sm text-charcoal">
                  {settings.portfolioShowcase ? "On" : "Off"}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-light">
                What this does:
              </h3>

              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="text-accent mr-3 mt-1">•</span>
                  <div>
                    <span className="font-semibold text-light">When On:</span>
                    <span className="text-charcoal ml-2">
                      We may show your finished Edited Output (never raw
                      uploads) on our website, social channels, case studies,
                      award entries, or new-client pitches. We may make light
                      formatting tweaks (resizing, compression, tasteful
                      watermarks); no creative changes. You're confirming you've
                      got any needed permissions for people/likenesses that
                      appear. You can turn this Off later and we'll stop new
                      uses and remove the piece from active showcases within a
                      reasonable time.
                    </span>
                  </div>
                </div>

                <div className="flex items-start">
                  <span className="text-accent mr-3 mt-1">•</span>
                  <div>
                    <span className="font-semibold text-light">When Off:</span>
                    <span className="text-charcoal ml-2">
                      We won't show your work anywhere outside the private
                      service experience.
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-dark/50 rounded border border-gray-700/30">
                <p className="text-sm text-charcoal">
                  <span className="font-semibold">Notes:</span> You can withdraw
                  at any time. Editors do not get separate portfolio rights.
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-charcoal/30 my-8"></div>

          {/* Research, Development Setting */}
          <div className="bg-charcoal/20 rounded-lg border border-gray-700/50 p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-light mb-2">
                  2) Help Improve Our Editing Systems
                  <br />
                  (Research, Development & Curated Dataset)
                </h2>
                <p className="text-accent text-base font-medium mb-4">
                  Help improve Mementiq
                </p>
              </div>
              <div className="flex items-center ml-6">
                <Toggle
                  checked={settings.modelTraining}
                  onToggle={(checked) =>
                    handleToggleChange("modelTraining", checked)
                  }
                  disabled={settings.doNotSell}
                />
                <span className="ml-3 text-sm text-charcoal">
                  {settings.modelTraining ? "On" : "Off"}
                  {settings.doNotSell && (
                    <span className="text-xs text-charcoal/60 ml-2">
                      (Disabled when "Do Not Sell" is on)
                    </span>
                  )}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-light">
                What this does:
              </h3>

              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="text-accent mr-3 mt-1">•</span>
                  <div>
                    <span className="font-semibold text-light">When On:</span>
                    <span className="text-charcoal ml-2">
                      You allow us to use your uploads and/or Edited Outputs to
                      train, fine-tune, evaluate, and improve our editing
                      systems. In limited cases, we may include de-identified
                      examples in curated datasets for trusted partners under
                      strict agreements (which may include licensing/sale). You
                      can turn this Off later; we'll stop future use and remove
                      your content from training corpora going forward. Learned
                      model parameters may not be reversible.
                    </span>
                  </div>
                </div>

                <div className="flex items-start">
                  <span className="text-accent mr-3 mt-1">•</span>
                  <div>
                    <span className="font-semibold text-light">When Off:</span>
                    <span className="text-charcoal ml-2">
                      Your content is not used for Research, Development or any
                      curated dataset activity.
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-dark/50 rounded border border-gray-700/30">
                <p className="text-sm text-charcoal">
                  <span className="font-semibold">Notes:</span> We commit not to
                  re-identify de-identified data and require partners not to do
                  so.
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-charcoal/30 my-8"></div>

          {/* Do Not Sell Setting */}
          <div className="bg-charcoal/20 rounded-lg border border-gray-700/50 p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-light mb-2">
                  3) Do Not Sell or Share My Personal Information
                </h2>
                <p className="text-accent text-base font-medium mb-4">
                  Do not sell or share my personal information
                </p>
              </div>
              <div className="flex items-center ml-6">
                <Toggle
                  checked={settings.doNotSell}
                  onToggle={(checked) =>
                    handleToggleChange("doNotSell", checked)
                  }
                />
                <span className="ml-3 text-sm text-charcoal">
                  {settings.doNotSell ? "On" : "Off"}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-light">
                What this does:
              </h3>

              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="text-accent mr-3 mt-1">•</span>
                  <div>
                    <span className="font-semibold text-light">When On:</span>
                    <span className="text-charcoal ml-2">
                      We do not sell your personal information or share it for
                      cross-context behavioral advertising. If you had the
                      R&D/Dataset toggle On, we'll automatically
                      disable/withdraw that for sale/share purposes going
                      forward.
                    </span>
                  </div>
                </div>

                <div className="flex items-start">
                  <span className="text-accent mr-3 mt-1">•</span>
                  <div>
                    <span className="font-semibold text-light">When Off:</span>
                    <span className="text-charcoal ml-2">
                      You're allowing sale/share as defined by applicable law.
                      (This is not required to use Mementiq; you can keep it
                      On.)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <Link href="/dashboard">
            <Button className="bg-accent hover:bg-accent/80 text-secondary">
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
