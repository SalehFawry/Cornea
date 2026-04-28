"""
Application configuration: API base URL, default dates, and branding constants.
"""
import os
from datetime import date

# Default date for all date filters across pages (current day)
DEFAULT_FILTER_DATE = date.today()

# API base URL (normalized: no trailing slash, then we add one when building URLs)
API_BASE = os.getenv("API_BASE_URL", "http://127.0.0.1:8000")
API_BASE = API_BASE.rstrip("/")
if not API_BASE.endswith("/"):
    API_BASE = f"{API_BASE}/"

# Fawry Plus brand color palette
COLORS = {
    "primary": "#0066CC",       # Fawry Blue
    "secondary": "#FFD700",     # Fawry Yellow
    "accent": "#800020",        # Fawry Maroon
    "success": "#10b981",
    "warning": "#f59e0b",
    "danger": "#ef4444",
    "info": "#0066CC",
    "gradient1": ["#0066CC", "#FFD700"],
    "gradient2": ["#FFD700", "#800020"],
    "gradient3": ["#0066CC", "#800020"],
    "gradient4": ["#E6F2FF", "#FFE44D"],
}


LOGO_PATHS = [
    "images/fawry_logo.png",
]
