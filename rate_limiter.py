import os
from datetime import datetime, timedelta
from typing import Optional, Dict
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

class RateLimiter:
    """
    Rate limiter for controlling API usage and preventing token waste.
    Implements both per-user and global rate limits.
    """
    
    def __init__(self, supabase_client: Optional[Client] = None):
        self.supabase = supabase_client or create_client(SUPABASE_URL, SUPABASE_KEY)
        self.max_user_actions = int(os.getenv("MAX_DAILY_USER_ACTIONS", "10"))
        self.max_global_actions = int(os.getenv("MAX_DAILY_GLOBAL_ACTIONS", "100"))
    
    def _get_today_start(self) -> str:
        """Get the start of today in ISO format"""
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        return today.isoformat()
    
    def _ensure_rate_limits_table(self) -> bool:
        """Ensure the rate_limits table exists"""
        try:
            self.supabase.table("rate_limits").select("*").limit(1).execute()
            return True
        except Exception:
            return False
    
    def check_user_limit(self, user_id: str, action_type: str) -> Dict[str, any]:
        """
        Check if user has exceeded their daily limit.
        
        Args:
            user_id: User identifier
            action_type: Type of action being performed
            
        Returns:
            Dict with 'allowed' (bool), 'remaining' (int), and 'message' (str)
        """
        try:
            today_start = self._get_today_start()
            
            result = self.supabase.table("rate_limits")\
                .select("*")\
                .eq("user_id", user_id)\
                .eq("action_type", action_type)\
                .gte("created_at", today_start)\
                .execute()
            
            current_count = len(result.data) if result.data else 0
            remaining = max(0, self.max_user_actions - current_count)
            
            if current_count >= self.max_user_actions:
                return {
                    "allowed": False,
                    "remaining": 0,
                    "message": f"Daily limit of {self.max_user_actions} actions exceeded for user {user_id}"
                }
            
            return {
                "allowed": True,
                "remaining": remaining,
                "message": f"{remaining} actions remaining today"
            }
            
        except Exception as e:
            return {
                "allowed": True,
                "remaining": self.max_user_actions,
                "message": f"Rate limit check failed (allowing action): {str(e)}"
            }
    
    def check_global_limit(self, action_type: str) -> Dict[str, any]:
        """
        Check if global daily limit has been exceeded.
        
        Args:
            action_type: Type of action being performed
            
        Returns:
            Dict with 'allowed' (bool), 'remaining' (int), and 'message' (str)
        """
        try:
            today_start = self._get_today_start()
            
            result = self.supabase.table("rate_limits")\
                .select("*")\
                .eq("action_type", action_type)\
                .gte("created_at", today_start)\
                .execute()
            
            current_count = len(result.data) if result.data else 0
            remaining = max(0, self.max_global_actions - current_count)
            
            if current_count >= self.max_global_actions:
                return {
                    "allowed": False,
                    "remaining": 0,
                    "message": f"Global daily limit of {self.max_global_actions} actions exceeded"
                }
            
            return {
                "allowed": True,
                "remaining": remaining,
                "message": f"{remaining} global actions remaining today"
            }
            
        except Exception as e:
            return {
                "allowed": True,
                "remaining": self.max_global_actions,
                "message": f"Global rate limit check failed (allowing action): {str(e)}"
            }
    
    def record_action(self, user_id: str, action_type: str, metadata: Optional[Dict] = None) -> bool:
        """
        Record an action in the rate limits table.
        
        Args:
            user_id: User identifier
            action_type: Type of action performed
            metadata: Optional metadata about the action
            
        Returns:
            True if recorded successfully, False otherwise
        """
        try:
            self.supabase.table("rate_limits").insert({
                "user_id": user_id,
                "action_type": action_type,
                "metadata": metadata or {}
            }).execute()
            
            return True
            
        except Exception as e:
            return False
    
    def is_action_allowed(self, user_id: str, action_type: str) -> Dict[str, any]:
        """
        Check if an action is allowed based on both user and global limits.
        
        Args:
            user_id: User identifier
            action_type: Type of action to check
            
        Returns:
            Dict with 'allowed' (bool), 'reason' (str), and limits info
        """
        try:
            user_check = self.check_user_limit(user_id, action_type)
            if not user_check["allowed"]:
                return {
                    "allowed": False,
                    "reason": "user_limit_exceeded",
                    "message": user_check["message"],
                    "user_remaining": 0,
                    "global_remaining": None
                }
            
            global_check = self.check_global_limit(action_type)
            if not global_check["allowed"]:
                return {
                    "allowed": False,
                    "reason": "global_limit_exceeded",
                    "message": global_check["message"],
                    "user_remaining": user_check["remaining"],
                    "global_remaining": 0
                }
            
            return {
                "allowed": True,
                "reason": "within_limits",
                "message": "Action allowed",
                "user_remaining": user_check["remaining"],
                "global_remaining": global_check["remaining"]
            }
            
        except Exception as e:
            return {
                "allowed": True,
                "reason": "check_failed",
                "message": f"Rate limit check failed, allowing action: {str(e)}",
                "user_remaining": None,
                "global_remaining": None
            }
    
    def cleanup_old_records(self, days_to_keep: int = 7) -> int:
        """
        Clean up old rate limit records.
        
        Args:
            days_to_keep: Number of days of records to keep
            
        Returns:
            Number of records deleted
        """
        try:
            cutoff_date = (datetime.now() - timedelta(days=days_to_keep)).isoformat()
            
            result = self.supabase.table("rate_limits")\
                .delete()\
                .lt("created_at", cutoff_date)\
                .execute()
            
            return len(result.data) if result.data else 0
            
        except Exception as e:
            return 0
