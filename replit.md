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

## Recent Changes (October 3, 2025)
- Imported from GitHub repository
- Updated Vite configuration for Replit environment
- Set up workflow to run on port 5000 with webview output
- Installed all npm dependencies
- Verified application runs correctly
