"""
Shared helper functions for the Streamlit app (no Streamlit imports for testability).
"""
import re
import requests
import pandas as pd

from config import DEFAULT_FILTER_DATE


def _default_date_value(dates, use_last=False):
    """Return default date for picker: always use current day (DEFAULT_FILTER_DATE)."""
    return DEFAULT_FILTER_DATE


def _get_json(url, params=None, default=None):
    """GET URL and return JSON. On empty/invalid response or error, return default (default: [])."""
    if default is None:
        default = []
    try:
        r = requests.get(url, params=params, timeout=30)
        text = (r.text or "").strip()
        if not text:
            return default
        return r.json()
    except (requests.RequestException, ValueError):
        return default


def format_alert_type(alert_type):
    """Convert camelCase/PascalCase alert types to Title Case with spaces."""
    formatted = re.sub(r"(?<!^)(?=[A-Z])", " ", alert_type)
    return formatted


def format_working_hours(hours_decimal):
    """Format decimal hours as 'x hours y mins' or 'y mins' if less than 1 hour."""
    try:
        hours_decimal = float(hours_decimal) if hours_decimal is not None else 0.0
    except (ValueError, TypeError):
        return "0 mins"

    if pd.isna(hours_decimal) or hours_decimal <= 0:
        return "0 mins"

    hours = int(hours_decimal)
    minutes = int(round((hours_decimal - hours) * 60))

    if minutes >= 60:
        hours += 1
        minutes = 0

    if hours == 0:
        return f"{minutes} mins"
    elif minutes == 0:
        return f"{hours} hour{'s' if hours != 1 else ''}"
    else:
        return f"{hours} hour{'s' if hours != 1 else ''} {minutes} min{'s' if minutes != 1 else ''}"


def apply_chart_black_text(fig):
    """
    Force all chart text to black and chart background to white so charts are readable in both light and dark mode.
    Call this on a Plotly figure before passing it to st.plotly_chart().
    """
    fig.update_layout(
        font_color="black",
        title_font_color="black",
        title_subtitle_font_color="black",
        legend_font_color="black",
        legend_title_font_color="black",
        hoverlabel_font_color="black",
        paper_bgcolor="white",
        plot_bgcolor="white",
    )
    fig.update_xaxes(tickfont=dict(color="black"), title_font=dict(color="black"))
    fig.update_yaxes(tickfont=dict(color="black"), title_font=dict(color="black"))
    return fig
