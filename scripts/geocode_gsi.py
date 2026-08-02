#!/usr/bin/env python3
"""国土地理院の住所検索APIでCSVに緯度・経度を追加する。

外部パッケージは不要。既定ではリポジトリ内の対象CSVを更新する。
取得済みの行はスキップし、再取得する場合は --force を指定する。
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
import tempfile
import time
from collections import Counter
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


API_ENDPOINT = "https://msearch.gsi.go.jp/address-search/AddressSearch"
DEFAULT_INPUT = (
    Path(__file__).resolve().parents[1]
    / "data"
    / "arts_council_saitama_art_resources_official_gsi_pending.csv"
)
OUTPUT_COLUMNS = [
    "国土地理院検索住所",
    "国土地理院結果住所",
    "国土地理院経度",
    "国土地理院緯度",
    "国土地理院取得状態",
    "国土地理院API_URL",
]
SAITAMA_WARDS = (
    "西区",
    "北区",
    "大宮区",
    "見沼区",
    "中央区",
    "桜区",
    "浦和区",
    "南区",
    "緑区",
    "岩槻区",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="国土地理院の住所検索APIでCSVに緯度・経度を追加します。"
    )
    parser.add_argument(
        "input",
        nargs="?",
        type=Path,
        default=DEFAULT_INPUT,
        help=f"入力CSV（既定: {DEFAULT_INPUT}）",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        help="出力CSV。省略時は入力CSVを安全に置換します。",
    )
    parser.add_argument(
        "--address-column",
        default="国土地理院検索住所",
        help="検索に使う住所列（空欄時は「参考住所」を使用）",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="「取得済み」の行もAPIで再取得します。",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.1,
        help="API呼び出し間隔（秒、既定: 0.1）",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=15.0,
        help="1回のAPI待ち時間（秒、既定: 15）",
    )
    parser.add_argument(
        "--retries",
        type=int,
        default=3,
        help="一時エラー時の最大試行回数（既定: 3）",
    )
    args = parser.parse_args()
    if args.delay < 0:
        parser.error("--delay は0以上にしてください。")
    if args.timeout <= 0:
        parser.error("--timeout は0より大きくしてください。")
    if args.retries < 1:
        parser.error("--retries は1以上にしてください。")
    return args


def normalize_address(value: str) -> str:
    """検索精度を落とす明らかな表記不足・重複だけを補正する。"""
    address = value.strip()
    address = re.sub(
        r"^埼玉県さいたま市さいたま市", "埼玉県さいたま市", address
    )
    if address.startswith(("さいたま市", "川口市")):
        address = f"埼玉県{address}"
    if address.startswith(SAITAMA_WARDS):
        address = f"埼玉県さいたま市{address}"
    # 例: 「1-56NRK大宮」のような番地と英字建物名の連結を分離する。
    return re.sub(r"([0-9０-９])(?=[A-Za-z]{2,})", r"\1 ", address, count=1)


def request_geocode(
    address: str, *, timeout: float, retries: int
) -> dict[str, Any]:
    api_url = f"{API_ENDPOINT}?{urlencode({'q': address})}"
    last_error = "不明"

    for attempt in range(1, retries + 1):
        try:
            request = Request(
                api_url,
                headers={"User-Agent": "Saitama-Art-Resources-Survey/1.0"},
            )
            with urlopen(request, timeout=timeout) as response:
                payload = json.load(response)
            if not isinstance(payload, list):
                raise ValueError("API応答が配列ではありません")
            if not payload:
                return {"status": "候補なし", "api_url": api_url}

            first = payload[0]
            coordinates = first.get("geometry", {}).get("coordinates", [])
            if not isinstance(coordinates, list) or len(coordinates) < 2:
                raise ValueError("API応答に座標がありません")
            longitude = float(coordinates[0])
            latitude = float(coordinates[1])
            result_address = str(first.get("properties", {}).get("title", ""))
            return {
                "status": "取得済み",
                "api_url": api_url,
                "result_address": result_address,
                "longitude": longitude,
                "latitude": latitude,
            }
        except (HTTPError, URLError, TimeoutError, ValueError, json.JSONDecodeError) as error:
            last_error = str(error)
            if attempt < retries:
                time.sleep(0.5 * attempt)

    return {
        "status": f"取得エラー（{last_error}）",
        "api_url": api_url,
    }


def read_csv(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames is None:
            raise ValueError("CSVにヘッダーがありません。")
        fieldnames = list(reader.fieldnames)
        rows = list(reader)
    return fieldnames, rows


def write_csv_atomic(
    path: Path, fieldnames: list[str], rows: list[dict[str, str]]
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=path.parent
    )
    temporary_path = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.DictWriter(
                handle,
                fieldnames=fieldnames,
                extrasaction="ignore",
                lineterminator="\n",
            )
            writer.writeheader()
            writer.writerows(rows)
        os.replace(temporary_path, path)
    except BaseException:
        temporary_path.unlink(missing_ok=True)
        raise


def main() -> int:
    args = parse_args()
    input_path = args.input.resolve()
    output_path = (args.output or args.input).resolve()
    if not input_path.is_file():
        print(f"入力CSVが見つかりません: {input_path}", file=sys.stderr)
        return 2

    try:
        fieldnames, rows = read_csv(input_path)
    except (OSError, UnicodeError, csv.Error, ValueError) as error:
        print(f"CSVを読み込めません: {error}", file=sys.stderr)
        return 2

    for column in OUTPUT_COLUMNS:
        if column not in fieldnames:
            fieldnames.append(column)

    counts: Counter[str] = Counter()
    api_calls = 0
    for row in rows:
        source_address = row.get(args.address_column, "") or row.get("参考住所", "")
        address = normalize_address(source_address)
        if not address:
            row.update(
                {
                    "国土地理院検索住所": "",
                    "国土地理院結果住所": "",
                    "国土地理院経度": "",
                    "国土地理院緯度": "",
                    "国土地理院取得状態": "住所なし",
                    "国土地理院API_URL": "",
                }
            )
            counts["住所なし"] += 1
            continue

        row["国土地理院検索住所"] = address
        if row.get("国土地理院取得状態") == "取得済み" and not args.force:
            counts["取得済み（スキップ）"] += 1
            continue

        result = request_geocode(
            address, timeout=args.timeout, retries=args.retries
        )
        api_calls += 1
        row.update(
            {
                "国土地理院結果住所": result.get("result_address", ""),
                "国土地理院経度": result.get("longitude", ""),
                "国土地理院緯度": result.get("latitude", ""),
                "国土地理院取得状態": result["status"],
                "国土地理院API_URL": result["api_url"],
            }
        )
        counts[result["status"]] += 1
        if args.delay:
            time.sleep(args.delay)

    try:
        write_csv_atomic(output_path, fieldnames, rows)
    except OSError as error:
        print(f"CSVを書き込めません: {error}", file=sys.stderr)
        return 2

    summary = {
        "input": str(input_path),
        "output": str(output_path),
        "rows": len(rows),
        "api_calls": api_calls,
        "counts": dict(counts),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
