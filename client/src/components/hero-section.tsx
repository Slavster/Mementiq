import { Button } from "@/components/ui/button";
import { Play, ArrowRight } from "lucide-react";

export default function HeroSection() {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="bg-gradient-to-br from-secondary via-purple-900 to-primary text-white pt-32 pb-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Bring Your Stories to <span className="text-accent">Life</span>
            </h1>
            <p className="text-xl text-gray-300 mb-6 leading-relaxed">
              Professional quality, transparently priced, and{" "}
              <span className="text-accent font-bold text-2xl">
                hassle-free video editing <br />
              </span>{" "}
              All at the touch of a button.
            </p>
            <p className="text-2xl mb-8 text-left text-[#ffffff] font-semibold">
              For You. For All. Forever.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={() => scrollToSection("pricing")}
                className="bg-accent text-secondary px-8 py-4 text-lg font-semibold hover:bg-yellow-500 transition-all duration-200 h-auto transform hover:scale-105"
              >
                Start Creating
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                onClick={() => scrollToSection("portfolio")}
                variant="outline"
                className="border-2 border-accent text-accent px-8 py-4 text-lg font-semibold hover:bg-accent hover:text-secondary transition-colors duration-200 h-auto"
              >
                View Portfolio
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-purple-500/30">
              <img
                src="https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=600"
                alt="Professional video editing workspace with multiple monitors"
                className="w-full h-auto"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-center justify-center">
                <Button
                  size="lg"
                  className="bg-accent/90 backdrop-blur-sm rounded-full p-6 hover:bg-accent transition-all duration-200 transform hover:scale-110 border border-yellow-400/30"
                >
                  <Play className="h-8 w-8 text-secondary ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
