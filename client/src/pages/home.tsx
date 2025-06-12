import Navigation from "@/components/navigation";
import HeroSection from "@/components/hero-section";
import ServicesSection from "@/components/services-section";
import PortfolioSection from "@/components/portfolio-section";
import TestimonialsSection from "@/components/testimonials-section";
import CompetitiveAdvantageSection from "@/components/competitive-advantage-section";
import PricingSection from "@/components/pricing-section";
import EmailCaptureSection from "@/components/email-capture-section";
import Footer from "@/components/footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-purple-900 to-primary">
      <Navigation />
      <HeroSection />
      <ServicesSection />
      <PortfolioSection />
      <TestimonialsSection />
      <CompetitiveAdvantageSection />
      <PricingSection />
      <EmailCaptureSection />
      <Footer />
    </div>
  );
}
