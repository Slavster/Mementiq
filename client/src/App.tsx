import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import AuthPage from "@/pages/auth";
import DashboardPage from "@/pages/dashboard";
import SettingsPage from "@/pages/settings";
import Subscribe from "@/pages/subscribe";
import PaymentCancelledPage from "@/pages/payment-cancelled";
import PaymentSuccessPage from "@/pages/payment-success";
import FrameioTest from "@/pages/FrameioTest";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/subscribe" component={Subscribe} />
      <Route path="/payment-cancelled" component={PaymentCancelledPage} />
      <Route path="/payment-success" component={PaymentSuccessPage} />
      <Route path="/frameio-test" component={FrameioTest} />
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
