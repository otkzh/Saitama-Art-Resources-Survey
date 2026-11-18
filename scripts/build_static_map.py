#!/usr/bin/env python3
"""Build the static map pages and optionally stage the GitHub Pages files."""

from __future__ import annotations

import argparse
import base64
import csv
import io
import json
import os
import re
import shutil
import tempfile
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
MAP_HTML = REPOSITORY_ROOT / "index.html"
DATASETS = {
    "facility": ("data/arts_council_saitama_art_resources_official_gsi_pending.csv", "id"),
    "article": ("data/copyrighted/arts_council_saitama_articles.csv", "id"),
    "osm": ("data/open_data/111007_public_facility.csv", "ID"),
}
# 連絡がついていない調査先の施設ID。掲載対象に戻す場合はここから外す。
PENDING_CONTACT_IDS = {"5", "7", "11", "17", "21", "22", "23", "25", "27", "28", "35"}
PENDING_PUBLIC_IDS = {f"ACS{int(spot_id):04d}" for spot_id in PENDING_CONTACT_IDS}
IMAGE_DIR = Path("data/copyrighted/images")
START_MARKER = "<!-- STATIC_DATA_START -->"
END_MARKER = "<!-- STATIC_DATA_END -->"


def encoded_datasets() -> dict[str, str]:
    datasets = {}
    for name, (relative_path, id_column) in DATASETS.items():
        excluded_ids = PENDING_PUBLIC_IDS if name == "osm" else PENDING_CONTACT_IDS
        filtered = io.StringIO(newline="")
        with (REPOSITORY_ROOT / relative_path).open(encoding="utf-8-sig", newline="") as source:
            rows = csv.reader(source)
            headers = next(rows)
            id_index = headers.index(id_column)
            writer = csv.writer(filtered)
            writer.writerow(headers)
            writer.writerows(row for row in rows if row and row[id_index] not in excluded_ids)
        datasets[name] = base64.b64encode(filtered.getvalue().encode("utf-8-sig")).decode("ascii")
    return datasets


def write_atomic(path: Path, content: str) -> None:
    original_mode = path.stat().st_mode
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=path.parent
    )
    temporary_path = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(content)
        os.chmod(temporary_path, original_mode)
        os.replace(temporary_path, path)
    except BaseException:
        temporary_path.unlink(missing_ok=True)
        raise


def stage_pages(output: Path) -> None:
    output.mkdir(parents=True)
    for name in (MAP_HTML.name, "260902.html", "site.webmanifest"):
        shutil.copy2(REPOSITORY_ROOT / name, output / name)
    for name in ("assets", "vendor"):
        shutil.copytree(REPOSITORY_ROOT / name, output / name)
    (output / IMAGE_DIR).mkdir(parents=True)
    for source in (REPOSITORY_ROOT / IMAGE_DIR).iterdir():
        if source.is_dir() and source.name not in PENDING_PUBLIC_IDS:
            shutil.copytree(source, output / IMAGE_DIR / source.name)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pages-dir", type=Path, help="New directory for the GitHub Pages files")
    args = parser.parse_args()
    payload = json.dumps(encoded_datasets(), ensure_ascii=True, separators=(",", ":"))
    replacement = (
        f'{START_MARKER}\n'
        f'    <script id="static-data" type="application/json">{payload}</script>\n'
        f'    {END_MARKER}'
    )
    pattern = re.compile(
        rf"{re.escape(START_MARKER)}.*?{re.escape(END_MARKER)}", re.DOTALL
    )
    updated, count = pattern.subn(replacement, MAP_HTML.read_text(encoding="utf-8"))
    if count != 1:
        raise RuntimeError(f"{MAP_HTML.name} static data markers were not found exactly once")
    write_atomic(MAP_HTML, updated)
    print(f"Embedded filtered CSV datasets into {MAP_HTML.name}")

    if args.pages_dir is not None:
        stage_pages(args.pages_dir)


if __name__ == "__main__":
    main()
