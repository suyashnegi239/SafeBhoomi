
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path("/content/landslide_project/data/safebhoomi.db")


def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def insert_weather(
    district,
    rainfall_24h=0,
    rainfall_7d=0,
    temperature=None,
    humidity=None,
    wind_speed=None,
    source="UNKNOWN",
    data_status="UNAVAILABLE"
):
    conn = db()

    conn.execute("""
        INSERT INTO weather (
            district,
            observed_at,
            rainfall_24h,
            rainfall_7d,
            temperature,
            humidity,
            wind_speed,
            source,
            data_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        district,
        datetime.now(timezone.utc).isoformat(),
        rainfall_24h,
        rainfall_7d,
        temperature,
        humidity,
        wind_speed,
        source,
        data_status
    ))

    conn.commit()
    conn.close()


def insert_terrain(
    district,
    elevation=None,
    slope=None,
    aspect=None,
    source="UNKNOWN",
    data_status="UNAVAILABLE"
):
    conn = db()

    conn.execute("""
        INSERT INTO terrain (
            district,
            elevation,
            slope,
            aspect,
            source,
            data_status
        )
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        district,
        elevation,
        slope,
        aspect,
        source,
        data_status
    ))

    conn.commit()
    conn.close()


def insert_soil(
    district,
    soil_type=None,
    soil_moisture=None,
    soil_saturation=None,
    source="UNKNOWN",
    data_status="UNAVAILABLE"
):
    conn = db()

    conn.execute("""
        INSERT INTO soil (
            district,
            soil_type,
            soil_moisture,
            soil_saturation,
            source,
            data_status
        )
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        district,
        soil_type,
        soil_moisture,
        soil_saturation,
        source,
        data_status
    ))

    conn.commit()
    conn.close()


def insert_landslide(
    district,
    latitude=None,
    longitude=None,
    event_date=None,
    landslide_type=None,
    source="UNKNOWN",
    data_status="HISTORICAL"
):
    conn = db()

    conn.execute("""
        INSERT INTO landslides (
            district,
            latitude,
            longitude,
            event_date,
            landslide_type,
            source,
            data_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        district,
        latitude,
        longitude,
        event_date,
        landslide_type,
        source,
        data_status
    ))

    conn.commit()
    conn.close()


def database_counts():
    conn = db()

    tables = [
        "districts",
        "weather",
        "terrain",
        "soil",
        "landslides",
        "risk",
        "alerts"
    ]

    result = {}

    for table in tables:
        result[table] = conn.execute(
            f"SELECT COUNT(*) FROM {table}"
        ).fetchone()[0]

    conn.close()

    return result
