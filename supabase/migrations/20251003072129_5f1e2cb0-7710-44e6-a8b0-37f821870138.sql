-- Create engagement tracking table
CREATE TABLE public.attendee_engagement (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attendee_id UUID NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  engagement_type TEXT NOT NULL,
  engagement_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attendee_engagement ENABLE ROW LEVEL SECURITY;

-- RLS policies for engagement tracking
CREATE POLICY "Users can view engagement for their events"
  ON public.attendee_engagement FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = attendee_engagement.event_id
      AND events.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert engagement data"
  ON public.attendee_engagement FOR INSERT
  WITH CHECK (true);

-- Create user interests table
CREATE TABLE public.attendee_interests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attendee_id UUID NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
  interests JSONB,
  preferences JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attendee_interests ENABLE ROW LEVEL SECURITY;

-- RLS policies for interests
CREATE POLICY "Users can view interests for their event attendees"
  ON public.attendee_interests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.attendees
      JOIN public.events ON events.id = attendees.event_id
      WHERE attendees.id = attendee_interests.attendee_id
      AND events.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage interests"
  ON public.attendee_interests FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create email logs table
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attendee_id UUID NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  subject TEXT,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent'
);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for email logs
CREATE POLICY "Users can view email logs for their events"
  ON public.email_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = email_logs.event_id
      AND events.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert email logs"
  ON public.email_logs FOR INSERT
  WITH CHECK (true);