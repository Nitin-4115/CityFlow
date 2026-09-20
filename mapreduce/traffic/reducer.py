#!/usr/bin/env python3
"""Traffic Reducer: Hadoop Streaming feeds rows sorted by key, so we track
the current key manually and emit once it changes (classic streaming
reducer pattern - there is no Java-style Iterable<Text> grouping here)."""
import sys


def emit(route_id, total_speed, count):
    if route_id is None or count == 0:
        return
    avg_speed = total_speed / count
    if avg_speed < 15.0:
        level = "HEAVY_CONGESTION"
    elif avg_speed < 30.0:
        level = "MODERATE_TRAFFIC"
    else:
        level = "NORMAL"
    print("{}\t{:.2f},{},{}".format(route_id, avg_speed, count, level))


current_route = None
total_speed = 0.0
count = 0

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        route_id, value = line.split("\t", 1)
        speed_str, cnt_str = value.split(",")
        speed = float(speed_str)
        cnt = int(cnt_str)
    except ValueError:
        continue

    if route_id != current_route:
        emit(current_route, total_speed, count)
        current_route = route_id
        total_speed = 0.0
        count = 0

    total_speed += speed * cnt
    count += cnt

emit(current_route, total_speed, count)
