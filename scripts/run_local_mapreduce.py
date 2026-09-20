"""
Local MapReduce Pipeline Simulator.
Executes the MapReduce streaming jobs (mapper.py -> sort -> reducer.py) locally
using Python standard library subprocesses, replicating Hadoop Streaming behaviour.
Produces identical output/part-00000 and _SUCCESS files.
"""
import io
import os
import subprocess
import sys
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))


def run_mapreduce_job(job_name, input_csv, mapper_path, reducer_path, output_dir):
    print(f"[*] Running MapReduce Job: {job_name}...")
    t0 = time.time()
    
    os.makedirs(output_dir, exist_ok=True)
    part_file = os.path.join(output_dir, "part-00000")
    success_file = os.path.join(output_dir, "_SUCCESS")

    python_bin = sys.executable

    # 1. Run mapper
    with open(input_csv, "rb") as f_in:
        p_map = subprocess.Popen(
            [python_bin, mapper_path],
            stdin=f_in,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        map_out, map_err = p_map.communicate()

    if p_map.returncode != 0:
        print(f"[ERROR] Mapper failed for {job_name}:\n{map_err.decode('utf-8', errors='replace')}", file=sys.stderr)
        return False

    # 2. Sort key-value pairs (replicates Hadoop Shuffle & Sort phase)
    lines = [line for line in map_out.decode("utf-8", errors="replace").splitlines() if line.strip()]
    lines.sort()
    sorted_input = ("\n".join(lines) + "\n").encode("utf-8")

    # 3. Run reducer
    p_red = subprocess.Popen(
        [python_bin, reducer_path],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    red_out, red_err = p_red.communicate(input=sorted_input)

    if p_red.returncode != 0:
        print(f"[ERROR] Reducer failed for {job_name}:\n{red_err.decode('utf-8', errors='replace')}", file=sys.stderr)
        return False

    # 4. Write part-00000 and _SUCCESS
    with open(part_file, "wb") as f_out:
        f_out.write(red_out)

    with open(success_file, "w") as f_succ:
        f_succ.write("")

    elapsed = time.time() - t0
    line_count = len([l for l in red_out.decode("utf-8", errors="replace").splitlines() if l.strip()])
    print(f"[OK] {job_name} completed in {elapsed:.2f}s -> {part_file} ({line_count:,} records)")
    return True


def main():
    data_dir = os.path.join(PROJECT_ROOT, "data")
    output_dir = os.path.join(PROJECT_ROOT, "output")

    gps_csv = os.path.join(data_dir, "raw_gps", "gps_telemetry.csv")
    rfid_csv = os.path.join(data_dir, "raw_rfid", "rfid_ticketing.csv")

    if not os.path.exists(gps_csv) or not os.path.exists(rfid_csv):
        print(f"[!] Extracted telemetry missing. Ingesting from Kaggle dataset now...")
        subprocess.run([sys.executable, os.path.join(data_dir, "ingest_kaggle_bengaluru.py")], check=True)

    # Job 1: Traffic Congestion Summary
    run_mapreduce_job(
        job_name="Traffic (Route Congestion)",
        input_csv=gps_csv,
        mapper_path=os.path.join(PROJECT_ROOT, "mapreduce", "traffic", "mapper.py"),
        reducer_path=os.path.join(PROJECT_ROOT, "mapreduce", "traffic", "reducer.py"),
        output_dir=os.path.join(output_dir, "processed_traffic"),
    )

    # Job 2: Traffic Hourly Profile (ML dataset)
    run_mapreduce_job(
        job_name="Traffic Hourly (ML Profiles)",
        input_csv=gps_csv,
        mapper_path=os.path.join(PROJECT_ROOT, "mapreduce", "traffic_hourly", "mapper.py"),
        reducer_path=os.path.join(PROJECT_ROOT, "mapreduce", "traffic", "reducer.py"),
        output_dir=os.path.join(output_dir, "processed_traffic_hourly"),
    )

    # Job 3: Stop Ridership Analysis
    run_mapreduce_job(
        job_name="Ridership (Stop Boardings)",
        input_csv=rfid_csv,
        mapper_path=os.path.join(PROJECT_ROOT, "mapreduce", "ridership", "mapper.py"),
        reducer_path=os.path.join(PROJECT_ROOT, "mapreduce", "ridership", "reducer.py"),
        output_dir=os.path.join(output_dir, "processed_ridership"),
    )

    print("\n[OK] All 3 MapReduce jobs completed successfully!")


if __name__ == "__main__":
    main()

