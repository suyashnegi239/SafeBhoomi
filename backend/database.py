
import sqlite3
from pathlib import Path

DB_PATH = Path("/content/landslide_project/data/safebhoomi.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS districts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS weather (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        district TEXT NOT NULL,
        observed_at TEXT,
        rainfall_24h REAL DEFAULT 0,
        rainfall_7d REAL DEFAULT 0,
        temperature REAL,
        humidity REAL,
        wind_speed REAL,
        source TEXT,
        data_status TEXT
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS terrain (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        district TEXT NOT NULL,
        elevation REAL,
        slope REAL,
        aspect REAL,
        source TEXT,
        data_status TEXT
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS soil (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        district TEXT NOT NULL,
        soil_type TEXT,
        soil_moisture REAL,
        soil_saturation REAL,
        source TEXT,
        data_status TEXT
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS landslides (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        district TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        event_date TEXT,
        landslide_type TEXT,
        source TEXT,
        data_status TEXT
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS risk (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        district TEXT NOT NULL,
        calculated_at TEXT,
        score REAL,
        level TEXT,
        rainfall_component REAL,
        terrain_component REAL,
        soil_component REAL,
        historical_component REAL
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        district TEXT,
        severity TEXT,
        alert_type TEXT,
        message TEXT,
        created_at TEXT,
        source TEXT,
        active INTEGER DEFAULT 1
    )
    """)

    conn.commit()
    conn.close()

def seed_districts():
    districts = [
        ("Almora", 29.5971, 79.6591),
        ("Bageshwar", 29.8383, 79.7714),
        ("Chamoli", 30.4020, 79.3281),
        ("Champawat", 29.3357, 80.0910),
        ("Dehradun", 30.3165, 78.0322),
        ("Haridwar", 29.9457, 78.1642),
        ("Nainital", 29.3919, 79.4542),
        ("Pauri Garhwal", 30.1461, 78.7782),
        ("Pithoragarh", 29.5829, 80.2182),
        ("Rudraprayag", 30.2844, 78.9811),
        ("Tehri Garhwal", 30.3780, 78.4800),
        ("Udham Singh Nagar", 28.9760, 79.4000),
        ("Uttarkashi", 30.7268, 78.4354),
    ]

    conn = get_connection()
    cur = conn.cursor()

    for name, lat, lon in districts:
        cur.execute("""
        INSERT OR IGNORE INTO districts
        (name, latitude, longitude)
        VALUES (?, ?, ?)
        """, (name, lat, lon))

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    seed_districts()
    print("SafeBhoomi database initialized.")
