"""
Unit tests for the mapper/reducer scripts, run exactly as Hadoop Streaming
runs them (as a subprocess reading stdin / writing stdout) - so these tests
exercise the real files deployed to the cluster, not a refactored copy, and
they run in a couple seconds without needing Docker or a Hadoop cluster.

Usage:
    python -m pip install -r tests/requirements.txt
    pytest tests/
"""
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]


def run_script(relative_path, stdin_text):
    result = subprocess.run(
        [sys.executable, str(PROJECT_ROOT / relative_path)],
        input=stdin_text,
        capture_output=True,
        text=True,
        cwd=PROJECT_ROOT,
    )
    assert result.returncode == 0, f"{relative_path} exited {result.returncode}: {result.stderr}"
    return [line for line in result.stdout.splitlines() if line]


# ---------------------------------------------------------------------------
# Traffic mapper (mapreduce/traffic/mapper.py) - route_id -> "speed,1"
# ---------------------------------------------------------------------------

def test_traffic_mapper_emits_key_value_for_valid_row():
    row = "TRIP_1,BUS_1,ROUTE_101,12.9,77.6,20.50,2026-09-01T08:00:00,CLEAR\n"
    out = run_script("mapreduce/traffic/mapper.py", row)
    assert out == ["ROUTE_101\t20.5,1"]


def test_traffic_mapper_skips_header_row():
    header = "trip_id,vehicle_id,route_id,latitude,longitude,speed_kmph,timestamp,weather\n"
    out = run_script("mapreduce/traffic/mapper.py", header)
    assert out == []


def test_traffic_mapper_skips_row_with_missing_field():
    # only 7 fields instead of 8 (weather missing) - must be dropped, not crash
    row = "TRIP_1,BUS_1,ROUTE_101,12.9,77.6,20.50,2026-09-01T08:00:00\n"
    out = run_script("mapreduce/traffic/mapper.py", row)
    assert out == []


def test_traffic_mapper_skips_row_with_non_numeric_speed():
    row = "TRIP_1,BUS_1,ROUTE_101,12.9,77.6,N/A,2026-09-01T08:00:00,CLEAR\n"
    out = run_script("mapreduce/traffic/mapper.py", row)
    assert out == []


# ---------------------------------------------------------------------------
# Traffic reducer (mapreduce/traffic/reducer.py) - averages + congestion label
# ---------------------------------------------------------------------------

def test_traffic_reducer_labels_heavy_congestion_below_15():
    stdin = "ROUTE_1\t10,1\nROUTE_1\t10,1\n"  # avg 10.0
    out = run_script("mapreduce/traffic/reducer.py", stdin)
    assert out == ["ROUTE_1\t10.00,2,HEAVY_CONGESTION"]


def test_traffic_reducer_labels_moderate_between_15_and_30():
    stdin = "ROUTE_1\t20,1\nROUTE_1\t20,1\n"  # avg 20.0
    out = run_script("mapreduce/traffic/reducer.py", stdin)
    assert out == ["ROUTE_1\t20.00,2,MODERATE_TRAFFIC"]


def test_traffic_reducer_labels_normal_at_or_above_30():
    stdin = "ROUTE_1\t40,1\nROUTE_1\t40,1\n"  # avg 40.0
    out = run_script("mapreduce/traffic/reducer.py", stdin)
    assert out == ["ROUTE_1\t40.00,2,NORMAL"]


def test_traffic_reducer_handles_multiple_keys_in_sorted_order():
    # Hadoop Streaming guarantees keys arrive sorted, not grouped by a dict -
    # this is what exercises the manual "current key" tracking.
    stdin = "ROUTE_1\t10,1\nROUTE_1\t10,1\nROUTE_2\t50,1\n"
    out = run_script("mapreduce/traffic/reducer.py", stdin)
    assert out == [
        "ROUTE_1\t10.00,2,HEAVY_CONGESTION",
        "ROUTE_2\t50.00,1,NORMAL",
    ]


# ---------------------------------------------------------------------------
# Traffic hourly mapper (mapreduce/traffic_hourly/mapper.py) - the ML feed
# ---------------------------------------------------------------------------

def test_traffic_hourly_mapper_key_includes_hour_weather_and_weekday():
    # 2026-09-01 is a Tuesday
    row = "TRIP_1,BUS_1,ROUTE_101,12.9,77.6,20.50,2026-09-01T08:30:00,RAIN\n"
    out = run_script("mapreduce/traffic_hourly/mapper.py", row)
    assert out == ["ROUTE_101|08|RAIN|WEEKDAY\t20.5,1"]


def test_traffic_hourly_mapper_detects_weekend():
    # 2026-09-06 is a Sunday
    row = "TRIP_1,BUS_1,ROUTE_101,12.9,77.6,20.50,2026-09-06T08:30:00,CLEAR\n"
    out = run_script("mapreduce/traffic_hourly/mapper.py", row)
    assert out == ["ROUTE_101|08|CLEAR|WEEKEND\t20.5,1"]


def test_traffic_hourly_mapper_skips_row_without_weather():
    row = "TRIP_1,BUS_1,ROUTE_101,12.9,77.6,20.50,2026-09-01T08:30:00\n"
    out = run_script("mapreduce/traffic_hourly/mapper.py", row)
    assert out == []


# ---------------------------------------------------------------------------
# Ridership mapper/reducer
# ---------------------------------------------------------------------------

def test_ridership_mapper_extracts_stop_and_hour():
    row = "CARD_1,STOP_501,ROUTE_101,GENERAL,2026-09-01T07:15:00\n"
    out = run_script("mapreduce/ridership/mapper.py", row)
    assert out == ["STOP_501|07\tGENERAL"]


def test_ridership_mapper_skips_row_missing_timestamp():
    row = "CARD_1,STOP_501,ROUTE_101,GENERAL\n"
    out = run_script("mapreduce/ridership/mapper.py", row)
    assert out == []


def test_ridership_reducer_counts_by_passenger_type():
    stdin = "STOP_501|07\tGENERAL\nSTOP_501|07\tGENERAL\nSTOP_501|07\tSTUDENT\n"
    out = run_script("mapreduce/ridership/reducer.py", stdin)
    assert out == ["STOP_501\t07,3,GENERAL:2,STUDENT:1,SENIOR:0"]


# ---------------------------------------------------------------------------
# End-to-end: mapper piped into (sorted) reducer input, like the real job
# ---------------------------------------------------------------------------

def test_traffic_job_end_to_end_on_small_fixture():
    csv_rows = (
        "trip_id,vehicle_id,route_id,latitude,longitude,speed_kmph,timestamp,weather\n"
        "T1,B1,ROUTE_A,12.9,77.6,10.0,2026-09-01T08:00:00,CLEAR\n"
        "T2,B1,ROUTE_A,12.9,77.6,20.0,2026-09-01T09:00:00,CLEAR\n"
        "T3,B1,ROUTE_A,12.9,77.6,bad,2026-09-01T10:00:00,CLEAR\n"  # dropped
        "T4,B1,ROUTE_B,12.9,77.6,50.0,2026-09-01T08:00:00,CLEAR\n"
    )
    mapped = run_script("mapreduce/traffic/mapper.py", csv_rows)
    # Hadoop Streaming sorts by key between map and reduce
    reduced = run_script("mapreduce/traffic/reducer.py", "\n".join(sorted(mapped)) + "\n")
    assert reduced == [
        "ROUTE_A\t15.00,2,MODERATE_TRAFFIC",
        "ROUTE_B\t50.00,1,NORMAL",
    ]
