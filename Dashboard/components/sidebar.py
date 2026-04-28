"""
Sidebar component: logo, navigation, and dashboard info.
"""
import os
import streamlit as st

from config import API_BASE, LOGO_PATHS


def render_sidebar(pages):
    """
    Render the app sidebar with logo, navigation buttons, and info.
    pages: dict mapping page label to page function (e.g. {"👥 Employees": employees_page, ...})
    """
    with st.sidebar:
        st.markdown('<div class="logo-container">', unsafe_allow_html=True)

        logo_found = False
        for logo_path in LOGO_PATHS:
            if os.path.exists(logo_path):
                try:
                    st.image(logo_path, width=150)
                    logo_found = True
                    break
                except Exception:
                    continue

        if not logo_found:
            st.markdown("""
            <div style="background: linear-gradient(135deg, #0066CC 0%, #FFD700 100%); 
                        padding: 1rem; border-radius: 10px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 1.5rem; font-weight: bold;">
                    fawry<span style="font-family: 'Brush Script MT', cursive; color: #800020;">Plus</span>
                </h1>
                <p style="color: white; margin-top: 0.5rem; font-size: 0.8rem;">Branch Analytics Dashboard</p>
            </div>
            """, unsafe_allow_html=True)

        st.markdown("</div>", unsafe_allow_html=True)
        st.markdown("### 🧭 Navigation")
        st.markdown("---")

        for page_name, page_func in pages.items():
            if st.button(
                page_name,
                use_container_width=True,
                type="primary" if st.session_state.current_page == page_name else "secondary",
                key=f"sidebar_nav_{page_name}",
            ):
                st.session_state.current_page = page_name
                st.rerun()

        st.markdown("---")
        st.markdown("### ℹ️ Dashboard Info")
        st.info("""
        **Fawry Plus Analytics**

        Monitor branch operations:
        - Employee attendance
        - Shutter states
        - Customer analytics
        - Alerts & violations
        """)
        st.markdown("---")
