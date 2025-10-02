import { HeroSection } from "@/components/HeroSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold bg-gradient-accent bg-clip-text text-transparent">
              EngageBoost
            </div>
            <div className="flex items-center gap-4">
              <Link to="/dashboard">
                <Button variant="ghost">Dashboard</Button>
              </Link>
              <Link to="/events">
                <Button variant="ghost">Events</Button>
              </Link>
              <Button className="bg-gradient-accent hover:opacity-90 transition-smooth">
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <HeroSection />
      <FeaturesSection />

      {/* CTA Section */}
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto text-center bg-gradient-card rounded-3xl p-12 shadow-glow border border-border/50">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              Ready to Transform Your Events?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join hundreds of organizers who've boosted their webinar engagement by 300%
            </p>
            <Link to="/events">
              <Button size="lg" className="bg-gradient-accent hover:opacity-90 transition-smooth text-lg px-8 shadow-glow">
                Get Started Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2025 EngageBoost. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
