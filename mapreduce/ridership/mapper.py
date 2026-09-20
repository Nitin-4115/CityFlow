#!/usr/bin/env python3
"""Ridership Mapper: parses rfid_ticketing.csv rows, emits
"stop_id|hour" -> passenger_type so the reducer can build an
hour-of-day ridership breakdown per stop."""
import sys

for line in sys.stdin:
    line = line.strip()
    if not line or line.startswith("card_id"):
        continue

    fields = line.split(",")
    if len(fields) != 5:
        continue  # malformed row (e.g. missing timestamp) - skip

    stop_id = fields[1].strip()
    ptype = fields[3].strip()
    timestamp = fields[4].strip()

    if not stop_id or not timestamp or "T" not in timestamp:
        continue

    try:
        hour = int(timestamp.split("T")[1].split(":")[0])
    except (IndexError, ValueError):
        continue

    print("{}|{:02d}\t{}".format(stop_id, hour, ptype))
