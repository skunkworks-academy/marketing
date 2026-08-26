#!/usr/bin/env python3
"""Render deterministic Skunkworks Academy × CompTIA social cards.

Output: 1080x1080 PNGs published by marketing.skunkworksacademy.com.
The layout keeps the two brand marks in a dedicated co-branding band and does
not recolour, stretch, skew or add effects to either source logo.
"""

from __future__ import annotations

import io
import json
import subprocess
import urllib.request
from pathlib import Path

import cairosvg
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT.parent.parent / "campaigns" / "comptia" / "2026q3"
COMPTIA_LOGO = "https://raw.githubusercontent.com/skunkworks-academy/www/main/comptia/Comptia-logo.svg"
SKUNKWORKS_LOGO = "https://raw.githubusercontent.com/skunkworks-academy/portal/main/public/logo.svg"

WIDTH = HEIGHT = 1080
BG = "#F7F7F5"
INK = "#151515"
MUTED = "#525252"
RULE = "#D9D9D5"
ACCENT = "#EE2722"
WHITE = "#FFFFFF"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    path = Path("/usr/share/fonts/truetype/dejavu") / name
    return ImageFont.truetype(str(path), size=size)


def fetch_svg(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "Skunkworks-CompTIA-Creative-Renderer/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()


def svg_image(svg: bytes, width: int | None = None, height: int | None = None) -> Image.Image:
    png = cairosvg.svg2png(bytestring=svg, output_width=width, output_height=height)
    return Image.open(io.BytesIO(png)).convert("RGBA")


def contain(image: Image.Image, max_width: int, max_height: int) -> Image.Image:
    ratio = min(max_width / image.width, max_height / image.height)
    size = (max(1, round(image.width * ratio)), max(1, round(image.height * ratio)))
    return image.resize(size, Image.Resampling.LANCZOS)


def split_lines(draw: ImageDraw.ImageDraw, text: str, face: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        box = draw.textbbox((0, 0), candidate, font=face)
        if box[2] - box[0] <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def fit_text(draw: ImageDraw.ImageDraw, text: str, max_width: int, max_lines: int, start_size: int, min_size: int, bold: bool = False):
    for size in range(start_size, min_size - 1, -2):
        face = font(size, bold=bold)
        lines = split_lines(draw, text, face, max_width)
        if len(lines) <= max_lines:
            return face, lines
    face = font(min_size, bold=bold)
    lines = split_lines(draw, text, face, max_width)
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        last = lines[-1]
        while last and draw.textbbox((0, 0), last + "…", font=face)[2] > max_width:
            last = last[:-1]
        lines[-1] = last.rstrip() + "…"
    return face, lines


def draw_lines(draw: ImageDraw.ImageDraw, xy: tuple[int, int], lines: list[str], face: ImageFont.FreeTypeFont, fill: str, gap: int) -> int:
    x, y = xy
    for line in lines:
        draw.text((x, y), line, font=face, fill=fill)
        bbox = draw.textbbox((x, y), line, font=face)
        y = bbox[3] + gap
    return y


def load_calendar() -> dict:
    subprocess.run(["node", str(ROOT / "build-calendar.mjs")], check=True, cwd=ROOT.parent.parent)
    return json.loads((ROOT / "content-calendar.json").read_text(encoding="utf-8"))


def render(item: dict, skunkworks: Image.Image, comptia: Image.Image) -> Path:
    canvas = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(canvas)

    # Dedicated co-branding band.
    draw.rectangle((0, 0, WIDTH, 168), fill=WHITE)
    draw.line((0, 168, WIDTH, 168), fill=RULE, width=2)

    skw = contain(skunkworks, 72, 72)
    canvas.paste(skw, (64, 47), skw)
    draw.text((154, 50), "SKUNKWORKS", font=font(26, True), fill=INK)
    draw.text((154, 84), "ACADEMY", font=font(23, False), fill=MUTED)

    comp = contain(comptia, 245, 58)
    canvas.paste(comp, (WIDTH - 64 - comp.width, 55), comp)

    draw.text((64, 220), f"DAY {item['day']:02d}  •  {item['pillar'].replace('-', ' ').upper()}", font=font(22, True), fill=ACCENT)

    headline_face, headline_lines = fit_text(draw, item["headline"], 930, 4, 66, 42, bold=True)
    y = draw_lines(draw, (64, 280), headline_lines, headline_face, INK, 10)

    y += 34
    proof_face, proof_lines = fit_text(draw, item["proof"], 900, 5, 32, 25, bold=False)
    y = draw_lines(draw, (64, y), proof_lines, proof_face, MUTED, 12)

    # CTA block uses one clear action only.
    cta_top = 862
    draw.rounded_rectangle((64, cta_top, 1016, 970), radius=24, fill=INK)
    draw.text((98, cta_top + 24), item["cta"], font=font(31, True), fill=WHITE)
    draw.text((98, cta_top + 66), "comptia.skunkworksacademy.com", font=font(21, False), fill="#D6D6D6")

    draw.text((64, 1016), "Skunkworks Academy × CompTIA  •  Learn. Practice. Validate. Apply.", font=font(18, False), fill=MUTED)

    OUTPUT.mkdir(parents=True, exist_ok=True)
    path = OUTPUT / f"day-{item['day']:02d}.png"
    canvas.save(path, format="PNG", optimize=True)
    return path


def main() -> None:
    calendar = load_calendar()
    skunkworks = svg_image(fetch_svg(SKUNKWORKS_LOGO))
    comptia = svg_image(fetch_svg(COMPTIA_LOGO))
    paths = [render(item, skunkworks, comptia) for item in calendar["days"]]
    print(f"Rendered {len(paths)} co-branded CompTIA social cards to {OUTPUT}.")


if __name__ == "__main__":
    main()
