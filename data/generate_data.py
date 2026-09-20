"""
Synthetic data generator for the Smart City Traffic & Public Transit Analytics Platform.
Optimized for high-performance buffered writing while maintaining standard library portability.

Produces:
  gps_telemetry.csv    -> raw bus GPS pings (Traffic & Traffic-Hourly MapReduce jobs)
  rfid_ticketing.csv   -> raw RFID boarding scans (Ridership MapReduce job)
  transit_stops.csv    -> static stop reference data (MongoDB & Geospatial analysis)

Simulates 14 days with weekday/weekend effects and weather profiles for robust ML training.
"""
import argparse
import csv
import os
import random
import time
from datetime import datetime, timedelta

# Always write next to this script or relative to repo data/ directory
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = SCRIPT_DIR

CITY_CENTER = (12.9716, 77.5946)

ROUTE_SPEED_PROFILE = {
    "ROUTE_101": (5, 20),     # heavy congestion corridor
    "ROUTE_102": (8, 22),     # heavy congestion corridor
    "ROUTE_103": (25, 55),    # free flowing (expressway)
    "ROUTE_204": (15, 32),    # moderate
    "ROUTE_305": (20, 40),    # moderate/free
    "ROUTE_410": (10, 26),    # moderate/heavy
    "ROUTE_500": (18, 35),    # moderate
    "ROUTE_600": (30, 55),    # free flowing (suburb connector)
    "ROUTE_701": (6, 18),     # heavy congestion (industrial belt, truck traffic)
    "ROUTE_802": (18, 34),    # moderate (lakeside drive)
    "ROUTE_903": (12, 28),    # moderate/heavy (stadium express)
    "ROUTE_150": (22, 45),    # moderate/free (harbor road)
}
ROUTES = list(ROUTE_SPEED_PROFILE.keys())

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

STOPS = [
    ("STOP_501", "Central Silk Board Junction", 12.9172, 77.6245, ["ROUTE_101", "ROUTE_204", "ROUTE_410"]),
    ("STOP_502", "MG Road Metro Gate", 12.9758, 77.6045, ["ROUTE_102", "ROUTE_500"]),
    ("STOP_503", "Airport Terminal 1", 13.1986, 77.7066, ["ROUTE_103"]),
    ("STOP_504", "Riverside Market", 12.9611, 77.5920, ["ROUTE_305", "ROUTE_204"]),
    ("STOP_505", "Tech Park Gate 2", 12.9345, 77.6910, ["ROUTE_410", "ROUTE_101"]),
    ("STOP_506", "University Circle", 13.0210, 77.5680, ["ROUTE_500", "ROUTE_305"]),
    ("STOP_507", "Old Town Square", 12.9634, 77.5855, ["ROUTE_204", "ROUTE_102"]),
    ("STOP_508", "Ring Road Flyover", 12.9050, 77.6120, ["ROUTE_101"]),
    ("STOP_509", "Riverside Bridge East", 12.9550, 77.6050, ["ROUTE_305"]),
    ("STOP_510", "North Gate Interchange", 13.0400, 77.6200, ["ROUTE_500", "ROUTE_410"]),
    ("STOP_511", "Greenfield Suburb Hub", 13.0550, 77.5400, ["ROUTE_600"]),
    ("STOP_512", "Industrial Estate Gate 3", 12.8850, 77.6500, ["ROUTE_701"]),
    ("STOP_513", "Lakeside Promenade", 12.9400, 77.6150, ["ROUTE_802", "ROUTE_204"]),
    ("STOP_514", "City Stadium", 12.9800, 77.5990, ["ROUTE_903", "ROUTE_102"]),
    ("STOP_515", "Harbor Junction", 13.0100, 77.6800, ["ROUTE_150"]),
    ("STOP_516", "Suburb Rail Terminus", 13.0700, 77.5300, ["ROUTE_600", "ROUTE_500"]),
    ("STOP_517", "Industrial Warehouse Row", 12.8700, 77.6650, ["ROUTE_701", "ROUTE_101"]),
    ("STOP_518", "Harbor Cargo Gate", 13.0250, 77.6950, ["ROUTE_150", "ROUTE_103"]),
]

PASSENGER_TYPES = ["GENERAL", "STUDENT", "SENIOR"]
PASSENGER_WEIGHTS = [0.6, 0.3, 0.1]

WEATHER_CONDITIONS = ["CLEAR", "RAIN", "FOG"]
WEATHER_WEIGHTS = [0.7, 0.2, 0.1]
WEATHER_SPEED_FACTOR = {"CLEAR": 1.0, "RAIN": 0.72, "FOG": 0.82}

START_TIME = datetime(2026, 9, 1, 0, 0, 0)
SIM_DAYS = 14
SIM_HOURS = SIM_DAYS * 24


def jitter(coord, spread=0.01):
    return coord + random.uniform(-spread, spread)


def gen_gps_telemetry(path, num_rows=160000, malformed_rate=0.01, sim_days=14, chunk_size=10000):
    sim_seconds = sim_days * 24 * 3600
    base_lat, base_lon = CITY_CENTER
    
    with open(path, "w", newline="", buffering=1024 * 1024) as f:
        w = csv.writer(f)
        w.writerow(
            ["trip_id", "vehicle_id", "route_id", "latitude", "longitude", "speed_kmph", "timestamp", "weather"]
        )
        
        buffer = []
        for i in range(num_rows):
            route_id = random.choice(ROUTES)
            lo, hi = ROUTE_SPEED_PROFILE[route_id]
            vehicle_id = f"BUS_{random.randint(1, 60):03d}"
            trip_id = f"TRIP_{i:07d}"
            lat = round(jitter(base_lat, 0.09), 6)
            lon = round(jitter(base_lon, 0.09), 6)
            ts = START_TIME + timedelta(seconds=random.randint(0, sim_seconds))
            weather = random.choices(WEATHER_CONDITIONS, weights=WEATHER_WEIGHTS)[0]

            hour = ts.hour
            is_weekend = ts.weekday() >= 5
            rush = hour in (8, 9, 18, 19) and not is_weekend
            effective_hi = hi * (0.5 if rush else 1.0) * WEATHER_SPEED_FACTOR[weather]
            effective_hi = max(effective_hi, lo + 1)
            speed = max(0.5, random.uniform(lo, effective_hi))

            if random.random() < malformed_rate:
                bad_choice = random.choice(["missing_field", "bad_speed", "blank"])
                if bad_choice == "missing_field":
                    buffer.append([trip_id, vehicle_id, route_id, lat, lon, ts.isoformat()])
                elif bad_choice == "bad_speed":
                    buffer.append([trip_id, vehicle_id, route_id, lat, lon, "N/A", ts.isoformat(), weather])
                else:
                    buffer.append([])
            else:
                buffer.append([trip_id, vehicle_id, route_id, lat, lon, f"{speed:.2f}", ts.isoformat(), weather])

            if len(buffer) >= chunk_size:
                w.writerows(buffer)
                buffer.clear()

        if buffer:
            w.writerows(buffer)


def gen_rfid_ticketing(path, num_rows=60000, malformed_rate=0.01, sim_days=14, chunk_size=10000):
    sim_seconds = sim_days * 24 * 3600
    
    with open(path, "w", newline="", buffering=1024 * 1024) as f:
        w = csv.writer(f)
        w.writerow(["card_id", "stop_id", "route_id", "passenger_type", "timestamp"])
        
        buffer = []
        for i in range(num_rows):
            stop_id, _, _, _, route_ids = random.choice(STOPS)
            route_id = random.choice(route_ids)
            card_id = f"CARD_{random.randint(100000, 999999)}"
            ptype = random.choices(PASSENGER_TYPES, weights=PASSENGER_WEIGHTS)[0]
            ts = START_TIME + timedelta(seconds=random.randint(0, sim_seconds))

            hour_bias = random.random()
            if hour_bias < 0.35:
                ts = ts.replace(hour=random.choice([7, 8, 9]))
            elif hour_bias < 0.6:
                ts = ts.replace(hour=random.choice([17, 18, 19]))

            if random.random() < malformed_rate:
                buffer.append([card_id, stop_id, route_id, ptype])
            else:
                buffer.append([card_id, stop_id, route_id, ptype, ts.isoformat()])

            if len(buffer) >= chunk_size:
                w.writerows(buffer)
                buffer.clear()

        if buffer:
            w.writerows(buffer)


def gen_transit_stops(path):
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["stop_id", "stop_name", "latitude", "longitude", "route_ids"])
        for stop_id, name, lat, lon, route_ids in STOPS:
            w.writerow([stop_id, name, lat, lon, "|".join(route_ids)])


def main():
    parser = argparse.ArgumentParser(description="Synthetic data generator for CityFlow Big Data analytics.")
    parser.add_argument("--gps-rows", type=int, default=160000, help="Number of GPS pings to generate (default: 160000)")
    parser.add_argument("--rfid-rows", type=int, default=60000, help="Number of RFID card scans to generate (default: 60000)")
    parser.add_argument("--sim-days", type=int, default=14, help="Simulated time span in days (default: 14)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for deterministic generation (default: 42)")
    parser.add_argument("--quick", action="store_true", help="Quick mode with smaller dataset for fast testing")
    args = parser.parse_args()

    random.seed(args.seed)

    gps_rows = 20000 if args.quick else args.gps_rows
    rfid_rows = 8000 if args.quick else args.rfid_rows
    sim_days = 7 if args.quick else args.sim_days

    os.makedirs(DATA_DIR, exist_ok=True)
    gps_path = os.path.join(DATA_DIR, "gps_telemetry.csv")
    rfid_path = os.path.join(DATA_DIR, "rfid_ticketing.csv")
    stops_path = os.path.join(DATA_DIR, "transit_stops.csv")

    print(f"Generating datasets with seed={args.seed}...")
    t0 = time.time()
    gen_gps_telemetry(gps_path, num_rows=gps_rows, sim_days=sim_days)
    gen_rfid_ticketing(rfid_path, num_rows=rfid_rows, sim_days=sim_days)
    gen_transit_stops(stops_path)
    elapsed = time.time() - t0

    print(f"Successfully generated datasets in {elapsed:.2f}s:")
    print(f"  - {gps_path} ({gps_rows:,} rows)")
    print(f"  - {rfid_path} ({rfid_rows:,} rows)")
    print(f"  - {stops_path} ({len(STOPS)} stops)")


if __name__ == "__main__":
    main()
