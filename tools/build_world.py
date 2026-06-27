"""Extract clean, uniform game tiles + props from the AI reference sheets.

Outputs:
  public/assets/img/tiles.png   uniform 48px terrain tilesheet (13 x 8)
  public/assets/img/props.png   packed prop atlas (transparent bg)
  src/world/atlas.json          frame coordinates for tiles + props
"""
import json
import os
from PIL import Image
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ATT = "/home/ubuntu/attachments"
TILESET = f"{ATT}/e97cb8c1-c3f9-4789-8e6f-56fe36380dc7/assets_tileset.png"
PROPS = f"{ATT}/10624ec6-190d-463b-b6b3-7203ce3236ad/assets_props.png"
OUT_IMG = f"{ROOT}/public/assets/img"
OUT_SRC = f"{ROOT}/src/world"
TILE = 48

# Detected terrain grid (start,end inclusive) from separator analysis.
COLS = [(18, 92), (99, 169), (176, 247), (254, 325), (332, 402), (409, 478),
        (485, 556), (563, 632), (640, 708), (716, 787), (794, 863), (871, 935),
        (944, 1008)]
ROWS = [(18, 92), (98, 172), (177, 251), (258, 333), (339, 414), (421, 495),
        (503, 591), (600, 673)]


def extract_terrain():
    im = Image.open(TILESET).convert("RGB")
    cols, rows = len(COLS), len(ROWS)
    sheet = Image.new("RGBA", (cols * TILE, rows * TILE), (0, 0, 0, 0))
    inset = 5
    for r, (y0, y1) in enumerate(ROWS):
        for c, (x0, x1) in enumerate(COLS):
            cell = im.crop((x0 + inset, y0 + inset, x1 - inset, y1 - inset))
            cell = cell.resize((TILE, TILE), Image.LANCZOS).convert("RGBA")
            sheet.paste(cell, (c * TILE, r * TILE))
    return sheet, cols, rows


if __name__ == "__main__":
    os.makedirs(OUT_IMG, exist_ok=True)
    os.makedirs(OUT_SRC, exist_ok=True)
    sheet, cols, rows = extract_terrain()
    sheet.save(f"{OUT_IMG}/tiles.png")
    # quick upscale preview for visual inspection
    sheet.resize((cols * TILE * 2, rows * TILE * 2), Image.NEAREST).save("/tmp/tiles_preview.png")
    print("tiles.png", sheet.size, f"{cols}x{rows} @ {TILE}px")
