"""
Smart City Traffic & Public Transit Analytics - Streamlit Dashboard.

Reads the results of the Hadoop MapReduce jobs (from MongoDB or local MapReduce outputs)
and the trained ML model (ml/model.joblib), rendering four interactive analytics tabs:
1. Route Congestion: Average speed, traffic volume, and corridor ranking.
2. Transit Stop Map: Geospatial map colored by worst corridor congestion.
3. Hourly Ridership: Stop-level boardings broken down by passenger demographics.
4. Congestion Forecast: Live ML predictions based on route, hour, weather, and day type.

Supports light/dark mode and offline/standalone execution.
"""
import glob
import json
import os

import folium
import joblib
import pandas as pd
import plotly.graph_objects as go
import streamlit as st
from folium.plugins import Fullscreen
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError
from streamlit_folium import st_folium

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = "smartcity"
MODEL_PATH = os.path.join(PROJECT_ROOT, "ml", "model.joblib")
METRICS_PATH = os.path.join(PROJECT_ROOT, "ml", "metrics.json")
CACHE_PATH = os.path.join(PROJECT_ROOT, "output", "dashboard_cache.json")
FONT_STACK = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"

CORRIDOR_NAMES = {
    "ROUTE_101": "Outer Ring Road Sector 4",
    "ROUTE_102": "MG Road Corridor",
    "ROUTE_103": "Airport Expressway",
    "ROUTE_204": "Old Town Circular",
    "ROUTE_305": "Riverside Boulevard",
    "ROUTE_410": "Tech Park Link Road",
    "ROUTE_500": "University Belt",
    "ROUTE_600": "Suburb Connector",
    "ROUTE_701": "Industrial Belt Road",
    "ROUTE_802": "Lakeside Drive",
    "ROUTE_903": "Stadium Express",
    "ROUTE_150": "Harbor Road",
}

STATUS = {
    "HEAVY_CONGESTION": {"color": "#d03b3b", "icon": "🔴", "label": "Heavy congestion"},
    "MODERATE_TRAFFIC": {"color": "#fab219", "icon": "🟡", "label": "Moderate traffic"},
    "NORMAL": {"color": "#0ca30c", "icon": "🟢", "label": "Normal flow"},
}
STATUS_ORDER = ["NORMAL", "MODERATE_TRAFFIC", "HEAVY_CONGESTION"]

st.set_page_config(page_title="CityFlow - Smart City Transit Analytics", page_icon="🚦", layout="wide")

dark_mode = st.sidebar.toggle("🌙 Dark mode", key="dark_mode", help="Switch dashboard theme")

if dark_mode:
    INK_PRIMARY = "#ffffff"
    INK_SECONDARY = "#c3c2b7"
    INK_MUTED = "#898781"
    GRIDLINE = "#2c2c2a"
    SURFACE = "#1a1a19"
    PAGE = "#0d0d0d"
    BORDER = "rgba(255,255,255,0.12)"
    PASSENGER_COLORS = {"general": "#3987e5", "student": "#d95926", "senior": "#199e70"}
    MAP_TILES = "cartodbdark_matter"
else:
    INK_PRIMARY = "#0b0b0b"
    INK_SECONDARY = "#52514e"
    INK_MUTED = "#898781"
    GRIDLINE = "#e1e0d9"
    SURFACE = "#fcfcfb"
    PAGE = "#f9f9f7"
    BORDER = "rgba(11,11,11,0.10)"
    PASSENGER_COLORS = {"general": "#2a78d6", "student": "#eb6834", "senior": "#1baf7a"}
    MAP_TILES = "cartodbpositron"

HOVERLABEL = dict(bgcolor=SURFACE, bordercolor=BORDER, font=dict(family=FONT_STACK, size=12, color=INK_PRIMARY))

st.markdown(
    f"""
    <style>
    .stApp {{ background: {PAGE}; color: {INK_PRIMARY}; }}
    #MainMenu, footer {{ visibility: hidden; }}
    .block-container {{ padding-top: 1.2rem; max-width: 1250px; }}

    [data-testid="stHeader"] {{ background: transparent; }}
    [data-testid="stSidebar"] {{ background: {SURFACE}; border-right: 1px solid {BORDER}; }}
    [data-testid="stSidebar"] *:not(a) {{ color: {INK_PRIMARY}; }}
    .stApp p, .stApp span, .stApp li, .stApp label {{ color: {INK_PRIMARY}; }}
    div[data-baseweb="select"] > div, div[data-baseweb="popover"], ul[role="listbox"] {{
        background: {SURFACE} !important; color: {INK_PRIMARY} !important; border-color: {BORDER} !important;
    }}
    li[role="option"] {{ color: {INK_PRIMARY} !important; }}

    .hero {{
        background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #0284c7 100%);
        border-radius: 14px;
        padding: 24px 28px;
        margin-bottom: 16px;
        color: #ffffff;
        box-shadow: 0 6px 20px rgba(37,99,235,0.22);
    }}
    .hero h1 {{ margin: 0 0 6px 0; font-size: 1.7rem; font-weight: 700; color: #ffffff; }}
    .hero p {{ margin: 0; opacity: 0.92; font-size: 0.95rem; color: #f1f5f9; }}
    .hero .pipeline {{
        margin-top: 12px; font-size: 0.82rem; opacity: 0.88;
        letter-spacing: 0.02em; color: #e2e8f0; font-weight: 500;
    }}

    .kpi-row {{ display: flex; gap: 14px; margin-bottom: 18px; flex-wrap: wrap; }}
    .kpi-card {{
        flex: 1 1 210px;
        background: {SURFACE};
        border: 1px solid {BORDER};
        border-radius: 12px;
        padding: 14px 18px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }}
    .kpi-card:hover {{
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0,0,0,0.08);
    }}
    .kpi-card .kpi-icon {{ font-size: 1.1rem; margin-bottom: 2px; }}
    .kpi-card .kpi-label {{ color: {INK_SECONDARY}; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }}
    .kpi-card .kpi-value {{ color: {INK_PRIMARY}; font-size: 1.75rem; font-weight: 700; line-height: 1.1; margin: 4px 0; }}
    .kpi-card .kpi-sub {{ color: {INK_MUTED}; font-size: 0.75rem; }}

    .status-badge {{
        display: inline-flex; align-items: center; gap: 6px;
        padding: 3px 10px; border-radius: 999px; margin-right: 6px; margin-bottom: 6px;
        border: 1px solid currentColor; font-size: 0.8rem; font-weight: 600;
        background: {SURFACE};
    }}
    .section-title {{ font-size: 1.05rem; font-weight: 700; color: {INK_PRIMARY}; margin: 6px 0 10px 0; }}
    .section-sub {{ color: {INK_SECONDARY}; font-size: 0.85rem; margin: -6px 0 14px 0; }}
    </style>
    """,
    unsafe_allow_html=True,
)


@st.cache_resource
def get_db():
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=1500)
        client.admin.command("ping")
        return client[DB_NAME]
    except (ServerSelectionTimeoutError, Exception):
        return None


@st.cache_data
def load_data_from_disk():
    # 1. Try pre-generated dashboard cache JSON
    if os.path.exists(CACHE_PATH):
        try:
            with open(CACHE_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("routes_summary", []), data.get("transit_stops", []), data.get("stop_ridership", [])
        except Exception:
            pass

    # 2. Parse from output/ directory files directly
    routes = []
    traffic_paths = sorted(glob.glob(os.path.join(PROJECT_ROOT, "output", "processed_traffic", "part-*")))
    for p in traffic_paths:
        with open(p, "r", encoding="utf-8", errors="replace") as f:
            for line in f:
                line = line.strip()
                if line:
                    route_id, val = line.split("\t", 1)
                    avg_speed, total_pings, congestion_level = val.split(",")
                    routes.append({
                        "route_id": route_id,
                        "avg_speed_kmph": round(float(avg_speed), 2),
                        "total_pings": int(total_pings),
                        "congestion_level": congestion_level,
                        "corridor_name": CORRIDOR_NAMES.get(route_id, route_id),
                    })

    # Stops from data/transit_stops.csv
    stops = []
    stops_csv = os.path.join(PROJECT_ROOT, "data", "transit_stops.csv")
    if os.path.exists(stops_csv):
        import csv
        with open(stops_csv, "r", encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f)
            for row in reader:
                stops.append({
                    "stop_id": row["stop_id"],
                    "stop_name": row["stop_name"],
                    "route_ids": row["route_ids"].split("|"),
                    "location": {
                        "type": "Point",
                        "coordinates": [float(row["longitude"]), float(row["latitude"])],
                    },
                })

    # Ridership from output/processed_ridership/part-*
    ridership = []
    ridership_paths = sorted(glob.glob(os.path.join(PROJECT_ROOT, "output", "processed_ridership", "part-*")))
    by_stop = {}
    for p in ridership_paths:
        with open(p, "r", encoding="utf-8", errors="replace") as f:
            for line in f:
                line = line.strip()
                if line:
                    stop_id, val = line.split("\t", 1)
                    hour, total, breakdown = val.split(",", 2)
                    counts = {}
                    for pair in breakdown.split(","):
                        if ":" in pair:
                            pt, cnt = pair.split(":")
                            counts[pt.lower()] = int(cnt)
                    by_stop.setdefault(stop_id, []).append({
                        "hour": int(hour),
                        "total_boardings": int(total),
                        **counts,
                    })

    for stop_id, hourly in by_stop.items():
        hourly.sort(key=lambda h: h["hour"])
        daily_boardings = sum(h["total_boardings"] for h in hourly)
        peak = max(hourly, key=lambda h: h["total_boardings"]) if hourly else {"hour": 0, "total_boardings": 0}
        ridership.append({
            "stop_id": stop_id,
            "daily_boardings": daily_boardings,
            "peak_hour": peak["hour"],
            "peak_hour_boardings": peak["total_boardings"],
            "hourly_ridership": hourly,
        })

    return routes, stops, ridership


@st.cache_data
def get_dashboard_data():
    db = get_db()
    source = "MongoDB"
    if db is not None:
        try:
            routes = list(db.routes_summary.find({}, {"_id": 0}))
            stops = list(db.transit_stops.find({}, {"_id": 0}))
            ridership = list(db.stop_ridership.find({}, {"_id": 0}))
            if routes and stops and ridership:
                return routes, stops, ridership, source
        except Exception:
            pass

    # Fallback to local files
    routes, stops, ridership = load_data_from_disk()
    source = "Local MapReduce Output (Offline)"
    return routes, stops, ridership, source


@st.cache_resource
def get_model():
    if not os.path.exists(MODEL_PATH):
        return None, None
    try:
        model = joblib.load(MODEL_PATH)
        metrics = {}
        if os.path.exists(METRICS_PATH):
            with open(METRICS_PATH, "r", encoding="utf-8") as f:
                metrics = json.load(f)
        return model, metrics
    except Exception:
        return None, None


def status_badge_html(level, extra_style=""):
    cfg = STATUS.get(level, {"color": "#888888", "icon": "⚪", "label": level})
    return f'<span class="status-badge" style="color:{cfg["color"]}; {extra_style}">{cfg["icon"]} {cfg["label"]}</span>'


def status_legend_html(levels):
    return f'<div>{"".join(status_badge_html(lvl) for lvl in levels)}</div>'


# Fetch data
routes, stops, ridership, data_source = get_dashboard_data()

# Hero Header
st.markdown(
    """
    <div class="hero">
        <h1>🚦 CityFlow — Smart City Traffic &amp; Public Transit Analytics</h1>
        <p>Big Data MapReduce batch analytics, NoSQL MongoDB storage, and Real-time ML Congestion Forecasting.</p>
        <div class="pipeline">HDFS &rarr; MapReduce (3 Hadoop Jobs) &rarr; MongoDB &rarr; RandomForest ML Model &rarr; Streamlit Analytics</div>
    </div>
    """,
    unsafe_allow_html=True,
)

with st.expander("ℹ️ How to read this dashboard", expanded=False):
    st.markdown(
        "- **Data Source**: Live synthetic telemetry (~160k GPS pings, ~60k RFID ticketing transactions).\n"
        "- 🔴 **Heavy Congestion**: Average speed < 15 km/h · 🟡 **Moderate Traffic**: 15–30 km/h · 🟢 **Normal Flow**: ≥ 30 km/h.\n"
        "- **Route Congestion**: Identifies bottleneck corridors and route-level speeds.\n"
        "- **Stop Map**: Interactive geospatial visualization of transit stations colored by corridor congestion.\n"
        "- **Ridership**: Hourly commuter trends per stop categorized by General, Student, and Senior demographics.\n"
        "- **Predict**: Real-time ML inference forecasting traffic conditions before they happen."
    )

if not routes:
    st.warning("No data found. Please run `python run_all.py` to generate data and execute MapReduce jobs.")
    st.stop()

routes_df = pd.DataFrame(routes)
ridership_by_stop = {r["stop_id"]: r for r in ridership}
total_daily_boardings = sum(r.get("daily_boardings", 0) for r in ridership)
heavy_count = int((routes_df["congestion_level"] == "HEAVY_CONGESTION").sum())

# KPI Row
st.markdown(
    f"""
    <div class="kpi-row">
        <div class="kpi-card">
            <div class="kpi-icon">🛣️</div>
            <div class="kpi-label">Routes Analyzed</div>
            <div class="kpi-value">{len(routes_df)}</div>
            <div class="kpi-sub">Traffic MapReduce job</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon">🔴</div>
            <div class="kpi-label">Heavy Congestion</div>
            <div class="kpi-value" style="color:{STATUS['HEAVY_CONGESTION']['color']}">{heavy_count}</div>
            <div class="kpi-sub">Corridors below 15 km/h</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon">📡</div>
            <div class="kpi-label">GPS Pings Processed</div>
            <div class="kpi-value">{int(routes_df['total_pings'].sum()):,}</div>
            <div class="kpi-sub">Validated telemetry records</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon">🎟️</div>
            <div class="kpi-label">Daily Boardings</div>
            <div class="kpi-value">{total_daily_boardings:,}</div>
            <div class="kpi-sub">Across {len(stops)} transit stops</div>
        </div>
    </div>
    """,
    unsafe_allow_html=True,
)

# Tabs
tab_overview, tab_map, tab_ridership, tab_predict = st.tabs(
    ["📊 Route Congestion", "🗺️ Stop Map", "🚌 Ridership Analysis", "🔮 Congestion Predictor"]
)

# Tab 1: Route Congestion
with tab_overview:
    col_t1, col_t2 = st.columns([2, 1])
    with col_t1:
        st.markdown('<div class="section-title">Average Speed by Route Corridor</div>', unsafe_allow_html=True)
        st.markdown('<div class="section-sub">Sorted from slowest to fastest - highlights major congestion bottlenecks.</div>', unsafe_allow_html=True)
    with col_t2:
        filter_status = st.multiselect(
            "Filter Congestion Status",
            options=STATUS_ORDER,
            default=STATUS_ORDER,
            format_func=lambda s: f"{STATUS[s]['icon']} {STATUS[s]['label']}",
        )

    filtered_df = routes_df[routes_df["congestion_level"].isin(filter_status)].sort_values("avg_speed_kmph")
    st.markdown(status_legend_html(filter_status), unsafe_allow_html=True)

    if not filtered_df.empty:
        fig = go.Figure(
            go.Bar(
                x=filtered_df["avg_speed_kmph"],
                y=filtered_df["route_id"] + " · " + filtered_df["corridor_name"],
                orientation="h",
                marker_color=[STATUS[lvl]["color"] for lvl in filtered_df["congestion_level"]],
                text=[f"{v:.1f} km/h" for v in filtered_df["avg_speed_kmph"]],
                textposition="outside",
                hovertemplate="<b>%{y}</b><br>Avg Speed: %{x:.1f} km/h<extra></extra>",
            )
        )
        fig.update_layout(
            plot_bgcolor=SURFACE,
            paper_bgcolor=SURFACE,
            font=dict(color=INK_PRIMARY, family=FONT_STACK, size=13),
            xaxis=dict(title="Average Speed (km/h)", gridcolor=GRIDLINE, zeroline=False),
            yaxis=dict(title=None, automargin=True),
            margin=dict(l=10, r=40, t=10, b=40),
            height=120 + 36 * len(filtered_df),
            showlegend=False,
            hoverlabel=HOVERLABEL,
        )
        st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})

    st.markdown('<div class="section-title" style="margin-top:12px;">Detailed Corridor Metrics</div>', unsafe_allow_html=True)
    table_df = filtered_df.copy()
    table_df["Status"] = table_df["congestion_level"].map(lambda lvl: f"{STATUS[lvl]['icon']} {STATUS[lvl]['label']}")
    table_df = table_df.rename(
        columns={
            "route_id": "Route ID",
            "corridor_name": "Corridor Name",
            "avg_speed_kmph": "Avg Speed (km/h)",
            "total_pings": "Total GPS Pings",
        }
    )[["Route ID", "Corridor Name", "Avg Speed (km/h)", "Total GPS Pings", "Status"]]
    
    st.dataframe(
        table_df,
        use_container_width=True,
        hide_index=True,
        column_config={
            "Avg Speed (km/h)": st.column_config.NumberColumn(format="%.2f"),
            "Total GPS Pings": st.column_config.NumberColumn(format="%d"),
        },
    )

# Tab 2: Map
with tab_map:
    st.markdown('<div class="section-title">Geospatial Transit Stops & Nearby Route Congestion</div>', unsafe_allow_html=True)
    st.markdown(status_legend_html(STATUS_ORDER), unsafe_allow_html=True)

    route_level = {r["route_id"]: r["congestion_level"] for r in routes}
    m = folium.Map(location=[12.9716, 77.5946], zoom_start=11, tiles=MAP_TILES)
    Fullscreen(position="topright").add_to(m)

    for s in stops:
        worst = "NORMAL"
        for rid in s.get("route_ids", []):
            lvl = route_level.get(rid, "NORMAL")
            if STATUS_ORDER.index(lvl) > STATUS_ORDER.index(worst):
                worst = lvl
        lon, lat = s["location"]["coordinates"]
        daily = ridership_by_stop.get(s["stop_id"], {}).get("daily_boardings", 0)
        color = STATUS[worst]["color"]
        popup_html = (
            f"<div style='font-family:{FONT_STACK}; font-size:13px;'>"
            f"<b>{s['stop_name']}</b> ({s['stop_id']})<br>"
            f"<b>Routes:</b> {', '.join(s['route_ids'])}<br>"
            f"<b>Daily Boardings:</b> {daily:,}<br>"
            f"<b>Status:</b> {STATUS[worst]['icon']} {STATUS[worst]['label']}"
            f"</div>"
        )
        folium.CircleMarker(
            location=[lat, lon],
            radius=8 + min(daily / 300, 10),
            color=color,
            weight=2,
            fill=True,
            fill_color=color,
            fill_opacity=0.6,
            popup=folium.Popup(popup_html, max_width=280),
        ).add_to(m)

    st_folium(m, width=None, height=500, returned_objects=[])

# Tab 3: Ridership Analysis
with tab_ridership:
    st.markdown('<div class="section-title">Hourly Ridership & Demographic Breakdown by Stop</div>', unsafe_allow_html=True)
    st.markdown('<div class="section-sub">Derived from MapReduce processing of RFID transit smartcard tap-ins.</div>', unsafe_allow_html=True)

    stop_names = {s["stop_id"]: s["stop_name"] for s in stops}
    sorted_ridership = sorted(ridership, key=lambda r: -r.get("daily_boardings", 0))
    selected_stop = st.selectbox(
        "Select Transit Stop",
        options=[r["stop_id"] for r in sorted_ridership],
        format_func=lambda sid: f"{stop_names.get(sid, sid)} ({ridership_by_stop[sid].get('daily_boardings', 0):,}/day)",
        help="Sorted from highest to lowest daily passenger volume",
    )
    doc = ridership_by_stop.get(selected_stop, {})
    hourly_df = pd.DataFrame(doc.get("hourly_ridership", [])).set_index("hour") if doc else pd.DataFrame()

    if not hourly_df.empty:
        fig2 = go.Figure()
        for ptype, color in PASSENGER_COLORS.items():
            if ptype in hourly_df.columns:
                fig2.add_trace(
                    go.Bar(
                        x=hourly_df.index,
                        y=hourly_df[ptype],
                        name=ptype.capitalize(),
                        marker_color=color,
                        hovertemplate=f"{ptype.capitalize()}: %{{y}} boardings<br>Hour: %{{x}}:00<extra></extra>",
                    )
                )
        fig2.update_layout(
            barmode="stack",
            plot_bgcolor=SURFACE,
            paper_bgcolor=SURFACE,
            font=dict(color=INK_PRIMARY, family=FONT_STACK, size=13),
            xaxis=dict(title="Hour of Day (00:00 - 23:00)", dtick=1, gridcolor=GRIDLINE, zeroline=False),
            yaxis=dict(title="Passenger Boardings", gridcolor=GRIDLINE, zeroline=False),
            legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="left", x=0),
            margin=dict(l=10, r=10, t=40, b=10),
            height=390,
            hovermode="x unified",
            hoverlabel=HOVERLABEL,
        )
        if "peak_hour" in doc:
            fig2.add_vline(x=doc["peak_hour"], line_dash="dot", line_color=INK_MUTED)
        st.plotly_chart(fig2, use_container_width=True, config={"displayModeBar": False})
        st.caption(f"Peak Hour: {doc.get('peak_hour', 0):02d}:00 with {doc.get('peak_hour_boardings', 0)} boardings · {doc.get('daily_boardings', 0):,} total daily boardings")

# Tab 4: ML Congestion Forecast
with tab_predict:
    st.markdown('<div class="section-title">Machine Learning Congestion Forecast</div>', unsafe_allow_html=True)
    st.markdown(
        "<div class=\"section-sub\">Predicts traffic congestion probability for any route corridor before it happens "
        "using a trained RandomForest model.</div>",
        unsafe_allow_html=True,
    )

    model, model_metrics = get_model()
    if model is None:
        st.info("No trained model found. Run `python ml/train_model.py` to train the model, then reload.")
    else:
        if model_metrics:
            trained_at = model_metrics.get("trained_at", "")[:19].replace("T", " ")
            st.caption(
                f"Model Accuracy: {model_metrics.get('accuracy', 0) * 100:.1f}% on "
                f"{model_metrics.get('test_rows', 0)} test samples · Trained {trained_at} UTC"
            )

        weather_options = ["CLEAR", "RAIN", "FOG"]
        route_options = sorted(routes_df["route_id"])
        corridor_lookup = dict(zip(routes_df["route_id"], routes_df["corridor_name"]))

        col1, col2, col3, col4 = st.columns(4)
        with col1:
            pred_route = st.selectbox(
                "Route Corridor",
                options=route_options,
                format_func=lambda r: f"{r} · {corridor_lookup.get(r, '')}",
            )
        with col2:
            pred_hour = st.slider("Hour of Day", 0, 23, 8)
        with col3:
            pred_weather = st.selectbox("Weather Condition", options=weather_options)
        with col4:
            pred_day_type = st.selectbox("Day of Week", options=["Weekday", "Weekend"])

        input_df = pd.DataFrame([{
            "route_id": pred_route,
            "hour": pred_hour,
            "weather": pred_weather,
            "is_weekend": pred_day_type == "Weekend",
        }])
        proba = model.predict_proba(input_df)[0]
        classes = list(model.classes_)
        predicted_label = classes[proba.argmax()]

        with st.container(border=True):
            st.markdown(
                f'<div>Predicted Status: {status_badge_html(predicted_label, "font-size:1.05rem; padding:6px 14px;")}</div>',
                unsafe_allow_html=True,
            )

            prob_fig = go.Figure(
                go.Bar(
                    x=[STATUS.get(c, {}).get("label", c) for c in classes],
                    y=proba,
                    marker_color=[STATUS.get(c, {}).get("color", "#888888") for c in classes],
                    text=[f"{p * 100:.1f}%" for p in proba],
                    textposition="outside",
                    hovertemplate="%{x}: %{y:.1%}<extra></extra>",
                )
            )
            prob_fig.update_layout(
                plot_bgcolor=SURFACE,
                paper_bgcolor=SURFACE,
                font=dict(color=INK_PRIMARY, family=FONT_STACK, size=13),
                yaxis=dict(title="Probability", range=[0, 1], gridcolor=GRIDLINE, tickformat=".0%"),
                xaxis=dict(title=None),
                margin=dict(l=10, r=10, t=30, b=10),
                height=280,
                showlegend=False,
                hoverlabel=HOVERLABEL,
            )
            st.plotly_chart(prob_fig, use_container_width=True, config={"displayModeBar": False})

            if model_metrics and model_metrics.get("feature_importance"):
                fi = model_metrics["feature_importance"]
                st.caption("Feature Importance Weights: " + ", ".join(f"{k} ({v * 100:.1f}%)" for k, v in fi.items()))

# Sidebar
with st.sidebar:
    st.markdown(f"**Data Mode:** `{data_source}`")
    if st.button("🔄 Refresh Data & Model", use_container_width=True):
        get_db.clear()
        get_dashboard_data.clear()
        get_model.clear()
        st.rerun()

    st.markdown("---")
    st.markdown("### 🛠️ Analytics Architecture")
    st.markdown(
        "- **HDFS Storage**: Raw GPS & RFID telemetry\n"
        "- **MapReduce**: 3 Streaming aggregate jobs\n"
        "- **MongoDB**: Ingestion with GeoJSON & 2dsphere indexing\n"
        "- **ML Layer**: RandomForest classification (~94% accuracy)\n"
        "- **Frontend**: Streamlit interactive dashboards"
    )
    st.markdown("### 🌐 Cluster Endpoints")
    st.markdown(
        "- [HDFS NameNode (9870)](http://localhost:9870)\n"
        "- [YARN ResourceManager (8088)](http://localhost:8088)\n"
        "- [Mongo Express UI (8081)](http://localhost:8081)"
    )
    st.markdown("---")
    st.caption("CityFlow Big Data Analytics Platform")
