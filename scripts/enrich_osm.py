#!/usr/bin/env python3
"""Add reviewed OpenStreetMap matches and selected tags to the public CSV.

The OSM matches below were reviewed on 2026-08-02 using normalized names and
distance from the GSI coordinates.  Keeping the reviewed ID mapping explicit
prevents a later fuzzy-search run from silently attaching an unrelated place.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CSV = REPOSITORY_ROOT / "data" / "open_data" / "111007_public_facility.csv"
DEFAULT_OVERPASS_URL = "https://overpass-api.de/api/interpreter"
OSM_REVIEW_DATE = "2026-08-02"

OSM_COLUMNS = [
    "OSM照合状態",
    "OSM要素種別",
    "OSM_ID",
    "OSM名称",
    "OSM_URL",
    "OSM距離_m",
    "OSM主要分類",
    "OSM住所",
    "OSM営業時間",
    "OSM電話番号",
    "OSMウェブサイト",
    "OSM車椅子対応",
    "OSM運営者",
    "OSM最終更新日時",
    "OSM照合日",
    "OSM照合根拠",
]

# ID: (match status, OSM element type, OSM element ID, reviewed reason)
REVIEWED_MATCHES: dict[str, tuple[str, str, int, str]] = {
    "ACS0005": ("推定一致", "node", 7418228785, "主要語「南風」が一致し、座標も近接"),
    "ACS0012": ("推定一致", "node", 12608987423, "主要名「Stand coffee コトコト」が一致し、座標も近接"),
    "ACS0017": ("推定一致", "node", 10744451701, "主要名「ブロックはかせ.Labo」が一致し、座標も近接"),
    "ACS0018": ("一致", "way", 778807058, "名称が一致し、座標も近接"),
    "ACS0019": ("一致", "node", 7325685803, "名称が一致し、座標も近接"),
    "ACS0020": ("一致", "node", 12046978099, "名称が一致し、店舗POIを採用"),
    "ACS0029": ("一致", "node", 5854321085, "名称が一致し、座標も近接"),
    "ACS0031": ("推定一致", "node", 13483132616, "主要名「GAFU」が一致し、座標も近接"),
    "ACS0032": ("一致", "node", 11905910767, "名称が一致し、ウェブサイト付きPOIを採用"),
    "ACS0036": ("推定一致", "node", 6625378220, "英字名「Cobalt」と業種・座標から推定"),
    "ACS0043": ("推定一致", "node", 10589573099, "主要名「大西屋」と酒販店分類・座標から推定"),
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_CSV)
    parser.add_argument("--output", type=Path, default=DEFAULT_CSV)
    parser.add_argument(
        "--osm-json",
        type=Path,
        help="Use a cached Overpass JSON response instead of accessing the network.",
    )
    parser.add_argument("--overpass-url", default=DEFAULT_OVERPASS_URL)
    return parser.parse_args()


def overpass_query() -> str:
    nodes = [str(osm_id) for _, kind, osm_id, _ in REVIEWED_MATCHES.values() if kind == "node"]
    ways = [str(osm_id) for _, kind, osm_id, _ in REVIEWED_MATCHES.values() if kind == "way"]
    parts = []
    if nodes:
        parts.append(f"node(id:{','.join(nodes)});")
    if ways:
        parts.append(f"way(id:{','.join(ways)});")
    return f"[out:json][timeout:60];({''.join(parts)});out center tags meta;"


def fetch_osm(url: str) -> dict[str, Any]:
    body = urllib.parse.urlencode({"data": overpass_query()}).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=body,
        headers={"User-Agent": "SaitamaArtResourcesSurvey/1.0 (OSM enrichment script)"},
    )
    with urllib.request.urlopen(request, timeout=90) as response:
        return json.load(response)


def element_key(element: dict[str, Any]) -> tuple[str, int]:
    return str(element["type"]), int(element["id"])


def element_coordinates(element: dict[str, Any]) -> tuple[float, float]:
    if "lat" in element and "lon" in element:
        return float(element["lat"]), float(element["lon"])
    center = element.get("center", {})
    return float(center["lat"]), float(center["lon"])


def haversine_metres(lat1: float, lon1: float, lat2: float, lon2: float) -> int:
    radius = 6_371_000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    value = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return round(2 * radius * math.asin(math.sqrt(value)))


def first_tag(tags: dict[str, str], *keys: str) -> str:
    return next((tags[key] for key in keys if tags.get(key)), "")


def classification(tags: dict[str, str]) -> str:
    keys = ("amenity", "shop", "tourism", "leisure", "office", "craft", "historic", "club", "man_made", "building")
    return ";".join(f"{key}={tags[key]}" for key in keys if tags.get(key))


def osm_address(tags: dict[str, str]) -> str:
    if tags.get("addr:full"):
        return tags["addr:full"]
    parts = [
        tags.get("addr:postcode", ""),
        tags.get("addr:province", ""),
        tags.get("addr:city", ""),
        tags.get("addr:suburb", ""),
        tags.get("addr:quarter", ""),
        tags.get("addr:street", ""),
        tags.get("addr:housenumber", ""),
        tags.get("addr:floor", ""),
    ]
    return " ".join(part for part in parts if part)


def osm_values(
    row: dict[str, str],
    element: dict[str, Any],
    match_status: str,
    reason: str,
) -> dict[str, str]:
    kind = str(element["type"])
    osm_id = int(element["id"])
    tags: dict[str, str] = element.get("tags", {})
    lat, lon = element_coordinates(element)
    distance = haversine_metres(float(row["緯度"]), float(row["経度"]), lat, lon)
    return {
        "OSM照合状態": match_status,
        "OSM要素種別": kind,
        "OSM_ID": str(osm_id),
        "OSM名称": first_tag(tags, "name", "name:ja", "official_name", "brand"),
        "OSM_URL": f"https://www.openstreetmap.org/{kind}/{osm_id}",
        "OSM距離_m": str(distance),
        "OSM主要分類": classification(tags),
        "OSM住所": osm_address(tags),
        "OSM営業時間": first_tag(tags, "opening_hours"),
        "OSM電話番号": first_tag(tags, "contact:phone", "phone"),
        "OSMウェブサイト": first_tag(tags, "contact:website", "website"),
        "OSM車椅子対応": first_tag(tags, "wheelchair"),
        "OSM運営者": first_tag(tags, "operator"),
        "OSM最終更新日時": str(element.get("timestamp", "")),
        "OSM照合日": OSM_REVIEW_DATE,
        "OSM照合根拠": f"{reason}（{distance}m）",
    }


def main() -> None:
    args = parse_args()
    if args.osm_json:
        osm = json.loads(args.osm_json.read_text(encoding="utf-8"))
    else:
        osm = fetch_osm(args.overpass_url)
    elements = {element_key(element): element for element in osm.get("elements", [])}

    with args.input.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        input_headers = [header for header in (reader.fieldnames or []) if header not in OSM_COLUMNS]
        rows = list(reader)

    missing_elements = []
    for facility_id, (_, kind, osm_id, _) in REVIEWED_MATCHES.items():
        if (kind, osm_id) not in elements:
            missing_elements.append(f"{facility_id}:{kind}/{osm_id}")
    if missing_elements:
        raise RuntimeError("OSM response is missing reviewed elements: " + ", ".join(missing_elements))

    for row in rows:
        for column in OSM_COLUMNS:
            row.pop(column, None)
        reviewed = REVIEWED_MATCHES.get(row.get("ID", ""))
        if reviewed:
            status, kind, osm_id, reason = reviewed
            row.update(osm_values(row, elements[(kind, osm_id)], status, reason))
        else:
            row.update({column: "" for column in OSM_COLUMNS})
            row["OSM照合状態"] = "該当なし"
            row["OSM照合日"] = OSM_REVIEW_DATE
            row["OSM照合根拠"] = "座標350m以内に同名・有力類似名なし"

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=input_headers + OSM_COLUMNS, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)

    counts = {status: sum(row["OSM照合状態"] == status for row in rows) for status in ("一致", "推定一致", "該当なし")}
    print(f"Wrote {len(rows)} rows to {args.output}")
    print(" / ".join(f"{key}: {value}" for key, value in counts.items()))


if __name__ == "__main__":
    main()
