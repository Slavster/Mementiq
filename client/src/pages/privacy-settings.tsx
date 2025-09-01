import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Settings } from "lucide-react";

export default function PrivacySettings() {
  return (
    <div className="min-h-screen bg-dark text-light">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" className="mr-4 text-charcoal hover:text-light">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-accent mr-3" />
            <h1 className="text-3xl font-bold text-light">Data Privacy Settings</h1>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-charcoal/20 rounded-lg border border-gray-700/50 p-8">
          <div className="text-center">
            <Settings className="h-16 w-16 text-accent mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-light mb-4">
              Privacy Controls Coming Soon
            </h2>
            <p className="text-charcoal text-lg mb-8 max-w-2xl mx-auto">
              We're building comprehensive privacy controls to give you full control over your data. 
              You'll be able to manage your communication preferences, data sharing settings, and more.
            </p>
            
            {/* Placeholder sections */}
            <div className="grid md:grid-cols-2 gap-6 mt-8">
              <div className="bg-dark/50 rounded-lg p-6 border border-gray-700/30">
                <h3 className="text-lg font-semibold text-light mb-2">
                  Communication Preferences
                </h3>
                <p className="text-charcoal text-sm">
                  Control what emails and notifications you receive from us.
                </p>
              </div>
              
              <div className="bg-dark/50 rounded-lg p-6 border border-gray-700/30">
                <h3 className="text-lg font-semibold text-light mb-2">
                  Data Sharing
                </h3>
                <p className="text-charcoal text-sm">
                  Manage how your data is used and shared with our partners.
                </p>
              </div>
              
              <div className="bg-dark/50 rounded-lg p-6 border border-gray-700/30">
                <h3 className="text-lg font-semibold text-light mb-2">
                  Account Data
                </h3>
                <p className="text-charcoal text-sm">
                  View and manage your personal information and account data.
                </p>
              </div>
              
              <div className="bg-dark/50 rounded-lg p-6 border border-gray-700/30">
                <h3 className="text-lg font-semibold text-light mb-2">
                  Cookie Preferences
                </h3>
                <p className="text-charcoal text-sm">
                  Control which cookies and tracking technologies we use.
                </p>
              </div>
            </div>

            <div className="mt-8">
              <Link href="/dashboard">
                <Button className="bg-accent hover:bg-accent/80 text-secondary">
                  Return to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}