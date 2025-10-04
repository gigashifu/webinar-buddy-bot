import os
from typing import Any
from dotenv import load_dotenv

load_dotenv()

class Config:
    """
    Central configuration management for the webinar engagement system.
    Loads all feature toggles and settings from environment variables.
    """
    
    ENABLE_REMINDERS: bool = os.getenv("ENABLE_REMINDERS", "true").lower() == "true"
    ENABLE_PREVIEWS: bool = os.getenv("ENABLE_PREVIEWS", "false").lower() == "true"
    ENABLE_FOLLOWUPS: bool = os.getenv("ENABLE_FOLLOWUPS", "true").lower() == "true"
    ENABLE_AI_AGENT: bool = os.getenv("ENABLE_AI_AGENT", "true").lower() == "true"
    
    MAX_DAILY_USER_ACTIONS: int = int(os.getenv("MAX_DAILY_USER_ACTIONS", "10"))
    MAX_DAILY_GLOBAL_ACTIONS: int = int(os.getenv("MAX_DAILY_GLOBAL_ACTIONS", "100"))
    
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "ERROR").upper()
    
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    
    @classmethod
    def get(cls, key: str, default: Any = None) -> Any:
        """Get a configuration value by key"""
        return getattr(cls, key, default)
    
    @classmethod
    def is_feature_enabled(cls, feature: str) -> bool:
        """Check if a feature is enabled"""
        feature_key = f"ENABLE_{feature.upper()}"
        return getattr(cls, feature_key, False)
    
    @classmethod
    def validate(cls) -> tuple[bool, list[str]]:
        """
        Validate that all required configuration is present.
        
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []
        
        if not cls.SUPABASE_URL:
            errors.append("SUPABASE_URL is not set")
        
        if not cls.SUPABASE_KEY:
            errors.append("SUPABASE_KEY is not set")
        
        if cls.ENABLE_AI_AGENT and not cls.OPENAI_API_KEY:
            errors.append("OPENAI_API_KEY is required when AI_AGENT is enabled")
        
        if cls.OPENAI_API_KEY and "your_api_key_here" in cls.OPENAI_API_KEY:
            errors.append("OPENAI_API_KEY contains placeholder value")
        
        if cls.MAX_DAILY_USER_ACTIONS < 1:
            errors.append("MAX_DAILY_USER_ACTIONS must be at least 1")
        
        if cls.MAX_DAILY_GLOBAL_ACTIONS < 1:
            errors.append("MAX_DAILY_GLOBAL_ACTIONS must be at least 1")
        
        return (len(errors) == 0, errors)
    
    @classmethod
    def print_config(cls) -> None:
        """Print current configuration (excluding sensitive data)"""
        print("=" * 80)
        print("Current Configuration")
        print("=" * 80)
        print(f"Feature Toggles:")
        print(f"  - Reminders:     {cls.ENABLE_REMINDERS}")
        print(f"  - Previews:      {cls.ENABLE_PREVIEWS}")
        print(f"  - Follow-ups:    {cls.ENABLE_FOLLOWUPS}")
        print(f"  - AI Agent:      {cls.ENABLE_AI_AGENT}")
        print(f"\nRate Limits:")
        print(f"  - User/Day:      {cls.MAX_DAILY_USER_ACTIONS}")
        print(f"  - Global/Day:    {cls.MAX_DAILY_GLOBAL_ACTIONS}")
        print(f"\nSystem:")
        print(f"  - Log Level:     {cls.LOG_LEVEL}")
        print(f"  - Supabase:      {'Configured' if cls.SUPABASE_URL else 'Not configured'}")
        print(f"  - OpenAI:        {'Configured' if cls.OPENAI_API_KEY and 'your_api_key' not in cls.OPENAI_API_KEY else 'Not configured'}")
        print("=" * 80)
