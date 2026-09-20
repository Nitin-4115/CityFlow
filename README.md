# Smart City Traffic & Public Transit Analytics Platform

A working Big Data Analytics project covering both graded activities, plus a
congestion-forecasting ML layer and a polished dashboard built on top:

| Activity | Marks | Where |
|---|---|---|
| Install Hadoop; add/retrieve/delete files & directories in HDFS; run MapReduce | 10 | `scripts/run_pipeline.sh`, `mapreduce/` |
| MongoDB application to store big data and process/analyze results | 15 | `mongo/`, `dashboard/` |

Everything runs in Docker (no native Hadoop/MongoDB install, no Windows
`winutils.exe` pain): a pseudo-distributed Hadoop cluster (NameNode,
DataNode, ResourceManager, NodeManager, HistoryServer) + MongoDB +
Mongo Express + the dashboard itself, all started with one `docker compose up`.

## Architecture

```
                         ┌─► routes_summary                 ─┐
gps_telemetry.csv  ──┬─► ├─► route_hourly_profile          ─┐│
rfid_ticketing.csv ──┘   │   (route×hour×weather×weekend)   ├─► MongoDB ─┬─► mongo/aggregations.js
transit_stops.csv ───────┴─► stop_ridership                ─┘│            │
      HDFS  ──►  MapReduce (3 Hadoop Streaming jobs) ─────────┘            ├─► ml/train_model.py ─► ml/model.joblib
                                                                            └─► dashboard/app.py (Streamlit, containerized)
```

* **Traffic job** (`mapreduce/traffic/`): `gps_telemetry.csv` → per-route
  average speed, ping count, congestion level (`HEAVY_CONGESTION` /
  `MODERATE_TRAFFIC` / `NORMAL`). One row per route (12 rows).
* **Traffic Hourly job** (`mapreduce/traffic_hourly/`): the same input keyed
  by `route × hour-of-day × weather × weekday/weekend` instead of just route
  — 1,728 rows, fine enough grained to train a model on. Reuses
  `traffic/reducer.py` unchanged (it only ever averages "speed,count" values
  under an opaque key, so the same reducer works for either job).
* **Ridership job** (`mapreduce/ridership/`): `rfid_ticketing.csv` →
  per-stop, per-hour boarding counts broken down by passenger type.
* **MongoDB**: stores all three MapReduce outputs plus static stop reference
  data, with a compound index, unique indexes, and a `2dsphere` geospatial
  index, queried with 6 aggregation pipelines (`$match`, `$group`, `$lookup`,
  `$near`, `$facet`, `$sort`/`$limit`).
* **ML** (`ml/train_model.py`): a scikit-learn Random Forest trained on
  `route_hourly_profile` straight out of MongoDB — predicts the congestion
  level for a route/hour/weather/weekend combination *before* it's observed,
  not just reporting history. ~93% held-out accuracy on the synthetic data
  (see "Design notes" below for why that number is expected, not suspicious).
* **Dashboard** (`dashboard/app.py`): a 4-tab Streamlit app — route
  congestion (chart + table), a stop map colored by nearby congestion, an
  hourly ridership chart, and a live congestion-forecast tab backed by the
  trained model. Includes a built-in "how to read this" panel, tooltips on
  every control, a sidebar refresh button, a light/dark theme toggle (with
  a matching dark map basemap), and light entrance/hover animations (all
  disabled automatically for users with reduced-motion preferences). Runs
  as its own container (`dashboard/Dockerfile`), reading the model file
  through a mounted volume so retraining never needs a rebuild.
* **CI** (`.github/workflows/tests.yml`): runs the mapper/reducer test suite
  on Python 3.10/3.11/3.12 and builds the dashboard image on every push/PR —
  see "Tests" below.

## Prerequisites

* **Docker** with Compose V2 (the `docker compose` subcommand, not the old
  standalone `docker-compose`) — Docker Desktop on Windows/macOS, or
  `docker` + `docker-compose-plugin` on Linux
* **Python 3.9+** on the host, for the data generator, the MongoDB loader,
  model training, and the dashboard
* **A POSIX shell** for `scripts/run_pipeline.sh` — a normal terminal on
  macOS/Linux, or **Git Bash** on Windows (not PowerShell/cmd — the script
  uses Unix syntax). WSL2 also works if you have it.

### Cross-platform notes

This runs unmodified on Windows, macOS, and Linux:

* All container state lives in named Docker volumes, not host bind mounts —
  nothing depends on host path syntax.
* `scripts/run_pipeline.sh` sets `MSYS_NO_PATHCONV` to stop Git Bash on
  Windows from mangling `/smartcity/...` paths into `C:/smartcity/...`
  before they reach `docker exec`; that variable is simply unused (harmless)
  on macOS/Linux, where bash never rewrites paths in the first place.
* Every host path in the Python code is built with `os.path` relative to
  the script's own location — nothing is hardcoded to this machine's
  directory layout.
* `MONGO_URI` is read from an environment variable everywhere (defaulting
  to `mongodb://localhost:27017`), so the dashboard/loader/trainer work
  the same whether Mongo is local, remote, or renamed in Compose.
* **Apple Silicon (M1/M2/M3) caveat**: the Hadoop images (`bde2020/hadoop-*`)
  are `amd64`-only — Docker Desktop will run them via emulation
  automatically, which works but is noticeably slower than native. MongoDB
  and Mongo Express are official multi-arch images and run natively.
* Commands below use `python`; on macOS/Linux use `python3` if `python`
  isn't aliased on your system.

## Quick Start (1-Click Run with Conda)

We have pre-configured a dedicated Conda environment `cityflow-env` with all dependencies installed.

### Option A: 1-Click Launch (Windows)
Double-click `run.bat` or in PowerShell run:
```powershell
.\run.ps1
```
This automatically runs data generation, all 3 MapReduce jobs, cache/DB sync, ML model training, pytest validation, and opens the **Streamlit Dashboard** in your browser!

### Option B: Cross-Platform Python CLI
```bash
# Activate environment
conda activate cityflow-env

# Run entire pipeline + dashboard
python run_all.py

# Or run in quick demo mode
python run_all.py --quick
```

---

## Running with Docker (Hadoop Cluster + MongoDB)

If you want to run the distributed Hadoop cluster in Docker:

```bash
# 1. Generate synthetic datasets
python data/generate_data.py

# 2. Start Hadoop cluster + MongoDB + Mongo Express + Dashboard
docker compose up -d --build

# Wait ~30-60s for HDFS safe mode, verify containers:
docker compose ps
#   NameNode UI:      http://localhost:9870
#   ResourceManager:  http://localhost:8088
#   Mongo Express:    http://localhost:8081
#   Dashboard:        http://localhost:8501

# 3. Run HDFS & MapReduce pipeline
bash scripts/run_pipeline.sh

# 4. Load MapReduce results into MongoDB and build indexes
python mongo/load_data.py

# 5. Run MongoDB aggregations
docker exec -i mongodb mongosh smartcity < mongo/aggregations.js

# 6. Train congestion forecast model
python ml/train_model.py

# 7. Open http://localhost:8501 to view the live dashboard!
```

---

## Tests

Mapper/reducer logic is unit-tested by running the real deployed scripts as
subprocesses (stdin in, stdout out) — the same way Hadoop Streaming invokes
them — so no cluster is needed and the suite runs in under a second:

```bash
pip install -r tests/requirements.txt
pytest tests/
```

`.github/workflows/tests.yml` runs this suite automatically on every push
and pull request (Python 3.10/3.11/3.12), plus a data-generator smoke test
and a `docker compose config` + dashboard image build check — all without
needing the Hadoop cluster, so CI stays fast and doesn't depend on
Docker-in-Docker privileges beyond a plain image build.

## Security notes (read before pushing this or deploying it anywhere)

This stack is built for local/educational use, not for exposure beyond your
own machine. Before pushing to GitHub or running it anywhere reachable by
others, know what you're publishing:

* **No secrets are stored anywhere in this repo.** There are no API keys,
  passwords, tokens, or `.env` files checked in — the whole pipeline runs
  against local, unauthenticated services (MongoDB on `localhost:27017`,
  the Hadoop cluster's internal Docker network). `.gitignore` also
  defensively excludes `.env`, `*.pem`, `*.key`, and similar patterns in
  case you add real credentials later (e.g. pointing `MONGO_URI` at a
  hosted database).
* **MongoDB and Mongo Express run with no authentication.** That's fine as
  long as their ports (`27017`, `8081`) stay bound to `localhost` (the
  Compose default) and your machine isn't otherwise exposed to an untrusted
  network. Do not publish these ports to the internet, and do not reuse
  this `docker-compose.yml` as-is for a public deployment — add
  `MONGO_INITDB_ROOT_USERNAME`/`_PASSWORD` and `ME_CONFIG_BASICAUTH=true`
  (with real credentials from an env var, not hardcoded) first.
* **HDFS permission checks are disabled** (`HDFS_CONF_dfs_permissions_enabled=false`
  in `hadoop.env`) — standard for a single-user local pseudo-cluster, not
  appropriate for a shared or multi-tenant deployment.
* **Only synthetic data is generated and stored** — `data/generate_data.py`
  fabricates every row; nothing real (no actual GPS traces, no real
  passenger records) ever enters this pipeline, so there's no PII to leak
  in the first place.
* **What's gitignored and why**: generated data (`data/*.csv`), pipeline
  output (`output/`), and the trained model (`ml/model.joblib`,
  `ml/metrics.json`) are all excluded — not because they're sensitive, but
  because they're large, regenerable, and would bloat the repo/diff noise
  for no benefit.

## What to screenshot for the report

* `docker compose ps` — all containers healthy
* NameNode UI (`:9870`) → Utilities → Browse the file system, showing `/smartcity`
* Terminal output of `scripts/run_pipeline.sh` — HDFS `-mkdir`, `-put`,
  `-ls`, `-cat`, `-rm`/`-rmdir` (the explicit delete demo), and all 3
  MapReduce jobs completing (100% map, 100% reduce)
* ResourceManager UI (`:8088`) — 3 completed jobs listed
* `mongo/aggregations.js` output — all 6 pipelines
* Mongo Express (`:8081`) — `routes_summary`, `route_hourly_profile`,
  `stop_ridership`, `transit_stops` collections and their indexes
* `python ml/train_model.py` output — accuracy, classification report,
  feature importance
* The Streamlit dashboard — all 4 tabs, including a live prediction

## Project layout

```
data/generate_data.py            synthetic dataset generator (stdlib only)
mapreduce/traffic/                per-route congestion job (mapper + reducer)
mapreduce/traffic_hourly/         per-route×hour×weather×weekend job (mapper only - reuses traffic/reducer.py)
mapreduce/ridership/               hourly ridership job (mapper + reducer)
mongo/load_data.py                loads MR output + stop data into MongoDB, builds indexes
mongo/aggregations.js             the 6 aggregation pipelines
ml/train_model.py                 trains the congestion-forecast model from MongoDB
dashboard/app.py                  4-tab Streamlit dashboard (congestion, map, ridership, predict)
dashboard/Dockerfile              containerizes the dashboard for docker-compose
tests/test_mapreduce.py           pytest suite for the mapper/reducer scripts
scripts/run_pipeline.sh           orchestrates all HDFS ops + all 3 MapReduce jobs
scripts/manual_demo_commands.txt  same steps, one command per line, for a live/manual demo
docker-compose.yml                Hadoop pseudo-cluster + MongoDB + Mongo Express + dashboard
hadoop.env                        Hadoop cluster configuration (bde2020 image convention)
.streamlit/config.toml            dashboard theme (colors, font)
.github/workflows/tests.yml       CI: pytest suite + data-generator smoke test + image build
.dockerignore                     keeps the build context small (excludes data/output/pycache)
.gitignore                        excludes generated data/output/model artifacts and secrets
```

Generated/derived files are not checked in (see `.gitignore`) — `data/*.csv`,
`output/`, `ml/model.joblib`, and `ml/metrics.json` are all reproducible by
re-running the steps above.

## Design notes worth mentioning in your writeup

* **Validation in the mapper, not just the reducer**: both traffic mappers
  reject malformed rows (wrong column count, non-numeric speed, missing
  timestamp) — the generator deliberately injects ~1% bad rows so this
  logic has something real to do.
* **Streaming reducers group manually**: unlike the Java API's
  `Iterable<Text>` grouping, Hadoop Streaming just guarantees sorted input,
  so each reducer tracks the current key itself and emits on key change.
  This is also why `traffic/reducer.py` could be reused unchanged for the
  hourly job — it never inspects the key's structure, only tracks whether
  it changed.
* **Why two traffic jobs, not one**: the per-route job produces exactly 12
  rows (one per route) — nowhere near enough to train a model on. The
  hourly job keys by `route|hour|weather|weekday_or_weekend` instead,
  producing 1,728 rows with real class balance, which is what makes the ML
  step legitimate rather than decorative.
* **Why weekend is WEEKDAY/WEEKEND, not a 7-day split**: the generator only
  varies rush-hour intensity by weekend vs. weekday (see
  `data/generate_data.py`), so that's the actual signal in the data — a
  full 7-way day-of-week split would just fragment the sample count per bin
  (1,728 → 6,048 combos) without giving the model anything real to learn
  from the extra granularity.
* **Why ~93% model accuracy is the right number, not a red flag**: the
  synthetic generator draws speeds from fixed per-route/rush-hour/weather
  ranges, so a model that captured the pattern perfectly would be
  overfitting to arbitrary boundaries. 93% with confusable adjacent classes
  (a route sitting right at the 15 km/h or 30 km/h threshold) is what a
  model that's actually learned the structure — not memorized noise —
  looks like. Feature importance confirms this is learned, not fit: route
  identity dominates (~88%), weather and hour contribute real but smaller
  signal, and `is_weekend` is the smallest (~0.6%) — consistent with the
  generator only using it as a secondary rush-hour modifier, not a primary
  driver.
* **Embedding vs. referencing in MongoDB**: `stop_ridership` embeds all 24
  hourly buckets in one document per stop (fast single-query read of a
  stop's full day) while `transit_stops` and `routes_summary` are joined
  via `$lookup` on `route_id` (normalized, since a stop can serve many
  routes and a route serves many stops — a many-to-many that doesn't
  embed cleanly).
* **Geospatial index**: `transit_stops.location` is a GeoJSON `Point` with
  a `2dsphere` index, enabling `$near` queries such as "find stops within
  2km of this congested junction."
* **Dashboard robustness**: `dashboard/app.py` and `mongo/load_data.py` both
  fail with a specific, actionable message (not a raw traceback) if MongoDB
  is unreachable or the pipeline hasn't been run yet.
* **Why the model is a mounted volume, not baked into the dashboard image**:
  `ml/model.joblib` changes every time you retrain, and rebuilding a Docker
  image just to pick up a new file is slow and easy to forget. Mounting
  `./ml:/app/ml` means `python ml/train_model.py` on the host is
  immediately visible to the running container — just hit the sidebar's
  refresh button.
