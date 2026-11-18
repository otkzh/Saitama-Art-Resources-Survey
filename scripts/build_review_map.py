#!/usr/bin/env python3
"""Build the permission-review map and a self-contained, filtered delivery folder."""

import base64
import csv
import io
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
# 掲載許可の連絡待ち。名称の表記揺れに依存せず元データIDで管理する。
PENDING_IDS = {5, 7, 11, 17, 21, 22, 23, 25, 27, 28, 35}
OUTPUT = ROOT / "261118-review.html"
DELIVERY = ROOT / "dist" / "review"


def main():
    html = (ROOT / "260902.html").read_text(encoding="utf-8")
    match = re.search(r'<script id="static-data" type="application/json">(.*?)</script>', html, re.S)
    payload = json.loads(match[1])
    datasets = {}
    for name, value in payload.items():
        datasets[name] = list(csv.DictReader(io.StringIO(base64.b64decode(value).decode("utf-8-sig"))))
    original_ids = {int(row["id"]) for row in datasets["facility"]}
    assert PENDING_IDS <= original_ids
    allowed = {
        int(row["id"]) for row in datasets["facility"]
        if int(row["id"]) not in PENDING_IDS
        and row.get("国土地理院緯度") and row.get("国土地理院経度")
    }
    for name, rows in datasets.items():
        key = "ID" if name == "osm" else "id"
        rows = [row for row in rows if int(row[key].removeprefix("ACS")) in allowed]
        datasets[name] = rows
        buffer = io.StringIO(newline="")
        writer = csv.DictWriter(buffer, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
        payload[name] = base64.b64encode(buffer.getvalue().encode("utf-8")).decode("ascii")
    html = html[:match.start(1)] + json.dumps(payload, separators=(",", ":")) + html[match.end(1):]
    # Limit flex ancestors as well as the scrolling child; preserve [hidden].
    css = """
      #list-view:not([hidden]) { display:flex; flex:1 1 0; flex-direction:column; min-height:0; overflow:hidden; }
      .list-heading { flex:0 0 auto; }
      #list { flex:1 1 0; min-height:0; overflow-y:auto; scrollbar-gutter:stable; }
      .detail-scroll { flex:1 1 0; }
      .review-notice { margin:0 0 14px; padding:10px 14px; border:1px solid var(--line); color:var(--muted); font-size:.75rem; line-height:1.6; }
      @media(max-width:760px) {
        #viewer { height:520px; max-height:70vh; }
        #viewer.has-detail { height:72vh; max-height:72vh; }
        #viewer .detail { min-height:0; }
      }
"""
    html = html.replace("    </style>", css + "    </style>")
    html = html.replace("<title>さいたまアート資源マップ｜近くから探す</title>", "<title>さいたまアート資源マップ｜掲載確認版 2026-11-18</title>")
    html = html.replace('<meta name="viewport"', '<meta name="robots" content="noindex,nofollow" />\n    <meta name="viewport"', 1)
    html = html.replace('    <link rel="manifest" href="./site.webmanifest" />\n', '')
    html = html.replace('      <section class="controls"', '      <p class="review-notice" role="note">掲載確認版（2026年11月18日）｜掲載確認待ちのスポットを除外しています。正式公開前の確認用です。</p>\n      <section class="controls"', 1)
    html = html.replace('<div id="list"></div>', '<div id="list" tabindex="0" role="region" aria-label="スポット検索結果（スクロールできます）"></div>')
    OUTPUT.write_text(html, encoding="utf-8")
    # Only this generated directory may be shared; raw repository data stays out.
    if DELIVERY.exists():
        shutil.rmtree(DELIVERY)
    DELIVERY.mkdir(parents=True)
    (DELIVERY / "index.html").write_text(html, encoding="utf-8")
    shutil.copytree(ROOT / "assets", DELIVERY / "assets")
    shutil.copytree(ROOT / "vendor", DELIVERY / "vendor")
    image_count = 0
    for row in datasets["article"]:
        for image in json.loads(row.get("画像JSON") or "[]"):
            if not image.get("local_path"):
                continue
            relative = Path("data/copyrighted") / image["local_path"]
            assert ".." not in relative.parts and not relative.is_absolute()
            target = DELIVERY / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(ROOT / relative, target)
            image_count += 1
    mapped = sum(bool(r.get("国土地理院緯度") and r.get("国土地理院経度")) for r in datasets["facility"])
    print(f"Created {OUTPUT.name}: {mapped} mapped spots, {len(PENDING_IDS)} held, {image_count} images")
    print(f"Filtered delivery: {DELIVERY}")


if __name__ == "__main__":
    main()
