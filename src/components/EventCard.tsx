import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, TrendingUp } from "lucide-react";

interface EventCardProps {
  title: string;
  date: string;
  attendees: number;
  registrations: number;
  engagement: number;
  status: "upcoming" | "live" | "completed";
}

export function EventCard({ title, date, attendees, registrations, engagement, status }: EventCardProps) {
  const statusColors = {
    upcoming: "bg-primary/10 text-primary border-primary/20",
    live: "bg-accent/10 text-accent border-accent/20",
    completed: "bg-muted text-muted-foreground border-border",
  };

  return (
    <Card className="bg-gradient-card shadow-card border-border/50 hover:shadow-glow transition-smooth group">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl group-hover:text-primary transition-smooth">{title}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-2">
              <Calendar className="w-4 h-4" />
              {date}
            </CardDescription>
          </div>
          <Badge className={statusColors[status]}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-secondary/50">
              <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
              <div className="text-2xl font-bold text-foreground">{registrations}</div>
              <div className="text-xs text-muted-foreground">Registered</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/50">
              <Users className="w-5 h-5 mx-auto mb-1 text-accent" />
              <div className="text-2xl font-bold text-foreground">{attendees}</div>
              <div className="text-xs text-muted-foreground">Attended</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/50">
              <TrendingUp className="w-5 h-5 mx-auto mb-1 text-highlight" />
              <div className="text-2xl font-bold text-foreground">{engagement}%</div>
              <div className="text-xs text-muted-foreground">Engaged</div>
            </div>
          </div>
          <Button className="w-full bg-gradient-accent hover:opacity-90 transition-smooth">
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
