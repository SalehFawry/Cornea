"""Alerts page: violations and alerts."""
import streamlit as st
import requests
import pandas as pd
import plotly.express as px
from datetime import datetime

from config import API_BASE, COLORS, DEFAULT_FILTER_DATE
from utils.helpers import _default_date_value, format_alert_type, apply_chart_black_text


def alerts_page():
    st.markdown('<div class="page-header"><h1>🚨 Alerts & Violations Dashboard</h1><p style="opacity: 0.9;">Monitor alerts and violations by type, branch, and date</p></div>', unsafe_allow_html=True)
    
    # Filters at the top
    st.markdown('<div class="filter-section">', unsafe_allow_html=True)
    st.markdown("### 🎯 Filters")
    
    # Filter row
    col1, col2, col3 = st.columns(3)
    
    with col1:
        # Region filter
        selected_region = None
        try:
            regions = requests.get(f"{API_BASE}alerts/regions").json()
            if regions:
                region_options = ["All"] + sorted(regions)
                selected_region_str = st.selectbox("🗺️ Region", options=region_options, index=0, key="alert_region")
                selected_region = None if selected_region_str == "All" else selected_region_str
        except Exception:
            selected_region = None

    with col2:
        # Area filter
        selected_area = None
        try:
            params_area = {}
            if selected_region:
                params_area["region"] = selected_region
            areas = requests.get(f"{API_BASE}alerts/areas", params=params_area).json()
            if areas:
                area_options = ["All"] + sorted(areas)
                selected_area_str = st.selectbox("📍 Area", options=area_options, index=0, key="alert_area")
                selected_area = None if selected_area_str == "All" else selected_area_str
        except Exception:
            selected_area = None

    with col3:
        # Branch Name filter
        branch_id = None
        try:
            params_branch = {}
            if selected_region:
                params_branch["region"] = selected_region
            if selected_area:
                params_branch["area"] = selected_area
            response = requests.get(f"{API_BASE}alerts/branch-names", params=params_branch)
            response.raise_for_status()  # Raise an exception for bad status codes
            
            # Check if response has content before parsing JSON
            if response.text.strip():
                branch_names_data = response.json()
            else:
                branch_names_data = []
            
            if branch_names_data:
                branch_options = ["All"] + [f"{b['Branch Name']} ({b['Branch ID']})" for b in branch_names_data]
                # Set default to "Wadi Elmlouk (1290)" if available
                default_branch_index = 0
                wadi_elmlouk_option = next((opt for opt in branch_options if "Wadi Elmlouk" in opt and "1290" in opt), None)
                if wadi_elmlouk_option:
                    default_branch_index = branch_options.index(wadi_elmlouk_option)
                selected_branch_str = st.selectbox(
                    "🏢 Branch Name",
                    options=branch_options,
                    index=default_branch_index,
                    key="alert_branch_name"
                )
                
                if selected_branch_str != "All":
                    # Extract branch ID from selection
                    branch_id = int(selected_branch_str.split("(")[1].split(")")[0])
            else:
                branch_options = ["All"]
                st.selectbox("🏢 Branch Name", options=branch_options, key="alert_branch_name")
        except requests.exceptions.RequestException as e:
            st.error(f"Error fetching branches: {e}")
            if hasattr(e, 'response') and e.response is not None:
                st.error(f"Response status: {e.response.status_code}")
                st.error(f"Response content: {e.response.text[:200]}")
            branch_id = None
            branch_options = ["All"]
            st.selectbox("🏢 Branch Name", options=branch_options, key="alert_branch_name")
        except Exception as e:
            st.error(f"Unexpected error fetching branches: {e}")
            branch_id = None
            branch_options = ["All"]
            st.selectbox("🏢 Branch Name", options=branch_options, key="alert_branch_name")
    
    col4 = st.columns(1)[0]
    with col4:
        # Date filter
        try:
            params = {}
            if branch_id:
                params["branch"] = branch_id
            response = requests.get(f"{API_BASE}alerts/dates", params=params)
            response.raise_for_status()  # Raise an exception for bad status codes
            
            # Check if response has content before parsing JSON
            if response.text.strip():
                dates_str = response.json()
                dates = [datetime.fromisoformat(d).date() if 'T' in d else datetime.strptime(d, '%Y-%m-%d').date() for d in dates_str]
                dates = sorted(set(dates))
            else:
                dates = []
        except requests.exceptions.RequestException as e:
            st.error(f"Error fetching dates: {e}")
            if hasattr(e, 'response') and e.response is not None:
                st.error(f"Response status: {e.response.status_code}")
                st.error(f"Response content: {e.response.text[:200]}")
            dates = []
        except Exception as e:
            st.error(f"Unexpected error fetching dates: {e}")
            dates = []
        
        # Date selection
        if dates:
            selected_date = st.date_input(
                "📅 Date",
                value=_default_date_value(dates, use_last=True),
                min_value=min(min(dates), DEFAULT_FILTER_DATE) if dates else None,
                max_value=max(max(dates), DEFAULT_FILTER_DATE) if dates else None,
                key="alert_date"
            )
        else:
            selected_date = st.date_input("📅 Date", value=DEFAULT_FILTER_DATE, key="alert_date")
    
    st.markdown('</div>', unsafe_allow_html=True)
    
    # Main content - Alert counts by type
    if selected_date:
        try:
            date_str = selected_date.isoformat()
            
            # Get alert data
            params = {"date": date_str}
            if branch_id:
                params["branch"] = branch_id
            
            alert_data = requests.get(
                f"{API_BASE}alerts/data",
                params=params
            ).json()
            
            if alert_data:
                # Create DataFrame from alert data
                df_alerts = pd.DataFrame(alert_data)
                
                # Create a formatted version for display
                df_alerts_display = df_alerts.copy()
                df_alerts_display['alert_type_formatted'] = df_alerts_display['alert_type'].apply(format_alert_type)
                
                # Display metrics
                st.markdown("### 📊 Alert Summary")
                
                # Create columns for metrics
                num_cols = len(df_alerts)
                if num_cols > 0:
                    cols = st.columns(min(num_cols, 4))
                    
                    for idx, row in df_alerts.iterrows():
                        col_idx = idx % 4
                        with cols[col_idx]:
                            formatted_type = format_alert_type(row['alert_type'])
                            st.metric(
                                label=f"🚨 {formatted_type}",
                                value=row['count']
                            )
                    
                    # Display bar chart
                    st.markdown("### 📈 Alert Counts by Type")
                    fig = px.bar(
                        df_alerts_display,
                        x='alert_type_formatted',
                        y='count',
                        title='Number of Alerts by Type',
                        labels={'alert_type_formatted': 'Alert Type', 'count': 'Count'},
                        color='count',
                        color_continuous_scale=COLORS['gradient1']
                    )
                    fig.update_layout(
                        xaxis_title="Alert Type",
                        yaxis_title="Number of Alerts",
                        showlegend=False,
                        height=400
                    )
                    apply_chart_black_text(fig)
                    st.plotly_chart(fig, use_container_width=True)
                    
                    # Display data table with formatted alert types
                    st.markdown("### 📋 Alert Details")
                    df_display_table = df_alerts_display[['alert_type_formatted', 'count']].copy()
                    df_display_table.columns = ['Alert Type', 'Count']
                    st.dataframe(df_display_table, use_container_width=True)
                    
                    # Generate Reports Section
                    st.markdown("---")
                    st.markdown("### 📥 Generate Reports")
                    
                    try:
                        # Create alert report with relevant information
                        df_alert_report = df_alerts_display.copy()
                        
                        # Add date and branch information to the report
                        df_alert_report['Date'] = selected_date.strftime('%Y-%m-%d')
                        if branch_id:
                            df_alert_report['Branch ID'] = branch_id
                            # Get branch name
                            branch_name = None
                            try:
                                branch_names_data = requests.get(f"{API_BASE}alerts/branch-names").json()
                                if branch_names_data:
                                    for b in branch_names_data:
                                        if b['Branch ID'] == branch_id:
                                            branch_name = b['Branch Name']
                                            break
                            except:
                                pass
                            df_alert_report['Branch Name'] = branch_name if branch_name else f"Branch {branch_id}"
                        else:
                            df_alert_report['Branch ID'] = "All Branches"
                            df_alert_report['Branch Name'] = "All Branches"
                        
                        # Reorder columns for better readability
                        report_columns = ['Date', 'Branch ID', 'Branch Name', 'alert_type_formatted', 'count']
                        df_alert_report = df_alert_report[report_columns].copy()
                        
                        # Rename columns for the report
                        column_mapping = {
                            'alert_type_formatted': 'Alert Type',
                            'count': 'Count'
                        }
                        df_alert_report = df_alert_report.rename(columns=column_mapping)
                        
                        # Sort by alert type
                        df_alert_report = df_alert_report.sort_values('Alert Type')
                        
                        # Generate CSV
                        csv_alert = df_alert_report.to_csv(index=False)
                        
                        # Build filename with filter information
                        branch_suffix = f"_Branch_{branch_id}" if branch_id else "_All_Branches"
                        file_name = f"alerts_report_{selected_date}{branch_suffix}.csv"
                        
                        st.download_button(
                            label="📄 Alerts Report",
                            data=csv_alert,
                            file_name=file_name,
                            mime="text/csv",
                            key="alerts_report"
                        )
                    except Exception as e:
                        st.error(f"Error generating report: {e}")
                        st.download_button(
                            label="📄 Alerts Report",
                            data="",
                            file_name="alerts_report.csv",
                            mime="text/csv",
                            key="alerts_report",
                            disabled=True
                        )
                else:
                    st.warning("No alert data available for the selected date and branch.")
            else:
                st.info("No alerts found for the selected date and branch.")
        except Exception as e:
            st.error(f"Error fetching alert data: {e}")
    else:
        st.info("Please select a date to view alerts.")
