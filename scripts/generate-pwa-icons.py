"""Generate the raster PWA icons from the shapes in public/icon.svg."""

from pathlib import Path
import struct
import zlib


ROOT = Path(__file__).resolve().parents[1] / "public"
GREEN = (39, 129, 78)
WHITE = (255, 255, 255)
PALE = (213, 233, 220)


def rounded_rect(x, y, left, top, right, bottom, radius):
    if not (left <= x < right and top <= y < bottom):
        return False
    center_x = min(max(x, left + radius), right - radius)
    center_y = min(max(y, top + radius), bottom - radius)
    return (x - center_x) ** 2 + (y - center_y) ** 2 <= radius**2


def color_at(x, y):
    color = (*GREEN, 255)
    if rounded_rect(x, y, 98, 145, 414, 375, 42):
        color = (*WHITE, 255)
    if 98 <= x < 414 and 200 <= y < 222:
        color = (*PALE, 255)
    if rounded_rect(x, y, 284, 248, 414, 334, 28):
        color = (*PALE, 255)
    if (x - 335) ** 2 + (y - 291) ** 2 <= 15**2:
        color = (*GREEN, 255)
    return color


def chunk(kind, data):
    return struct.pack(">I", len(data)) + kind + data + struct.pack(
        ">I", zlib.crc32(kind + data)
    )


def write_icon(filename, size):
    rows = []
    for py in range(size):
        row = bytearray([0])
        for px in range(size):
            samples = [
                color_at((px + (sx + 0.5) / 4) * 512 / size,
                         (py + (sy + 0.5) / 4) * 512 / size)
                for sy in range(4)
                for sx in range(4)
            ]
            row.extend(round(sum(sample[channel] for sample in samples) / 16)
                       for channel in range(4))
        rows.append(row)
    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
           + chunk(b"IDAT", zlib.compress(b"".join(rows), 9))
           + chunk(b"IEND", b""))
    (ROOT / filename).write_bytes(png)


if __name__ == "__main__":
    write_icon("icon-192.png", 192)
    write_icon("icon-512.png", 512)
    write_icon("apple-touch-icon.png", 180)
