#!/usr/bin/env python3
"""Traffic Hourly Profile Mapper: like mapreduce/traffic/mapper.py, but keys
by route_id|hour|weather|day_type instead of just route_id, producing a
fine-grained (route, hour-of-day, weather, weekday-or-weekend) -> average
speed profile. This is the training set for the congestion prediction model
in ml/train_model.py - a single per-route average (the traffic job) isn't
enough rows to learn from, but route x 24 hours x 3 weather x 2 day types is.

day_type is WEEKEND/WEEKDAY rather than the specific day name: the data
generator only varies rush-hour intensity by weekend vs. weekday (see
data/generate_data.py), so that's the real signal in the data - a 7-way
split would just fragment the sample count per bin without adding anything
the model could actually learn.

Reuses mapreduce/traffic/reducer.py unchanged as its reducer: that reducer
only tracks "the current key" as an opaque string and averages "speed,count"
values, so it works for any key shape.

Note: the container this runs in has Python 3.5 (see docker-compose.yml's
nodemanager build), so this deliberately avoids f-strings and
datetime.fromisoformat (Python 3.7+); .format() and datetime.strptime()
are both available since Python 3.5."""
import sys
from datetime import datetime

for line in sys.stdin:
    line = line.strip()
    if not line or line.startswith("trip_id"):
        continue

    fields = line.split(",")
    if len(fields) != 8:
        continue  # malformed row (e.g. missing field) - skip

    route_id = fields[2].strip()
    speed_str = fields[5].strip()
    timestamp = fields[6].strip()
    weather = fields[7].strip()

    try:
        speed = float(speed_str)
    except ValueError:
        continue  # malformed row (e.g. "N/A") - skip

    if not route_id or not weather or "T" not in timestamp:
        continue

    date_part, _, time_part = timestamp.partition("T")

    try:
        hour = int(time_part.split(":")[0])
        weekday = datetime.strptime(date_part, "%Y-%m-%d").weekday()
    except ValueError:
        continue  # malformed row (e.g. bad date/time) - skip

    day_type = "WEEKEND" if weekday >= 5 else "WEEKDAY"

    print("{}|{:02d}|{}|{}\t{},1".format(route_id, hour, weather, day_type, speed))
