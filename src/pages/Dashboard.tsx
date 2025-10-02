import { Users, Calendar, TrendingUp, Mail } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { EventCard } from "@/components/EventCard";
import { Button } from "@/components/ui/button";

const upcomingEvents = [
  {
    id: 1,
    title: "AI in Marketing 2025",
    date: "Jan 15, 2025 • 2:00 PM EST",
    attendees: 234,
    registrations: 456,
    engagement: 87,
    status: "upcoming" as const,
  },
  {
    id: 2,
    title: "Product Launch Webinar",
    date: "Jan 10, 2025 • 3:00 PM EST",
    attendees: 189,
    registrations: 320,
    engagement: 92,
    status: "live" as const,
  },
];

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here's your engagement overview.</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard
            title="Total Events"
            value={24}
            icon={Calendar}
            trend={{ value: 12, isPositive: true }}
          />
          <StatCard
            title="Total Attendees"
            value="3.2K"
            icon={Users}
            trend={{ value: 23, isPositive: true }}
          />
          <StatCard
            title="Avg Engagement"
            value="84%"
            icon={TrendingUp}
            trend={{ value: 8, isPositive: true }}
          />
          <StatCard
            title="Emails Sent"
            value="12.4K"
            icon={Mail}
            trend={{ value: 15, isPositive: true }}
          />
        </div>

        {/* Upcoming Events Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">Upcoming Events</h2>
            <Button variant="outline">View All</Button>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} {...event} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
