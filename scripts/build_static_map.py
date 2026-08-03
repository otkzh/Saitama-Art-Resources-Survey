#!/usr/bin/env python3
"""Embed the map CSV datasets into index.html for direct file:// use."""

from __future__ import annotations

import base64
import json
import os
import re
import tempfile
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
MAP_HTML = REPOSITORY_ROOT / "index.html"
DATASETS = {
    "facility": REPOSITORY_ROOT / "data" / "arts_council_saitama_art_resources_official_gsi_pending.csv",
    "article": REPOSITORY_ROOT / "data" / "copyrighted" / "arts_council_saitama_articles.csv",
    "osm": REPOSITORY_ROOT / "data" / "open_data" / "111007_public_facility.csv",
}
START_MARKER = "<!-- STATIC_DATA_START -->"
END_MARKER = "<!-- STATIC_DATA_END -->"


def encoded_datasets() -> dict[str, str]:
    return {
        name: base64.b64encode(path.read_bytes()).decode("ascii")
        for name, path in DATASETS.items()
    }


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


def main() -> None:
    html = MAP_HTML.read_text(encoding="utf-8")
    payload = json.dumps(encoded_datasets(), ensure_ascii=True, separators=(",", ":"))
    replacement = (
        f'{START_MARKER}\n'
        f'    <script id="static-data" type="application/json">{payload}</script>\n'
        f'    {END_MARKER}'
    )
    pattern = re.compile(
        rf"{re.escape(START_MARKER)}.*?{re.escape(END_MARKER)}", re.DOTALL
    )
    updated, count = pattern.subn(replacement, html)
    if count != 1:
        raise RuntimeError("index.html static data markers were not found exactly once")
    write_atomic(MAP_HTML, updated)
    sizes = {name: path.stat().st_size for name, path in DATASETS.items()}
    print(f"Embedded {sum(sizes.values())} bytes from {len(sizes)} CSV files into {MAP_HTML}")


if __name__ == "__main__":
    main()
