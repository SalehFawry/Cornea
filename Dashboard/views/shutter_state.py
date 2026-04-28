"""Shutter state page: opening/closing times."""
import streamlit as st
import requests
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta

from config import API_BASE, COLORS, DEFAULT_FILTER_DATE
from utils.helpers import _default_date_value, _get_json, apply_chart_black_text


def shutter_state_page():
    st.markdown('<div class="page-header"><h1>🚪 Shutter State Dashboard</h1><p style="opacity: 0.9;">Monitor branch opening and closing times</p></div>', unsafe_allow_html=True)
    
    # Filters at the top (moved from sidebar)
    st.markdown('<div class="filter-section">', unsafe_allow_html=True)
    st.markdown("### 🎯 Filters")
    
    # First row of filters
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        # 1. Region filter (first)
        selected_region = None
        try:
            regions = _get_json(f"{API_BASE}shutter/regions", default=[])
            if regions:
                region_options = ["All"] + sorted(regions)
                selected_region_str = st.selectbox(
                    "🗺️ Region",
                    options=region_options,
                    index=0,
                    key="shutter_region"
                )
                selected_region = None if selected_region_str == "All" else selected_region_str
        except:
            selected_region = None
    
    with col2:
        # 2. Area filter
        selected_area = None
        try:
            params_area = {}
            if selected_region:
                params_area["region"] = selected_region
            areas = _get_json(f"{API_BASE}shutter/areas", params=params_area, default=[])
            if areas:
                area_options = ["All"] + sorted(areas)
                selected_area_str = st.selectbox(
                    "📍 Area",
                    options=area_options,
                    index=0,
                    key="shutter_area"
                )
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
            branch_names_data = _get_json(f"{API_BASE}shutter/branch-names", params=params)
            if not isinstance(branch_names_data, list):
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
                    key="shutter_branch_name"
                )
                
                if selected_branch_str != "All":
                    # Extract branch ID from selection
                    branch_id = int(selected_branch_str.split("(")[1].split(")")[0])
            else:
                branch_options = ["All"]
                st.selectbox("🏢 Branch Name", options=branch_options, key="shutter_branch_name")
        except requests.exceptions.RequestException as e:
            st.error(f"Error fetching branches: {e}")
            if hasattr(e, 'response') and e.response is not None:
                st.error(f"Response status: {e.response.status_code}")
                st.error(f"Response content: {e.response.text[:200]}")
            branch_id = None
            branch_options = ["All"]
            st.selectbox("🏢 Branch Name", options=branch_options, key="shutter_branch_name")
        except Exception as e:
            st.error(f"Unexpected error fetching branches: {e}")
            branch_id = None
            branch_options = ["All"]
            st.selectbox("🏢 Branch Name", options=branch_options, key="shutter_branch_name")
    
    with col4:
        # 4. View mode selection
        view_mode = st.radio(
            "📊 View Mode",
            ["Single Date Timeline", "Date Interval Analysis"],
            index=0,  # Default to "Single Date Timeline"
            key="shutter_view_mode",
            horizontal=True
        )
    
    # Second row of filters
    col4, col5, col6 = st.columns(3)
    
    # Get available dates
    try:
        params = {}
        if branch_id:
            params["branch"] = branch_id
        if selected_area:
            params["area"] = selected_area
        dates_str = _get_json(f"{API_BASE}shutter/dates", params=params)
        if isinstance(dates_str, list):
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
    
    if view_mode == "Single Date Timeline":
        with col4:
            # Single date selection
            selected_date = st.date_input(
                "📅 Date",
                value=_default_date_value(dates, use_last=True) if dates else DEFAULT_FILTER_DATE,
                min_value=min(min(dates), DEFAULT_FILTER_DATE) if dates else None,
                max_value=max(max(dates), DEFAULT_FILTER_DATE) if dates else None,
                key="shutter_date"
            )
            
        with col5:
            # 4. Shutter State filter - Always show "All, open, closed"
            shutter_state = None
            if selected_date:
                # Always show these options
                state_options = ["All", "open", "closed"]
                selected_state_str = st.selectbox(
                    "🚪 Shutter State",
                    options=state_options,
                    key="shutter_state"
                )
                shutter_state = None if selected_state_str == "All" else selected_state_str
            else:
                st.selectbox("🚪 Shutter State", options=["All", "open", "closed"], key="shutter_state")
                shutter_state = None
        
        start_date = None
        end_date = None
    else:
        with col4:
            # Date range selection
            if dates:
                start_date = st.date_input(
                    "📅 Start Date",
                    value=_default_date_value(dates),
                    min_value=min(min(dates), DEFAULT_FILTER_DATE) if dates else None,
                    max_value=max(max(dates), DEFAULT_FILTER_DATE) if dates else None,
                    key="shutter_start_date"
                )
                
                # Track previous start_date to detect changes and update end_date accordingly
                if 'shutter_prev_start_date' not in st.session_state:
                    st.session_state.shutter_prev_start_date = start_date
                    # On first load, set end_date to start_date
                    if start_date:
                        st.session_state.shutter_end_date = start_date
                elif st.session_state.shutter_prev_start_date != start_date:
                    # Start date changed, reset end_date to start_date
                    st.session_state.shutter_prev_start_date = start_date
                    if start_date:
                        st.session_state.shutter_end_date = start_date
            else:
                start_date = None
                
        with col5:
            if dates:
                # Default end_date to start_date if start_date is selected, otherwise use default date or last available
                default_end_date = start_date if start_date else _default_date_value(dates, use_last=True)
                end_date = st.date_input(
                    "📅 End Date",
                    value=default_end_date,
                    min_value=start_date if start_date else (min(min(dates), DEFAULT_FILTER_DATE) if dates else None),
                    max_value=max(max(dates), DEFAULT_FILTER_DATE) if dates else None,
                    key="shutter_end_date"
                )
            else:
                end_date = None
        
            selected_date = None
            shutter_state = None
    
    st.markdown('</div>', unsafe_allow_html=True)
    
    # Main content
    if view_mode == "Single Date Timeline":
        # Single date timeline view
        if selected_date:
            try:
                date_str = selected_date.isoformat()
                params = {"date": date_str}
                if branch_id:
                    params["branch"] = branch_id
                # Only filter by event if it's not "closed" (closed is handled separately)
                if shutter_state and shutter_state.lower() != "closed":
                    params["event"] = shutter_state
                if selected_area:
                    params["area"] = selected_area
                
                data = _get_json(f"{API_BASE}shutter/data", params=params)
                
                if data:
                    df_filtered = pd.DataFrame(data)
                    # Include next calendar day's events 00:00–03:59 as part of this day (day = 6 AM to 4 AM)
                    next_date = selected_date + timedelta(days=1)
                    params_next = {"date": next_date.isoformat()}
                    if branch_id:
                        params_next["branch"] = branch_id
                    if shutter_state and shutter_state.lower() != "closed":
                        params_next["event"] = shutter_state
                    if selected_area:
                        params_next["area"] = selected_area
                    data_next = _get_json(f"{API_BASE}shutter/data", params=params_next)
                    if data_next:
                        df_next = pd.DataFrame(data_next)
                        if "time stamp" in df_next.columns and not df_next.empty:
                            # Keep only 00:00:00 to 03:59:59 (early morning = end of previous business day)
                            def _is_early_morning(ts):
                                try:
                                    t = pd.to_datetime(ts, format='%H:%M:%S')
                                    m = t.hour * 60 + t.minute
                                    return 0 <= m < 240  # before 4:00 AM
                                except Exception:
                                    return False
                            mask = df_next["time stamp"].apply(_is_early_morning)
                            df_early = df_next.loc[mask].copy()
                            if not df_early.empty:
                                df_filtered = pd.concat([df_filtered, df_early], ignore_index=True)
                    
                    # Calculate KPI metrics
                    total_events = len(df_filtered)
                    unique_branches = df_filtered["Branch ID"].nunique() if "Branch ID" in df_filtered.columns else 0
                    
                    # Shutter state and times: use business day (6 AM to 4 AM next day)
                    first_opening_time = "N/A"
                    last_closing_time = "N/A"
                    latest_state = "N/A"
                    if "event" in df_filtered.columns and "time stamp" in df_filtered.columns:
                        _day_start_min = 360
                        _day_end_next_min = 240
                        def _time_to_business_min(ts):
                            try:
                                t = pd.to_datetime(ts, format='%H:%M:%S')
                                m = t.hour * 60 + t.minute
                                if m < _day_end_next_min:
                                    return 1080 + m
                                return m - _day_start_min
                            except Exception:
                                return 0
                        # Latest shutter state = last event in business-day order (00:00-03:59 counts as end of day)
                        df_all = df_filtered.copy()
                        df_all["_business_min"] = df_all["time stamp"].apply(_time_to_business_min)
                        idx_last = df_all["_business_min"].idxmax()
                        latest_state = df_all.loc[idx_last, "event"]
                        # Filter for open events
                        df_open = df_filtered[df_filtered["event"].str.lower().str.contains("open", na=False)].copy()
                        # Filter for close events
                        df_close = df_filtered[df_filtered["event"].str.lower().str.contains("close", na=False)].copy()
                        
                        # Get first opening time (earliest open event at or after 4 AM - operational day start)
                        OPERATIONAL_DAY_START_MIN = 240  # 4:00 AM
                        if not df_open.empty:
                            df_open["time_stamp_parsed"] = pd.to_datetime(df_open["time stamp"], format='%H:%M:%S', errors='coerce')
                            df_open = df_open[df_open["time_stamp_parsed"].notna()]
                            if not df_open.empty:
                                df_open["_min_of_day"] = df_open["time_stamp_parsed"].dt.hour * 60 + df_open["time_stamp_parsed"].dt.minute
                                df_open_after_4am = df_open[df_open["_min_of_day"] >= OPERATIONAL_DAY_START_MIN]
                                if not df_open_after_4am.empty:
                                    first_opening = df_open_after_4am["time_stamp_parsed"].min()
                                    first_opening_time = first_opening.strftime("%H:%M:%S")
                        
                        # Get last closing time: use business-day order so closing after 24:00 and before 4:00 counts as latest
                        if not df_close.empty:
                            df_close = df_close.copy()
                            df_close["time_stamp_parsed"] = pd.to_datetime(df_close["time stamp"], format='%H:%M:%S', errors='coerce')
                            df_close = df_close[df_close["time_stamp_parsed"].notna()]
                            if not df_close.empty:
                                df_close["_business_min"] = df_close["time stamp"].apply(_time_to_business_min)
                                idx_last = df_close["_business_min"].idxmax()
                                last_closing_time = df_close.loc[idx_last, "time stamp"]
                                if hasattr(last_closing_time, 'strftime'):
                                    last_closing_time = last_closing_time.strftime("%H:%M:%S")
                                elif isinstance(last_closing_time, str) and len(last_closing_time) > 8:
                                    last_closing_time = last_closing_time[:8]
                    
                    # Display KPI Cards in one row
                    kpi_col1, kpi_col2, kpi_col3 = st.columns(3)
                    
                    with kpi_col1:
                        st.metric("Shutter State", latest_state)
                    
                    with kpi_col2:
                        st.metric("Shutter Opening Time", first_opening_time)
                    
                    with kpi_col3:
                        st.metric("Shutter Closing Time", last_closing_time)
                    
                    # If "closed" is selected, show list of closed branches instead of chart
                    if shutter_state and shutter_state.lower() == "closed":
                        try:
                            params_closed = {"date": selected_date.isoformat()}
                            if selected_area:
                                params_closed["area"] = selected_area
                            
                            closed_branches = _get_json(f"{API_BASE}shutter/closed-branches", params=params_closed)
                            
                            if closed_branches:
                                st.markdown("### 🚫 Closed Branches")
                                st.markdown("Branches that did not have an 'open' event on the selected date:")
                                df_closed = pd.DataFrame(closed_branches)
                                st.dataframe(
                                    df_closed,
                                    use_container_width=True,
                                    hide_index=True,
                                    column_config={
                                        "Branch ID": st.column_config.NumberColumn("Branch ID", format="%d"),
                                        "Branch Name": st.column_config.TextColumn("Branch Name")
                                    }
                                )
                            else:
                                st.info("No closed branches found for the selected date. All branches had an 'open' event.")
                        except Exception as e:
                            st.warning(f"Could not fetch closed branches: {e}")
                    else:
                        # Shutter state timeline: colored segments representing periods of each state
                        st.markdown("### 📊 Shutter State Timeline")
                        if "time stamp" in df_filtered.columns and "Branch ID" in df_filtered.columns:
                            df_timeline = df_filtered.copy()
                            df_timeline = df_timeline.sort_values('time stamp')
                            
                            # Business day: 6:00 AM to 4:00 AM next day (0 = 6 AM, 1320 = 4 AM)
                            DAY_START_MIN = 360   # 6:00 AM in minutes from midnight
                            DAY_END_NEXT_MIN = 240  # 4:00 AM = 240 min from midnight
                            BUSINESS_DAY_END = 1080 + DAY_END_NEXT_MIN  # 1320
                            def time_to_business_minutes(ts):
                                try:
                                    t = pd.to_datetime(ts, format='%H:%M:%S')
                                    m = t.hour * 60 + t.minute
                                    if m < DAY_END_NEXT_MIN:  # 00:00-03:59 -> after 24:00 on axis
                                        return 1080 + m
                                    return m - DAY_START_MIN  # 6 AM = 0
                                except Exception:
                                    return 0
                            def business_min_to_time_str(pos):
                                if pos < 1080:
                                    total_min = pos + DAY_START_MIN
                                    return f"{total_min//60:02d}:{total_min%60:02d}"
                                early = pos - 1080
                                return f"{early//60:02d}:{early%60:02d}"
                            
                            # Get unique branches
                            branches = sorted(df_timeline["Branch ID"].unique())
                            
                            # State colors
                            state_colors = {
                                'Opened': COLORS['success'],  # Green for open
                                'Partially Closed': COLORS['warning'],  # Orange/Yellow for partial
                                'Closed': COLORS['danger']  # Red for closed
                            }
                            
                            # Create timeline data for each branch
                            timeline_segments = []
                            
                            for branch in branches:
                                branch_events = df_timeline[df_timeline["Branch ID"] == branch].copy()
                                branch_events = branch_events.sort_values('time stamp')
                                
                                # Convert times to business-day minutes (0 = 6 AM, 1320 = 4 AM next day)
                                branch_events['minutes'] = branch_events['time stamp'].apply(time_to_business_minutes)
                                
                                # Determine state for each event
                                branch_events['state'] = branch_events['event'].apply(
                                    lambda x: 'Opened' if 'open' in x.lower() 
                                             else 'Partially Closed' if 'partial' in x.lower()
                                             else 'Closed' if 'close' in x.lower()
                                             else None
                                )
                                
                                # Remove events with unknown states
                                branch_events = branch_events[branch_events['state'].notna()]
                                
                                if len(branch_events) == 0:
                                    continue
                                
                                # Create segments: from one event to the next (or end of business day at 4 AM)
                                current_state = None
                                current_start = 0  # Start of business day (6:00 AM)
                                
                                for idx, row in branch_events.iterrows():
                                    event_time = row['minutes']
                                    new_state = row['state']
                                    
                                    # If we have a previous state, create a segment up to this event
                                    if current_state is not None:
                                        timeline_segments.append({
                                            'Branch': f'Branch {branch}',
                                            'BranchID': branch,
                                            'State': current_state,
                                            'Start': current_start,
                                            'End': event_time,
                                            'StartTime': business_min_to_time_str(current_start),
                                            'EndTime': row['time stamp']
                                        })
                                    
                                    # Update state and start time
                                    current_state = new_state
                                    current_start = event_time
                                
                                # Add final segment to end of business day (4:00 AM = 1320)
                                if current_state is not None:
                                    timeline_segments.append({
                                        'Branch': f'Branch {branch}',
                                        'BranchID': branch,
                                        'State': current_state,
                                        'Start': current_start,
                                        'End': BUSINESS_DAY_END,
                                        'StartTime': business_min_to_time_str(current_start),
                                        'EndTime': "04:00"
                                    })
                            
                            if timeline_segments:
                                # Create horizontal timeline (Gantt chart style) using horizontal bar chart
                                fig_timeline = go.Figure()
                                
                                # Create y-axis positions for branches
                                branch_positions = {f'Branch {b}': i for i, b in enumerate(branches)}
                                
                                # Group segments by state for legend
                                state_groups = {}
                                for segment in timeline_segments:
                                    state = segment['State']
                                    if state not in state_groups:
                                        state_groups[state] = []
                                    state_groups[state].append(segment)
                                
                                # Add segments for each state using horizontal bars
                                for state in ['Opened', 'Partially Closed', 'Closed']:
                                    if state in state_groups:
                                        state_segments = state_groups[state]
                                        
                                        # Prepare data for this state
                                        x_starts = []
                                        x_widths = []
                                        y_positions = []
                                        hover_texts = []
                                        
                                        for segment in state_segments:
                                            branch_name = segment['Branch']
                                            y_pos = branch_positions[branch_name]
                                            
                                            start_min = max(0, min(1320, segment['Start']))
                                            end_min = max(0, min(1320, segment['End']))
                                            width = max(0, end_min - start_min)
                                            
                                            x_starts.append(start_min)
                                            x_widths.append(width)
                                            y_positions.append(y_pos)
                                            
                                            hover_texts.append(
                                                f'<b>{branch_name}</b><br>'
                                                f'State: {state}<br>'
                                                f'From: {segment["StartTime"]}<br>'
                                                f'To: {segment["EndTime"]}<br>'
                                                f'Duration: {width//60}h {width%60}m'
                                            )
                                        
                                        # Add horizontal bar trace for this state
                                        fig_timeline.add_trace(go.Bar(
                                            x=x_widths,
                                            y=y_positions,
                                            base=x_starts,
                                            orientation='h',
                                            name=state,
                                            marker=dict(
                                                color=state_colors[state],
                                                line=dict(color='white', width=1)
                                            ),
                                            text=[f"{s['StartTime']}" for s in state_segments],
                                            textposition='inside',
                                            textfont=dict(size=9, color='white'),
                                            customdata=hover_texts,
                                            hovertemplate='%{customdata}<extra></extra>'
                                        ))
                                
                                # Add vertical lines for state transitions (event markers)
                                transition_times = set()
                                for segment in timeline_segments:
                                    if segment['Start'] > 0:  # Don't mark 00:00
                                        transition_times.add((segment['Start'], segment['Branch']))
                                
                                # Update layout (day = 6:00 AM to 4:00 AM, 1320 minutes)
                                fig_timeline.update_layout(
                                    title=f"Shutter State Timeline - {selected_date}<br><sub>Day: 6:00 AM to 4:00 AM • Colored segments show periods of each state</sub>",
                                    xaxis=dict(
                                        title="Time of Day",
                                        tickmode='array',
                                        tickvals=[0, 360, 720, 1080, 1320],
                                        ticktext=["06:00", "12:00", "18:00", "24:00", "04:00"],
                                        range=[0, 1320]
                                    ),
                                    yaxis=dict(
                                        title="Branch",
                                        tickmode='array',
                                        tickvals=list(range(len(branches))),
                                        ticktext=[f'Branch {b}' for b in branches],
                                        range=[-0.5, len(branches) - 0.5]
                                    ),
                                    plot_bgcolor='white',
                                    paper_bgcolor='white',
                                    height=max(400, len(branches) * 120),
                                    showlegend=True,
                                    legend=dict(
                                        orientation="h",
                                        yanchor="bottom",
                                        y=1.02,
                                        xanchor="right",
                                        x=1,
                                        title_text="State"
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
                                    text="No shutter events found for the selected filters",
                                    xref="paper", yref="paper",
                                    x=0.5, y=0.5, showarrow=False,
                                    font=dict(color='black')
                                )
                                fig_timeline.update_layout(
                                    title=f"Shutter State Timeline - {selected_date}",
                                    height=400
                                )
                                apply_chart_black_text(fig_timeline)
                                st.plotly_chart(fig_timeline, use_container_width=True)
                        elif "time stamp" in df_filtered.columns:
                            # Fallback if no Branch ID
                            st.warning("Branch ID not available in data")
                    
                        # Generate Reports Section
                        st.markdown("---")
                        st.markdown("### 📥 Generate Reports")
                        
                        col_report1, col_report2, col_report3 = st.columns(3)
                        
                        with col_report1:
                            # Report 1: Closed branches for specific date
                            try:
                                params_closed = {"date": selected_date.isoformat()}
                                if selected_area:
                                    params_closed["area"] = selected_area
                                closed_branches_data = _get_json(f"{API_BASE}shutter/closed-branches", params=params_closed)
                                if closed_branches_data:
                                    df_closed_report = pd.DataFrame(closed_branches_data)
                                    csv_closed = df_closed_report.to_csv(index=False)
                                    st.download_button(
                                        label="📄 Closed Branches Report",
                                        data=csv_closed,
                                        file_name=f"closed_branches_{selected_date}.csv",
                                        mime="text/csv",
                                        key="shutter_closed_report"
                                    )
                                else:
                                    st.download_button(
                                        label="📄 Closed Branches Report",
                                        data="Branch ID,Branch Name\n",
                                        file_name=f"closed_branches_{selected_date}.csv",
                                        mime="text/csv",
                                        key="shutter_closed_report",
                                        disabled=True
                                    )
                            except:
                                st.download_button(
                                    label="📄 Closed Branches Report",
                                    data="",
                                    file_name="closed_branches.csv",
                                    mime="text/csv",
                                    key="shutter_closed_report",
                                    disabled=True
                                )
                        
                        with col_report2:
                            # Report 2: Opened branches with opening time
                            try:
                                params_open = {"date": selected_date.isoformat(), "event": "open"}
                                if branch_id:
                                    params_open["branch"] = branch_id
                                if selected_area:
                                    params_open["area"] = selected_area
                                open_data = _get_json(f"{API_BASE}shutter/data", params=params_open)
                                if open_data:
                                    df_open_report = pd.DataFrame(open_data)
                                    # Select relevant columns
                                    if "Branch ID" in df_open_report.columns and "time stamp" in df_open_report.columns:
                                        df_open_report = df_open_report[["Branch ID", "time stamp", "event"]].copy()
                                        df_open_report.columns = ["Branch ID", "Opening Time", "Event"]
                                        csv_open = df_open_report.to_csv(index=False)
                                        st.download_button(
                                            label="📄 Opened Branches Report",
                                            data=csv_open,
                                            file_name=f"opened_branches_{selected_date}.csv",
                                            mime="text/csv",
                                            key="shutter_opened_report"
                                        )
                                    else:
                                        st.download_button(
                                            label="📄 Opened Branches Report",
                                            data="Branch ID,Opening Time,Event\n",
                                            file_name=f"opened_branches_{selected_date}.csv",
                                            mime="text/csv",
                                            key="shutter_opened_report",
                                            disabled=True
                                        )
                                else:
                                    st.download_button(
                                        label="📄 Opened Branches Report",
                                        data="Branch ID,Opening Time,Event\n",
                                        file_name=f"opened_branches_{selected_date}.csv",
                                        mime="text/csv",
                                        key="shutter_opened_report",
                                        disabled=True
                                    )
                            except:
                                st.download_button(
                                    label="📄 Opened Branches Report",
                                    data="",
                                    file_name="opened_branches.csv",
                                    mime="text/csv",
                                    key="shutter_opened_report",
                                    disabled=True
                                )
                        
                        with col_report3:
                            # Report 3: Shutter states for single date
                            try:
                                if not (shutter_state and shutter_state.lower() == "closed"):
                                    # Get all shutter states for the selected date
                                    params_states = {"date": selected_date.isoformat()}
                                    if branch_id:
                                        params_states["branch"] = branch_id
                                    if selected_area:
                                        params_states["area"] = selected_area
                                    states_data = _get_json(f"{API_BASE}shutter/data", params=params_states)
                                    if states_data:
                                        df_states_report = pd.DataFrame(states_data)
                                        csv_states = df_states_report.to_csv(index=False)
                                        st.download_button(
                                            label="📄 Shutter States Report",
                                            data=csv_states,
                                            file_name=f"shutter_states_{selected_date}.csv",
                                            mime="text/csv",
                                            key="shutter_states_report"
                                        )
                                    else:
                                        st.download_button(
                                            label="📄 Shutter States Report",
                                            data="",
                                            file_name="shutter_states.csv",
                                            mime="text/csv",
                                            key="shutter_states_report",
                                            disabled=True
                                        )
                                else:
                                    st.download_button(
                                        label="📄 Shutter States Report",
                                        data="",
                                        file_name="shutter_states.csv",
                                        mime="text/csv",
                                        key="shutter_states_report",
                                        disabled=True
                                    )
                            except:
                                st.download_button(
                                    label="📄 Shutter States Report",
                                    data="",
                                    file_name="shutter_states.csv",
                                    mime="text/csv",
                                    key="shutter_states_report",
                                    disabled=True
                                )
                        
                        # Show data table (only if not showing closed branches)
                        if not (shutter_state and shutter_state.lower() == "closed"):
                            st.markdown("### 📋 Event Details")
                            st.dataframe(df_filtered, use_container_width=True)
                else:
                    st.warning("No data for this combination of branch and date.")
            except Exception as e:
                st.error(f"Error fetching data: {e}")
        else:
            st.info("Please select a date")
    
    else:
        # Date interval analysis - removed graph of shutter state time as requested
        if start_date and end_date:
            try:
                start_str = start_date.isoformat()
                end_str = end_date.isoformat()
                
                params = {"start_date": start_str, "end_date": end_str}
                if branch_id:
                    params["branch"] = branch_id
                if selected_area:
                    params["area"] = selected_area
                
                data = _get_json(f"{API_BASE}shutter/data", params=params)
                
                if data:
                    df = pd.DataFrame(data)
                    df["Date"] = pd.to_datetime(df["Date"], format="mixed", errors="coerce").dt.date
                    
                    # Calculate KPI metrics
                    unique_branches = df["Branch ID"].nunique() if "Branch ID" in df.columns else 0
                    unique_dates = df["Date"].nunique() if "Date" in df.columns else 0
                    
                    # Display KPI Cards
                    kpi_col1, kpi_col2 = st.columns(2)
                    
                    with kpi_col1:
                        st.metric("Branches", unique_branches)
                    
                    with kpi_col2:
                        st.metric("Days", unique_dates)
                    
                    # Generate Reports Section for Date Interval
                    st.markdown("---")
                    st.markdown("### 📥 Generate Reports")
                    
                    col_report1, col_report2, col_report3 = st.columns(3)
                    
                    with col_report1:
                        # Report 1: Closed branches for date range
                        try:
                            # Get closed branches for each date in range
                            closed_branches_all = []
                            current_date = start_date
                            while current_date <= end_date:
                                params_closed = {"date": current_date.isoformat()}
                                if selected_area:
                                    params_closed["area"] = selected_area
                                closed_data = _get_json(f"{API_BASE}shutter/closed-branches", params=params_closed)
                                for branch in (closed_data or []):
                                    branch["Date"] = current_date.isoformat()
                                    closed_branches_all.append(branch)
                                current_date += pd.Timedelta(days=1)
                            
                            if closed_branches_all:
                                df_closed_report = pd.DataFrame(closed_branches_all)
                                csv_closed = df_closed_report.to_csv(index=False)
                                st.download_button(
                                    label="📄 Closed Branches Report",
                                    data=csv_closed,
                                    file_name=f"closed_branches_{start_date}_to_{end_date}.csv",
                                    mime="text/csv",
                                    key="shutter_closed_report_interval"
                                )
                            else:
                                st.download_button(
                                    label="📄 Closed Branches Report",
                                    data="Branch ID,Branch Name,Date\n",
                                    file_name=f"closed_branches_{start_date}_to_{end_date}.csv",
                                    mime="text/csv",
                                    key="shutter_closed_report_interval",
                                    disabled=True
                                )
                        except Exception as e:
                            st.download_button(
                                label="📄 Closed Branches Report",
                                data="",
                                file_name="closed_branches.csv",
                                mime="text/csv",
                                key="shutter_closed_report_interval",
                                disabled=True
                            )
                    
                    with col_report2:
                        # Report 2: Opened branches with opening time for date range
                        try:
                            params_open = {"start_date": start_date.isoformat(), "end_date": end_date.isoformat(), "event": "open"}
                            if branch_id:
                                params_open["branch"] = branch_id
                            if selected_area:
                                params_open["area"] = selected_area
                            open_data = _get_json(f"{API_BASE}shutter/data", params=params_open)
                            if open_data:
                                df_open_report = pd.DataFrame(open_data)
                                # Select relevant columns
                                if "Branch ID" in df_open_report.columns and "time stamp" in df_open_report.columns:
                                    df_open_report = df_open_report[["Branch ID", "Date", "time stamp", "event"]].copy()
                                    df_open_report.columns = ["Branch ID", "Date", "Opening Time", "Event"]
                                    csv_open = df_open_report.to_csv(index=False)
                                    st.download_button(
                                        label="📄 Opened Branches Report",
                                        data=csv_open,
                                        file_name=f"opened_branches_{start_date}_to_{end_date}.csv",
                                        mime="text/csv",
                                        key="shutter_opened_report_interval"
                                    )
                                else:
                                    st.download_button(
                                        label="📄 Opened Branches Report",
                                        data="Branch ID,Date,Opening Time,Event\n",
                                        file_name=f"opened_branches_{start_date}_to_{end_date}.csv",
                                        mime="text/csv",
                                        key="shutter_opened_report_interval",
                                        disabled=True
                                    )
                            else:
                                st.download_button(
                                    label="📄 Opened Branches Report",
                                    data="Branch ID,Date,Opening Time,Event\n",
                                    file_name=f"opened_branches_{start_date}_to_{end_date}.csv",
                                    mime="text/csv",
                                    key="shutter_opened_report_interval",
                                    disabled=True
                                )
                        except:
                            st.download_button(
                                label="📄 Opened Branches Report",
                                data="",
                                file_name="opened_branches.csv",
                                mime="text/csv",
                                key="shutter_opened_report_interval",
                                disabled=True
                            )
                    
                    with col_report3:
                        # Report 3: Shutter states along days
                        try:
                            csv_states = df.to_csv(index=False)
                            st.download_button(
                                label="📄 Shutter States Report",
                                data=csv_states,
                                file_name=f"shutter_states_{start_date}_to_{end_date}.csv",
                                mime="text/csv",
                                key="shutter_states_report_interval"
                            )
                        except:
                            st.download_button(
                                label="📄 Shutter States Report",
                                data="",
                                file_name="shutter_states.csv",
                                mime="text/csv",
                                key="shutter_states_report_interval",
                                disabled=True
                            )
                    
                    # Show data table only (graph removed as requested)
                    st.markdown("### 📋 Shutter State Data")
                    st.dataframe(df, use_container_width=True)
                else:
                    st.warning("No data available for the selected date range.")
            except Exception as e:
                st.error(f"Error fetching data: {e}")
        else:
            st.info("Please select date range to view the analysis.")
