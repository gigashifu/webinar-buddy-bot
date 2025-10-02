import { Plus, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/EventCard";
import { Input } from "@/components/ui/input";

const mockEvents = [
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
  {
    id: 3,
    title: "Customer Success Workshop",
    date: "Jan 5, 2025 • 11:00 AM EST",
    attendees: 156,
    registrations: 280,
    engagement: 78,
    status: "completed" as const,
  },
  {
    id: 4,
    title: "Sales Training Session",
    date: "Dec 28, 2024 • 1:00 PM EST",
    attendees: 203,
    registrations: 350,
    engagement: 85,
    status: "completed" as const,
  },
];

export default function Events() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Event Dashboard</h1>
              <p className="text-sm text-muted-foreground">Manage and track your webinars</p>
            </div>
            <Button className="bg-gradient-accent hover:opacity-90 transition-smooth shadow-glow">
              <Plus className="w-4 h-4 mr-2" />
              Create Event
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Input 
            placeholder="Search events..." 
            className="flex-1 bg-card border-border"
          />
          <Button variant="outline" className="sm:w-auto">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Events Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockEvents.map((event) => (
            <EventCard key={event.id} {...event} />
          ))}
        </div>
      </main>
    </div>
  );
}
