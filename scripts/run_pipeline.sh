#!/usr/bin/env bash
# End-to-end pipeline: HDFS file ops -> three Hadoop Streaming MapReduce jobs
# -> pull results back to local disk for the MongoDB loader.
#
# Run from the project root: bash scripts/run_pipeline.sh
set -euo pipefail

# Prevent Git Bash/MSYS on Windows from mangling absolute-looking Unix paths
# (e.g. /smartcity/...) into Windows paths (C:/smartcity/...) before they
# reach `docker exec`, which would otherwise make hdfs see "C:" as a URI scheme.
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL="*"

STREAMING_JAR="/opt/hadoop-3.2.1/share/hadoop/tools/lib/hadoop-streaming-3.2.1.jar"

echo "== 1. Waiting for HDFS to leave safe mode =="
docker exec namenode hdfs dfsadmin -safemode wait

echo "== 1b. Waiting for at least one NodeManager to register with YARN =="
for i in $(seq 1 24); do
  RUNNING=$(docker exec resourcemanager yarn node -list 2>/dev/null | grep -c RUNNING || true)
  if [ "${RUNNING:-0}" -ge 1 ]; then
    echo "NodeManager registered ($RUNNING running)."
    break
  fi
  sleep 5
done

echo "== 2. HDFS directory management (adding directories) =="
docker exec namenode hdfs dfs -mkdir -p /smartcity/raw_gps
docker exec namenode hdfs dfs -mkdir -p /smartcity/raw_rfid

echo "== 3. Copying local datasets into the namenode container =="
docker cp data/gps_telemetry.csv namenode:/tmp/gps_telemetry.csv
docker cp data/rfid_ticketing.csv namenode:/tmp/rfid_ticketing.csv

echo "== 4. Adding files to HDFS =="
docker exec namenode hdfs dfs -put -f /tmp/gps_telemetry.csv /smartcity/raw_gps/
docker exec namenode hdfs dfs -put -f /tmp/rfid_ticketing.csv /smartcity/raw_rfid/

echo "== 5. Retrieving / verifying files in HDFS =="
docker exec namenode hdfs dfs -ls /smartcity/raw_gps/
docker exec namenode hdfs dfs -ls /smartcity/raw_rfid/
docker exec namenode hdfs dfs -cat /smartcity/raw_gps/gps_telemetry.csv 2>/dev/null | head -n 5 || true

echo "== 6. Explicit HDFS delete demo (deleting a file, then a directory) =="
docker exec namenode hdfs dfs -mkdir -p /smartcity/tmp_test
docker exec namenode bash -c "echo 'sample line for the delete demo' > /tmp/sample.txt"
docker exec namenode hdfs dfs -put -f /tmp/sample.txt /smartcity/tmp_test/sample.txt
echo "-- before deletion --"
docker exec namenode hdfs dfs -ls /smartcity/tmp_test/
docker exec namenode hdfs dfs -rm /smartcity/tmp_test/sample.txt
docker exec namenode hdfs dfs -rmdir /smartcity/tmp_test
echo "-- after deletion (should be empty / gone) --"
docker exec namenode hdfs dfs -ls /smartcity/ | grep tmp_test && echo "WARNING: tmp_test still present" || echo "tmp_test file and directory successfully deleted"

echo "== 7. Removing any stale output directories from a previous run =="
docker exec namenode hdfs dfs -rm -r -f /smartcity/processed_traffic || true
docker exec namenode hdfs dfs -rm -r -f /smartcity/processed_traffic_hourly || true
docker exec namenode hdfs dfs -rm -r -f /smartcity/processed_ridership || true

echo "== 8. Copying MapReduce scripts into the namenode container =="
docker cp mapreduce/traffic/mapper.py namenode:/tmp/traffic_mapper.py
docker cp mapreduce/traffic/reducer.py namenode:/tmp/traffic_reducer.py
docker cp mapreduce/traffic_hourly/mapper.py namenode:/tmp/traffic_hourly_mapper.py
docker cp mapreduce/ridership/mapper.py namenode:/tmp/ridership_mapper.py
docker cp mapreduce/ridership/reducer.py namenode:/tmp/ridership_reducer.py

echo "== 9. Running the Traffic Congestion MapReduce job (per route) =="
docker exec namenode hadoop jar "$STREAMING_JAR" \
  -files /tmp/traffic_mapper.py,/tmp/traffic_reducer.py \
  -mapper "python3 traffic_mapper.py" \
  -reducer "python3 traffic_reducer.py" \
  -input /smartcity/raw_gps \
  -output /smartcity/processed_traffic

echo "== 10. Running the Traffic Hourly Profile MapReduce job (route x hour x weather x weekday/weekend) =="
echo "        this is the ML training set - reuses traffic_reducer.py unchanged"
docker exec namenode hadoop jar "$STREAMING_JAR" \
  -files /tmp/traffic_hourly_mapper.py,/tmp/traffic_reducer.py \
  -mapper "python3 traffic_hourly_mapper.py" \
  -reducer "python3 traffic_reducer.py" \
  -input /smartcity/raw_gps \
  -output /smartcity/processed_traffic_hourly

echo "== 11. Running the Ridership MapReduce job =="
docker exec namenode hadoop jar "$STREAMING_JAR" \
  -files /tmp/ridership_mapper.py,/tmp/ridership_reducer.py \
  -mapper "python3 ridership_mapper.py" \
  -reducer "python3 ridership_reducer.py" \
  -input /smartcity/raw_rfid \
  -output /smartcity/processed_ridership

echo "== 12. Verifying job outputs =="
docker exec namenode hdfs dfs -ls /smartcity/processed_traffic/
docker exec namenode hdfs dfs -cat /smartcity/processed_traffic/part-00000 2>/dev/null | head -n 10 || true
docker exec namenode hdfs dfs -ls /smartcity/processed_traffic_hourly/
docker exec namenode hdfs dfs -cat /smartcity/processed_traffic_hourly/part-00000 2>/dev/null | head -n 5 || true

echo "== 13. Pulling results back to local disk (retrieving files) =="
rm -rf output
mkdir -p output
docker exec namenode bash -c "rm -rf /tmp/processed_traffic /tmp/processed_traffic_hourly /tmp/processed_ridership && \
  hdfs dfs -get /smartcity/processed_traffic /tmp/processed_traffic && \
  hdfs dfs -get /smartcity/processed_traffic_hourly /tmp/processed_traffic_hourly && \
  hdfs dfs -get /smartcity/processed_ridership /tmp/processed_ridership"
docker cp namenode:/tmp/processed_traffic output/processed_traffic
docker cp namenode:/tmp/processed_traffic_hourly output/processed_traffic_hourly
docker cp namenode:/tmp/processed_ridership output/processed_ridership

echo "== Pipeline complete. Now run: python mongo/load_data.py =="
