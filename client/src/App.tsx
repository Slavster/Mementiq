import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import AuthPage from "@/pages/auth";
import DashboardPage from "@/pages/dashboard";
import Subscribe from "@/pages/subscribe";
import PaymentCancelledPage from "@/pages/payment-cancelled";
import PaymentSuccessPage from "@/pages/payment-success";
import PrivacyPolicyPage from "@/pages/privacy-policy";
import PrivacySettingsPage from "@/pages/privacy-settings";
import TermsOfServicePage from "@/pages/terms-of-service";
import AdminSettingsPage from "@/pages/admin-settings";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/subscribe" component={Subscribe} />
      <Route path="/payment-cancelled" component={PaymentCancelledPage} />
      <Route path="/payment-success" component={PaymentSuccessPage} />
      <Route path="/privacy-policy" component={PrivacyPolicyPage} />
      <Route path="/privacy-settings" component={PrivacySettingsPage} />
      <Route path="/terms-of-service" component={TermsOfServicePage} />
      <Route path="/admin/settings" component={AdminSettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
