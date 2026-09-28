
import pandas as pd
import sqlite3
from pathlib import Path

DB_PATH = Path(
    "/content/landslide_project/data/safebhoomi.db"
)

UTTARAKHAND = {
    "almora",
    "bageshwar",
    "chamoli",
    "champawat",
    "dehradun",
    "haridwar",
    "nainital",
    "pauri garhwal",
    "pauri",
    "pithoragarh",
    "rudraprayag",
    "tehri garhwal",
    "tehri",
    "udham singh nagar",
    "uttarkashi",
}


def import_landslide_file(file_path):
    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(str(path))

    if path.suffix.lower() == ".csv":
        df = pd.read_csv(path)

    elif path.suffix.lower() in [".xlsx", ".xls"]:
        df = pd.read_excel(path)

    elif path.suffix.lower() == ".json":
        df = pd.read_json(path)

    else:
        raise ValueError(
            "Supported files: CSV, Excel, JSON"
        )

    # Normalize column names
    df.columns = [
        str(c).strip().lower().replace(" ", "_")
        for c in df.columns
    ]

    print("Columns found:")
    print(list(df.columns))

    return df


def filter_uttarakhand(df):
    possible_district_columns = [
        "district",
        "district_name",
        "dist_name",
        "districtname"
    ]

    district_column = None

    for col in possible_district_columns:
        if col in df.columns:
            district_column = col
            break

    if district_column is None:
        print(
            "⚠️ No district column detected."
        )
        return df

    result = df[
        df[district_column]
        .astype(str)
        .str.strip()
        .str.lower()
        .isin(UTTARAKHAND)
    ].copy()

    print(
        "Uttarakhand records:",
        len(result)
    )

    return result


def save_to_database(df):
    conn = sqlite3.connect(DB_PATH)

    inserted = 0

    for _, row in df.iterrows():

        district = row.get(
            "district",
            row.get("district_name", None)
        )

        latitude = row.get(
            "latitude",
            row.get("lat", None)
        )

        longitude = row.get(
            "longitude",
            row.get("lon", row.get("lng", None))
        )

        event_date = row.get(
            "event_date",
            row.get("date", None)
        )

        landslide_type = row.get(
            "landslide_type",
            row.get("type", None)
        )

        if pd.isna(latitude) or pd.isna(longitude):
            continue

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
            str(district),
            float(latitude),
            float(longitude),
            None if pd.isna(event_date)
                else str(event_date),
            None if pd.isna(landslide_type)
                else str(landslide_type),
            "NRSC/ISRO",
            "HISTORICAL"
        ))

        inserted += 1

    conn.commit()
    conn.close()

    return inserted
