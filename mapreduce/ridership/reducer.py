#!/usr/bin/env python3
"""Ridership Reducer: groups by "stop_id|hour" (sorted stream, manual
grouping) and emits total boardings plus a breakdown by passenger type."""
import sys

KNOWN_TYPES = ("GENERAL", "STUDENT", "SENIOR")


def emit(key, counts):
    if key is None:
        return
    stop_id, hour = key.split("|")
    total = sum(counts.values())
    breakdown = ",".join("{}:{}".format(t, counts.get(t, 0)) for t in KNOWN_TYPES)
    print("{}\t{},{},{}".format(stop_id, hour, total, breakdown))


current_key = None
counts = {}

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        key, ptype = line.split("\t", 1)
    except ValueError:
        continue

    if key != current_key:
        emit(current_key, counts)
        current_key = key
        counts = {}

    counts[ptype] = counts.get(ptype, 0) + 1

emit(current_key, counts)
