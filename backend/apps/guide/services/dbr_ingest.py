"""Focal Point DBR RSS ingestion."""
from __future__ import annotations

import logging
import re
import xml.etree.ElementTree as ET
from html import unescape
from pathlib import Path

import requests

from apps.dbr.models import ReadingDay
from apps.guide.services.paths import dbr_audio_path
from apps.guide.services.narration import generate_dbr_intro_audio

logger = logging.getLogger(__name__)

FEED_URL = "https://feedpress.me/focalpoint-dbr"
NS = {
    "content": "http://purl.org/rss/1.0/modules/content/",
    "itunes": "http://www.itunes.com/dtds/podcast-1.0.dtd",
}


def _text(el) -> str:
    return (el.text or "").strip() if el is not None else ""


def _strip_html(html: str) -> str:
    text = re.sub(r"<[^>]+>", " ", html)
    return unescape(re.sub(r"\s+", " ", text)).strip()


def _extract_links(html: str) -> tuple[str, str, str, str, str]:
    ot_ref = ot_link = nt_ref = nt_link = ""
    for match in re.finditer(r'href="([^"]+)"[^>]*>([^<]+)</a>', html):
        link, label = match.group(1), match.group(2).strip()
        if "Old Testament" in label or "OT" in label:
            ot_link, ot_ref = link, label
        elif "New Testament" in label or "NT" in label:
            nt_link, nt_ref = link, label
    esv_org = ""
    m = re.search(r'https://www\.esv\.org/audio[^"\s<]+', html)
    if m:
        esv_org = m.group(0)
    return ot_ref, ot_link, nt_ref, nt_link, esv_org


def _split_esv_blocks(html: str) -> tuple[str, str, str, str]:
    parts = re.split(r"(?i)<h2[^>]*>.*?new testament.*?</h2>", html, maxsplit=1)
    ot_html = parts[0] if parts else html
    nt_html = parts[1] if len(parts) > 1 else ""
    return ot_html, _strip_html(ot_html), nt_html, _strip_html(nt_html)


def _parse_commentary(html: str) -> str:
    m = re.search(r"(?is)<p[^>]*>\s*Pastor Mike.*?</p>", html)
    if m:
        return _strip_html(m.group(0))
    return ""


def parse_feed_item(item: ET.Element) -> dict:
    guid = _text(item.find("guid")) or _text(item.find("link"))
    title = _text(item.find("title"))
    description = _text(item.find("description"))
    content_el = item.find("content:encoded", NS)
    raw_html = content_el.text if content_el is not None and content_el.text else ""
    pub_date_raw = _text(item.find("pubDate"))

    enclosure = item.find("enclosure")
    audio_url = enclosure.get("url", "") if enclosure is not None else ""
    audio_bytes = int(enclosure.get("length", "0") or 0) if enclosure is not None else None

    ot_ref, ot_link, nt_ref, nt_link, esv_org = _extract_links(raw_html)
    ot_html, ot_text, nt_html, nt_text = _split_esv_blocks(raw_html)
    commentary = _parse_commentary(raw_html)

    from django.utils.dateparse import parse_datetime
    from email.utils import parsedate_to_datetime

    pub_date = None
    if pub_date_raw:
        try:
            pub_date = parsedate_to_datetime(pub_date_raw)
        except (TypeError, ValueError, IndexError):
            pub_date = parse_datetime(pub_date_raw)

    return {
        "guid": guid,
        "title": title,
        "pub_date": pub_date,
        "passage_reference": description,
        "commentary": commentary,
        "ot_reference": ot_ref,
        "ot_link": ot_link,
        "nt_reference": nt_ref,
        "nt_link": nt_link,
        "esv_day_audio_url": audio_url,
        "esv_day_audio_bytes": audio_bytes,
        "esv_org_audio_url": esv_org,
        "esv_ot_html": ot_html,
        "esv_ot_text": ot_text,
        "esv_nt_html": nt_html,
        "esv_nt_text": nt_text,
        "raw_content_html": raw_html,
    }


def download_dbr_audio(guid: str, url: str, *, force: bool = False) -> str:
    if not url:
        return ""
    path = dbr_audio_path(guid)
    if path.exists() and not force:
        return str(path)
    if force and path.exists():
        path.unlink(missing_ok=True)
    response = requests.get(url, timeout=120)
    response.raise_for_status()
    path.write_bytes(response.content)
    return str(path)


def ingest_feed() -> int:
    response = requests.get(FEED_URL, timeout=60)
    response.raise_for_status()
    root = ET.fromstring(response.content)
    channel = root.find("channel")
    if channel is None:
        logger.warning("DBR feed: no channel element")
        return 0

    count = 0
    for item in channel.findall("item"):
        data = parse_feed_item(item)
        if not data["guid"]:
            continue
        audio_path = ""
        if data["esv_day_audio_url"]:
            try:
                audio_path = download_dbr_audio(data["guid"], data["esv_day_audio_url"])
            except Exception as exc:
                logger.exception("DBR audio download failed for %s: %s", data["guid"], exc)

        intro_text, intro_audio_path = generate_dbr_intro_audio(
            data["guid"],
            ot_reference=data["ot_reference"],
            nt_reference=data["nt_reference"],
        )

        ReadingDay.objects.update_or_create(
            guid=data["guid"],
            defaults={
                **data,
                "audio_cached_path": audio_path,
                "intro_narration_text": intro_text,
            },
        )
        if intro_audio_path and not Path(intro_audio_path).exists():
            logger.warning("DBR intro audio missing after generation for %s", data["guid"])
        count += 1
    logger.info("DBR ingest complete: %s items", count)
    return count
