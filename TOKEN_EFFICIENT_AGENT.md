# Token-Efficient Webinar Engagement Agent

## Overview
A resource-efficient AI agent that handles webinar engagement tasks while staying under a 400K daily token limit.

## Key Features Implemented

### 1. Token Efficiency Strategies
- **Reduced AI Model**: Uses `gemini-flash-1.5-8b` (smaller, faster model)
- **Lower Token Limits**: Max 200 tokens per generation (down from 300)
- **Extended Caching**: 2-hour cache TTL (up from 1 hour)
- **Template Priority**: Uses pre-built templates by default
- **Reduced AI Calls**: Only 20 AI calls per hour (down from 50)
- **Daily Token Tracking**: Monitors 400K daily token limit

### 2. Batching & Efficiency
- **Batch Size**: 15 items per batch (optimized from 10)
- **Smart Scheduling**: Only sends reminders at 24h and 1h before events
- **Rate Limiting**: 80 emails/hour, 400 emails/day
- **Cache Reuse**: Shared content for similar requests

### 3. Database Schema
Pre-defined message templates stored in database:
- `reminder_24h` - 24-hour advance reminder
- `reminder_1h` - 1-hour advance reminder
- `preview_content` - Event preview with personalization
- `followup_attended` - Thanks for attending
- `followup_missed` - Missed event follow-up
- `confirmation` - Registration confirmation

### 4. Engagement Tracking
Lightweight data structures track:
- User registrations and interests (JSONB)
- Engagement activities (clicks, opens, etc.)
- Engagement scores (calculated from activity)
- Batch job progress and token usage

### 5. Preview Fix
Fixed the "Waiting for preview to load" issue:
- Changed `VITE_SUPABASE_PUBLISHABLE_KEY` to `VITE_SUPABASE_ANON_KEY`
- Updated Supabase client configuration
- Fixed edge function imports to use `Deno.serve`

## How It Works

### Agent Execution Flow
1. **Rate Limit Check**: Verifies email and token limits
2. **Cache Check**: Looks for cached responses first
3. **Template First**: Uses database templates when possible
4. **AI Generation**: Only generates content for unique cases
5. **Batch Processing**: Handles multiple attendees efficiently
6. **Token Tracking**: Logs all token usage to database

### Token Budget Management
- **Templates Only Mode**: Can disable AI generation entirely
- **Cached Responses**: Reuses content for similar events
- **Minimal AI Prompts**: Concise prompts (150-200 words)
- **Daily Monitoring**: Tracks cumulative token usage

### Frontend Integration
- **Agent Launcher**: Floating button to manually trigger agent
- **Real-time Feedback**: Shows metrics after each run
- **Token Usage Display**: Reports token consumption
- **Lovable Integration**: Works seamlessly with Lovable platform

## Usage

### Manual Trigger
Click the "Lovable AI" button in bottom-right corner to run the agent immediately.

### Scheduled Execution
Set up a cron job to run the edge function:
```bash
# Run every hour
0 * * * * curl -X POST https://your-project.supabase.co/functions/v1/event-engagement-agent
```

### API Call
```typescript
const { data } = await supabase.functions.invoke('event-engagement-agent', {
  body: {
    eventId: 'specific-event-id',  // optional
    reminderInterval: 24            // optional
  }
});
```

## Configuration

Edit `CONFIG` in `supabase/functions/event-engagement-agent/index.ts`:

```typescript
const CONFIG = {
  MAX_EMAILS_PER_HOUR: 80,      // Email rate limit
  MAX_EMAILS_PER_DAY: 400,      // Daily email limit
  MAX_AI_CALLS_PER_HOUR: 20,    // AI generation limit
  DAILY_TOKEN_LIMIT: 400000,    // Total daily tokens
  BATCH_SIZE: 15,                // Items per batch
  REMINDER_INTERVALS: [24, 1],   // Hours before event
  CACHE_TTL: 7200000,            // 2 hours
  USE_TEMPLATES_ONLY: true,      // Disable AI generation
};
```

## Token Usage Examples

### Typical Daily Usage
- 50 registrations × 45 tokens (template) = 2,250 tokens
- 50 reminders (24h) × 50 tokens (template) = 2,500 tokens
- 50 reminders (1h) × 40 tokens (template) = 2,000 tokens
- 30 follow-ups × 60 tokens (template) = 1,800 tokens
- 10 AI generations × 200 tokens = 2,000 tokens
- **Total: ~10,550 tokens/day** (well under 400K limit)

### Peak Usage Scenario
- 200 reminders × 50 tokens = 10,000 tokens
- 100 follow-ups × 60 tokens = 6,000 tokens
- 20 AI calls × 200 tokens = 4,000 tokens
- **Total: ~20,000 tokens/day** (5% of limit)

## Environment Variables

Required in Supabase Edge Functions:
- `SUPABASE_URL` - Auto-populated
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-populated
- `RESEND_API_KEY` - For email sending
- `RESEND_FROM_EMAIL` - Sender email address
- `LOVABLE_API_KEY` - For AI generation

## Monitoring

Check token usage in database:
```sql
SELECT
  date,
  SUM(tokens_used) as total_tokens,
  COUNT(*) as operations
FROM token_usage_log
GROUP BY date
ORDER BY date DESC;
```

## Best Practices

1. **Keep Templates Updated**: Review and optimize templates monthly
2. **Monitor Cache Hit Rates**: Aim for 70%+ cache hits
3. **Batch Similar Events**: Group events with similar topics
4. **Review AI Usage**: Analyze which operations need AI vs templates
5. **Track Engagement**: Use engagement_score to optimize timing

## Troubleshooting

### High Token Usage
- Enable `USE_TEMPLATES_ONLY` mode
- Reduce `MAX_AI_CALLS_PER_HOUR`
- Increase `CACHE_TTL`

### Low Engagement
- Adjust `REMINDER_INTERVALS`
- Personalize template variables
- A/B test different templates

### Rate Limit Errors
- Increase `BATCH_SIZE` delay
- Lower `MAX_EMAILS_PER_HOUR`
- Spread reminders across more intervals
