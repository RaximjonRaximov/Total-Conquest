"""Turn the 3 magenta-bg knight walk strips into one clean uniform sprite sheet.

Steps: key out the magenta background (+ despill), split each strip into 3 frames,
bounding-box each frame, normalize every frame onto a uniform cell (centered
horizontally, feet aligned to the bottom). Output rows: down, up, right (left is
the mirror of right at runtime).
"""
import os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = f"{ROOT}/tools/raw"
OUT = f"{ROOT}/public/assets/img"
STRIPS = ["knight_down.png", "knight_up.png", "knight_right.png"]  # row order
FRAMES = 3


def key_magenta(img):
    a = np.asarray(img.convert("RGBA")).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mag = (r > 150) & (b > 150) & (g < 110)
    out = a.copy()
    out[mag, 3] = 0
    # despill: on remaining pixels where magenta tint lingers, clamp blue/red toward green
    rem = out[..., 3] > 0
    spill = rem & (out[..., 0] > out[..., 1]) & (out[..., 2] > out[..., 1]) & \
        ((out[..., 0] + out[..., 2]) > 2 * out[..., 1] + 40)
    out[spill, 0] = np.minimum(out[spill, 0], out[spill, 1] + 20)
    out[spill, 2] = np.minimum(out[spill, 2], out[spill, 1] + 20)
    return Image.fromarray(out.astype(np.uint8), "RGBA")


def bbox(img):
    a = np.asarray(img)
    ys, xs = np.where(a[..., 3] > 16)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def main():
    # cut all frames first
    frames = []  # list of rows, each row list of PIL frame images (bbox-cropped)
    for strip in STRIPS:
        im = key_magenta(Image.open(f"{RAW}/{strip}"))
        w, h = im.size
        fw = w // FRAMES
        row = []
        for i in range(FRAMES):
            cell = im.crop((i * fw, 0, (i + 1) * fw, h))
            row.append(cell.crop(bbox(cell)))
        frames.append(row)

    # equalize character size across directions using each row's neutral (middle)
    # frame as the reference height, so all directions render the same scale.
    target = max(row[1].height for row in frames)
    for row in frames:
        factor = target / row[1].height
        for i, f in enumerate(row):
            nw = max(1, round(f.width * factor))
            nh = max(1, round(f.height * factor))
            row[i] = f.resize((nw, nh), Image.LANCZOS)

    # uniform cell from max content
    maxw = max(f.width for row in frames for f in row)
    maxh = max(f.height for row in frames for f in row)
    pad = 6
    cw, ch = maxw + pad * 2, maxh + pad * 2
    sheet = Image.new("RGBA", (cw * FRAMES, ch * len(frames)), (0, 0, 0, 0))
    for r, row in enumerate(frames):
        for c, f in enumerate(row):
            x = c * cw + (cw - f.width) // 2          # center horizontally
            y = r * ch + (ch - pad - f.height)        # feet to bottom
            sheet.paste(f, (x, y))
    # downscale whole sheet to a game-friendly resolution (cell height ~160px)
    scale = 160 / ch
    fcw, fch = round(cw * scale), round(ch * scale)
    sheet = sheet.resize((fcw * FRAMES, fch * len(frames)), Image.LANCZOS)
    sheet.save(f"{OUT}/knight.png")
    sheet.resize((sheet.width * 2, sheet.height * 2), Image.NEAREST).save("/tmp/knight_sheet.png")
    print(f"knight.png {sheet.size} cell={fcw}x{fch} rows={len(frames)} frames={FRAMES}")
    print(f"FRAME_W={fcw} FRAME_H={fch}")


if __name__ == "__main__":
    main()
