import os
from langchain.agents import initialize_agent, Tool
from langchain.llms import OpenAI
from supabase import create_client

# Load secrets
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Tool: Fetch yachts (example table: "yachts")
def get_yachts():
    data = supabase.table("yachts").select("*").execute()
    return data.data

tools = [
    Tool(
        name="YachtDatabase",
        func=get_yachts,
        description="Get available yachts from Supabase"
    )
]

# LLM brain
llm = OpenAI(openai_api_key=os.getenv("OPENAI_API_KEY"), temperature=0)

# Build agent
agent = initialize_agent(tools, llm, agent="zero-shot-react-description", verbose=True)

# Run a query
query = "List all available yachts in the database."
response = agent.run(query)
print("Agent: - agent.py:33", response)
