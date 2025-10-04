import os
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dotenv import load_dotenv
from supabase import create_client, Client
from langchain_openai import ChatOpenAI
from langchain.agents import Tool, initialize_agent, AgentType
from langchain.memory import ConversationBufferMemory
from config import Config
from rate_limiter import RateLimiter

load_dotenv()

logging.basicConfig(
    level=getattr(logging, Config.LOG_LEVEL, logging.ERROR),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class WebinarEngagementAgent:
    """AI Agent for managing webinar engagement, reminders, and follow-ups with rate limiting"""
    
    def __init__(self):
        is_valid, errors = Config.validate()
        if not is_valid:
            error_msg = "Configuration errors:\n" + "\n".join(f"  - {e}" for e in errors)
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        self.supabase = create_client(Config.SUPABASE_URL, Config.SUPABASE_KEY)
        self.rate_limiter = RateLimiter(self.supabase)
        
        if not Config.ENABLE_AI_AGENT:
            logger.info("AI Agent is disabled via configuration")
            return
        
        try:
            self.llm = ChatOpenAI(
                model="gpt-4o",
                temperature=0.7,
                max_tokens=2000,
                openai_api_key=Config.OPENAI_API_KEY
            )
            
            self.memory = ConversationBufferMemory(
                memory_key="chat_history",
                return_messages=True,
                max_token_limit=4000
            )
            
            self.tools = self._initialize_tools()
            self.agent = initialize_agent(
                self.tools,
                self.llm,
                agent=AgentType.CHAT_CONVERSATIONAL_REACT_DESCRIPTION,
                memory=self.memory,
                verbose=(Config.LOG_LEVEL == "DEBUG"),
                max_iterations=5,
                handle_parsing_errors=True
            )
        except Exception as e:
            logger.error(f"Failed to initialize AI agent: {str(e)}")
            raise
    
    def _initialize_tools(self) -> List[Tool]:
        """Initialize all tools for the agent based on feature toggles"""
        tools = [
            Tool(
                name="RegisterAttendee",
                func=self.register_attendee,
                description="Register a new attendee for an event. Input should be JSON with event_id, email, and optionally name."
            ),
            Tool(
                name="TrackEngagement",
                func=self.track_engagement,
                description="Track attendee engagement activity. Input should be JSON with attendee_id, event_id, engagement_type, and engagement_data."
            ),
            Tool(
                name="GetEventDetails",
                func=self.get_event_details,
                description="Get details about a specific event. Input should be the event_id."
            ),
            Tool(
                name="GetAttendeeInfo",
                func=self.get_attendee_info,
                description="Get information about an attendee. Input should be the attendee_id."
            ),
            Tool(
                name="GetUpcomingEvents",
                func=self.get_upcoming_events,
                description="Get a list of upcoming events. No input required."
            ),
            Tool(
                name="UpdateAttendeeInterests",
                func=self.update_attendee_interests,
                description="Update attendee interests and preferences. Input should be JSON with attendee_id, interests, and preferences."
            )
        ]
        
        if Config.ENABLE_REMINDERS:
            tools.append(Tool(
                name="SendReminder",
                func=self.send_reminder,
                description="Send a reminder to an attendee. Input should be JSON with attendee_id, event_id, and reminder_type."
            ))
        
        if Config.ENABLE_FOLLOWUPS:
            tools.append(Tool(
                name="SendFollowUp",
                func=self.send_followup,
                description="Send a follow-up message to an attendee. Input should be JSON with attendee_id, event_id, and followup_type."
            ))
        
        return tools
    
    def _check_rate_limit(self, user_id: str, action_type: str) -> tuple[bool, str]:
        """Check rate limits before processing action"""
        try:
            result = self.rate_limiter.is_action_allowed(user_id, action_type)
            if not result["allowed"]:
                return False, result["message"]
            return True, "OK"
        except Exception as e:
            logger.error(f"Rate limit check failed: {str(e)}")
            return True, "OK"
    
    def _record_action(self, user_id: str, action_type: str, metadata: Optional[Dict] = None) -> None:
        """Record action for rate limiting"""
        try:
            self.rate_limiter.record_action(user_id, action_type, metadata)
        except Exception as e:
            logger.error(f"Failed to record action: {str(e)}")
    
    def register_attendee(self, input_str: str) -> str:
        """Register a new attendee for an event"""
        try:
            data = json.loads(input_str) if isinstance(input_str, str) else input_str
            user_id = data.get("email", "unknown")
            
            allowed, message = self._check_rate_limit(user_id, "register_attendee")
            if not allowed:
                logger.warning(f"Rate limit exceeded for {user_id}: {message}")
                return f"Rate limit exceeded: {message}"
            
            result = self.supabase.table("attendees").insert({
                "event_id": data["event_id"],
                "email": data["email"],
                "name": data.get("name")
            }).execute()
            
            if result.data:
                attendee = result.data[0]
                
                event_result = self.supabase.table("events").select("registrations").eq("id", data["event_id"]).execute()
                if event_result.data:
                    current_registrations = event_result.data[0]["registrations"]
                    self.supabase.table("events").update({
                        "registrations": current_registrations + 1
                    }).eq("id", data["event_id"]).execute()
                
                self._record_action(user_id, "register_attendee", {"attendee_id": attendee["id"]})
                logger.info(f"Registered attendee {attendee['email']} for event {data['event_id']}")
                return f"Successfully registered attendee {attendee['email']} for event {data['event_id']}"
            
            return "Failed to register attendee"
            
        except Exception as e:
            logger.error(f"Error registering attendee: {str(e)}")
            return f"Error registering attendee: {str(e)}"
    
    def track_engagement(self, input_str: str) -> str:
        """Track attendee engagement"""
        try:
            data = json.loads(input_str) if isinstance(input_str, str) else input_str
            
            result = self.supabase.table("attendee_engagement").insert({
                "attendee_id": data["attendee_id"],
                "event_id": data["event_id"],
                "engagement_type": data["engagement_type"],
                "engagement_data": data.get("engagement_data", {})
            }).execute()
            
            if result.data:
                logger.info(f"Tracked {data['engagement_type']} for attendee {data['attendee_id']}")
                return f"Successfully tracked {data['engagement_type']} engagement for attendee {data['attendee_id']}"
            
            return "Failed to track engagement"
            
        except Exception as e:
            logger.error(f"Error tracking engagement: {str(e)}")
            return f"Error tracking engagement: {str(e)}"
    
    def get_event_details(self, event_id: str) -> str:
        """Get event details"""
        try:
            result = self.supabase.table("events").select("*").eq("id", event_id).execute()
            
            if result.data:
                event = result.data[0]
                logger.info(f"Retrieved details for event {event_id}")
                return json.dumps({
                    "title": event["title"],
                    "date": event["date"],
                    "status": event["status"],
                    "attendees": event["attendees"],
                    "registrations": event["registrations"],
                    "engagement": str(event["engagement"]),
                    "description": event.get("description")
                })
            
            return f"Event {event_id} not found"
            
        except Exception as e:
            logger.error(f"Error getting event details: {str(e)}")
            return f"Error getting event details: {str(e)}"
    
    def get_attendee_info(self, attendee_id: str) -> str:
        """Get attendee information"""
        try:
            result = self.supabase.table("attendees").select("*").eq("id", attendee_id).execute()
            
            if result.data:
                attendee = result.data[0]
                
                interests_result = self.supabase.table("attendee_interests").select("*").eq("attendee_id", attendee_id).execute()
                interests = interests_result.data[0] if interests_result.data else {}
                
                logger.info(f"Retrieved info for attendee {attendee_id}")
                return json.dumps({
                    "email": attendee["email"],
                    "name": attendee.get("name"),
                    "registered_at": attendee["registered_at"],
                    "attended": attendee.get("attended"),
                    "interests": interests.get("interests", []),
                    "preferences": interests.get("preferences", {})
                })
            
            return f"Attendee {attendee_id} not found"
            
        except Exception as e:
            logger.error(f"Error getting attendee info: {str(e)}")
            return f"Error getting attendee info: {str(e)}"
    
    def send_reminder(self, input_str: str) -> str:
        """Send reminder to attendee"""
        if not Config.ENABLE_REMINDERS:
            return "Reminder feature is disabled"
        
        try:
            data = json.loads(input_str) if isinstance(input_str, str) else input_str
            
            attendee = self.supabase.table("attendees").select("*").eq("id", data["attendee_id"]).execute()
            event = self.supabase.table("events").select("*").eq("id", data["event_id"]).execute()
            
            if not attendee.data or not event.data:
                return "Attendee or event not found"
            
            attendee_info = attendee.data[0]
            event_info = event.data[0]
            user_id = attendee_info["email"]
            
            allowed, message = self._check_rate_limit(user_id, "send_reminder")
            if not allowed:
                logger.warning(f"Rate limit exceeded for {user_id}: {message}")
                return f"Rate limit exceeded: {message}"
            
            reminder_type = data.get("reminder_type", "general")
            subject = f"Reminder: {event_info['title']} coming up!"
            
            self.supabase.table("email_logs").insert({
                "attendee_id": data["attendee_id"],
                "event_id": data["event_id"],
                "email_type": f"reminder_{reminder_type}",
                "subject": subject,
                "status": "sent"
            }).execute()
            
            self._record_action(user_id, "send_reminder", {"event_id": data["event_id"]})
            logger.info(f"Sent reminder to {attendee_info['email']} for event {event_info['title']}")
            return f"Reminder sent to {attendee_info['email']} for event {event_info['title']}"
            
        except Exception as e:
            logger.error(f"Error sending reminder: {str(e)}")
            return f"Error sending reminder: {str(e)}"
    
    def send_followup(self, input_str: str) -> str:
        """Send follow-up to attendee"""
        if not Config.ENABLE_FOLLOWUPS:
            return "Follow-up feature is disabled"
        
        try:
            data = json.loads(input_str) if isinstance(input_str, str) else input_str
            
            attendee = self.supabase.table("attendees").select("*").eq("id", data["attendee_id"]).execute()
            event = self.supabase.table("events").select("*").eq("id", data["event_id"]).execute()
            
            if not attendee.data or not event.data:
                return "Attendee or event not found"
            
            attendee_info = attendee.data[0]
            event_info = event.data[0]
            user_id = attendee_info["email"]
            
            allowed, message = self._check_rate_limit(user_id, "send_followup")
            if not allowed:
                logger.warning(f"Rate limit exceeded for {user_id}: {message}")
                return f"Rate limit exceeded: {message}"
            
            followup_type = data.get("followup_type", "general")
            subject = f"Thank you for attending {event_info['title']}"
            
            self.supabase.table("email_logs").insert({
                "attendee_id": data["attendee_id"],
                "event_id": data["event_id"],
                "email_type": f"followup_{followup_type}",
                "subject": subject,
                "status": "sent"
            }).execute()
            
            self._record_action(user_id, "send_followup", {"event_id": data["event_id"]})
            logger.info(f"Sent follow-up to {attendee_info['email']} for event {event_info['title']}")
            return f"Follow-up sent to {attendee_info['email']} for event {event_info['title']}"
            
        except Exception as e:
            logger.error(f"Error sending follow-up: {str(e)}")
            return f"Error sending follow-up: {str(e)}"
    
    def get_upcoming_events(self, _: str = "") -> str:
        """Get upcoming events"""
        try:
            result = self.supabase.table("events").select("*").eq("status", "upcoming").order("date").limit(10).execute()
            
            if result.data:
                events = [{
                    "id": event["id"],
                    "title": event["title"],
                    "date": event["date"],
                    "registrations": event["registrations"],
                    "attendees": event["attendees"]
                } for event in result.data]
                
                logger.info(f"Retrieved {len(events)} upcoming events")
                return json.dumps(events)
            
            return "No upcoming events found"
            
        except Exception as e:
            logger.error(f"Error getting upcoming events: {str(e)}")
            return f"Error getting upcoming events: {str(e)}"
    
    def update_attendee_interests(self, input_str: str) -> str:
        """Update attendee interests and preferences"""
        try:
            data = json.loads(input_str) if isinstance(input_str, str) else input_str
            
            existing = self.supabase.table("attendee_interests").select("*").eq("attendee_id", data["attendee_id"]).execute()
            
            if existing.data:
                result = self.supabase.table("attendee_interests").update({
                    "interests": data.get("interests", []),
                    "preferences": data.get("preferences", {}),
                    "updated_at": datetime.now().isoformat()
                }).eq("attendee_id", data["attendee_id"]).execute()
            else:
                result = self.supabase.table("attendee_interests").insert({
                    "attendee_id": data["attendee_id"],
                    "interests": data.get("interests", []),
                    "preferences": data.get("preferences", {})
                }).execute()
            
            if result.data:
                logger.info(f"Updated interests for attendee {data['attendee_id']}")
                return f"Successfully updated interests for attendee {data['attendee_id']}"
            
            return "Failed to update interests"
            
        except Exception as e:
            logger.error(f"Error updating interests: {str(e)}")
            return f"Error updating interests: {str(e)}"
    
    def run(self, query: str, user_id: str = "system") -> str:
        """Run the agent with a query"""
        if not Config.ENABLE_AI_AGENT:
            return "AI Agent is disabled via configuration"
        
        try:
            allowed, message = self._check_rate_limit(user_id, "agent_query")
            if not allowed:
                logger.warning(f"Rate limit exceeded for {user_id}: {message}")
                return f"Rate limit exceeded: {message}"
            
            response = self.agent.run(query)
            self._record_action(user_id, "agent_query", {"query_length": len(query)})
            return response
        except Exception as e:
            logger.error(f"Error running agent: {str(e)}")
            return f"Error running agent: {str(e)}"

def main():
    """Main function to run the webinar engagement agent"""
    try:
        Config.print_config()
        
        if not Config.ENABLE_AI_AGENT:
            print("\n⚠️  AI Agent is DISABLED via configuration")
            print("Set ENABLE_AI_AGENT=true in your environment to enable it")
            return
        
        agent = WebinarEngagementAgent()
        
        print("\n" + "=" * 80)
        print("Webinar Engagement Bot - AI Agent")
        print("=" * 80)
        print("Capabilities:")
        print("- Register attendees for events")
        print("- Track engagement patterns")
        if Config.ENABLE_REMINDERS:
            print("- Send personalized reminders ✓")
        else:
            print("- Send personalized reminders (DISABLED)")
        if Config.ENABLE_FOLLOWUPS:
            print("- Send post-event follow-ups ✓")
        else:
            print("- Send post-event follow-ups (DISABLED)")
        print("- Manage attendee interests and preferences")
        print("=" * 80)
        
        example_query = """
        I need to check the upcoming webinars and prepare reminder emails
        for all registered attendees who haven't attended yet.
        """
        
        print(f"\nExample Query: {example_query.strip()}")
        print("\nAgent Response:")
        response = agent.run(example_query, user_id="demo_user")
        print(response)
        
    except ValueError as e:
        print(f"\n❌ Configuration Error: {str(e)}")
        print("\nPlease check your .env file and ensure all required values are set.")
    except Exception as e:
        logger.error(f"Error initializing agent: {str(e)}", exc_info=True)
        print(f"\n❌ Error: {str(e)}")

if __name__ == "__main__":
    main()
