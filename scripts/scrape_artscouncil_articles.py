#!/usr/bin/env python3
"""Extract Arts Council Saitama survey articles into structured JSON.

The output is an intermediate file for the separately stored copyrighted CSV.
Image source URLs and metadata are recorded. Run download_article_images.py
after this scraper when local WebP display assets need to be refreshed.
"""

from __future__ import annotations

import argparse
import csv
import html as html_module
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path
from typing import Any

from lxml import html


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = REPOSITORY_ROOT / "data" / "arts_council_saitama_art_resources_official_gsi_pending.csv"
DEFAULT_OUTPUT = REPOSITORY_ROOT / "data" / "copyrighted" / "arts_council_saitama_articles.json"
REST_ENDPOINT = "https://artscouncil-saitama.jp/wp-json/wp/v2/survey?per_page=100"
USER_AGENT = "SaitamaArtResourcesSurvey/1.0 (one-time article metadata collection)"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--delay", type=float, default=0.25)
    return parser.parse_args()


def fetch(url: str, retries: int = 3) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept-Language": "ja"})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                return response.read()
        except (urllib.error.URLError, TimeoutError):
            if attempt + 1 == retries:
                raise
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError("unreachable")


def clean_text(value: str) -> str:
    value = html_module.unescape(value)
    value = value.replace("\u3000", " ").replace("\xa0", " ")
    return re.sub(r"[ \t\f\v]+", " ", re.sub(r"\s*\n\s*", "\n", value)).strip()


def first_text(tree: Any, xpath: str) -> str:
    nodes = tree.xpath(xpath)
    if not nodes:
        return ""
    node = nodes[0]
    return clean_text(node if isinstance(node, str) else node.text_content())


def absolute_url(value: str, base_url: str) -> str:
    url = urllib.parse.urljoin(base_url, value.strip())
    return urllib.parse.quote(url, safe=":/?=&%#,+@;~!$'()*[]")


def image_record(node: Any, base_url: str, role: str) -> dict[str, Any]:
    width = node.get("width", "")
    height = node.get("height", "")
    return {
        "role": role,
        "url": absolute_url(node.get("src", ""), base_url),
        "alt": clean_text(node.get("alt", "")),
        "width": int(width) if str(width).isdigit() else None,
        "height": int(height) if str(height).isdigit() else None,
    }


def parse_sections(content: Any) -> list[dict[str, Any]]:
    sections: list[dict[str, Any]] = []
    current: dict[str, Any] = {"heading": "", "paragraphs": []}
    for node in content.xpath("./h2|./h3|./p|./ul|./ol|./blockquote"):
        tag = node.tag.lower()
        text = clean_text(node.text_content())
        if tag in {"h2", "h3"}:
            if current["heading"] or current["paragraphs"]:
                sections.append(current)
            current = {"heading": text, "paragraphs": []}
        elif text and not node.xpath(".//img"):
            current["paragraphs"].append(text)
    if current["heading"] or current["paragraphs"]:
        sections.append(current)
    return sections


def article_text(sections: list[dict[str, Any]]) -> str:
    blocks = []
    for section in sections:
        parts = [section["heading"]] if section["heading"] else []
        parts.extend(section["paragraphs"])
        if parts:
            blocks.append("\n".join(parts))
    return "\n\n".join(blocks)


def parse_article(source: bytes, source_url: str) -> dict[str, Any]:
    tree = html.fromstring(source, base_url=source_url)
    content_nodes = tree.xpath('//div[contains(concat(" ", normalize-space(@class), " "), " article-body ")]/div[contains(concat(" ", normalize-space(@class), " "), " wysiwyg ")][1]')
    if not content_nodes:
        raise ValueError("article body was not found")
    content = content_nodes[0]
    sections = parse_sections(content)
    body_text = article_text(sections)

    images: list[dict[str, Any]] = []
    seen: set[str] = set()
    eyecatch = tree.xpath('//div[contains(concat(" ", normalize-space(@class), " "), " eyecatch ")]//img[1]')
    candidates = [(node, "eyecatch") for node in eyecatch]
    candidates.extend((node, "body") for node in content.xpath(".//img"))
    for node, role in candidates:
        record = image_record(node, source_url, role)
        if record["url"] and record["url"] not in seen:
            seen.add(record["url"])
            images.append(record)

    basic_info: dict[str, str] = {}
    for row in tree.xpath('//div[contains(concat(" ", normalize-space(@class), " "), " basic_info ")]//tr'):
        headers = row.xpath("./th")
        cells = row.xpath("./td")
        if headers and cells:
            key = clean_text(headers[0].text_content())
            value = clean_text(cells[0].text_content())
            if key:
                basic_info[key] = value

    return {
        "article_title": first_text(tree, '//article[contains(concat(" ", normalize-space(@class), " "), " article ")]//h1[contains(concat(" ", normalize-space(@class), " "), " heading ")][1]'),
        "subtitle": first_text(tree, '//div[contains(concat(" ", normalize-space(@class), " "), " subtitle-2 ")][1]'),
        "year": first_text(tree, '//div[contains(concat(" ", normalize-space(@class), " "), " meta-lower ")]//ul[contains(concat(" ", normalize-space(@class), " "), " category ")]/li[1]'),
        "sections": sections,
        "body_text": body_text,
        "images": images,
        "basic_info": basic_info,
    }


def main() -> None:
    args = parse_args()
    with args.input.open("r", encoding="utf-8-sig", newline="") as handle:
        source_rows = list(csv.DictReader(handle))

    posts = json.loads(fetch(REST_ENDPOINT).decode("utf-8"))
    post_by_url = {post["link"].rstrip("/") + "/": post for post in posts}

    results = []
    for index, source_row in enumerate(source_rows, start=1):
        source_url = source_row["公式記事URL"].rstrip("/") + "/"
        record: dict[str, Any] = {
            "id": source_row["id"],
            "public_data_id": f"ACS{int(source_row['id']):04d}",
            "source_name": source_row["施設名"],
            "source_url": source_url,
            "retrieved_date": date.today().isoformat(),
            "status": "取得済み",
            "error": "",
        }
        try:
            parsed = parse_article(fetch(source_url), source_url)
            post = post_by_url.get(source_url, {})
            record.update(parsed)
            record.update(
                {
                    "wordpress_id": post.get("id", ""),
                    "slug": post.get("slug", urllib.parse.urlparse(source_url).path.rstrip("/").split("/")[-1]),
                    "published_at": post.get("date", ""),
                    "modified_at": post.get("modified", ""),
                }
            )
        except Exception as error:  # Keep one failed page from discarding the full collection.
            record.update(
                {
                    "status": "取得失敗",
                    "error": str(error),
                    "article_title": "",
                    "subtitle": "",
                    "year": source_row["年度"],
                    "sections": [],
                    "body_text": "",
                    "images": [],
                    "basic_info": {},
                    "wordpress_id": "",
                    "slug": urllib.parse.urlparse(source_url).path.rstrip("/").split("/")[-1],
                    "published_at": "",
                    "modified_at": "",
                }
            )
        results.append(record)
        print(f"[{index:02d}/{len(source_rows):02d}] {record['id']} {record['status']} {record['article_title']}")
        if index < len(source_rows):
            time.sleep(max(args.delay, 0))

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(results)} records to {args.output}")


if __name__ == "__main__":
    main()
