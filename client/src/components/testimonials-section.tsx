import { useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";

const testimonials = [
  {
    id: 1,
    name: "Paddy M",
    title: "Actor",
    country: "🇦🇺",
    content:
      "Mementiq did a fabulous job at creating a montage with fun music and creative transitions. Completed quickly and without any prompts, they knew the vibe we wanted. Love your work.",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100",
    rating: 5,
  },
  {
    id: 2,
    name: "Martin M",
    title: "Developer",
    country: "🇩🇰",
    content:
      "The video was so amazing, exactly what I was looking for! Other editors have been so difficult to work with, but with Mementiq it was one take, one send, one revision, and we were done! Cuts really captured the essence of what people wanted to watch.",
    avatar:
      "https://images.unsplash.com/photo-1494790108755-2616b612b77c?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100",
    rating: 5,
  },
  {
    id: 3,
    name: "Elena E",
    title: "Family Archivist",
    country: "🇺🇸",
    content:
      "I had two movies done using my photos and video clips from the past year. I didn’t have time to do it myself, so I decided to use Mementiq. I am impressed! Everything was done as I wanted and in a timely manner. I will use your service again and I highly recommend it to everyone.",
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100",
    rating: 5,
  },

  {
    id: 4,
    name: "Markos K",
    title: "Entrepreneur",
    country: "🇬🇷",
    content:
      "Mementiq did an incredible job editing and producing one of the most powerful reels from Vietnam Nomad Fest 2025. As Co-Founder of the festival, I sent over 30 raw interview clips, and what they delivered was beyond impressive. It captured our community's spirit, energy, and diversity that deeply resonated with our audience.",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100",
    rating: 5,
  },
  {
    id: 5,
    name: "Ethan B",
    title: "Coach",
    country: "🇦🇺",
    content:
      "As someone who is new to advertising, I was not confident about how I came across on camera. I wanted my ad to look exceptional, Mementiq beautifully edited an ad which distracts from the parts I was a little bit critical of. I am now very excited and confident about posting the ad.",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100",
    rating: 5,
  },
  {
    id: 6,
    name: "Jainkarn P",
    title: "Outdoorsman",
    country: "🇹🇭",
    content:
      "Big thanks to Mementiq for helping me out with video editing! Your eye for detail and smooth transitions made the video look amazing. Couldn’t have done it without you!",
    avatar:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100",
    rating: 5,
  },
];

export default function TestimonialsSection() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -350, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 350, behavior: "smooth" });
    }
  };

  return (
    <section id="testimonials" className="py-20 bg-lightgray">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-light mb-4">Client Stories</h2>
          <p className="text-xl text-charcoal max-w-3xl mx-auto">
            Hear from creators, influencers, and content makers who've
            transformed their videos with our editing services.
          </p>
        </div>

        <div className="relative">
          <Button
            onClick={scrollLeft}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-dark-card/80 hover:bg-dark-card border border-gray-600 text-light p-3 rounded-full shadow-xl backdrop-blur-sm"
            size="sm"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <Button
            onClick={scrollRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-dark-card/80 hover:bg-dark-card border border-gray-600 text-light p-3 rounded-full shadow-xl backdrop-blur-sm"
            size="sm"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>

          <div
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto pb-4"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {testimonials.map((testimonial) => (
              <Card
                key={testimonial.id}
                className="bg-dark-card border border-gray-700 rounded-xl shadow-xl hover:shadow-2xl hover:border-primary/50 transition-all duration-300 flex-shrink-0 w-80"
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex text-accent">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-current" />
                      ))}
                    </div>
                    <span className="bg-primary/20 text-primary px-2 py-1 rounded-full text-xs font-semibold">
                      {testimonial.platform}
                    </span>
                  </div>
                  <p className="text-charcoal mb-6 italic text-sm leading-relaxed">
                    "{testimonial.content}"
                  </p>
                  <div className="flex items-center">
                    <img
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      className="w-10 h-10 rounded-full object-cover mr-3 border-2 border-primary/30"
                    />
                    <div>
                      <p className="font-semibold text-light text-sm">
                        {testimonial.name}
                      </p>
                      <p className="text-xs text-charcoal">
                        {testimonial.title}
                      </p>
                      <p className="text-lg mt-1">
                        {testimonial.country}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
