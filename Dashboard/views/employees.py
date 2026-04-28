"""Employees page: attendance, working hours, and reports."""
import streamlit as st
import requests
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime

from config import API_BASE, COLORS, DEFAULT_FILTER_DATE
from utils.helpers import _default_date_value, format_working_hours, apply_chart_black_text


def employees_page():
    # Fawry Plus branded header
    st.markdown('<div class="page-header"><h1>👥 Employee Analytics Dashboard</h1><p style="opacity: 0.9;">Track attendance, working hours, and employee performance</p></div>', unsafe_allow_html=True)
    
    # Debug: Show API base URL (can be removed later)
    if st.sidebar.checkbox("🔧 Debug Mode", key="debug_mode"):
        st.sidebar.write(f"API Base: `{API_BASE}`")
        test_url = f"{API_BASE}employees/areas"
        st.sidebar.write(f"Test URL: `{test_url}`")
        try:
            test_response = requests.get(test_url, timeout=5)
            st.sidebar.success(f"✅ API Status: {test_response.status_code}")
            st.sidebar.json(test_response.json())
        except Exception as e:
            st.sidebar.error(f"❌ API Error: {e}")
    
    # Filters at the top (moved from sidebar)
    st.markdown('<div class="filter-section">', unsafe_allow_html=True)
    st.markdown("### 🎯 Filters")
    
    # First row of filters
    col1, col2, col3, col4, col5 = st.columns(5)
    
    with col1:
        # 1. Region filter
        selected_region = None
        try:
            response = requests.get(f"{API_BASE}employees/regions")
            response.raise_for_status()
            regions = response.json()
            if regions:
                region_options = ["All"] + sorted(regions)
                selected_region_str = st.selectbox("🗺️ Region", options=region_options, index=0, key="emp_region")
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
            area_response = requests.get(f"{API_BASE}employees/areas", params=params_area)
            area_response.raise_for_status()
            areas = area_response.json()
            if areas:
                area_options = ["All"] + sorted(areas)
                selected_area_str = st.selectbox("📍 Area", options=area_options, index=0, key="emp_area")
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
            response = requests.get(f"{API_BASE}employees/branch-names", params=params)
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
                    key="emp_branch_name"
                )
                
                if selected_branch_str != "All":
                    # Extract branch ID from selection
                    branch_id = int(selected_branch_str.split("(")[1].split(")")[0])
            else:
                branch_options = ["All"]
                st.selectbox("🏢 Branch Name", options=branch_options, key="emp_branch_name")
        except requests.exceptions.RequestException as e:
            st.error(f"Error fetching branches: {e}")
            if hasattr(e, 'response') and e.response is not None:
                st.error(f"Response status: {e.response.status_code}")
                st.error(f"Response content: {e.response.text[:200]}")
            branch_id = None
            branch_options = ["All"]
            st.selectbox("🏢 Branch Name", options=branch_options, key="emp_branch_name")
        except Exception as e:
            st.error(f"Unexpected error fetching branches: {e}")
            branch_id = None
            branch_options = ["All"]
            st.selectbox("🏢 Branch Name", options=branch_options, key="emp_branch_name")
    
    with col4:
        # 4. View mode filter: Daily or Weekly
        view_mode = st.radio(
            "📊 View Mode",
            ["Daily", "Weekly"],
            index=0,  # Default to "Daily"
            key="emp_view_mode",
            horizontal=True
        )
    
    # Second row of filters
    col5, col6 = st.columns(2)
    
    with col5:
        # Get available dates
        try:
            params = {}
            if branch_id:
                params["branch"] = branch_id
            if selected_region:
                params["region"] = selected_region
            if selected_area:
                params["area"] = selected_area
            response = requests.get(f"{API_BASE}employees/dates", params=params)
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
        
        if view_mode == "Daily":
            # Date range selection for Daily view
            if dates:
                start_date = st.date_input(
                    "📅 Start Date",
                    value=_default_date_value(dates),
                    min_value=min(min(dates), DEFAULT_FILTER_DATE) if dates else None,
                    max_value=max(max(dates), DEFAULT_FILTER_DATE) if dates else None,
                    key="emp_start_date"
                )
                
                # Track previous start_date to detect changes and update end_date accordingly
                if 'emp_prev_start_date' not in st.session_state:
                    st.session_state.emp_prev_start_date = start_date
                    # On first load, set end_date to start_date
                    if start_date:
                        st.session_state.emp_end_date = start_date
                elif st.session_state.emp_prev_start_date != start_date:
                    # Start date changed, reset end_date to start_date
                    st.session_state.emp_prev_start_date = start_date
                    if start_date:
                        st.session_state.emp_end_date = start_date
            else:
                start_date = None
        else:
            # Weekly view: single week start date
            if dates:
                week_start_date = st.date_input(
                    "📅 Week Start Date",
                    value=_default_date_value(dates),
                    min_value=min(min(dates), DEFAULT_FILTER_DATE) if dates else None,
                    max_value=max(max(dates), DEFAULT_FILTER_DATE) if dates else None,
                    key="emp_week_start_date",
                    help="Select the start date of the week (Monday)"
                )
                start_date = week_start_date
                # Calculate end date (7 days from start)
                end_date = week_start_date + pd.Timedelta(days=6) if week_start_date else None
            else:
                start_date = None
                end_date = None
                week_start_date = None
            
    with col6:
        if view_mode == "Daily":
            if dates:
                # Default end_date to start_date if start_date is selected, otherwise use default date or last available
                default_end_date = start_date if start_date else _default_date_value(dates, use_last=True)
                end_date = st.date_input(
                    "📅 End Date",
                    value=default_end_date,
                    min_value=start_date if start_date else (min(min(dates), DEFAULT_FILTER_DATE) if dates else None),
                    max_value=max(max(dates), DEFAULT_FILTER_DATE) if dates else None,
                    key="emp_end_date"
                )
            else:
                end_date = None
        else:
            # Weekly view: show calculated week end date (read-only display)
            if week_start_date:
                week_end_date = week_start_date + pd.Timedelta(days=6)
                st.date_input(
                    "📅 Week End Date",
                    value=week_end_date,
                    disabled=True,
                    key="emp_week_end_date_display"
                )
                end_date = week_end_date
            else:
                end_date = None
        
    # Get employees list based on selected dates
    employees = []
    if start_date and end_date:
        try:
            start_str = start_date.isoformat()
            end_str = end_date.isoformat()
            params = {"start_date": start_str, "end_date": end_str}
            if branch_id:
                params["branch"] = branch_id
            if selected_region:
                params["region"] = selected_region
            if selected_area:
                params["area"] = selected_area
            data = requests.get(f"{API_BASE}employees/data", params=params).json()
            if data:
                df_temp = pd.DataFrame(data)
                employees = sorted(df_temp["Employee ID"].dropna().unique().tolist())
        except:
            employees = []
        
    # Employee filter in col5
    with col5:
        if employees:
            employee_options = ["All"] + sorted(employees)
            selected_employee_str = st.selectbox(
            "👤 Employee ID",
                options=employee_options,
            key="emp_employee"
        )
            employee_id = None if selected_employee_str == "All" else selected_employee_str
        else:
            st.selectbox("👤 Employee ID", options=["All"], key="emp_employee")
            employee_id = None
    
    st.markdown('</div>', unsafe_allow_html=True)
    
    # Main content - Handle Daily and Weekly views
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
            if employee_id:  # Only add employee filter if a specific employee is selected
                params["employee"] = employee_id
            
            data = requests.get(
                f"{API_BASE}employees/data",
                params=params
            ).json()
            
            if data:
                df = pd.DataFrame(data)
                df["Date"] = pd.to_datetime(df["Date"], format="mixed", errors="coerce").dt.date
                
                # If a specific employee is selected, fetch and show their name from employees_table
                selected_employee_name = None
                if employee_id is not None:
                    try:
                        params_list = {}
                        if branch_id:
                            params_list["branch"] = branch_id
                        if selected_region:
                            params_list["region"] = selected_region
                        if selected_area:
                            params_list["area"] = selected_area
                        emp_list_data = requests.get(f"{API_BASE}employees/list", params=params_list).json()
                        for emp in (emp_list_data or []):
                            eid = emp.get("employee_id")
                            if eid is not None and str(eid) == str(employee_id):
                                selected_employee_name = emp.get("name") or f"Employee {employee_id}"
                                break
                        if selected_employee_name is None:
                            selected_employee_name = f"Employee {employee_id}"
                    except Exception:
                        selected_employee_name = f"Employee {employee_id}"
                
                # Calculate KPI metrics
                # API returns "First time seen" and "Last time seen" (with spaces)
                first_time_col = "First time seen" if "First time seen" in df.columns else "first_time_seen"
                last_time_col = "Last time seen" if "Last time seen" in df.columns else "last_time_seen"
                
                if first_time_col in df.columns and last_time_col in df.columns:
                    # Calculate average arrival and leaving times (accept "YYYY-MM-DD HH:MM:SS" with or without .%f)
                    df[first_time_col] = pd.to_datetime(df[first_time_col], format="mixed", errors="coerce")
                    df[last_time_col] = pd.to_datetime(df[last_time_col], format="mixed", errors="coerce")
                    # Calculate mean time by converting to seconds since midnight
                    if not df[first_time_col].isna().all():
                        avg_arrival_seconds = (df[first_time_col].dt.hour * 3600 + df[first_time_col].dt.minute * 60 + df[first_time_col].dt.second).mean()
                        avg_arrival_hour = int(avg_arrival_seconds // 3600)
                        avg_arrival_min = int((avg_arrival_seconds % 3600) // 60)
                        # Format as 12-hour time with AM/PM
                        if avg_arrival_hour >= 12:
                            am_pm = "PM"
                            display_hour = avg_arrival_hour - 12 if avg_arrival_hour > 12 else 12
                        else:
                            am_pm = "AM"
                            display_hour = avg_arrival_hour if avg_arrival_hour > 0 else 12
                        avg_arrival = f"{display_hour}:{avg_arrival_min:02d} {am_pm}"
                    else:
                        avg_arrival = "N/A"
                    
                    if not df[last_time_col].isna().all():
                        avg_leaving_seconds = (df[last_time_col].dt.hour * 3600 + df[last_time_col].dt.minute * 60 + df[last_time_col].dt.second).mean()
                        avg_leaving_hour = int(avg_leaving_seconds // 3600)
                        avg_leaving_min = int((avg_leaving_seconds % 3600) // 60)
                        # Format as 12-hour time with AM/PM
                        if avg_leaving_hour >= 12:
                            am_pm = "PM"
                            display_hour = avg_leaving_hour - 12 if avg_leaving_hour > 12 else 12
                        else:
                            am_pm = "AM"
                            display_hour = avg_leaving_hour if avg_leaving_hour > 0 else 12
                        avg_leaving = f"{display_hour}:{avg_leaving_min:02d} {am_pm}"
                    else:
                        avg_leaving = "N/A"
                else:
                    avg_arrival = "N/A"
                    avg_leaving = "N/A"
                
                # Exclude Employee ID 0 (Security Man) when calculating average working hours for "All" employees
                df_for_avg = df[df["Employee ID"] != 0] if "Employee ID" in df.columns else df
                avg_working_hours = df["Working hours"].mean() if "Working hours" in df.columns else 0
                avg_working_hours_all = df_for_avg["Working hours"].mean() if "Working hours" in df_for_avg.columns and len(df_for_avg) > 0 else 0
                
                # When a specific employee is selected, show their name above the content
                if selected_employee_name:
                    st.markdown(f"**Selected employee:** {selected_employee_name} (ID: {employee_id})")
                    st.markdown("")
                
                # Display KPI Cards
                # If specific employee is selected, show KPIs based on date range
                # If "All" is selected, show only Active Employees (no Working Time)
                # Hide Working Time and Active Counters/Employees when Weekly view is selected
                # Hide Active Counters/Employees when specific employee is selected
                if view_mode == "Weekly":
                    # Weekly view: Don't show Working Time and Active Counters/Employees cards
                    if employee_id:
                        # Specific employee selected - only show Arrival/Leaving Time if single date
                        if start_date and end_date and start_date == end_date:
                            kpi_col1, kpi_col2 = st.columns(2)
                            
                            with kpi_col1:
                                st.metric("Arrival Time", avg_arrival)
                            
                            with kpi_col2:
                                st.metric("Leaving Time", avg_leaving)
                        # If date range, don't show any KPI cards for Weekly view
                    else:
                        # "All" employees selected in Weekly view - don't show any KPI cards
                        pass
                elif employee_id:
                    # Specific employee selected - don't show Active Counters/Employees
                    # Only show Arrival/Leaving Time if single date is selected (start_date == end_date)
                    if start_date and end_date and start_date == end_date:
                        kpi_col1, kpi_col2, kpi_col3 = st.columns(3)
                        
                        with kpi_col1:
                            st.metric("Arrival Time", avg_arrival)
                        
                        with kpi_col2:
                            st.metric("Leaving Time", avg_leaving)
                        
                        with kpi_col3:
                            st.metric("Working Time", format_working_hours(avg_working_hours))
                    else:
                        # Date range selected - don't show Arrival/Leaving Time
                        kpi_col1, = st.columns(1)
                        
                        with kpi_col1:
                            st.metric("Working Time", format_working_hours(avg_working_hours))
                else:
                    # "All" employees selected - show Active Counters/Employees and Average Working Hours in one row
                    kpi_col1, kpi_col2 = st.columns(2)
                    
                    with kpi_col1:
                        # Active Counters/Employees - count unique employees in the dataset (excluding employee ID 0 - security man)
                        if "Employee ID" in df.columns:
                            df_filtered = df[df["Employee ID"] != 0]
                            active_employees = df_filtered["Employee ID"].nunique()
                        else:
                            active_employees = 0
                        st.metric("Active Counters/Employees", active_employees)
                    
                    with kpi_col2:
                        st.metric("Average Working Hours", format_working_hours(avg_working_hours_all))
                
                # All Employees Summary section (shown when "All" is selected in Daily view)
                if view_mode == "Daily" and not employee_id:
                    # Show summary when "All" is selected (Daily view)
                    
                    # Chart showing number of employees per date (only if date range is selected and All employees)
                    if start_date and end_date and start_date != end_date:
                        # Count unique employees per date from attendance_table
                        df_employees_per_date = df.groupby("Date")["Employee ID"].nunique().reset_index()
                        df_employees_per_date.columns = ["Date", "Number of Employees"]
                        df_employees_per_date["Date"] = pd.to_datetime(df_employees_per_date["Date"])
                        df_employees_per_date = df_employees_per_date.sort_values("Date")
                        
                        branch_display = f"Branch {branch_id}" if branch_id else "All Branches"
                        st.markdown("### 👥 Number of Employees Per Date")
                        fig_employees = px.bar(
                            df_employees_per_date,
                            x="Date",
                            y="Number of Employees",
                            title=f"Number of Employees per Date - {branch_display}",
                            color="Number of Employees",
                            color_continuous_scale=COLORS['gradient2'],
                            labels={"Number of Employees": "Number of Employees", "Date": "Date"}
                        )
                        fig_employees.update_traces(
                            marker=dict(line=dict(color='white', width=1))
                        )
                        fig_employees.update_layout(
                            plot_bgcolor='white',
                            paper_bgcolor='white',
                            height=400,
                            xaxis=dict(tickformat="%Y-%m-%d", dtick=86400000.0),
                            xaxis_title="Date",
                            yaxis_title="Number of Employees"
                        )
                        apply_chart_black_text(fig_employees)
                        st.plotly_chart(fig_employees, use_container_width=True)
                    
                    # Chart showing average working hours per date for all employees (only if date range is selected); exclude ID 0 (Security Man)
                    if start_date and end_date and start_date != end_date:
                        df_all_no0 = df[df["Employee ID"] != 0] if "Employee ID" in df.columns else df
                        df_daily_all = df_all_no0.groupby("Date")["Working hours"].mean().reset_index()
                        df_daily_all["Date"] = pd.to_datetime(df_daily_all["Date"])
                        df_daily_all = df_daily_all.sort_values("Date")
                        
                        branch_display = f"Branch {branch_id}" if branch_id else "All Branches"
                        st.markdown("### 📈 Average Working Time Over Date Interval (All Employees)")
                        fig_line = px.line(
                            df_daily_all,
                            x="Date",
                            y="Working hours",
                            title=f"Average Working Hours - All Employees ({branch_display})",
                            markers=True,
                            color_discrete_sequence=[COLORS['primary']],
                            labels={"Working hours": "Average Working Hours (hours)", "Date": "Date"}
                        )
                        fig_line.update_traces(
                            line=dict(width=3),
                            marker=dict(size=8)
                        )
                        fig_line.update_layout(
                            plot_bgcolor='white',
                            paper_bgcolor='white',
                            height=500,
                            xaxis_title="Date",
                            yaxis_title="Average Working Hours (hours)",
                            xaxis=dict(tickformat="%Y-%m-%d", dtick=86400000.0)
                        )
                        apply_chart_black_text(fig_line)
                        st.plotly_chart(fig_line, use_container_width=True)
                
                # Employee attendance timeline: only when "All" is selected (not when a specific employee ID is chosen)
                if view_mode == "Daily" and start_date == end_date and employee_id is None and first_time_col in df.columns and last_time_col in df.columns:
                    # Show list of employees (Name & ID) from employees_table before the timeline
                    try:
                        params_list = {}
                        if branch_id:
                            params_list["branch"] = branch_id
                        if selected_region:
                            params_list["region"] = selected_region
                        if selected_area:
                            params_list["area"] = selected_area
                        emp_list_data = requests.get(f"{API_BASE}employees/list", params=params_list).json()
                        if emp_list_data:
                            st.markdown("### 👤 Employees (Name & ID)")
                            df_emp_list = pd.DataFrame(emp_list_data)
                            df_emp_list = df_emp_list.rename(columns={"employee_id": "Employee ID", "name": "Name"})
                            df_emp_list = df_emp_list[["Name", "Employee ID"]]
                            st.dataframe(df_emp_list, use_container_width=True, hide_index=True)
                            st.markdown("")
                    except Exception:
                        pass
                    st.markdown("### 📊 Employee Attendance Timeline")
                    df_timeline = df.copy()
                    
                    # Filter out rows with missing time data
                    df_timeline = df_timeline[df_timeline[first_time_col].notna() & df_timeline[last_time_col].notna()].copy()
                    
                    if len(df_timeline) > 0:
                        # Get unique employees
                        employees_timeline = sorted(df_timeline["Employee ID"].dropna().unique())
                        
                        # Create timeline data for each employee
                        timeline_segments = []
                        
                        for emp in employees_timeline:
                            emp_events = df_timeline[df_timeline["Employee ID"] == emp].copy()
                            
                            # For each employee, use their first time seen and last time seen
                            # Convert times to minutes from midnight
                            first_time = pd.to_datetime(emp_events[first_time_col].iloc[0], format="mixed", errors="coerce")
                            last_time = pd.to_datetime(emp_events[last_time_col].iloc[0], format="mixed", errors="coerce")
                            if pd.isna(first_time) or pd.isna(last_time):
                                continue
                            start_minutes = first_time.hour * 60 + first_time.minute
                            end_minutes = last_time.hour * 60 + last_time.minute
                            
                            # Cap end time at 24:00 (1440 minutes) for single day view
                            if end_minutes > 1440:
                                end_minutes = 1440
                            
                            # If end is before start (overnight shift), show until end of day
                            if end_minutes < start_minutes:
                                end_minutes = 1440
                            
                            # Calculate duration
                            duration = end_minutes - start_minutes
                            
                            timeline_segments.append({
                                'Employee': f'Employee {emp}',
                                'EmployeeID': emp,
                                'Start': start_minutes,
                                'End': end_minutes,
                                'StartTime': first_time.strftime('%H:%M:%S'),
                                'EndTime': last_time.strftime('%H:%M:%S'),
                                'Duration': duration
                            })
                        
                        if timeline_segments:
                            # Create horizontal timeline (Gantt chart style) using horizontal bar chart
                            fig_timeline = go.Figure()
                            
                            # Create y-axis positions for employees
                            employee_positions = {f'Employee {e}': i for i, e in enumerate(employees_timeline)}
                            
                            # Generate distinct colors for each employee
                            # Use a color palette with good contrast
                            color_palette = [
                                '#0066CC',  # Fawry Blue
                                '#FFD700',  # Fawry Yellow
                                '#800020',  # Fawry Maroon
                                '#10b981',  # Green
                                '#f59e0b',  # Orange
                                '#ef4444',  # Red
                                '#8b5cf6',  # Purple
                                '#06b6d4',  # Cyan
                                '#ec4899',  # Pink
                                '#84cc16',  # Lime
                                '#f97316',  # Orange Red
                                '#6366f1',  # Indigo
                                '#14b8a6',  # Teal
                                '#f43f5e',  # Rose
                                '#a855f7',  # Violet
                            ]
                            
                            # Add a trace for each employee with a different color
                            for idx, segment in enumerate(timeline_segments):
                                emp_name = segment['Employee']
                                y_pos = employee_positions[emp_name]
                                
                                start_min = segment['Start']
                                end_min = segment['End']
                                width = end_min - start_min
                                
                                # Ensure values are within 0-1440 range
                                start_min = max(0, min(1440, start_min))
                                end_min = max(0, min(1440, end_min))
                                width = end_min - start_min
                                
                                # Get color for this employee (cycle through palette if needed)
                                emp_color = color_palette[idx % len(color_palette)]
                                
                                duration_hours = width // 60
                                duration_mins = width % 60
                                hover_text = (
                                    f'<b>{emp_name}</b><br>'
                                    f'Arrival: {segment["StartTime"]}<br>'
                                    f'Departure: {segment["EndTime"]}<br>'
                                    f'Duration: {duration_hours}h {duration_mins:02d}m'
                                )
                                
                                # Add horizontal bar trace for this employee
                                fig_timeline.add_trace(go.Bar(
                                    x=[width],
                                    y=[y_pos],
                                    base=[start_min],
                                    orientation='h',
                                    name=emp_name,
                                    marker=dict(
                                        color=emp_color,
                                        line=dict(color='white', width=1)
                                    ),
                                    text=[f"{segment['StartTime'][:5]}"],
                                    textposition='inside',
                                    textfont=dict(size=9, color='white'),
                                    customdata=[hover_text],
                                    hovertemplate='%{customdata}<extra></extra>',
                                    showlegend=True
                                ))
                            
                            # Update layout
                            selected_date_str = start_date.strftime('%Y-%m-%d') if start_date else "Selected Date"
                            fig_timeline.update_layout(
                                title=f"Employee Attendance Timeline - {selected_date_str}<br><sub>Colored segments show periods of attendance throughout the day</sub>",
                                xaxis=dict(
                                    title="Time of Day",
                                    tickmode='array',
                                    tickvals=list(range(0, 1441, 120)),  # Every 2 hours
                                    ticktext=[f"{h//60:02d}:{h%60:02d}" for h in range(0, 1441, 120)],
                                    range=[0, 1440]
                                ),
                                yaxis=dict(
                                    title="Employee",
                                    tickmode='array',
                                    tickvals=list(range(len(employees_timeline))),
                                    ticktext=[f'Employee {e}' for e in employees_timeline],
                                    range=[-0.5, len(employees_timeline) - 0.5]
                                ),
                                plot_bgcolor='white',
                                paper_bgcolor='white',
                                height=max(400, len(employees_timeline) * 80),
                                showlegend=True,
                                legend=dict(
                                    orientation="v",
                                    yanchor="top",
                                    y=1,
                                    xanchor="left",
                                    x=-0.1,
                                    title_text="Employee"
                                ),
                                barmode='overlay',
                                hovermode='closest'
                            )
                            apply_chart_black_text(fig_timeline)
                            st.plotly_chart(fig_timeline, use_container_width=True)
                        else:
                            # No data to display
                            fig_timeline = go.Figure()
                            fig_timeline.add_annotation(
                                text="No attendance data found for the selected filters",
                                xref="paper", yref="paper",
                                x=0.5, y=0.5, showarrow=False,
                                font=dict(color='black')
                            )
                            selected_date_str = start_date.strftime('%Y-%m-%d') if start_date else "Selected Date"
                            fig_timeline.update_layout(
                                title=f"Employee Attendance Timeline - {selected_date_str}",
                                height=400
                            )
                            apply_chart_black_text(fig_timeline)
                            st.plotly_chart(fig_timeline, use_container_width=True)
                    else:
                        # No timeline data available
                        st.info("No attendance time data available for the selected date.")
                
                if view_mode == "Weekly":
                    # Weekly view: Show total working hours per week
                    if employee_id:
                        # Specific employee: Calculate total weekly hours
                        total_weekly_hours = df["Working hours"].sum() if "Working hours" in df.columns else 0
                        
                        st.markdown("### 📊 Weekly Working Hours")
                        branch_display = f"Branch {branch_id}" if branch_id else "All Branches"
                        week_label = f"Week starting {start_date.strftime('%Y-%m-%d')}"
                        
                        # Display weekly hours metric
                        kpi_weekly_col1, kpi_weekly_col2 = st.columns(2)
                        with kpi_weekly_col1:
                            st.metric(f"Weekly Hours - Employee {employee_id}", format_working_hours(total_weekly_hours))
                        with kpi_weekly_col2:
                            avg_daily = total_weekly_hours / 7 if total_weekly_hours > 0 else 0
                            st.metric("Average Daily Hours", format_working_hours(avg_daily))
                        
                        # Bar chart: Daily breakdown for the week
                        df_weekly_daily = df.groupby("Date")["Working hours"].sum().reset_index()
                        df_weekly_daily["Date"] = pd.to_datetime(df_weekly_daily["Date"])
                        df_weekly_daily = df_weekly_daily.sort_values("Date")
                        df_weekly_daily["Day"] = df_weekly_daily["Date"].dt.strftime("%a %m/%d")
                        
                        st.markdown("### 📈 Daily Working Hours Breakdown")
                        fig_weekly = px.bar(
                            df_weekly_daily,
                            x="Day",
                            y="Working hours",
                            title=f"Weekly Working Hours for Employee {employee_id} - {week_label} ({branch_display})",
                            color="Working hours",
                            color_continuous_scale=COLORS['gradient2'],
                            labels={"Working hours": "Working Hours (hours)", "Day": "Day"}
                        )
                        fig_weekly.update_traces(
                            marker=dict(line=dict(color='white', width=1))
                        )
                        fig_weekly.update_layout(
                            plot_bgcolor='white',
                            paper_bgcolor='white',
                            height=400,
                            xaxis_title="Day",
                            yaxis_title="Working Hours (hours)"
                        )
                        apply_chart_black_text(fig_weekly)
                        st.plotly_chart(fig_weekly, use_container_width=True)
                    else:
                        # All employees: Show weekly hours for each employee
                        st.markdown("### 📊 Weekly Working Hours by Employee")
                        branch_display = f"Branch {branch_id}" if branch_id else "All Branches"
                        week_label = f"Week starting {start_date.strftime('%Y-%m-%d')}"
                        
                        # Calculate total weekly hours per employee (exclude ID 0 - Security Man)
                        df_weekly_no0 = df[df["Employee ID"] != 0] if "Employee ID" in df.columns else df
                        df_weekly_employees = df_weekly_no0.groupby("Employee ID")["Working hours"].sum().reset_index()
                        df_weekly_employees.columns = ["Employee ID", "Weekly Hours"]
                        df_weekly_employees = df_weekly_employees.sort_values("Weekly Hours", ascending=False)
                        
                        # Bar chart: Weekly hours per employee
                        fig_weekly_all = px.bar(
                            df_weekly_employees,
                            x="Employee ID",
                            y="Weekly Hours",
                            title=f"Weekly Working Hours by Employee - {week_label} ({branch_display})",
                            color="Weekly Hours",
                            color_continuous_scale=COLORS['gradient2'],
                            labels={"Weekly Hours": "Weekly Hours (hours)", "Employee ID": "Employee ID"}
                        )
                        fig_weekly_all.update_traces(
                            marker=dict(line=dict(color='white', width=1))
                        )
                        fig_weekly_all.update_layout(
                            plot_bgcolor='white',
                            paper_bgcolor='white',
                            height=500,
                            xaxis_title="Employee ID",
                            yaxis_title="Weekly Hours (hours)",
                            xaxis=dict(type='category')
                        )
                        apply_chart_black_text(fig_weekly_all)
                        st.plotly_chart(fig_weekly_all, use_container_width=True)
                else:
                    # Daily view: Show chart for specific employee only if date range is selected (start_date != end_date)
                    if employee_id:
                        if start_date and end_date and start_date != end_date:
                            # Calculate average working hours per date
                            df_daily = df.groupby("Date")["Working hours"].mean().reset_index()
                            df_daily["Date"] = pd.to_datetime(df_daily["Date"])
                            df_daily = df_daily.sort_values("Date")
                            
                            # Line chart: Average working time across date interval
                            st.markdown("### 📈 Average Working Time Over Date Interval")
                            branch_display = f"Branch {branch_id}" if branch_id else "All Branches"
                            fig_line = px.line(
                                df_daily,
                                x="Date",
                                y="Working hours",
                                title=f"Average Working Hours for Employee {employee_id} ({branch_display})",
                                markers=True,
                                color_discrete_sequence=[COLORS['primary']],
                                labels={"Working hours": "Working Hours (hours)", "Date": "Date"}
                            )
                            fig_line.update_traces(
                                line=dict(width=3),
                                marker=dict(size=8)
                            )
                            fig_line.update_layout(
                                plot_bgcolor='white',
                                paper_bgcolor='white',
                                height=500,
                                xaxis_title="Date",
                                yaxis_title="Average Working Hours (hours)",
                                xaxis=dict(tickformat="%Y-%m-%d", dtick=86400000.0)
                            )
                            apply_chart_black_text(fig_line)
                            st.plotly_chart(fig_line, use_container_width=True)
                
                
                # Generate Reports Section
                st.markdown("---")
                st.markdown("### 📥 Generate Reports")
                
                # Report: Attendance report
                try:
                    # Create attendance report with relevant columns
                    df_attendance_report = df.copy()
                    
                    # Select and rename columns for the report
                    report_columns = []
                    if "Employee ID" in df_attendance_report.columns:
                        report_columns.append("Employee ID")
                    if "Branch ID" in df_attendance_report.columns:
                        report_columns.append("Branch ID")
                    if "Branch Name" in df_attendance_report.columns:
                        report_columns.append("Branch Name")
                    if "Date" in df_attendance_report.columns:
                        report_columns.append("Date")
                    if "First time seen" in df_attendance_report.columns:
                        report_columns.append("First time seen")
                    if "Last time seen" in df_attendance_report.columns:
                        report_columns.append("Last time seen")
                    if "Working hours" in df_attendance_report.columns:
                        report_columns.append("Working hours")
                    
                    if report_columns:
                        df_attendance_report = df_attendance_report[report_columns].copy()
                        # Rename columns for better readability
                        column_mapping = {
                            "First time seen": "Arrival Time",
                            "Last time seen": "Leaving Time",
                            "Working hours": "Working Hours (hours)"
                        }
                        df_attendance_report = df_attendance_report.rename(columns=column_mapping)
                        df_attendance_report = df_attendance_report.sort_values(["Date", "Employee ID"] if "Date" in df_attendance_report.columns and "Employee ID" in df_attendance_report.columns else ["Employee ID"] if "Employee ID" in df_attendance_report.columns else [])
                        
                        csv_attendance = df_attendance_report.to_csv(index=False)
                        st.download_button(
                            label="📄 Attendance Report",
                            data=csv_attendance,
                            file_name=f"attendance_report_{start_date}_to_{end_date}.csv",
                            mime="text/csv",
                            key="employee_attendance_report"
                        )
                    else:
                        # Fallback: use all data
                        csv_attendance = df.to_csv(index=False)
                        st.download_button(
                            label="📄 Attendance Report",
                            data=csv_attendance,
                            file_name=f"attendance_report_{start_date}_to_{end_date}.csv",
                            mime="text/csv",
                            key="employee_attendance_report"
                        )
                except Exception as e:
                    st.download_button(
                        label="📄 Attendance Report",
                        data="",
                        file_name="attendance_report.csv",
                        mime="text/csv",
                        key="employee_attendance_report",
                        disabled=True
                    )
                
                # Show data table
                st.markdown("### 📋 Employee Data")
                # Format Working hours column for display
                df_display = df.copy()
                if "Working hours" in df_display.columns:
                    df_display["Working hours"] = df_display["Working hours"].apply(format_working_hours)
                st.dataframe(df_display, use_container_width=True)
            else:
                st.warning("No data available for the selected filters.")
        except Exception as e:
            st.error(f"Error fetching data: {e}")
    else:
        st.info("Please select date range to view the data.")
