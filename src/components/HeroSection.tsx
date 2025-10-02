import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import heroImage from "@/assets/hero-webinar.jpg";

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-hero opacity-10" />
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Boost Event Engagement by 300%</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
              Transform Your
              <span className="bg-gradient-accent bg-clip-text text-transparent"> Webinar </span>
              Engagement
            </h1>
            
            <p className="text-xl text-muted-foreground leading-relaxed">
              Personalized reminders, content previews, and post-event follow-ups that keep your attendees engaged from registration to recap.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-gradient-accent hover:opacity-90 transition-smooth text-lg px-8 shadow-glow group">
                Get Started Free
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-smooth" />
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 border-2">
                Watch Demo
              </Button>
            </div>

            <div className="flex gap-8 pt-4">
              <div>
                <div className="text-3xl font-bold text-foreground">300%</div>
                <div className="text-sm text-muted-foreground">Higher Engagement</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-foreground">85%</div>
                <div className="text-sm text-muted-foreground">Attendance Rate</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-foreground">2.5x</div>
                <div className="text-sm text-muted-foreground">More Follow-ups</div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-accent opacity-20 blur-3xl rounded-full" />
            <img 
              src={heroImage} 
              alt="Webinar engagement platform" 
              className="relative rounded-2xl shadow-glow w-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
