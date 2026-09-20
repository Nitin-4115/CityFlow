# CityFlow — Smart Transit & Real-Time Traffic Platform

An enterprise-grade **Big Data Analytics & AI Congestion Forecasting Platform** built for smart cities (benchmarked on Bengaluru, India). 

CityFlow ingests **2.1 Million vehicle GPS pings** and **500,000 transit RFID ticketing events**, processes them distributedly with **Hadoop MapReduce**, indexes and aggregates them with **MongoDB**, trains an **AI Random Forest model (95.3% accuracy)**, and serves a **React Glassmorphic Cyber-Deck** backed by **FastAPI**.

---

## 🚦 Core Architecture

```text
[2.1M Kaggle Bengaluru GPS Records + 500K RFID Ticketing Events]
                           │
                           ▼
             [Hadoop MapReduce Processing]
        • Job 1: Traffic Congestion Aggregator (1,554 Corridors)
        • Job 2: Hourly ML Profile Generator (125,254 Profiles)
        • Job 3: Station Ridership & Demographics (960 Hours)
                           │
                           ▼
          [MongoDB Storage & Analytical Pipelines]
        • 4 Collections: routes_summary, route_hourly_profile, stop_ridership, transit_stops
        • 6 Aggregation Pipelines ($near 2dsphere, $lookup, $facet, $unwind)
                           │
                           ▼
          [AI Machine Learning Inference Engine]
        • Scikit-Learn Random Forest Classifier (95.32% Accuracy)
        • Real-time sub-10ms predictions via REST API
                           │
                           ▼
       [Modern React Cyber-Deck Dashboard + FastAPI]
        • OpenStreetMap (40 Transit Stations + 1,554 Dynamic Corridors)
        • Bottleneck Analytics, Ridership Demand Curves, Live AI Forecaster
```

---

## 🌟 Key Platform Modules

### 1. 🗺️ Metropolitan Transit Map
* **40 Real Bengaluru Transit Hubs** (Majestic, Silk Board, Whitefield, Manyata, Hebbal, Indiranagar, etc.).
* **1,554 Cross-City Corridors** with real-time speed color coding:
  * 🔴 **Red**: Heavy Congestion (< 15 km/h)
  * 🟡 **Amber**: Moderate Traffic (15–30 km/h)
  * 🟢 **Green**: Smooth Free Flow (≥ 30 km/h)
* Interactive station selection and corridor layer toggles.

### 2. 📊 Corridor Congestion & Bottleneck Analysis
* Automatically sorts and ranks the worst delay choke points across the city.
* Compact, scrollable interface with quick filters (Top 15, 30, 50, or All routes).

### 3. 👥 Station Ridership & Passenger Demographics
* 24-hour commuter demand curves per station to optimize bus fleet dispatch.
* Demographic breakdown across passenger types (**65% General**, **22% Student**, **13% Senior**).

### 4. 🔮 AI Congestion Forecaster
* Real-time search to instantly filter among 1,554 corridors.
* Scenario simulation: adjust hour of day, weather (*Clear*, *Rain*, *Fog*), and day type (*Weekday* vs *Weekend*).
* Outputs predicted congestion category, class confidence probabilities, and feature weights.

### 5. 🗄️ Big Data Studio (Hadoop & MongoDB)
* **Hadoop HDFS Explorer**: Visualizes directory hierarchy, block replication, and execution status of the 3 MapReduce jobs.
* **MongoDB Aggregation Deck**: Interactive workbench presenting all 6 production aggregation pipelines with live outputs.

---

## ⚡ Quick Start

### 1. Environment Setup (1-Click)
Double-click **`setup_env.bat`** (or run `conda env create -f environment.yml`).
This automatically creates the environment and installs all locked dependencies.

### 2. Dataset Setup (Kaggle)
CityFlow is benchmarked on the real-world **Bangalore Traffic Analysis Dataset** (~2.1M records):
1. Download the dataset directly from Kaggle:
   👉 **[Bangalore Traffic Analysis Dataset](https://www.kaggle.com/datasets/asshridattaaigal/bangalore-traffic-analysis-dataset)**
   *(Or download via Kaggle CLI: `kaggle datasets download -d asshridattaaigal/bangalore-traffic-analysis-dataset`)*
2. Extract the downloaded zip file to get **`bangalore_routes.csv`**.
3. Place the file inside the project directory:
   ```text
   CityFlow/data/kaggle_dataset/bangalore_routes.csv
   ```

### 3. Launching the Platform
Double-click **`run.bat`** (or run `.\run.ps1` in PowerShell).
The launcher automatically executes all 6 pipeline steps:
1. Ingests 2.1M Bengaluru GPS records & 500k transit tickets
2. Executes 3 Hadoop MapReduce streaming jobs
3. Syncs MongoDB collections, compound indexes, and offline cache
4. Trains the AI Random Forest model
5. Runs 15 unit tests (`pytest`)
6. Launches the FastAPI backend & opens the React dashboard at **http://localhost:8000**

---

## 🧪 Unit Tests

Run the test suite directly:
```bash
pytest tests/
```
* **15 / 15 unit tests passing** covering mappers, reducers, and edge-case sanitization.

---

## 📂 Repository Structure

```text
CityFlow/
├── api/             # FastAPI REST server & API endpoints
├── data/            # Ingestion scripts & transit metadata
│   ├── kaggle_dataset/   # Real Bengaluru routes dataset
│   ├── raw_gps/          # Calibrated GPS telemetry
│   ├── raw_rfid/         # RFID ticketing transactions
│   ├── routes_metadata.json
│   └── transit_stops.csv
├── frontend/        # React + Tailwind + Leaflet UI
│   ├── dist/        # Pre-built production bundle (FastAPI serves this directly)
│   └── src/         # UI source code and cyber-deck components
├── mapreduce/       # Hadoop Streaming mappers & reducers
│   ├── ridership/        # Ridership aggregator
│   ├── traffic/          # Corridor speed & congestion aggregator
│   └── traffic_hourly/   # Hourly profile feature generator
├── ml/              # Scikit-learn Random Forest model & metrics
├── mongo/           # MongoDB loaders & 6 aggregation pipelines
├── output/          # MapReduce outputs & dashboard_cache.json
├── scripts/         # Local MapReduce runner & utility scripts
├── tests/           # Pytest unit tests (15/15 passing)
├── environment.yml  # Conda environment definition
├── requirements.txt # Locked Python dependencies
├── run.bat          # 1-click Windows launcher
├── run.ps1          # PowerShell launcher
├── run_all.py       # Master pipeline orchestrator
├── setup_env.bat    # 1-click environment installer
└── README.md        # Project documentation
```

---

## 📜 License
Educational and smart city mobility research project. Open-source under MIT.
