-- Create rate_limits table for tracking API usage and preventing token waste
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action ON public.rate_limits(user_id, action_type);
CREATE INDEX IF NOT EXISTS idx_rate_limits_created_at ON public.rate_limits(created_at);
CREATE INDEX IF NOT EXISTS idx_rate_limits_action_type ON public.rate_limits(action_type);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS policies - allow system to manage rate limits
CREATE POLICY "System can manage rate limits"
  ON public.rate_limits FOR ALL
  USING (true)
  WITH CHECK (true);

-- Comment on table
COMMENT ON TABLE public.rate_limits IS 'Tracks API usage for rate limiting and token conservation';
