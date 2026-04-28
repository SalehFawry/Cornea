"""
Database filtering module.
Contains all filtering logic for database queries.
Can be enabled/disabled via filter_db parameter.
"""
import pandas as pd


def filter_employee_data(df: pd.DataFrame, filter_db: bool = True) -> pd.DataFrame:
    """
    Apply filtering to employee data.
    
    Args:
        df: DataFrame with employee data
        filter_db: If True, apply filters. If False, return data as-is.
    
    Returns:
        Filtered DataFrame
    """
    if not filter_db or df.empty:
        return df
    
    # Filter out invalid dates (like '0001-01-01') before processing
    if "Date" in df.columns:
        # Parse dates and filter out invalid ones (NaT values)
        df["Date_parsed"] = pd.to_datetime(df["Date"], errors='coerce')
        # Filter out rows with invalid dates (NaT) or dates before 1900 (likely invalid)
        df = df[df["Date_parsed"].notna()].copy()
        df = df[df["Date_parsed"].dt.year >= 1900].copy()
        # Drop the temporary parsed column
        df = df.drop(columns=["Date_parsed"])
    
    if df.empty:
        return df
    
    # Filter out any rows where date conversion failed
    if "Date" in df.columns:
        df["Date"] = pd.to_datetime(df["Date"], errors='coerce').dt.strftime("%Y-%m-%dT00:00:00")
        # Filter out any rows where date conversion failed
        df = df[df["Date"].notna()].copy()
    
    return df


def filter_customer_data(df: pd.DataFrame, filter_db: bool = True) -> pd.DataFrame:
    """
    Apply filtering to customer data.
    
    Args:
        df: DataFrame with customer data (service_time and waiting_time in hours)
        filter_db: If True, apply filters. If False, return data as-is.
    
    Returns:
        Filtered DataFrame
    """
    if not filter_db or df.empty:
        return df
    
    # Filter: Exclude customers where both service_time AND waiting_time are less than 3/60 hours (3 minutes)
    # Note: service_time and waiting_time are in hours in the database
    if "service time" in df.columns and "waiting time" in df.columns:
        # Convert to hours for comparison (if already converted to minutes, convert back)
        # Check if values are in minutes (typically > 1) or hours (typically < 1)
        # We'll work with the original hours from database
        # Since the conversion to minutes happens after loading, we need to check the original values
        # But in load_customer_data, conversion happens before this would be called
        # So we need to check if values are in minutes or hours
        
        # If values are already in minutes (converted), convert threshold to minutes
        # Threshold: 3/60 hours = 3 minutes
        threshold_minutes = 0.5
        
        # Check if data is in minutes (if max value > 10, likely in minutes)
        if df["service time"].max() > 10 or df["waiting time"].max() > 10:
            # Data is in minutes, use minute threshold
            df = df[
                ~((df["service time"] < threshold_minutes) & (df["waiting time"] < threshold_minutes))
            ].copy()
        else:
            # Data is in hours, use hour threshold (3/60)
            threshold_hours = 0.5 / 60.0
            df = df[
                ~((df["service time"] < threshold_hours) & (df["waiting time"] < threshold_hours))
            ].copy()
    
    return df


def filter_shutter_data(df: pd.DataFrame, filter_db: bool = True) -> pd.DataFrame:
    """
    Apply filtering to shutter data.
    
    Args:
        df: DataFrame with shutter data
        filter_db: If True, apply filters. If False, return data as-is.
    
    Returns:
        Filtered DataFrame
    """
    if not filter_db or df.empty:
        return df
    
    # Currently no specific filters for shutter data
    # Add any shutter-specific filters here if needed in the future
    
    return df


def filter_alert_data(df: pd.DataFrame, filter_db: bool = True) -> pd.DataFrame:
    """
    Apply filtering to alert data.
    
    Args:
        df: DataFrame with alert data
        filter_db: If True, apply filters. If False, return data as-is.
    
    Returns:
        Filtered DataFrame
    """
    if not filter_db or df.empty:
        return df
    
    # Currently no specific filters for alert data
    # Add any alert-specific filters here if needed in the future
    
    return df


def filter_customer_data_raw(df: pd.DataFrame, filter_db: bool = True) -> pd.DataFrame:
    """
    Apply filtering to customer data BEFORE conversion to minutes.
    This is used when data is still in hours format from the database.
    
    Args:
        df: DataFrame with customer data (service_time and waiting_time in hours)
        filter_db: If True, apply filters. If False, return data as-is.
    
    Returns:
        Filtered DataFrame
    """
    if not filter_db or df.empty:
        return df
    
    # Filter: Exclude customers where both service_time AND waiting_time are less than 3/60 hours (3 minutes)
    # service_time and waiting_time are in hours in the database
    threshold_hours = 1.5 / 60.0  # 1 minutes in hours
    
    if "service time" in df.columns and "waiting time" in df.columns:
        # Only filter if both values are not NaN and both are less than threshold
        mask = (
            df["service time"].notna() & 
            df["waiting time"].notna() &
            (df["service time"] < threshold_hours) & 
            (df["waiting time"] < threshold_hours)
        )
        df = df[~mask].copy()
    elif "service_time" in df.columns and "waiting_time" in df.columns:
        # Handle snake_case column names
        mask = (
            df["service_time"].notna() & 
            df["waiting_time"].notna() &
            (df["service_time"] < threshold_hours) & 
            (df["waiting_time"] < threshold_hours)
        )
        df = df[~mask].copy()
    
    return df

