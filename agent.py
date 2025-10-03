import os
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dotenv import load_dotenv
from supabase import create_client, Client
from langchain_openai import ChatOpenAI
from langchain.agents import Tool, initialize_agent, AgentType
from langchain.memory import ConversationBufferMemory
from langchain.prompts import ChatPromptTemplate

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not all([SUPABASE_URL, SUPABASE_KEY, OPENAI_API_KEY]):
    raise ValueError("Missing required environment variables: SUPABASE_URL, SUPABASE_KEY, or OPENAI_API_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

class WebinarEngagementAgent:
    """AI Agent for managing webinar engagement, reminders, and follow-ups"""
    
    def __init__(self):
        self.llm = ChatOpenAI(
            model="gpt-4o",
            temperature=0.7,
            max_tokens=2000,
            openai_api_key=OPENAI_API_KEY
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
            verbose=True,
            max_iterations=5,
            handle_parsing_errors=True
        )
    
    def _initialize_tools(self) -> List[Tool]:
        """Initialize all tools for the agent"""
        return [
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
                name="SendReminder",
                func=self.send_reminder,
                description="Send a reminder to an attendee. Input should be JSON with attendee_id, event_id, and reminder_type."
            ),
            Tool(
                name="SendFollowUp",
                func=self.send_followup,
                description="Send a follow-up message to an attendee. Input should be JSON with attendee_id, event_id, and followup_type."
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
    
    def register_attendee(self, input_str: str) -> str:
        """Register a new attendee for an event"""
        try:
            data = json.loads(input_str) if isinstance(input_str, str) else input_str
            
            result = supabase.table("attendees").insert({
                "event_id": data["event_id"],
                "email": data["email"],
                "name": data.get("name")
            }).execute()
            
            if result.data:
                attendee = result.data[0]
                
                supabase.table("events").update({
                    "registrations": supabase.table("events")
                        .select("registrations")
                        .eq("id", data["event_id"])
                        .execute().data[0]["registrations"] + 1
                }).eq("id", data["event_id"]).execute()
                
                return f"Successfully registered attendee {attendee['email']} for event {data['event_id']}"
            
            return "Failed to register attendee"
            
        except Exception as e:
            return f"Error registering attendee: {str(e)}"
    
    def track_engagement(self, input_str: str) -> str:
        """Track attendee engagement"""
        try:
            data = json.loads(input_str) if isinstance(input_str, str) else input_str
            
            result = supabase.table("attendee_engagement").insert({
                "attendee_id": data["attendee_id"],
                "event_id": data["event_id"],
                "engagement_type": data["engagement_type"],
                "engagement_data": data.get("engagement_data", {})
            }).execute()
            
            if result.data:
                return f"Successfully tracked {data['engagement_type']} engagement for attendee {data['attendee_id']}"
            
            return "Failed to track engagement"
            
        except Exception as e:
            return f"Error tracking engagement: {str(e)}"
    
    def get_event_details(self, event_id: str) -> str:
        """Get event details"""
        try:
            result = supabase.table("events").select("*").eq("id", event_id).execute()
            
            if result.data:
                event = result.data[0]
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
            return f"Error getting event details: {str(e)}"
    
    def get_attendee_info(self, attendee_id: str) -> str:
        """Get attendee information"""
        try:
            result = supabase.table("attendees").select("*").eq("id", attendee_id).execute()
            
            if result.data:
                attendee = result.data[0]
                
                interests_result = supabase.table("attendee_interests").select("*").eq("attendee_id", attendee_id).execute()
                interests = interests_result.data[0] if interests_result.data else {}
                
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
            return f"Error getting attendee info: {str(e)}"
    
    def send_reminder(self, input_str: str) -> str:
        """Send reminder to attendee"""
        try:
            data = json.loads(input_str) if isinstance(input_str, str) else input_str
            
            attendee = supabase.table("attendees").select("*").eq("id", data["attendee_id"]).execute()
            event = supabase.table("events").select("*").eq("id", data["event_id"]).execute()
            
            if not attendee.data or not event.data:
                return "Attendee or event not found"
            
            attendee_info = attendee.data[0]
            event_info = event.data[0]
            
            reminder_type = data.get("reminder_type", "general")
            
            subject = f"Reminder: {event_info['title']} coming up!"
            
            supabase.table("email_logs").insert({
                "attendee_id": data["attendee_id"],
                "event_id": data["event_id"],
                "email_type": f"reminder_{reminder_type}",
                "subject": subject,
                "status": "sent"
            }).execute()
            
            return f"Reminder sent to {attendee_info['email']} for event {event_info['title']}"
            
        except Exception as e:
            return f"Error sending reminder: {str(e)}"
    
    def send_followup(self, input_str: str) -> str:
        """Send follow-up to attendee"""
        try:
            data = json.loads(input_str) if isinstance(input_str, str) else input_str
            
            attendee = supabase.table("attendees").select("*").eq("id", data["attendee_id"]).execute()
            event = supabase.table("events").select("*").eq("id", data["event_id"]).execute()
            
            if not attendee.data or not event.data:
                return "Attendee or event not found"
            
            attendee_info = attendee.data[0]
            event_info = event.data[0]
            
            followup_type = data.get("followup_type", "general")
            
            subject = f"Thank you for attending {event_info['title']}"
            
            supabase.table("email_logs").insert({
                "attendee_id": data["attendee_id"],
                "event_id": data["event_id"],
                "email_type": f"followup_{followup_type}",
                "subject": subject,
                "status": "sent"
            }).execute()
            
            return f"Follow-up sent to {attendee_info['email']} for event {event_info['title']}"
            
        except Exception as e:
            return f"Error sending follow-up: {str(e)}"
    
    def get_upcoming_events(self, _: str = "") -> str:
        """Get upcoming events"""
        try:
            result = supabase.table("events").select("*").eq("status", "upcoming").order("date").limit(10).execute()
            
            if result.data:
                events = [{
                    "id": event["id"],
                    "title": event["title"],
                    "date": event["date"],
                    "registrations": event["registrations"],
                    "attendees": event["attendees"]
                } for event in result.data]
                
                return json.dumps(events)
            
            return "No upcoming events found"
            
        except Exception as e:
            return f"Error getting upcoming events: {str(e)}"
    
    def update_attendee_interests(self, input_str: str) -> str:
        """Update attendee interests and preferences"""
        try:
            data = json.loads(input_str) if isinstance(input_str, str) else input_str
            
            existing = supabase.table("attendee_interests").select("*").eq("attendee_id", data["attendee_id"]).execute()
            
            if existing.data:
                result = supabase.table("attendee_interests").update({
                    "interests": data.get("interests", []),
                    "preferences": data.get("preferences", {}),
                    "updated_at": datetime.now().isoformat()
                }).eq("attendee_id", data["attendee_id"]).execute()
            else:
                result = supabase.table("attendee_interests").insert({
                    "attendee_id": data["attendee_id"],
                    "interests": data.get("interests", []),
                    "preferences": data.get("preferences", {})
                }).execute()
            
            if result.data:
                return f"Successfully updated interests for attendee {data['attendee_id']}"
            
            return "Failed to update interests"
            
        except Exception as e:
            return f"Error updating interests: {str(e)}"
    
    def run(self, query: str) -> str:
        """Run the agent with a query"""
        try:
            response = self.agent.run(query)
            return response
        except Exception as e:
            return f"Error running agent: {str(e)}"

def main():
    """Main function to run the webinar engagement agent"""
    try:
        agent = WebinarEngagementAgent()
        
        print("=" * 80)
        print("Webinar Engagement Bot - AI Agent")
        print("=" * 80)
        print("Capabilities:")
        print("- Register attendees for events")
        print("- Track engagement patterns")
        print("- Send personalized reminders")
        print("- Send post-event follow-ups")
        print("- Manage attendee interests and preferences")
        print("=" * 80)
        
        example_query = """
        I need to check the upcoming webinars and prepare reminder emails
        for all registered attendees who haven't attended yet.
        """
        
        print(f"\nExample Query: {example_query.strip()}")
        print("\nAgent Response:")
        response = agent.run(example_query)
        print(response)
        
    except Exception as e:
        print(f"Error initializing agent: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
