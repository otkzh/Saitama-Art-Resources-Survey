#!/usr/bin/env python3
"""Download article images and create lightweight local WebP copies.

The source URLs remain in the article JSON for provenance. This script adds
local paths and WebP metadata to each image record; it does not change rights.
"""

from __future__ import annotations

import argparse
import io
import json
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from PIL import Image, ImageOps


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = REPOSITORY_ROOT / "data" / "copyrighted" / "arts_council_saitama_articles.json"
DEFAULT_OUTPUT_DIR = REPOSITORY_ROOT / "data" / "copyrighted" / "images"
USER_AGENT = "SaitamaArtResourcesSurvey/1.0 (article image preservation)"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--max-edge", type=int, default=1280)
    parser.add_argument("--quality", type=int, default=78)
    parser.add_argument("--delay", type=float, default=0.12)
    return parser.parse_args()


def fetch(url: str, retries: int = 3) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "image/*"})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                return response.read()
        except (urllib.error.URLError, TimeoutError):
            if attempt + 1 == retries:
                raise
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError("unreachable")


def convert_webp(source: bytes, destination: Path, max_edge: int, quality: int) -> tuple[int, int, int]:
    with Image.open(io.BytesIO(source)) as opened:
        image = ImageOps.exif_transpose(opened)
        image.thumbnail((max_edge, max_edge), Image.Resampling.LANCZOS)
        if image.mode not in {"RGB", "RGBA"}:
            image = image.convert("RGBA" if "transparency" in image.info else "RGB")
        destination.parent.mkdir(parents=True, exist_ok=True)
        temporary = destination.with_suffix(".tmp.webp")
        image.save(temporary, "WEBP", quality=quality, method=6, optimize=True)
        temporary.replace(destination)
        return image.width, image.height, destination.stat().st_size


def main() -> None:
    args = parse_args()
    records: list[dict[str, Any]] = json.loads(args.input.read_text(encoding="utf-8"))
    total = sum(len(record.get("images", [])) for record in records)
    completed = 0

    for record in records:
        public_id = record["public_data_id"]
        for index, image in enumerate(record.get("images", []), start=1):
            role = "eyecatch" if image.get("role") == "eyecatch" else "body"
            relative_path = Path("images") / public_id / f"{index:02d}-{role}.webp"
            destination = args.output_dir.parent / relative_path
            try:
                source = fetch(image["url"])
                width, height, output_bytes = convert_webp(source, destination, args.max_edge, args.quality)
                image.update(
                    {
                        "local_path": relative_path.as_posix(),
                        "webp_width": width,
                        "webp_height": height,
                        "source_bytes": len(source),
                        "webp_bytes": output_bytes,
                        "download_status": "取得済み",
                        "download_error": "",
                    }
                )
            except Exception as error:
                image.update({"local_path": "", "download_status": "取得失敗", "download_error": str(error)})
            completed += 1
            print(f"[{completed:03d}/{total:03d}] {public_id} {image['download_status']} {relative_path.name}", flush=True)
            if completed < total:
                time.sleep(max(args.delay, 0))

    temporary_json = args.input.with_suffix(".tmp.json")
    temporary_json.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary_json.replace(args.input)
    success = sum(image.get("download_status") == "取得済み" for record in records for image in record.get("images", []))
    print(f"Updated {args.input}: {success}/{total} images downloaded", flush=True)


if __name__ == "__main__":
    main()
