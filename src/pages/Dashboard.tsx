import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/ui/stat-card";
import { EventCard } from "@/components/EventCard";
import { Users, Calendar, TrendingUp, Mail } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Skeleton } from "@/components/ui/skeleton";

interface Event {
  id: string;
  title: string;
  date: string;
  attendees: number;
  registrations: number;
  engagement: number;
  status: "upcoming" | "live" | "completed";
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchEvents();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("date", { ascending: true })
        .limit(5);

      if (error) throw error;
      setEvents((data || []) as Event[]);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalEvents = events.length;
  const totalAttendees = events.reduce((sum, e) => sum + e.attendees, 0);
  const avgEngagement = events.length > 0
    ? events.reduce((sum, e) => sum + e.engagement, 0) / events.length
    : 0;

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Welcome back! 👋</h1>
          <p className="text-muted-foreground">
            Here's what's happening with your webinars today.
          </p>
        </div>

        {loading ? (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Events"
                value={totalEvents}
                icon={Calendar}
              />
              <StatCard
                title="Total Attendees"
                value={totalAttendees}
                icon={Users}
              />
              <StatCard
                title="Avg Engagement"
                value={`${avgEngagement.toFixed(1)}%`}
                icon={TrendingUp}
              />
              <StatCard
                title="Emails Sent"
                value="0"
                icon={Mail}
              />
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">Upcoming Events</h2>
              {events.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-lg border border-border">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">No events yet. Create your first event!</p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {events.map((event) => (
                    <EventCard key={event.id} {...event} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
