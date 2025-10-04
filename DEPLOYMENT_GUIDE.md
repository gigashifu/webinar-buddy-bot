# Deployment Guide - Webinar Engagement Platform

## Overview
This guide covers the comprehensive safeguards, rate limiting, feature toggles, and error handling implemented in the EngageBoost Webinar Engagement Platform.

## Table of Contents
1. [Configuration](#configuration)
2. [Feature Toggles](#feature-toggles)
3. [Rate Limiting](#rate-limiting)
4. [Error Handling](#error-handling)
5. [Deployment Steps](#deployment-steps)
6. [Monitoring & Logging](#monitoring--logging)
7. [Troubleshooting](#troubleshooting)

---

## Configuration

### Environment Variables

The application uses environment variables for configuration. Copy `.env.example` to `.env` and configure the following:

#### Required Variables
```bash
# Supabase Configuration (Frontend)
VITE_SUPABASE_PROJECT_ID="your-project-id"
VITE_SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
VITE_SUPABASE_URL="https://your-project.supabase.co"

# Supabase Configuration (Backend/Agent)
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_KEY="your-service-role-key"

# OpenAI Configuration
OPENAI_API_KEY="sk-your-actual-openai-key"
```

#### Feature Toggles
```bash
# Enable/Disable Features
ENABLE_REMINDERS=true      # Enable sending reminder emails
ENABLE_PREVIEWS=false      # Enable content preview emails (coming soon)
ENABLE_FOLLOWUPS=true      # Enable post-event follow-up emails
ENABLE_AI_AGENT=true       # Enable AI-powered agent functionality
```

#### Rate Limiting
```bash
# Rate Limit Configuration
MAX_DAILY_USER_ACTIONS=10      # Max actions per user per day
MAX_DAILY_GLOBAL_ACTIONS=100   # Max total actions per day (all users)
```

#### Logging
```bash
# Logging Configuration
LOG_LEVEL=ERROR  # Options: DEBUG, INFO, WARNING, ERROR, CRITICAL
```

### Configuration Validation

The `config.py` module automatically validates your configuration on startup and will provide clear error messages if something is missing or misconfigured.

```python
from config import Config

# Check if configuration is valid
is_valid, errors = Config.validate()
if not is_valid:
    print("Configuration errors:")
    for error in errors:
        print(f"  - {error}")
```

---

## Feature Toggles

Feature toggles allow you to enable/disable specific functionality without code changes.

### Available Features

| Feature | Environment Variable | Default | Description |
|---------|---------------------|---------|-------------|
| Reminders | `ENABLE_REMINDERS` | `true` | Enable sending reminder emails to attendees |
| Previews | `ENABLE_PREVIEWS` | `false` | Enable content preview emails (future feature) |
| Follow-ups | `ENABLE_FOLLOWUPS` | `true` | Enable post-event follow-up emails |
| AI Agent | `ENABLE_AI_AGENT` | `true` | Enable AI-powered engagement agent |

### Using Feature Toggles

```python
from config import Config

# Check if a feature is enabled
if Config.ENABLE_REMINDERS:
    send_reminder_email()

# Or use the helper method
if Config.is_feature_enabled("REMINDERS"):
    send_reminder_email()
```

### Disabling Features to Save Costs

To conserve API tokens and reduce costs:

1. **Disable AI Agent** when not needed:
   ```bash
   ENABLE_AI_AGENT=false
   ```

2. **Disable optional features**:
   ```bash
   ENABLE_PREVIEWS=false  # Already disabled by default
   ```

3. **Reduce rate limits**:
   ```bash
   MAX_DAILY_USER_ACTIONS=5    # Reduce from default 10
   MAX_DAILY_GLOBAL_ACTIONS=50  # Reduce from default 100
   ```

---

## Rate Limiting

Rate limiting prevents excessive API usage and controls costs.

### How It Works

The `RateLimiter` class tracks actions in the Supabase `rate_limits` table:

1. **Per-User Limits**: Each user can perform a maximum number of actions per day
2. **Global Limits**: Total system-wide actions are capped per day
3. **Action Types**: Different actions (register, send_reminder, send_followup, etc.) are tracked separately

### Rate Limit Configuration

```bash
# In .env
MAX_DAILY_USER_ACTIONS=10      # Each user can do 10 actions/day
MAX_DAILY_GLOBAL_ACTIONS=100   # System-wide limit of 100 actions/day
```

### Database Schema

The rate limiter uses the `rate_limits` table:

```sql
CREATE TABLE public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Rate Limiting in Code

```python
from rate_limiter import RateLimiter

rate_limiter = RateLimiter()

# Check if action is allowed
result = rate_limiter.is_action_allowed("user@example.com", "send_reminder")

if result["allowed"]:
    # Perform the action
    send_reminder()
    
    # Record the action
    rate_limiter.record_action("user@example.com", "send_reminder")
else:
    print(f"Rate limit exceeded: {result['message']}")
```

### Cleanup

Old rate limit records are automatically retained for 7 days. To manually clean up:

```python
from rate_limiter import RateLimiter

rate_limiter = RateLimiter()
deleted_count = rate_limiter.cleanup_old_records(days_to_keep=7)
print(f"Deleted {deleted_count} old records")
```

---

## Error Handling

### Comprehensive Error Handling

All operations are wrapped in try-catch blocks with:

1. **Graceful Degradation**: If rate limit checks fail, actions are allowed (fail-open)
2. **Detailed Logging**: All errors are logged with context
3. **User-Friendly Messages**: Clear error messages for debugging

### Error Levels

```python
# ERROR level (default) - Only critical errors
LOG_LEVEL=ERROR

# WARNING level - Errors + warnings (rate limits, etc.)
LOG_LEVEL=WARNING

# INFO level - General information
LOG_LEVEL=INFO

# DEBUG level - Detailed debugging (verbose agent output)
LOG_LEVEL=DEBUG
```

### Example Error Handling

```python
try:
    result = agent.run(query)
except ValueError as e:
    logger.error(f"Configuration error: {e}")
    return "Configuration error. Please check your settings."
except Exception as e:
    logger.error(f"Unexpected error: {e}", exc_info=True)
    return "An error occurred. Please try again later."
```

---

## Deployment Steps

### 1. Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd <project-directory>

# Install dependencies
npm install
pip install -r requirements.txt  # If using Python agent
```

### 2. Configure Environment

```bash
# Copy example configuration
cp .env.example .env

# Edit .env with your actual values
nano .env
```

**Important**: Replace all placeholder values:
- `your-project-id` → Your actual Supabase project ID
- `your-publishable-key` → Your Supabase publishable key
- `your-service-role-key` → Your Supabase service role key
- `your_api_key_here` → Your actual OpenAI API key

### 3. Database Setup

Run migrations to create the rate_limits table:

```bash
# If using Supabase CLI
supabase db push

# Or manually run the migration file
# supabase/migrations/20251003151500_create_rate_limits.sql
```

### 4. Test Configuration

```bash
# Test the Python agent
python agent.py

# Check for configuration errors
python -c "from config import Config; Config.print_config()"
```

### 5. Deploy to Production

#### For Replit:

1. The application is already configured for Replit
2. Ensure environment variables are set in Replit Secrets (not .env)
3. The workflow will automatically start on deployment

#### For Other Platforms:

```bash
# Build frontend
npm run build

# Deploy frontend (example for Netlify/Vercel)
npm run deploy

# Deploy backend/agent
# Configure as needed for your platform
```

---

## Monitoring & Logging

### Log Levels

Set `LOG_LEVEL` based on your needs:

- **Production**: `ERROR` (minimal logging, best performance)
- **Staging**: `WARNING` (include warnings for debugging)
- **Development**: `DEBUG` (verbose logging for troubleshooting)

### Monitoring Rate Limits

Query the `rate_limits` table to monitor usage:

```sql
-- Check today's activity by user
SELECT 
  user_id, 
  action_type, 
  COUNT(*) as count
FROM rate_limits
WHERE created_at >= CURRENT_DATE
GROUP BY user_id, action_type
ORDER BY count DESC;

-- Check global daily usage
SELECT 
  action_type, 
  COUNT(*) as count
FROM rate_limits
WHERE created_at >= CURRENT_DATE
GROUP BY action_type;
```

### Cost Monitoring

Monitor OpenAI API usage:
1. Check OpenAI dashboard for token usage
2. Set up billing alerts in OpenAI account
3. Review rate limit logs for excessive usage patterns

---

## Troubleshooting

### Common Issues

#### 1. "Configuration errors: OPENAI_API_KEY contains placeholder value"

**Solution**: Replace the placeholder in .env with your actual OpenAI API key:
```bash
OPENAI_API_KEY=sk-your-actual-openai-key-here
```

#### 2. "Rate limit exceeded"

**Solution**: Either wait for the daily reset or increase limits:
```bash
MAX_DAILY_USER_ACTIONS=20
MAX_DAILY_GLOBAL_ACTIONS=200
```

#### 3. "AI Agent is disabled via configuration"

**Solution**: Enable the AI agent in .env:
```bash
ENABLE_AI_AGENT=true
```

#### 4. Database connection errors

**Solution**: Verify Supabase credentials:
```bash
# Check SUPABASE_URL and SUPABASE_KEY in .env
# Ensure service role key has proper permissions
```

#### 5. Import errors (Python modules not found)

**Solution**: Install required packages:
```bash
pip install supabase openai langchain langchain-openai python-dotenv
```

#### 6. "Table 'rate_limits' does not exist"

**Solution**: Run the migration:
```bash
# Using Supabase CLI
supabase db push

# Or manually execute the migration file
```

### Debug Mode

Enable debug mode for detailed logging:

```bash
LOG_LEVEL=DEBUG
```

This will show:
- All agent reasoning steps
- Database queries
- Rate limit checks
- Detailed error traces

### Testing Rate Limits

```python
from rate_limiter import RateLimiter

rate_limiter = RateLimiter()

# Check current status
user_check = rate_limiter.check_user_limit("test@example.com", "send_reminder")
print(f"User has {user_check['remaining']} actions remaining")

global_check = rate_limiter.check_global_limit("send_reminder")
print(f"System has {global_check['remaining']} actions remaining")
```

### Resetting Rate Limits

To manually reset rate limits for testing:

```sql
-- Delete all rate limit records for today
DELETE FROM rate_limits WHERE created_at >= CURRENT_DATE;

-- Or delete for specific user
DELETE FROM rate_limits 
WHERE user_id = 'user@example.com' 
AND created_at >= CURRENT_DATE;
```

---

## Security Best Practices

### 1. Never Commit Secrets

- ✅ Use `.env` for local development (already in `.gitignore`)
- ✅ Use Replit Secrets for Replit deployment
- ✅ Use environment variables for production
- ❌ Never commit `.env` to version control
- ❌ Never hardcode API keys in code

### 2. Use Service Role Key Carefully

The Supabase service role key bypasses Row Level Security (RLS):
- Only use it in trusted backend code (Python agent)
- Never expose it to the frontend
- Rotate it if compromised

### 3. Monitor Usage

- Set up billing alerts in OpenAI
- Monitor rate limit logs regularly
- Review unusual activity patterns

### 4. Principle of Least Privilege

- Use publishable key for frontend (VITE_SUPABASE_PUBLISHABLE_KEY)
- Use service role key only in backend (SUPABASE_KEY)
- Enable RLS on all Supabase tables

---

## Performance Optimization

### 1. Token Conservation

- Set `LOG_LEVEL=ERROR` in production to minimize token usage
- Disable unused features via feature toggles
- Set conservative rate limits

### 2. Database Optimization

```sql
-- Add indexes for better query performance (already included in migration)
CREATE INDEX idx_rate_limits_user_action ON rate_limits(user_id, action_type);
CREATE INDEX idx_rate_limits_created_at ON rate_limits(created_at);
```

### 3. Caching

Consider implementing caching for:
- Event details (rarely change)
- Attendee information (for repeated queries)
- Rate limit checks (short TTL)

---

## Support

For issues or questions:

1. Check this troubleshooting guide first
2. Review logs with `LOG_LEVEL=DEBUG`
3. Verify configuration with `Config.print_config()`
4. Check Supabase and OpenAI dashboards for API issues

---

## Changelog

### Version 1.0 (October 3, 2025)

- ✅ Implemented comprehensive rate limiting
- ✅ Added feature toggles for cost control
- ✅ Enhanced error handling throughout
- ✅ Optimized logging (ERROR level by default)
- ✅ Created configuration validation
- ✅ Added rate_limits database table
- ✅ Implemented graceful degradation
- ✅ Added deployment documentation
