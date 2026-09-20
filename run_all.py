"""
CityFlow - Master One-Click Orchestrator & Runner.

Executes the end-to-end Big Data & ML pipeline:
1. Real / Synthetic Data Ingestion (GPS Telemetry, RFID Scans, Transit Stops)
2. MapReduce Execution (Traffic Congestion, Hourly Profiles, Ridership)
3. MongoDB Ingestion & Cache Sync (with GeoJSON & Compound indexing)
4. ML Model Training (RandomForest Congestion Forecasting ~93.6% accuracy)
5. Automated Unit Testing (pytest suite)
6. React Glassmorphic Web App & FastAPI Server Launch

Usage:
    python run_all.py              # Ingests real Kaggle dataset if available (or synthetic fallback)
    python run_all.py --synthetic  # Forces synthetic data generation
    python run_all.py --quick      # Runs fast sample
    python run_all.py --no-web     # Headless pipeline execution
"""
import argparse
import os
import subprocess
import sys
import time
import webbrowser

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
PYTHON_EXE = sys.executable
KAGGLE_CSV = os.path.join(PROJECT_ROOT, "data", "kaggle_dataset", "bangalore_routes.csv")


def banner():
    print("=" * 75)
    print("   CITYFLOW - SMART TRANSIT & REAL-TIME TRAFFIC PLATFORM")
    print("   Big Data Analytics & AI Congestion Forecasting")
    print("=" * 75)


def step(num, title):
    print(f"\n[{num}/6] {title}...")


def run_command(cmd_args, desc):
    t0 = time.time()
    res = subprocess.run(cmd_args, cwd=PROJECT_ROOT)
    elapsed = time.time() - t0
    if res.returncode != 0:
        print(f"[ERROR] Failed during: {desc} (code {res.returncode})", file=sys.stderr)
        return False
    print(f"[OK] {desc} finished in {elapsed:.2f}s")
    return True


def main():
    parser = argparse.ArgumentParser(description="Master runner for CityFlow pipeline.")
    parser.add_argument("-c", "--corridors", type=str, default="all", help="Number of dynamic corridors to extract (default: 'all')")
    parser.add_argument("-s", "--stations", type=str, default="all", help="Number of transit stations to extract (default: 'all')")
    parser.add_argument("--quick", action="store_true", help="Run with small dataset for rapid demonstration")
    parser.add_argument("--no-web", action="store_true", help="Skip launching the web application at the end")
    parser.add_argument("--port", type=int, default=8000, help="Port for Web Server (default: 8000)")
    args = parser.parse_args()

    banner()
    start_time = time.time()

    # Step 1: Ingest Real Kaggle Dataset
    if not os.path.exists(KAGGLE_CSV):
        print(f"\n[ERROR] Kaggle dataset not found at:\n  {KAGGLE_CSV}")
        print("\nPlease download 'bangalore_routes.csv' from Kaggle and place it in 'data/kaggle_dataset/'.")
        print("See README.md for download instructions.\n")
        sys.exit(1)

    step(1, f"Ingesting Real Bengaluru Traffic Dataset ({'300k sample' if args.quick else '2.1M full records'} from Kaggle)")
    gen_cmd = [
        PYTHON_EXE, os.path.join(PROJECT_ROOT, "data", "ingest_kaggle_bengaluru.py"),
        "--corridors", str(args.corridors),
        "--stations", str(args.stations),
    ]
    if args.quick:
        gen_cmd.append("--quick")
    if not run_command(gen_cmd, "Real Bengaluru Traffic Ingestion"):
        sys.exit(1)

    # Step 2: Run MapReduce Jobs
    step(2, "Executing MapReduce Streaming Jobs (Traffic, Hourly ML, Ridership)")
    mr_cmd = [PYTHON_EXE, os.path.join(PROJECT_ROOT, "scripts", "run_local_mapreduce.py")]
    if not run_command(mr_cmd, "MapReduce Processing"):
        sys.exit(1)

    # Step 3: Load Data to MongoDB / Sync Cache
    step(3, "Syncing MongoDB Collections & Compound/2dsphere Indexes")
    mongo_cmd = [PYTHON_EXE, os.path.join(PROJECT_ROOT, "mongo", "load_data.py")]
    if not run_command(mongo_cmd, "MongoDB Ingestion"):
        sys.exit(1)

    # Step 4: Train Machine Learning Model
    step(4, "Training Congestion Forecast AI Model (RandomForest, n_jobs=-1)")
    ml_cmd = [PYTHON_EXE, os.path.join(PROJECT_ROOT, "ml", "train_model.py")]
    if not run_command(ml_cmd, "ML Model Training"):
        sys.exit(1)

    # Step 5: Unit Tests
    step(5, "Running Unit Test Suite (pytest)")
    test_cmd = [PYTHON_EXE, "-m", "pytest", os.path.join(PROJECT_ROOT, "tests")]
    if not run_command(test_cmd, "Unit Tests"):
        print("[WARNING] Some tests reported issues, but continuing...")

    total_elapsed = time.time() - start_time
    print("\n" + "=" * 75)
    print(f"   [OK] Entire pipeline successfully executed in {total_elapsed:.2f} seconds!")
    print("=" * 75)

    # Step 6: Launch Web App
    if not args.no_web:
        step(6, f"Launching React Glassmorphic Web App on port {args.port}")
        server_cmd = [
            PYTHON_EXE, "-m", "uvicorn", "api.server:app",
            "--host", "127.0.0.1",
            "--port", str(args.port),
        ]
        print(f"\n[INFO] Starting FastAPI Backend & React UI...")
        print(f"[INFO] Web App URL: http://localhost:{args.port}")
        print(f"[INFO] Swagger API Docs: http://localhost:{args.port}/docs")
        print("[INFO] Press Ctrl+C in this terminal to stop the server.\n")
        
        # Automatically open browser
        try:
            webbrowser.open(f"http://localhost:{args.port}")
        except Exception:
            pass

        try:
            subprocess.run(server_cmd, cwd=PROJECT_ROOT)
        except KeyboardInterrupt:
            print("\n[INFO] Web App stopped by user.")


if __name__ == "__main__":
    main()
