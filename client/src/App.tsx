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
import NotFound from "@/pages/not-found";

function TestHome() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-purple-900 to-primary">
      <div className="text-white text-center py-20">
        <h1 className="text-4xl font-bold mb-4">Mementiq Landing Page Test</h1>
        <p className="text-xl">Home component is working!</p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={TestHome} />
      <Route component={() => <div className="text-white">Page not found</div>} />
    </Switch>
  );
}

function App() {
  return (
    <Router />
  );
}

export default App;
