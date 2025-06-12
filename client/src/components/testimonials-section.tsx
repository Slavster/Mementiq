import { useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";

const testimonials = [
  {
    id: 1,
    name: "Alex Rivera",
    title: "Content Creator & Influencer",
    content: "CreativeEdge turned my raw footage into cinematic gold! My engagement went through the roof and my followers can't stop asking about my editor.",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100",
    rating: 5,
    platform: "YouTube"
  },
  {
    id: 2,
    name: "Maya Patel",
    title: "Travel Blogger",
    content: "The travel video they edited for me was absolutely stunning. Every transition was perfect and the color grading made my footage look professional.",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b77c?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100",
    rating: 5,
    platform: "Instagram"
  },
  {
    id: 3,
    name: "Jordan Kim",
    title: "Musician & Artist",
    content: "They brought my music video vision to life beyond what I imagined. The editing style perfectly matched the vibe of my song.",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100",
    rating: 5,
    platform: "TikTok"
  },
  {
    id: 4,
    name: "Emma Thompson",
    title: "Wedding Videographer",
    content: "I send all my overflow work to CreativeEdge. Their attention to emotion and storytelling in wedding videos is unmatched.",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100",
    rating: 5,
    platform: "Vimeo"
  },
  {
    id: 5,
    name: "Carlos Santos",
    title: "Fitness Coach",
    content: "My workout videos now look like they belong on a fitness channel! The dynamic cuts and energy they bring is incredible.",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100",
    rating: 5,
    platform: "YouTube"
  }
];

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-20 bg-lightgray">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-secondary mb-4">What Our Clients Say</h2>
          <p className="text-xl text-charcoal max-w-3xl mx-auto">
            Don't just take our word for it. Here's what business leaders say about working with VideoForge.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.id} className="bg-white rounded-xl shadow-lg border-0">
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  <div className="flex text-yellow-400">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-charcoal mb-6 italic">"{testimonial.content}"</p>
                <div className="flex items-center">
                  <img 
                    src={testimonial.avatar} 
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover mr-4" 
                  />
                  <div>
                    <p className="font-semibold text-secondary">{testimonial.name}</p>
                    <p className="text-sm text-charcoal">{testimonial.title}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
