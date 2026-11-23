"""Image crop, resize, and compress utilities (bulk-friendly)."""

from __future__ import annotations

import io
from dataclasses import dataclass
from typing import BinaryIO, Literal, Optional, Tuple

from PIL import Image, ImageOps

Format = Literal["JPEG", "WEBP", "PNG"]
AspectPreset = Literal["free", "1:1", "4:5", "3:4", "16:9", "4:3"]


@dataclass
class ProcessResult:
    data: bytes
    filename: str
    mime: str
    width: int
    height: int
    size_bytes: int


def open_image(source: bytes | BinaryIO) -> Image.Image:
    img = Image.open(source)
    img = ImageOps.exif_transpose(img)
    if img.mode in ("RGBA", "P") and img.info.get("transparency") is not None:
        bg = Image.new("RGB", img.size, (255, 255, 255))
        bg.paste(img, mask=img.convert("RGBA").split()[-1])
        return bg
    if img.mode != "RGB":
        return img.convert("RGB")
    return img


def parse_aspect(preset: AspectPreset) -> Optional[float]:
    mapping = {
        "1:1": 1.0,
        "4:5": 4 / 5,
        "3:4": 3 / 4,
        "16:9": 16 / 9,
        "4:3": 4 / 3,
    }
    return mapping.get(preset)


def crop_center_aspect(img: Image.Image, target_ratio: float) -> Image.Image:
    w, h = img.size
    current = w / h
    if abs(current - target_ratio) < 1e-4:
        return img.copy()
    if current > target_ratio:
        new_w = int(round(h * target_ratio))
        left = (w - new_w) // 2
        return img.crop((left, 0, left + new_w, h))
    new_h = int(round(w / target_ratio))
    top = (h - new_h) // 2
    return img.crop((0, top, w, top + new_h))


def crop_box(img: Image.Image, x: float, y: float, w: float, h: float) -> Image.Image:
    """Crop using normalized 0–1 coordinates (same frame on every image size)."""
    iw, ih = img.size
    left = max(0, min(iw - 1, int(round(x * iw))))
    top = max(0, min(ih - 1, int(round(y * ih))))
    right = max(left + 1, min(iw, int(round((x + w) * iw))))
    bottom = max(top + 1, min(ih, int(round((y + h) * ih))))
    return img.crop((left, top, right, bottom))


def crop_pixels(
    img: Image.Image, left: int, top: int, width: int, height: int
) -> Image.Image:
    """Crop using pixel coords on the EXIF-oriented image."""
    iw, ih = img.size
    left = max(0, min(iw - 1, int(left)))
    top = max(0, min(ih - 1, int(top)))
    width = max(1, int(width))
    height = max(1, int(height))
    right = max(left + 1, min(iw, left + width))
    bottom = max(top + 1, min(ih, top + height))
    return img.crop((left, top, right, bottom))


def maybe_resize(img: Image.Image, max_edge: Optional[int]) -> Image.Image:
    if not max_edge or max_edge <= 0:
        return img
    w, h = img.size
    if max(w, h) <= max_edge:
        return img
    if w >= h:
        nw, nh = max_edge, int(round(h * max_edge / w))
    else:
        nh, nw = max_edge, int(round(w * max_edge / h))
    return img.resize((nw, nh), Image.Resampling.LANCZOS)


def _encode(
    img: Image.Image,
    fmt: Format,
    quality: int,
    webp_method: int = 6,
) -> bytes:
    buf = io.BytesIO()
    if fmt == "PNG":
        img.save(buf, format="PNG", optimize=True)
    elif fmt == "WEBP":
        img.save(buf, format="WEBP", quality=quality, method=webp_method)
    else:
        img.save(buf, format="JPEG", quality=quality, optimize=True, progressive=True)
    return buf.getvalue()


def compress_to_target(
    img: Image.Image,
    max_bytes: int,
    fmt: Format = "JPEG",
    min_quality: int = 35,
    max_quality: int = 95,
    max_edge: Optional[int] = None,
) -> Tuple[bytes, int, int, int]:
    """Return (bytes, quality, width, height) under max_bytes when possible."""
    working = img
    edge = max_edge
    best: Optional[bytes] = None
    best_q = min_quality
    best_size = 0

    for _ in range(6):
        working = maybe_resize(img, edge)
        lo, hi = min_quality, max_quality
        candidate: Optional[bytes] = None
        used_q = lo

        while lo <= hi:
            mid = (lo + hi) // 2
            blob = _encode(working, fmt, mid)
            if len(blob) <= max_bytes:
                candidate = blob
                used_q = mid
                lo = mid + 1
            else:
                hi = mid - 1

        if candidate is not None:
            best = candidate
            best_q = used_q
            best_size = len(candidate)
            break

        blob_hi = _encode(working, fmt, max_quality)
        best = blob_hi
        best_q = max_quality
        best_size = len(blob_hi)
        if edge is None:
            edge = max(working.size)
        edge = int(edge * 0.82)
        if edge < 480:
            break

    if best is None:
        best = _encode(working, fmt, min_quality)
        best_size = len(best)

    w, h = working.size
    return best, best_q, w, h


def apply_crop_plan(
    img: Image.Image,
    *,
    aspect: AspectPreset = "free",
    crop_px: Optional[Tuple[int, int, int, int]] = None,
    crop_norm: Optional[Tuple[float, float, float, float]] = None,
) -> Image.Image:
    if crop_px is not None:
        return crop_pixels(img, crop_px[0], crop_px[1], crop_px[2], crop_px[3])
    if crop_norm is not None:
        return crop_box(img, *crop_norm)
    ratio = parse_aspect(aspect)
    if ratio is not None:
        return crop_center_aspect(img, ratio)
    return img


def process_file(
    raw: bytes,
    original_name: str,
    *,
    aspect: AspectPreset = "free",
    crop_norm: Optional[Tuple[float, float, float, float]] = None,
    crop_px: Optional[Tuple[int, int, int, int]] = None,
    max_bytes: int = 5 * 1024 * 1024,
    out_format: Format = "JPEG",
    max_edge: Optional[int] = None,
) -> ProcessResult:
    img = open_image(io.BytesIO(raw))
    img = apply_crop_plan(img, aspect=aspect, crop_px=crop_px, crop_norm=crop_norm)

    data, _q, w, h = compress_to_target(
        img, max_bytes=max_bytes, fmt=out_format, max_edge=max_edge
    )

    stem = original_name.rsplit(".", 1)[0] if "." in original_name else original_name
    ext = {"JPEG": ".jpg", "WEBP": ".webp", "PNG": ".png"}[out_format]
    mime = {"JPEG": "image/jpeg", "WEBP": "image/webp", "PNG": "image/png"}[out_format]
    safe_stem = "".join(c if c.isalnum() or c in "-_" else "_" for c in stem)[:80]

    return ProcessResult(
        data=data,
        filename=f"{safe_stem}_optimized{ext}",
        mime=mime,
        width=w,
        height=h,
        size_bytes=len(data),
    )