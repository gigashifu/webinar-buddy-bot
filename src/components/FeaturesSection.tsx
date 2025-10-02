import { Bell, Mail, BarChart3, Users, Calendar, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Bell,
    title: "Smart Reminders",
    description: "Automated, personalized reminders that adapt to user behavior and time zones.",
  },
  {
    icon: Mail,
    title: "Email Campaigns",
    description: "Pre-event teasers and post-event follow-ups that drive engagement.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Real-time insights into registration, attendance, and engagement metrics.",
  },
  {
    icon: Users,
    title: "Attendee Tracking",
    description: "Monitor participant interests and engagement patterns throughout the journey.",
  },
  {
    icon: Calendar,
    title: "Event Management",
    description: "Centralized hub to manage all your webinars and events in one place.",
  },
  {
    icon: Zap,
    title: "AI-Powered Insights",
    description: "Get recommendations to optimize timing, content, and follow-up strategies.",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24 px-4 bg-secondary/30">
      <div className="container mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Everything You Need to
            <span className="bg-gradient-accent bg-clip-text text-transparent"> Engage Attendees</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Powerful features designed to maximize attendance and create lasting connections with your audience.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="bg-gradient-card shadow-card border-border/50 hover:shadow-glow transition-smooth group"
            >
              <CardContent className="p-8">
                <div className="w-14 h-14 rounded-xl bg-gradient-accent flex items-center justify-center mb-6 group-hover:scale-110 transition-smooth">
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
