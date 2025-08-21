import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useLocation } from "wouter";
import logoImage from "@assets/Mementiq-logo-transparent_1755766253695.png";

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [, setLocation] = useLocation();

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-secondary/20 backdrop-blur-xl shadow-2xl fixed top-0 left-0 right-0 z-50 border-b border-gray-800/30 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <img 
                src={logoImage} 
                alt="Mementiq" 
                className="h-12 w-auto"
              />
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <button 
                onClick={() => scrollToSection('services')} 
                className="text-light hover:text-accent transition-colors duration-200"
              >
                Services
              </button>
              <button 
                onClick={() => scrollToSection('portfolio')} 
                className="text-light hover:text-accent transition-colors duration-200"
              >
                Portfolio
              </button>
              <button 
                onClick={() => scrollToSection('testimonials')} 
                className="text-light hover:text-accent transition-colors duration-200"
              >
                Testimonials
              </button>
              <button 
                onClick={() => scrollToSection('pricing')} 
                className="text-light hover:text-accent transition-colors duration-200"
              >
                Pricing
              </button>
              <Button 
                onClick={() => setLocation('/auth')}
                className="bg-accent text-secondary hover:bg-yellow-500 font-semibold"
              >
                Login or Get Started
              </Button>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-light hover:text-accent"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-secondary/30 backdrop-blur-xl border-t border-gray-800/30">
              <button 
                onClick={() => scrollToSection('services')}
                className="block w-full text-left px-3 py-2 text-light hover:text-accent transition-colors duration-200"
              >
                Services
              </button>
              <button 
                onClick={() => scrollToSection('portfolio')}
                className="block w-full text-left px-3 py-2 text-light hover:text-accent transition-colors duration-200"
              >
                Portfolio
              </button>
              <button 
                onClick={() => scrollToSection('testimonials')}
                className="block w-full text-left px-3 py-2 text-light hover:text-accent transition-colors duration-200"
              >
                Testimonials
              </button>
              <button 
                onClick={() => scrollToSection('pricing')}
                className="block w-full text-left px-3 py-2 text-light hover:text-accent transition-colors duration-200"
              >
                Pricing
              </button>
              <Button 
                onClick={() => setLocation('/auth')}
                className="w-full mt-2 bg-accent text-secondary hover:bg-yellow-500 font-semibold"
              >
                Login or Get Started
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
