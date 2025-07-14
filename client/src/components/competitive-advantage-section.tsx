import { Card, CardContent } from "@/components/ui/card";
import { X, Check, Building, User, Zap } from "lucide-react";

export default function CompetitiveAdvantageSection() {
  const competitors = [
    {
      type: "Agencies",
      icon: Building,
      problems: [
        'Exclusionary, only interested in high margin "whale" clients',
        "Don't accept one-off video projects",
        "Require large upfront payments of hundreds of dollars",
        "High hourly rates with high minimums",
        "Charge for services you don't need or use",
        "Time wasted in calls, consultations, and revisions",
      ],
    },
    {
      type: "Freelancers",
      icon: User,
      problems: [
        "Spotty availability and constant delays",
        "Marketplaces take a big cut, forcing higher prices",
        "Too many options, hard to vet everyone",
        "Time zone, language, payment, and cultural barriers",
        "Confusing pricing options, cost overruns",
        'Variable quality, hard to find one that "does it all"',
      ],
    },
  ];

  const solutions = [
    "Pre-vetted editors, always available",
    "Automatically matched to your style and content",
    "White-glove, hands-off approach",
    "No searching, vetting, or endless chats",
    "Upload footage → push button → get results",
    "Low and transparent per-video rate",
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-darker via-dark to-darker">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-light mb-6">
            Why Choose <span className="text-accent">Mementiq</span>?
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Stop wasting time and money on outdated solutions. <br />
            Here's why we're different.
            <br />
          </p>
        </div>

        {/* Competitors Section */}
        <div className="mb-12">
          <h3 className="text-3xl font-bold text-light text-center mb-8">
            The Competition
          </h3>
          <div className="grid grid-cols-2 gap-4 md:gap-6 max-w-6xl mx-auto">
            {/* Agencies Card */}
            <Card className="bg-red-900/20 border-2 border-red-800/50 rounded-2xl hover:border-red-600/70 transition-all duration-300">
              <CardContent className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-red-800/30 p-3 rounded-xl">
                    <Building className="h-8 w-8 text-red-400" />
                  </div>
                  <h3 className="text-2xl font-semibold text-light">
                    Agencies
                  </h3>
                </div>
                <ul className="space-y-3">
                  {competitors[0].problems.map((problem, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <X className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300 text-sm">{problem}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Freelancers Card */}
            <Card className="bg-amber-900/25 border-2 border-amber-700/60 rounded-2xl hover:border-amber-500/80 transition-all duration-300">
              <CardContent className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-amber-700/40 p-3 rounded-xl">
                    <User className="h-8 w-8 text-amber-300" />
                  </div>
                  <h3 className="text-2xl font-semibold text-light">
                    Freelancers
                  </h3>
                </div>
                <ul className="space-y-3">
                  {competitors[1].problems.map((problem, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <X className="h-5 w-5 text-amber-300 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300 text-sm">{problem}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Our Solution Section */}
        <div className="mb-16">
          <div className="max-w-2xl mx-auto">
            <Card className="bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-accent/50 rounded-2xl hover:border-accent transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-purple-500"></div>
              <CardContent className="p-8">
                <div className="flex items-center gap-4 mb-6 justify-center">
                  <div className="bg-accent/20 p-3 rounded-xl">
                    <Zap className="h-8 w-8 text-accent" />
                  </div>
                  <h3 className="text-2xl font-semibold text-light">
                    Our Solution
                  </h3>
                </div>
                <ul className="space-y-3 flex flex-col items-center">
                  {solutions.map((solution, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300 text-sm font-medium">
                        {solution}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-purple-500/10 rounded-2xl p-8 border border-accent/30">
            <h3 className="text-3xl font-bold text-light mb-4">
              Upload Footage → Push Button → <br />
              Get Results
            </h3>
            <p className="text-xl text-gray-400 mb-6">
              That simple. All for a low and transparent per-video rate.
            </p>
            <button className="bg-gradient-to-r from-primary to-accent text-dark font-semibold px-8 py-4 rounded-xl hover:shadow-lg hover:shadow-accent/25 transition-all duration-300 transform hover:scale-105">
              Start Your First Video
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
