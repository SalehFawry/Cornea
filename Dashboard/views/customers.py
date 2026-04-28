"""Customers page: flow, waiting times, service metrics."""
import streamlit as st
import requests
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime

from config import API_BASE, COLORS, DEFAULT_FILTER_DATE
from utils.helpers import _default_date_value, apply_chart_black_text


def customers_page():
    st.markdown('<div class="page-header"><h1>🛒 Customer Analytics Dashboard</h1><p style="opacity: 0.9;">Analyze customer flow, waiting times, and service metrics</p></div>', unsafe_allow_html=True)
    
    # Filters at the top (moved from sidebar)
    st.markdown('<div class="filter-section">', unsafe_allow_html=True)
    st.markdown("### 🎯 Filters")
    
    # First row of filters
    col1, col2, col3, col4, col5 = st.columns(5)
    
    with col1:
        # 1. Region filter
        selected_region = None
        try:
            regions = requests.get(f"{API_BASE}customers/regions").json()
            if regions:
                region_options = ["All"] + sorted(regions)
                selected_region_str = st.selectbox("🗺️ Region", options=region_options, index=0, key="cust_region")
                selected_region = None if selected_region_str == "All" else selected_region_str
        except Exception:
            selected_region = None
    
    with col2:
        # 2. Area filter
        selected_area = None
        try:
            params_area = {}
            if selected_region:
                params_area["region"] = selected_region
            areas = requests.get(f"{API_BASE}customers/areas", params=params_area).json()
            if areas:
                area_options = ["All"] + sorted(areas)
                selected_area_str = st.selectbox("📍 Area", options=area_options, index=0, key="cust_area")
                selected_area = None if selected_area_str == "All" else selected_area_str
        except Exception:
            selected_area = None

    with col3:
        # 3. Branch Name filter
        branch_id = None
        try:
            params = {}
            if selected_region:
                params["region"] = selected_region
            if selected_area:
                params["area"] = selected_area
            response = requests.get(f"{API_BASE}customers/branch-names", params=params)
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
                    key="cust_branch_name"
                )
                
                if selected_branch_str != "All":
                    # Extract branch ID from selection
                    branch_id = int(selected_branch_str.split("(")[1].split(")")[0])
            else:
                branch_options = ["All"]
                st.selectbox("🏢 Branch Name", options=branch_options, key="cust_branch_name")
        except requests.exceptions.RequestException as e:
            st.error(f"Error fetching branches: {e}")
            if hasattr(e, 'response') and e.response is not None:
                st.error(f"Response status: {e.response.status_code}")
                st.error(f"Response content: {e.response.text[:200]}")
            branch_id = None
            branch_options = ["All"]
            st.selectbox("🏢 Branch Name", options=branch_options, key="cust_branch_name")
        except Exception as e:
            st.error(f"Unexpected error fetching branches: {e}")
            branch_id = None
            branch_options = ["All"]
            st.selectbox("🏢 Branch Name", options=branch_options, key="cust_branch_name")
    
    with col4:
        # 4. Graphs Interval filter
        graph_interval = st.selectbox(
            "📊 Graphs Interval",
            options=["All", "Daily", "Weekly", "Monthly"],
            index=1,  # Default to "Daily"
            key="cust_graph_interval"
        )
    
    with col5:
        # 5. View mode filter: Hourly or Daily
        view_mode = st.radio(
            "📊 View Mode",
            ["Daily", "Hourly"],
            index=0,  # Default to "Daily"
            key="cust_view_mode",
            horizontal=True
        )
    
    # Second row of filters
    col5, col6 = st.columns(2)
    
    with col5:
        # Get dates for selected branch
        try:
            params = {}
            if branch_id:
                params["branch"] = branch_id
            if selected_region:
                params["region"] = selected_region
            if selected_area:
                params["area"] = selected_area
            response = requests.get(f"{API_BASE}customers/dates", params=params)
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
        
        # Date range selection
        if dates:
            start_date = st.date_input(
                "📅 Start Date",
                value=_default_date_value(dates),
                min_value=min(min(dates), DEFAULT_FILTER_DATE) if dates else None,
                max_value=max(max(dates), DEFAULT_FILTER_DATE) if dates else None,
                key="cust_start_date"
            )
            
            # Track previous start_date to detect changes and update end_date accordingly
            if 'cust_prev_start_date' not in st.session_state:
                st.session_state.cust_prev_start_date = start_date
                # On first load, set end_date to start_date
                if start_date:
                    st.session_state.cust_end_date = start_date
            elif st.session_state.cust_prev_start_date != start_date:
                # Start date changed, reset end_date to start_date
                st.session_state.cust_prev_start_date = start_date
                if start_date:
                    st.session_state.cust_end_date = start_date
        else:
            start_date = None
            
    with col6:
        if dates:
            # Default end_date to start_date if start_date is selected, otherwise use default date or last available
            default_end_date = start_date if start_date else _default_date_value(dates, use_last=True)
            end_date = st.date_input(
                "📅 End Date",
                value=default_end_date,
                min_value=start_date if start_date else (min(min(dates), DEFAULT_FILTER_DATE) if dates else None),
                max_value=max(max(dates), DEFAULT_FILTER_DATE) if dates else None,
                key="cust_end_date"
            )
        else:
            end_date = None
    
    st.markdown('</div>', unsafe_allow_html=True)
    
    # Main content - Charts based on date interval
    if start_date and end_date:
        try:
            start_str = start_date.isoformat()
            end_str = end_date.isoformat()
            
            # Get data for the date range
            params = {"start_date": start_str, "end_date": end_str}
            if branch_id:
                params["branch"] = branch_id
            if selected_region:
                params["region"] = selected_region
            if selected_area:
                params["area"] = selected_area
            
            try:
                response = requests.get(
                    f"{API_BASE}customers/data",
                    params=params
                )
                response.raise_for_status()  # Raise an exception for bad status codes
                
                # Check if response has content before parsing JSON
                if response.text.strip():
                    data = response.json()
                else:
                    data = []
            except requests.exceptions.RequestException as e:
                st.error(f"Error fetching customer data: {e}")
                if hasattr(e, 'response') and e.response is not None:
                    st.error(f"Response status: {e.response.status_code}")
                    st.error(f"Response content: {e.response.text[:200]}")
                data = []
            except Exception as e:
                st.error(f"Unexpected error fetching customer data: {e}")
                data = []
            
            if data:
                df = pd.DataFrame(data)
                df["Date"] = pd.to_datetime(df["Date"], format="mixed", errors="coerce").dt.date
                
                # Exclude customers with (service time = 0 & waiting time <= 0.0166 hours) 
                # or (waiting time = 0 & service time <= 0.0166 hours)
                # Note: API converts hours to minutes, so 0.0166 hours = 0.0166 * 60 = 0.996 minutes
                if "waiting time" in df.columns and "service time" in df.columns:
                    # Convert 0.0166 hours to minutes: 0.0166 * 60 = 0.996
                    threshold_minutes = 0.0166 * 60
                    # Exclude: (service = 0 AND waiting <= 0.996) OR (waiting = 0 AND service <= 0.996)
                    # Handle NaN values: treat NaN as 0 for the equality check, but require valid value for <= comparison
                    exclude_mask = (
                        ((df["service time"] == 0) | (df["service time"].isna())) & 
                        (df["waiting time"].notna()) & 
                        (df["waiting time"] <= threshold_minutes)
                    ) | (
                        ((df["waiting time"] == 0) | (df["waiting time"].isna())) & 
                        (df["service time"].notna()) & 
                        (df["service time"] <= threshold_minutes)
                    )
                    df = df[~exclude_mask].copy()
                
                # Exclude customers where (service end time - visit start time) > 3 hours
                if "visit start time" in df.columns and "service end time" in df.columns:
                    try:
                        visit_start = pd.to_datetime(df["visit start time"], format="mixed", errors="coerce")
                        service_end = pd.to_datetime(df["service end time"], format="mixed", errors="coerce")
                        duration_hours = (service_end - visit_start).dt.total_seconds() / 3600
                        df = df[(duration_hours.isna()) | (duration_hours <= 3)].copy()
                    except Exception:
                        pass
                
                # Calculate KPI metrics
                total_customers = df["customer ID"].nunique() if "customer ID" in df.columns else len(df)
                unique_branches = df["Branch ID"].nunique() if "Branch ID" in df.columns else 0
                # Calculate average waiting time excluding records where waiting_time < 1 minute (or = 0 or is null)
                # Since API converts hours to minutes, 1 minute = 1 in the dataframe
                if "waiting time" in df.columns:
                    df_waiting_filtered = df[(df["waiting time"] >= 1) & (df["waiting time"].notna())]
                    avg_waiting = df_waiting_filtered["waiting time"].mean() if len(df_waiting_filtered) > 0 else 0
                else:
                    avg_waiting = 0
                # Calculate average service time excluding records where service_time < 1 minute (or = 0 or is null)
                # Since API converts hours to minutes, 1 minute = 1 in the dataframe
                if "service time" in df.columns:
                    df_service_filtered = df[(df["service time"] >= 1) & (df["service time"].notna())]
                    avg_service = df_service_filtered["service time"].mean() if len(df_service_filtered) > 0 else 0
                    max_service_raw = df["service time"].max()
                    max_service = float(max_service_raw) if pd.notna(max_service_raw) and max_service_raw > 0 else 0
                else:
                    avg_service = 0
                    max_service = 0
                
                # Get Active Counters/Employees: count unique employees from attendance_table for selected date(s)
                active_employees = 0
                try:
                    # Use same filters as customer data
                    emp_params = {"start_date": start_str, "end_date": end_str}
                    if branch_id:
                        emp_params["branch"] = branch_id
                    if selected_region:
                        emp_params["region"] = selected_region
                    if selected_area:
                        emp_params["area"] = selected_area
                    
                    emp_response = requests.get(f"{API_BASE}employees/data", params=emp_params)
                    emp_response.raise_for_status()
                    if emp_response.text.strip():
                        emp_data = emp_response.json()
                    else:
                        emp_data = []
                    if emp_data:
                        df_employees = pd.DataFrame(emp_data)
                        if "Employee ID" in df_employees.columns:
                            # Count unique employees across all selected dates (excluding employee ID 0 - security man)
                            df_employees_filtered = df_employees[df_employees["Employee ID"] != 0]
                            active_employees = df_employees_filtered["Employee ID"].nunique()
                except Exception as e:
                    # If employee data fetch fails, fall back to 0
                    active_employees = 0
                
                # Calculate Conversion Rate based on selected filters
                conversion_rate = 0
                customers_with_waiting = 0
                customers_with_service = 0
                waiting_only_customers = 0
                served_customers = 0
                total_customers_entered = 0
                if "waiting time" in df.columns and "service time" in df.columns:
                    # Count waiting-only customers (waiting > 0 but service = 0 or null)
                    waiting_only_customers = len(df[(df["waiting time"] > 0) & ((df["service time"] == 0) | (df["service time"].isna()))])
                    # Count served customers (service time > 0)
                    served_customers = len(df[df["service time"] > 0])
                    # Total customers who entered = waiting only + served
                    # This represents all customers who either waited or were served
                    total_customers_entered = waiting_only_customers + served_customers
                    # Calculate conversion rate: Served / Total who entered
                    if total_customers_entered > 0:
                        conversion_rate = (served_customers / total_customers_entered) * 100
                    # Keep old variables for backward compatibility (if used elsewhere)
                    customers_with_waiting = len(df[df["waiting time"] > 0])
                    customers_with_service = served_customers
                
                # Display KPI Cards
                kpi_col1, kpi_col2, kpi_col3, kpi_col4, kpi_col5, kpi_col6 = st.columns(6)
                
                with kpi_col1:
                    st.metric("Current Occupancy", f"{total_customers} Customers")
                
                with kpi_col2:
                    st.metric("Active Counters/Employees", active_employees)
                
                with kpi_col3:
                    if avg_waiting > 0:
                        # Waiting time is in minutes (converted from hours by API)
                        waiting_min = int(avg_waiting)
                        waiting_sec = int(round((avg_waiting - waiting_min) * 60))
                        if waiting_sec > 0:
                            st.metric("Avg Waiting Time", f"{waiting_min}m {waiting_sec}s")
                        else:
                            st.metric("Avg Waiting Time", f"{waiting_min} minutes")
                    else:
                        st.metric("Avg Waiting Time", "N/A")
                
                with kpi_col4:
                    if avg_service > 0:
                        # Service time is in minutes (converted from hours by API)
                        service_min = int(avg_service)
                        service_sec = int(round((avg_service - service_min) * 60))
                        if service_sec > 0:
                            st.metric("Avg Service Time", f"{service_min}m {service_sec}s")
                        else:
                            st.metric("Avg Service Time", f"{service_min} minutes")
                    else:
                        st.metric("Avg Service Time", "N/A")
                
                with kpi_col5:
                    if max_service > 0:
                        max_service_min = int(max_service)
                        max_service_sec = int(round((max_service - max_service_min) * 60))
                        if max_service_sec > 0:
                            st.metric("Max Service Time", f"{max_service_min}m {max_service_sec}s")
                        else:
                            st.metric("Max Service Time", f"{max_service_min} minutes")
                    else:
                        st.metric("Max Service Time", "N/A")
                
                with kpi_col6:
                    # Display conversion rate with waiting-only and served customer counts
                    st.metric(
                        "Conversion Rate", 
                        f"{conversion_rate:.1f}%",
                        help=f"Waiting Only: {waiting_only_customers} customers | Served: {served_customers} customers"
                    )
                    # Show detailed breakdown below the metric
                    st.markdown(f"<small>⏳ Waiting Only: {waiting_only_customers}<br>✅ Served: {served_customers}</small>", unsafe_allow_html=True)
                
                # Branch Idle Time (only for single date in Daily view with specific branch selected)
                if view_mode == "Daily" and start_date == end_date and branch_id:
                    try:
                        date_str = start_date.isoformat() if hasattr(start_date, 'isoformat') else str(start_date)
                        idle_response = requests.get(
                            f"{API_BASE}customers/idle-time",
                            params={"branch": branch_id, "date": date_str}
                        )
                        if idle_response.status_code == 200:
                            idle_data = idle_response.json()
                            
                            st.markdown("### ⏸️ Branch Idle Time (9:00 AM - 2:00 AM next day)")
                            
                            # Display idle time metrics - make total idle time prominent
                            idle_col1, idle_col2, idle_col3 = st.columns(3)
                            with idle_col1:
                                idle_hours = int(idle_data.get("total_idle_minutes", 0) // 60)
                                idle_mins = int(idle_data.get("total_idle_minutes", 0) % 60)
                                st.metric("**Total Idle Time**", f"{idle_hours}h {idle_mins:02d}m", help="Total time with no customers present (9 AM - 2 AM next day)")
                            
                            with idle_col2:
                                active_hours = int(idle_data.get("total_active_minutes", 0) // 60)
                                active_mins = int(idle_data.get("total_active_minutes", 0) % 60)
                                st.metric("Total Active Time", f"{active_hours}h {active_mins:02d}m")
                            
                            with idle_col3:
                                total_minutes = idle_data.get("total_idle_minutes", 0) + idle_data.get("total_active_minutes", 0)
                                if total_minutes > 0:
                                    idle_percentage = (idle_data.get("total_idle_minutes", 0) / total_minutes) * 100
                                    st.metric("Idle Percentage", f"{idle_percentage:.1f}%")
                                else:
                                    st.metric("Idle Percentage", "N/A")
                            
                            # Timeline visualization
                            timeline_segments = idle_data.get("timeline_segments", [])
                            if timeline_segments:
                                st.markdown("#### 📊 Idle Time Timeline")
                                
                                fig_timeline = go.Figure()
                                
                                # Colors for idle and active periods
                                idle_color = COLORS['danger']  # Red for idle
                                active_color = COLORS['success']  # Green for active
                                
                                # Group segments by type
                                idle_segments = [s for s in timeline_segments if s.get("type") == "idle"]
                                active_segments = [s for s in timeline_segments if s.get("type") == "active"]
                                
                                # Add idle segments
                                if idle_segments:
                                    x_starts = [s["start_minutes"] for s in idle_segments]
                                    x_widths = [s["end_minutes"] - s["start_minutes"] for s in idle_segments]
                                    
                                    fig_timeline.add_trace(go.Bar(
                                        x=x_widths,
                                        y=[0] * len(idle_segments),
                                        base=x_starts,
                                        orientation='h',
                                        name='Idle (No Customers)',
                                        marker=dict(
                                            color=idle_color,
                                            line=dict(color='white', width=1)
                                        ),
                                        text=[f"{s['start_time'][:5]}" for s in idle_segments],
                                        textposition='inside',
                                        textfont=dict(size=9, color='white'),
                                        customdata=[f'<b>Idle Period</b><br>From: {s["start_time"]}<br>To: {s["end_time"]}<br>Duration: {(s["end_minutes"]-s["start_minutes"])//60}h {(s["end_minutes"]-s["start_minutes"])%60:02d}m' for s in idle_segments],
                                        hovertemplate='%{customdata}<extra></extra>',
                                        showlegend=True
                                    ))
                                
                                # Add active segments
                                if active_segments:
                                    x_starts = [s["start_minutes"] for s in active_segments]
                                    x_widths = [s["end_minutes"] - s["start_minutes"] for s in active_segments]
                                    
                                    fig_timeline.add_trace(go.Bar(
                                        x=x_widths,
                                        y=[0] * len(active_segments),
                                        base=x_starts,
                                        orientation='h',
                                        name='Active (Customers Present)',
                                        marker=dict(
                                            color=active_color,
                                            line=dict(color='white', width=1)
                                        ),
                                        text=[f"{s['start_time'][:5]}" for s in active_segments],
                                        textposition='inside',
                                        textfont=dict(size=9, color='white'),
                                        customdata=[f'<b>Active Period</b><br>From: {s["start_time"]}<br>To: {s["end_time"]}<br>Duration: {(s["end_minutes"]-s["start_minutes"])//60}h {(s["end_minutes"]-s["start_minutes"])%60:02d}m' for s in active_segments],
                                        hovertemplate='%{customdata}<extra></extra>',
                                        showlegend=True
                                    ))
                                
                                branch_display = f"Branch {branch_id}" if branch_id else "All Branches"
                                selected_date_str = start_date.strftime('%Y-%m-%d') if hasattr(start_date, 'strftime') else str(start_date)
                                
                                # Calculate total idle time for title
                                total_idle_mins = idle_data.get("total_idle_minutes", 0)
                                idle_hours_title = int(total_idle_mins // 60)
                                idle_mins_title = int(total_idle_mins % 60)
                                
                                fig_timeline.update_layout(
                                    title=f"Branch Idle Time Timeline - {selected_date_str} ({branch_display})<br><sub>Total Idle Time: {idle_hours_title}h {idle_mins_title:02d}m | Red = Idle (No Customers), Green = Active (Customers Present)</sub>",
                                    xaxis=dict(
                                        title="Time of Day (9:00 AM - 2:00 AM next day)",
                                        tickmode='array',
                                        tickvals=[0, 180, 360, 540, 720, 900, 1020],
                                        ticktext=["09:00", "12:00", "15:00", "18:00", "21:00", "00:00", "02:00"],
                                        range=[0, 1020]
                                    ),
                                    yaxis=dict(
                                        title="",
                                        tickvals=[0],
                                        ticktext=[""],
                                        range=[-0.5, 0.5]
                                    ),
                                    plot_bgcolor='white',
                                    paper_bgcolor='white',
                                    height=200,
                                    showlegend=True,
                                    legend=dict(
                                        orientation="h",
                                        yanchor="bottom",
                                        y=1.02,
                                        xanchor="right",
                                        x=1
                                    ),
                                    barmode='overlay',
                                    hovermode='closest'
                                )
                                apply_chart_black_text(fig_timeline)
                                st.plotly_chart(fig_timeline, use_container_width=True)
                            else:
                                st.info("No timeline data available for the selected date.")
                    except Exception as e:
                        # Silently fail if idle time API is not available or has errors
                        pass
                
                # Chart 1: Number of customers (Daily or Hourly)
                if view_mode == "Hourly":
                    st.markdown("### 📊 Number of Customers Per Hour")
                    
                    # Extract hour from visit start time
                    if "visit start time" in df.columns:
                        df["Hour"] = pd.to_datetime(df["visit start time"], format="mixed", errors="coerce").dt.hour
                        
                        # Count customers per hour across ALL branches and ALL dates
                        # When "All" branches selected, aggregate across all branches
                        # When multiple dates selected, aggregate across all dates
                        # When "All" branches selected, aggregate across all branches
                        # When multiple dates selected, aggregate across all dates
                        if "customer ID" in df.columns:
                            # Count total number of customer visits per hour (not unique, to aggregate across dates)
                            # This counts each visit, so if same customer visits multiple days, they're counted multiple times
                            df_hourly_customers = df.groupby("Hour").size().reset_index(name="customer ID")
                        else:
                            # Fallback: count rows per hour
                            df_hourly_customers = df.groupby("Hour").size().reset_index(name="customer ID")
                        
                        df_hourly_customers = df_hourly_customers.sort_values("Hour")
                        
                        # Ensure all hours 0-23 are represented (fill missing hours with 0)
                        all_hours = pd.DataFrame({"Hour": range(24)})
                        df_hourly_customers = all_hours.merge(df_hourly_customers, on="Hour", how="left").fillna(0)
                        df_hourly_customers["customer ID"] = df_hourly_customers["customer ID"].astype(int)
                        df_hourly_customers = df_hourly_customers.sort_values("Hour")
                        
                        branch_display = f"Branch {branch_id}" if branch_id else "All Branches"
                        date_display = f"{start_date} to {end_date}" if start_date != end_date else str(start_date)
                        fig_bar = px.bar(
                            df_hourly_customers,
                            x="Hour",
                            y="customer ID",
                            title=f"Number of Customers per Hour ({branch_display}) - {date_display}",
                            color="customer ID",
                            color_continuous_scale=COLORS['gradient2'],
                            labels={"customer ID": "Number of Customers", "Hour": "Hour of Day"}
                        )
                        fig_bar.update_layout(
                            plot_bgcolor='white',
                            paper_bgcolor='white',
                            height=400,
                            xaxis=dict(tickmode='linear', dtick=1, title="Hour (0-23)")
                        )
                        apply_chart_black_text(fig_bar)
                        st.plotly_chart(fig_bar, use_container_width=True)
                    else:
                        st.warning("Visit start time data not available for hourly view")
                else:
                    # Daily view
                    st.markdown("### 📊 Number of Customers Across Days")
                    col_chart, col_summary = st.columns([2, 1])
                    
                    with col_chart:
                        df_daily_customers = df.groupby("Date")["customer ID"].nunique().reset_index() if "customer ID" in df.columns else df.groupby("Date").size().reset_index(name="count")
                        df_daily_customers["Date"] = pd.to_datetime(df_daily_customers["Date"])
                        df_daily_customers = df_daily_customers.sort_values("Date")
                        
                        if "customer ID" in df.columns:
                            customer_col = "customer ID"
                        else:
                            customer_col = "count"
                            df_daily_customers.rename(columns={"count": "customer ID"}, inplace=True)
                        
                        branch_display = f"Branch {branch_id}" if branch_id else "All Branches"
                        fig_bar = px.bar(
                            df_daily_customers,
                            x="Date",
                            y="customer ID",
                            title=f"Number of Customers per Day ({branch_display})",
                            color="customer ID",
                            color_continuous_scale=COLORS['gradient2'],
                            labels={"customer ID": "Number of Customers", "Date": "Date"}
                        )
                        fig_bar.update_layout(
                            plot_bgcolor='white',
                            paper_bgcolor='white',
                            height=400,
                            xaxis=dict(tickformat="%Y-%m-%d", dtick=86400000.0)
                        )
                        apply_chart_black_text(fig_bar)
                        st.plotly_chart(fig_bar, use_container_width=True)
                
                    with col_summary:
                        st.markdown("### 📋 Summary by Branch")
                        # Create summary: number of customers per branch for each date
                        if "Branch ID" in df.columns and "customer ID" in df.columns:
                            # Group by Date and Branch ID to count unique customers
                            df_summary = df.groupby(["Date", "Branch ID"])["customer ID"].nunique().reset_index()
                            df_summary.columns = ["Date", "Branch ID", "Number of Customers"]
                            df_summary = df_summary.sort_values(["Date", "Branch ID"])
                            
                            # Pivot table: Date as index, Branch ID as columns
                            df_pivot = df_summary.pivot_table(
                                index="Date",
                                columns="Branch ID",
                                values="Number of Customers",
                                fill_value=0
                            )
                            df_pivot = df_pivot.reset_index()
                            df_pivot["Date"] = pd.to_datetime(df_pivot["Date"]).dt.date
                            
                            # Format column names
                            df_pivot.columns = [f"Branch {col}" if col != "Date" else "Date" for col in df_pivot.columns]
                            
                            # Display the summary table
                            st.dataframe(
                                df_pivot,
                                use_container_width=True,
                                hide_index=True
                            )
                        elif "Branch ID" in df.columns:
                            # If no customer ID column, count rows instead
                            df_summary = df.groupby(["Date", "Branch ID"]).size().reset_index(name="Number of Customers")
                            df_summary = df_summary.sort_values(["Date", "Branch ID"])
                            
                            # Pivot table
                            df_pivot = df_summary.pivot_table(
                                index="Date",
                                columns="Branch ID",
                                values="Number of Customers",
                                fill_value=0
                            )
                            df_pivot = df_pivot.reset_index()
                            df_pivot["Date"] = pd.to_datetime(df_pivot["Date"]).dt.date
                            
                            # Format column names
                            df_pivot.columns = [f"Branch {col}" if col != "Date" else "Date" for col in df_pivot.columns]
                            
                            st.dataframe(
                                df_pivot,
                                use_container_width=True,
                                hide_index=True
                            )
                        else:
                            st.info("Branch information not available in the data")
                
                # Generate Reports Section
                st.markdown("---")
                st.markdown("### 📥 Generate Reports")
                
                # Report: Number of customers across multiple days
                try:
                    # Create summary report with number of customers per day
                    if "customer ID" in df.columns and "Date" in df.columns:
                        df_customer_report = df.groupby("Date")["customer ID"].nunique().reset_index()
                        df_customer_report.columns = ["Date", "Number of Customers"]
                        df_customer_report = df_customer_report.sort_values("Date")
                        
                        # Add branch breakdown if available
                        if "Branch ID" in df.columns:
                            df_branch_report = df.groupby(["Date", "Branch ID"])["customer ID"].nunique().reset_index()
                            df_branch_report.columns = ["Date", "Branch ID", "Number of Customers"]
                            df_branch_report = df_branch_report.sort_values(["Date", "Branch ID"])
                            
                            # Merge with branch names if available
                            if "Branch Name" in df.columns:
                                branch_names_map = df[["Branch ID", "Branch Name"]].drop_duplicates().set_index("Branch ID")["Branch Name"].to_dict()
                                df_branch_report["Branch Name"] = df_branch_report["Branch ID"].map(branch_names_map)
                                df_branch_report = df_branch_report[["Date", "Branch ID", "Branch Name", "Number of Customers"]]
                            
                            csv_customers = df_branch_report.to_csv(index=False)
                        else:
                            csv_customers = df_customer_report.to_csv(index=False)
                        
                        st.download_button(
                            label="📄 Number of Customers Report",
                            data=csv_customers,
                            file_name=f"customers_report_{start_date}_to_{end_date}.csv",
                            mime="text/csv",
                            key="customers_report"
                        )
                    else:
                        # Fallback: use all data
                        csv_customers = df.to_csv(index=False)
                        st.download_button(
                            label="📄 Number of Customers Report",
                            data=csv_customers,
                            file_name=f"customers_report_{start_date}_to_{end_date}.csv",
                            mime="text/csv",
                            key="customers_report"
                        )
                except Exception as e:
                    st.download_button(
                        label="📄 Number of Customers Report",
                        data="",
                        file_name="customers_report.csv",
                        mime="text/csv",
                        key="customers_report",
                        disabled=True
                    )
                
                # Data table
                st.markdown("### 📋 Customer Data")
                st.dataframe(df, use_container_width=True)
            else:
                st.warning("No data available for the selected date range and branch.")
        except Exception as e:
            st.error(f"Error fetching data: {e}")
    else:
        st.info("Please select date range to view the charts.")
