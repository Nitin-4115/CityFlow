#!/usr/bin/env python3
"""Traffic Mapper: parses gps_telemetry.csv rows, filters invalid ones,
emits route_id -> "speed,1" so the reducer can compute an average."""
import sys

for line in sys.stdin:
    line = line.strip()
    if not line or line.startswith("trip_id"):
        continue

    fields = line.split(",")
    if len(fields) != 8:
        continue  # malformed row (e.g. missing field) - skip

    route_id = fields[2].strip()
    speed_str = fields[5].strip()

    try:
        speed = float(speed_str)
    except ValueError:
        continue  # malformed row (e.g. "N/A") - skip

    if not route_id:
        continue

    print("{}\t{},1".format(route_id, speed))
