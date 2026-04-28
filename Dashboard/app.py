"""
Fawry Plus Dashboard - Main entry point.
Run with: streamlit run app.py
"""
import streamlit as st
import requests

from config import API_BASE
from styles import CUSTOM_CSS
from components.sidebar import render_sidebar
from views.employees import employees_page
from views.shutter_state import shutter_state_page
from views.customers import customers_page
from views.alerts import alerts_page

# Inject custom CSS
st.markdown(CUSTOM_CSS, unsafe_allow_html=True)

st.set_page_config(
    page_title="Fawry Plus Dashboard",
    layout="wide",
    initial_sidebar_state="expanded",
    page_icon="🏦",
)

# Initialize session state for page navigation
if "current_page" not in st.session_state:
    st.session_state.current_page = "👥 Employees"

# API connection check (run once on startup)
if "api_checked" not in st.session_state:
    st.session_state.api_checked = True
    try:
        test_url = f"{API_BASE}employees/governorates"
        response = requests.get(test_url, timeout=2)
        if response.status_code == 200:
            st.session_state.api_working = True
        else:
            st.session_state.api_working = False
            st.error(f"⚠️ API returned status {response.status_code}. Check if API server is running.")
    except requests.exceptions.ConnectionError:
        st.session_state.api_working = False
        st.error(f"❌ Cannot connect to API at {API_BASE}. Make sure the API server is running on port 8000.")
    except Exception as e:
        st.session_state.api_working = False
        st.error(f"❌ API Error: {e}")

# Page registry
pages = {
    "👥 Employees": employees_page,
    "🚪 Shutter State": shutter_state_page,
    "🛒 Customers": customers_page,
    "🚨 Alerts": alerts_page,
}

# Sidebar: logo, navigation, info
render_sidebar(pages)

# Main content: run the selected page
pages[st.session_state.current_page]()
