"""
Loads the three MapReduce outputs and the dynamic stop reference data into
MongoDB, builds indexes, and exports a local cache for offline dashboard mode.

Usage:
    python mongo/load_data.py
"""
import csv
import glob
import json
import os
import sys

from pymongo import ASCENDING, GEOSPHERE, MongoClient
from pymongo.errors import ServerSelectionTimeoutError

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = "smartcity"
ROUTES_META = os.path.join(PROJECT_ROOT, "data", "routes_metadata.json")


def get_routes_metadata():
    """Dynamically loads corridor metadata if available, otherwise generates defaults."""
    if os.path.exists(ROUTES_META):
        try:
            with open(ROUTES_META, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def read_streaming_output(rel_pattern):
    """Hadoop Streaming writes tab-separated part-* files; read all of them."""
    full_pattern = os.path.join(PROJECT_ROOT, rel_pattern)
    paths = sorted(glob.glob(full_pattern))
    if not paths:
        paths = sorted(glob.glob(rel_pattern))
    if not paths:
        raise FileNotFoundError(
            f"No files matched '{rel_pattern}'. Run MapReduce pipeline first to produce output."
        )
    rows = []
    for path in paths:
        with open(path, newline="", encoding="utf-8", errors="replace") as f:
            for line in f:
                line = line.rstrip("\r\n")
                if line:
                    rows.append(line.split("\t"))
    return rows


def get_routes_summary_docs():
    meta = get_routes_metadata()
    rows = read_streaming_output("output/processed_traffic/part-*")
    docs = []
    for route_id, value in rows:
        avg_speed, total_pings, congestion_level = value.split(",")
        r_meta = meta.get(route_id, {})
        docs.append({
            "route_id": route_id,
            "avg_speed_kmph": round(float(avg_speed), 2),
            "total_pings": int(total_pings),
            "congestion_level": congestion_level,
            "corridor_name": r_meta.get("corridor_name", f"Corridor {route_id}"),
            "latitude": r_meta.get("latitude", 12.9716),
            "longitude": r_meta.get("longitude", 77.5946),
            "lat_dest": r_meta.get("lat_dest", 12.9716),
            "lon_dest": r_meta.get("lon_dest", 77.5946),
        })
    return docs


def get_route_hourly_profile_docs():
    rows = read_streaming_output("output/processed_traffic_hourly/part-*")
    docs = []
    for key, value in rows:
        route_id, hour, weather, day_type = key.split("|")
        avg_speed, sample_count, congestion_level = value.split(",")
        docs.append({
            "route_id": route_id,
            "hour": int(hour),
            "weather": weather,
            "is_weekend": day_type == "WEEKEND",
            "avg_speed_kmph": round(float(avg_speed), 2),
            "sample_count": int(sample_count),
            "congestion_level": congestion_level,
        })
    return docs


def get_stop_ridership_docs():
    rows = read_streaming_output("output/processed_ridership/part-*")
    by_stop = {}
    for stop_id, value in rows:
        hour, total, breakdown = value.split(",", 2)
        counts = {}
        for pair in breakdown.split(","):
            if ":" in pair:
                ptype, cnt = pair.split(":")
                counts[ptype.lower()] = int(cnt)
        by_stop.setdefault(stop_id, []).append({
            "hour": int(hour),
            "total_boardings": int(total),
            **counts,
        })

    docs = []
    for stop_id, hourly in by_stop.items():
        hourly.sort(key=lambda h: h["hour"])
        daily_boardings = sum(h["total_boardings"] for h in hourly)
        peak = max(hourly, key=lambda h: h["total_boardings"]) if hourly else {"hour": 0, "total_boardings": 0}
        docs.append({
            "stop_id": stop_id,
            "daily_boardings": daily_boardings,
            "peak_hour": peak["hour"],
            "peak_hour_boardings": peak["total_boardings"],
            "hourly_ridership": hourly,
        })
    return docs


def get_transit_stops_docs(csv_path="data/transit_stops.csv"):
    full_csv = os.path.join(PROJECT_ROOT, csv_path) if not os.path.isabs(csv_path) else csv_path
    if not os.path.exists(full_csv):
        full_csv = csv_path
    docs = []
    with open(full_csv, newline="", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        for row in reader:
            docs.append({
                "stop_id": row["stop_id"],
                "stop_name": row["stop_name"],
                "route_ids": row["route_ids"].split("|"),
                "location": {
                    "type": "Point",
                    "coordinates": [float(row["longitude"]), float(row["latitude"])],
                },
            })
    return docs


def create_indexes(db):
    db.routes_summary.create_index([("congestion_level", ASCENDING), ("avg_speed_kmph", ASCENDING)])
    db.routes_summary.create_index("route_id", unique=True)
    db.route_hourly_profile.create_index(
        [("route_id", ASCENDING), ("hour", ASCENDING), ("weather", ASCENDING), ("is_weekend", ASCENDING)]
    )
    db.route_hourly_profile.create_index("congestion_level")
    db.transit_stops.create_index([("location", GEOSPHERE)])
    db.transit_stops.create_index("stop_id", unique=True)
    db.stop_ridership.create_index("stop_id", unique=True)
    db.stop_ridership.create_index("daily_boardings")
    print("[OK] MongoDB indexes created.")


def save_local_cache(routes_docs, hourly_docs, ridership_docs, stops_docs):
    cache_dir = os.path.join(PROJECT_ROOT, "output")
    os.makedirs(cache_dir, exist_ok=True)
    cache_file = os.path.join(cache_dir, "dashboard_cache.json")
    cache_data = {
        "routes_summary": routes_docs,
        "stop_ridership": ridership_docs,
        "transit_stops": stops_docs,
        "total_hourly_profiles": len(hourly_docs),
    }
    with open(cache_file, "w", encoding="utf-8") as f:
        json.dump(cache_data, f, indent=2)
    print(f"[OK] Local dashboard cache updated: {cache_file}")


def main():
    try:
        routes_docs = get_routes_summary_docs()
        hourly_docs = get_route_hourly_profile_docs()
        ridership_docs = get_stop_ridership_docs()
        stops_docs = get_transit_stops_docs()
    except FileNotFoundError as e:
        print(f"[ERROR] {e}", file=sys.stderr)
        sys.exit(1)

    save_local_cache(routes_docs, hourly_docs, ridership_docs, stops_docs)

    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
    mongo_connected = False
    try:
        client.admin.command("ping")
        mongo_connected = True
    except (ServerSelectionTimeoutError, Exception):
        print(f"[INFO] MongoDB not running at {MONGO_URI} (Offline cache mode active).")
        print("[INFO] Start Docker (`docker compose up -d`) if you want MongoDB live ingestion.")

    if mongo_connected:
        db = client[DB_NAME]
        if routes_docs:
            db.routes_summary.delete_many({})
            db.routes_summary.insert_many(routes_docs)
            print(f"[OK] routes_summary: inserted {len(routes_docs)} documents")

        if hourly_docs:
            db.route_hourly_profile.delete_many({})
            db.route_hourly_profile.insert_many(hourly_docs)
            print(f"[OK] route_hourly_profile: inserted {len(hourly_docs)} documents")

        if ridership_docs:
            db.stop_ridership.delete_many({})
            db.stop_ridership.insert_many(ridership_docs)
            print(f"[OK] stop_ridership: inserted {len(ridership_docs)} documents")

        if stops_docs:
            db.transit_stops.delete_many({})
            db.transit_stops.insert_many(stops_docs)
            print(f"[OK] transit_stops: inserted {len(stops_docs)} documents")

        create_indexes(db)
        print("[OK] Successfully loaded all datasets into MongoDB.")


if __name__ == "__main__":
    main()
