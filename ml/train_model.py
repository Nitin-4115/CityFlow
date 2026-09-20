"""
Trains a congestion-prediction model on top of the big-data pipeline:

    HDFS -> Traffic Hourly MapReduce job -> MongoDB (route_hourly_profile)
    -> this script -> ml/model.joblib (+ ml/metrics.json)

Given a route, an hour of day, a weather condition, and whether it's a
weekend, predicts whether that route will be NORMAL / MODERATE_TRAFFIC /
HEAVY_CONGESTION.

Supports dual loading: Reads directly from MongoDB if connected, or falls back
to output/processed_traffic_hourly/part-* for offline training.

Usage:
    python ml/train_model.py
"""
import glob
import json
import os
import sys
import time
from datetime import datetime, timezone

import joblib
import pandas as pd
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = "smartcity"
MODEL_PATH = os.path.join(SCRIPT_DIR, "model.joblib")
METRICS_PATH = os.path.join(SCRIPT_DIR, "metrics.json")

FEATURES = ["route_id", "hour", "weather", "is_weekend"]
TARGET = "congestion_level"


def load_from_mongo():
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
        client.admin.command("ping")
        db = client[DB_NAME]
        docs = list(db.route_hourly_profile.find({}, {"_id": 0, **{f: 1 for f in FEATURES}, TARGET: 1}))
        if docs:
            print(f"[OK] Loaded {len(docs)} profiles directly from MongoDB (route_hourly_profile).")
            return pd.DataFrame(docs)
    except (ServerSelectionTimeoutError, Exception):
        pass
    return None


def load_from_files():
    pattern = os.path.join(PROJECT_ROOT, "output", "processed_traffic_hourly", "part-*")
    paths = sorted(glob.glob(pattern))
    if not paths:
        return None

    rows = []
    for path in paths:
        with open(path, newline="", encoding="utf-8", errors="replace") as f:
            for line in f:
                line = line.rstrip("\r\n")
                if line:
                    rows.append(line.split("\t"))

    docs = []
    for key, value in rows:
        route_id, hour, weather, day_type = key.split("|")
        avg_speed, sample_count, congestion_level = value.split(",")
        docs.append({
            "route_id": route_id,
            "hour": int(hour),
            "weather": weather,
            "is_weekend": day_type == "WEEKEND",
            "congestion_level": congestion_level,
        })
    print(f"[OK] Loaded {len(docs)} profiles from local MapReduce files ({pattern}).")
    return pd.DataFrame(docs)


def load_training_data():
    df = load_from_mongo()
    if df is not None and len(df) > 0:
        return df

    df = load_from_files()
    if df is not None and len(df) > 0:
        return df

    print(
        "[ERROR] No training data found! Run scripts/run_local_mapreduce.py or scripts/run_pipeline.sh first.",
        file=sys.stderr,
    )
    sys.exit(1)


def build_pipeline():
    preprocessor = ColumnTransformer(
        transformers=[
            ("route", OneHotEncoder(handle_unknown="ignore"), ["route_id"]),
            ("weather", OneHotEncoder(handle_unknown="ignore"), ["weather"]),
        ],
        remainder="passthrough",  # leaves "hour" and "is_weekend"
    )
    model = RandomForestClassifier(
        n_estimators=150,
        max_depth=None,
        min_samples_leaf=1,
        random_state=42,
        class_weight="balanced",
        n_jobs=-1,  # Multi-threaded parallel training
    )
    return Pipeline(steps=[("preprocess", preprocessor), ("classify", model)])


def summarize_feature_importance(pipeline):
    preprocess = pipeline.named_steps["preprocess"]
    classify = pipeline.named_steps["classify"]
    feature_names = list(preprocess.get_feature_names_out())
    importances = classify.feature_importances_

    grouped = {}
    for name, importance in zip(feature_names, importances):
        prefix, _, rest = name.partition("__")
        group = {"route": "route_id", "weather": "weather"}.get(prefix, rest if prefix == "remainder" else prefix)
        grouped[group] = grouped.get(group, 0.0) + float(importance)
    return dict(sorted(grouped.items(), key=lambda kv: -kv[1]))


def main():
    t0 = time.time()
    df = load_training_data()
    print("Dataset Class Balance:\n" + df[TARGET].value_counts().to_string())

    X = df[FEATURES]
    y = df[TARGET]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    print("\n[*] Training RandomForest Classifier (n_jobs=-1, 300 estimators)...")
    pipeline = build_pipeline()
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    accuracy = float(accuracy_score(y_test, y_pred))
    report = classification_report(y_test, y_pred, output_dict=True)
    labels = sorted(y.unique())
    cm = confusion_matrix(y_test, y_pred, labels=labels).tolist()
    feature_importance = summarize_feature_importance(pipeline)
    train_duration = time.time() - t0

    print(f"\n[OK] Test Accuracy: {accuracy * 100:.2f}% (on {len(y_test)} test profiles)")
    print("\nClassification Report:\n" + classification_report(y_test, y_pred))
    print("Feature Importance Breakdown:")
    for k, v in feature_importance.items():
        print(f"  - {k}: {v * 100:.1f}%")

    joblib.dump(pipeline, MODEL_PATH)
    metrics = {
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "train_rows": len(X_train),
        "test_rows": len(X_test),
        "accuracy": accuracy,
        "classes": labels,
        "confusion_matrix": cm,
        "classification_report": report,
        "feature_importance": feature_importance,
        "train_duration_sec": round(train_duration, 2),
    }
    with open(METRICS_PATH, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    print(f"\n[OK] Saved trained model -> {MODEL_PATH}")
    print(f"[OK] Saved evaluation metrics -> {METRICS_PATH}")


if __name__ == "__main__":
    main()
