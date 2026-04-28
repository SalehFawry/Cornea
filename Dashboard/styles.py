"""
Custom CSS for Fawry Plus branding and dashboard styling.
Supports both light and dark mode (via system preference and Streamlit Settings > Theme).
"""
CUSTOM_CSS = """
<style>
    /* ========== Theme-aware variables (light by default) ========== */
    :root {
        --fawry-yellow: #FFD700;
        --fawry-blue: #0066CC;
        --fawry-maroon: #800020;
        --fawry-light-blue: #E6F2FF;
        /* Surfaces and text that adapt to theme */
        --app-surface: #ffffff;
        --app-surface-secondary: #f8f9fa;
        --app-text: #333333;
        --app-text-muted: #666666;
        --app-border: rgba(0, 0, 0, 0.08);
        --app-shadow: rgba(0, 0, 0, 0.08);
        --app-shadow-sm: rgba(0, 0, 0, 0.05);
    }
    
    /* Dark mode: when system prefers dark or Streamlit theme is dark */
    @media (prefers-color-scheme: dark) {
        :root {
            --app-surface: #1e1e2e;
            --app-surface-secondary: #252536;
            --app-text: #e4e4e7;
            --app-text-muted: #a1a1aa;
            --app-border: rgba(255, 255, 255, 0.1);
            --app-shadow: rgba(0, 0, 0, 0.3);
            --app-shadow-sm: rgba(0, 0, 0, 0.2);
        }
    }
    
    /* Streamlit injects theme; when main has dark background, our custom elements adapt */
    [data-testid="stAppViewContainer"] [data-theme="dark"],
    .stApp [data-theme="dark"] {
        --app-surface: #1e1e2e;
        --app-surface-secondary: #252536;
        --app-text: #e4e4e7;
        --app-text-muted: #a1a1aa;
        --app-border: rgba(255, 255, 255, 0.1);
        --app-shadow: rgba(0, 0, 0, 0.3);
        --app-shadow-sm: rgba(0, 0, 0, 0.2);
    }
    
    .main-header {
        font-size: 3rem;
        font-weight: bold;
        background: linear-gradient(90deg, var(--fawry-blue) 0%, var(--fawry-maroon) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-align: center;
        margin-bottom: 2rem;
    }
    
    .page-header {
        background: linear-gradient(135deg, var(--fawry-blue) 0%, var(--fawry-yellow) 100%);
        padding: 0.75rem 1rem;
        border-radius: 10px;
        color: white;
        text-align: center;
        margin-bottom: 1rem;
        box-shadow: 0 2px 8px rgba(0, 102, 204, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
    }
    
    .page-header h1 {
        text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.2);
        margin: 0;
        font-size: 1.5rem;
    }
    
    .page-header p {
        margin: 0.25rem 0 0 0;
        font-size: 0.85rem;
    }
    
    .metric-card {
        background: var(--app-surface);
        padding: 1.5rem;
        border-radius: 10px;
        box-shadow: 0 2px 8px var(--app-shadow);
        border-left: 4px solid var(--fawry-blue);
    }
    
    .metric-card h3 {
        font-size: 0.9rem;
        color: var(--app-text-muted);
        margin: 0 0 0.5rem 0;
        font-weight: 500;
    }
    
    .metric-card .value {
        font-size: 2rem;
        font-weight: bold;
        color: var(--app-text);
        margin: 0;
    }
    
    .filter-section {
        background: var(--app-surface);
        padding: 0.75rem;
        border-radius: 10px;
        box-shadow: 0 2px 4px var(--app-shadow-sm);
        margin-bottom: 1rem;
    }
    
    .stMetric {
        background: var(--app-surface) !important;
        padding: 1.2rem;
        border-radius: 10px;
        border-left: 4px solid var(--fawry-blue);
        box-shadow: 0 2px 6px var(--app-shadow);
    }
    
    .stMetric label {
        font-size: 0.85rem;
        color: var(--app-text-muted) !important;
        font-weight: 500;
    }
    
    .stMetric [data-testid="stMetricValue"] {
        font-size: 1.8rem;
        font-weight: bold;
        color: var(--fawry-blue);
    }
    
    /* Sidebar: keep brand gradient in light mode, subtle in dark */
    [data-testid="stSidebar"] {
        background: linear-gradient(180deg, var(--fawry-yellow) 0%, #FFE44D 50%, var(--fawry-light-blue) 100%);
    }
    
    @media (prefers-color-scheme: dark) {
        [data-testid="stSidebar"] {
            background: linear-gradient(180deg, #2d2d3d 0%, #252536 50%, #1e1e2e 100%);
            border-right: 1px solid var(--app-border);
        }
    }
    
    [data-testid="stSidebar"] .sidebar-content {
        background: transparent;
    }
    
    .logo-container {
        text-align: center;
        padding: 0.5rem 0;
        margin-bottom: 1rem;
    }
    
    .logo-container img {
        max-width: 60%;
        height: auto;
        border-radius: 8px;
    }
    
    .brand-name {
        font-size: 1.8rem;
        font-weight: bold;
        color: var(--fawry-blue);
        margin-top: 0.5rem;
        text-align: center;
    }
    
    .brand-tagline {
        font-size: 0.9rem;
        color: var(--app-text-muted);
        text-align: center;
        margin-top: 0.25rem;
        font-style: italic;
    }
    
    .main .block-container {
        padding-top: 2rem;
        padding-left: 2rem;
        padding-right: 2rem;
    }
    
    .nav-button-container {
        background: var(--app-surface);
        padding: 1rem;
        border-radius: 10px;
        margin-bottom: 1rem;
        box-shadow: 0 2px 4px var(--app-shadow-sm);
    }
</style>
"""
