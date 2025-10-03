# EngageBoost - Webinar Engagement Platform

## Overview
EngageBoost is a webinar and event engagement platform that helps boost event attendance and engagement with personalized reminders, content previews, and AI-powered follow-ups. This is a Lovable.dev project imported into Replit.

## Tech Stack
- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **State Management**: TanStack Query (React Query v5)
- **Backend**: Supabase (authentication, database)
- **Form Handling**: React Hook Form with Zod validation
- **Icons**: Lucide React

## Project Structure
```
├── src/
│   ├── components/     # React components including UI components
│   ├── pages/          # Page components (Index, Events, Dashboard, Auth, NotFound)
│   ├── integrations/   # Supabase integration
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility functions
│   └── main.tsx        # Application entry point
├── public/             # Static assets
├── supabase/           # Supabase migrations and functions
└── index.html          # HTML entry point
```

## Development Setup

### Running the Application
The application is configured to run on port 5000 with proper Replit environment setup:
- Host: 0.0.0.0 (accessible externally)
- Port: 5000 (Replit's exposed port)
- HMR configured for Replit's proxy setup

The workflow "Start application" runs `npm run dev` and starts the Vite development server.

### Environment Variables
The following environment variables are configured in `.env`:
- `VITE_SUPABASE_PROJECT_ID`: Supabase project ID
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Supabase publishable/anon key
- `VITE_SUPABASE_URL`: Supabase project URL
- `OPENAI_API_KEY`: OpenAI API key for AI features
- `SUPABASE_URL`: Backend Supabase URL
- `SUPABASE_KEY`: Service role key for backend operations

### Available Scripts
- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run build:dev`: Build in development mode
- `npm run lint`: Run ESLint
- `npm run preview`: Preview production build

## Key Features
- Event management and tracking
- User authentication via Supabase
- Dashboard for event analytics
- AI-powered engagement tools
- Responsive design with dark mode support

## Replit Configuration
- **Port**: 5000 (required for Replit frontend)
- **Host**: 0.0.0.0 (allows external access)
- **HMR**: Configured with clientPort 443 for Replit's proxy
- **Deployment**: Configured as autoscale with npm build and start scripts

## AI Webinar Engagement Agent

### Overview
The `agent.py` file contains a LangChain-based AI agent that manages webinar engagement, reminders, and follow-ups. It connects to the Supabase database and uses OpenAI for intelligent decision-making.

### Agent Features
- **Registration Management**: Register new attendees for events
- **Engagement Tracking**: Track attendee interactions and engagement patterns
- **Smart Reminders**: Send personalized reminder emails to attendees
- **Follow-up Automation**: Automated post-event follow-ups
- **Interest Management**: Track and update attendee interests and preferences
- **Event Analytics**: Retrieve event details and upcoming webinar information

### Configuration
- **LLM Model**: GPT-4o with 2000 max tokens
- **Context Window**: 4000 token memory buffer
- **Agent Type**: Conversational React with tool usage
- **Error Handling**: Comprehensive try-catch blocks for all operations

### Database Tables Used
- `events`: Event information and statistics
- `attendees`: Attendee registration data
- `attendee_engagement`: Engagement tracking
- `attendee_interests`: User interests and preferences
- `email_logs`: Email communication history

### Running the Agent
```bash
python agent.py
```

### Important: API Key Setup
The agent requires a valid OpenAI API key to function. The current `.env` file contains placeholder values that must be replaced with actual API keys:

⚠️ **SECURITY NOTICE**: 
- Replace `OPENAI_API_KEY=your_api_key_here` with your actual OpenAI API key
- Replace `SUPABASE_URL` and `SUPABASE_KEY` with your actual Supabase credentials if needed
- **NEVER commit actual API keys to version control**
- Use Replit Secrets or environment variables for production deployments
- The `.env` file should be in `.gitignore` (already configured)

To get an OpenAI API key:
1. Visit https://platform.openai.com/account/api-keys
2. Create a new API key
3. Update the `.env` file with your key
4. Ensure you have sufficient credits in your OpenAI account

## Recent Changes (October 3, 2025)
- Imported from GitHub repository
- Updated Vite configuration for Replit environment
- Set up workflow to run on port 5000 with webview output
- Installed all npm dependencies
- Verified application runs correctly
- **Rewrote agent.py to be a comprehensive webinar engagement bot**:
  - Integrated with Supabase database for event/attendee data
  - Added proper LangChain agent with OpenAI GPT-4o
  - Implemented 8 core functions for engagement management
  - Configured appropriate token limits and context windows
  - Added comprehensive error handling throughout
- Installed Python 3.11 and required packages (supabase, openai, langchain, etc.)
