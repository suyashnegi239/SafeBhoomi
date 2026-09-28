
import sqlite3
from pathlib import Path

DB_PATH = Path(
    "/content/landslide_project/data/safebhoomi.db"
)


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def add_landslide(
    district,
    latitude,
    longitude,
    event_date=None,
    landslide_type=None,
    source="NRSC/ISRO",
    data_status="HISTORICAL"
):
    conn = get_db()

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


def get_landslides(district=None):
    conn = get_db()

    if district:
        rows = conn.execute("""
            SELECT *
            FROM landslides
            WHERE LOWER(district) = LOWER(?)
            ORDER BY event_date DESC
        """, (district,)).fetchall()
    else:
        rows = conn.execute("""
            SELECT *
            FROM landslides
            ORDER BY event_date DESC
        """).fetchall()

    conn.close()

    return [dict(row) for row in rows]


def landslide_summary():
    conn = get_db()

    total = conn.execute(
        "SELECT COUNT(*) FROM landslides"
    ).fetchone()[0]

    districts = conn.execute("""
        SELECT district, COUNT(*) AS count
        FROM landslides
        GROUP BY district
        ORDER BY count DESC
    """).fetchall()

    conn.close()

    return {
        "total_records": total,
        "by_district": [
            dict(row) for row in districts
        ]
    }
