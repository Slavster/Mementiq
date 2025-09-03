import React, { useState } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ConsentPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onAccepted: () => void;
}

interface ConsentData {
  portfolioConsent: boolean;
  rdConsent: boolean;
}

export function ConsentPopup({ isOpen, onClose, onAccepted }: ConsentPopupProps) {
  const [tosAccepted, setTosAccepted] = useState(false);
  const [ppAccepted, setPpAccepted] = useState(false);
  const [portfolioConsent, setPortfolioConsent] = useState(false);
  const [rdConsent, setRdConsent] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const acceptConsentMutation = useMutation({
    mutationFn: (data: ConsentData) => 
      apiRequest('/api/auth/accept-tos-pp', { 
        method: 'POST', 
        body: JSON.stringify(data) 
      }),
    onSuccess: () => {
      toast({
        title: "Consent Recorded",
        description: "Your terms acceptance and privacy preferences have been saved.",
      });
      // Invalidate user query to refresh ToS acceptance status
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      onAccepted();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record consent. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!tosAccepted || !ppAccepted) {
      toast({
        title: "Required Agreement",
        description: "You must accept both the Terms of Service and Privacy Policy to continue.",
        variant: "destructive",
      });
      return;
    }

    acceptConsentMutation.mutate({
      portfolioConsent,
      rdConsent,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark border border-charcoal/30 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-charcoal/30">
          <h2 className="text-xl font-semibold text-light">Terms & Privacy</h2>
          <button
            onClick={onClose}
            className="text-charcoal hover:text-light transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <p className="text-charcoal text-sm">
            Before creating your first project, please review and accept our terms.
          </p>

          {/* Required Terms */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-light">Required</h3>
            
            {/* Terms of Service */}
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="tos"
                checked={tosAccepted}
                onChange={(e) => setTosAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border border-charcoal/30 bg-dark text-accent focus:ring-accent focus:ring-offset-0"
              />
              <label htmlFor="tos" className="text-sm text-charcoal flex-1">
                I agree to the{' '}
                <a
                  href="/terms-of-service"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:text-accent/80 underline inline-flex items-center gap-1"
                >
                  Terms of Service
                  <ExternalLink size={12} />
                </a>
              </label>
            </div>

            {/* Privacy Policy */}
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="pp"
                checked={ppAccepted}
                onChange={(e) => setPpAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border border-charcoal/30 bg-dark text-accent focus:ring-accent focus:ring-offset-0"
              />
              <label htmlFor="pp" className="text-sm text-charcoal flex-1">
                I agree to the{' '}
                <a
                  href="/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:text-accent/80 underline inline-flex items-center gap-1"
                >
                  Privacy Policy
                  <ExternalLink size={12} />
                </a>
              </label>
            </div>
          </div>

          {/* Optional Consents */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-light">Privacy Preferences</h3>
            
            {/* Portfolio Showcase */}
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="portfolio"
                checked={portfolioConsent}
                onChange={(e) => setPortfolioConsent(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border border-charcoal/30 bg-dark text-accent focus:ring-accent focus:ring-offset-0"
              />
              <label htmlFor="portfolio" className="text-sm text-charcoal flex-1">
                Allow Mementiq to showcase my video projects in marketing materials
              </label>
            </div>

            {/* R&D / Model Training */}
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="rd"
                checked={rdConsent}
                onChange={(e) => setRdConsent(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border border-charcoal/30 bg-dark text-accent focus:ring-accent focus:ring-offset-0"
              />
              <label htmlFor="rd" className="text-sm text-charcoal flex-1">
                Allow Mementiq to use my data for research and development to improve our services
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={acceptConsentMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-accent hover:bg-accent/90 text-dark"
              disabled={!tosAccepted || !ppAccepted || acceptConsentMutation.isPending}
            >
              {acceptConsentMutation.isPending ? 'Saving...' : 'Continue'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}