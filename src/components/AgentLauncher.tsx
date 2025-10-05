import { useState } from "react";
import { Bot, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function AgentLauncher() {
  const [running, setRunning] = useState(false);

  const handleClick = async () => {
    if (running) {
      return;
    }

    setRunning(true);
    const toastId = toast.loading("Running AI engagement agent...");

    try {
      const { data, error } = await supabase.functions.invoke("event-engagement-agent");

      if (error) {
        throw error;
      }

      const metrics = data?.metrics;
      const rateLimits = data?.rateLimits;

      toast.success(
        `Engagement agent completed! ${metrics?.remindersSent || 0} reminders sent, ${metrics?.followupsSent || 0} follow-ups sent. Token usage: ${rateLimits?.tokensToday || 'N/A'}`,
        {
          id: toastId,
          duration: 5000,
        }
      );
    } catch (error) {
      console.error("Error triggering engagement agent:", error);
      toast.error("Could not run engagement agent. Please try again.", {
        id: toastId,
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center justify-end">
      <div className="flex items-center gap-3 rounded-full border border-border bg-card/90 px-3 py-2 shadow-card backdrop-blur">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              onClick={handleClick}
              disabled={running}
              aria-label="Ask Lovable AI to handle webinar tasks"
              className="h-12 w-12 rounded-full shadow-glow transition-transform hover:scale-105"
            >
              {running ? <Loader2 className="h-5 w-5 animate-spin" /> : <Bot className="h-5 w-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-[200px] text-center">
            <p>Run the Lovable AI engagement agent anytime.</p>
          </TooltipContent>
        </Tooltip>
        <div className="hidden flex-col text-right sm:flex">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Lovable AI
          </span>
          <span className="text-sm font-medium text-foreground">Ready to help</span>
        </div>
      </div>
    </div>
  );
}
