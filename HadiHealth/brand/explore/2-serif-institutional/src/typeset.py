"""Type setting for direction 2: instance Source Serif 4, shape a string with
HarfBuzz, and return glyph outlines as pathops paths in font units (y up).

Nothing here writes <text>: every letter leaves this module as an outline.
"""
from functools import lru_cache
from io import BytesIO
from pathlib import Path

import pathops
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

HERE = Path(__file__).resolve().parent
FONTS = HERE.parent / "fonts"
SERIF = FONTS / "SourceSerif4[opsz,wght].ttf"


@lru_cache(maxsize=None)
def instance(opsz, wght):
    """A static instance of Source Serif 4 at the given optical size and weight,
    returned as (TTFont, font bytes)."""
    vf = TTFont(str(SERIF))
    static = instancer.instantiateVariableFont(vf, {"opsz": opsz, "wght": wght})
    buf = BytesIO()
    static.save(buf)
    data = buf.getvalue()
    return TTFont(BytesIO(data)), data


def shape(s, opsz, wght):
    """Glyph names, advances and x offsets in font units, kerned by HarfBuzz."""
    import uharfbuzz as hb
    font, data = instance(opsz, wght)
    hbfont = hb.Font(hb.Face(data))
    buf = hb.Buffer()
    buf.add_str(s)
    buf.guess_segment_properties()
    hb.shape(hbfont, buf, {"kern": True, "liga": False})
    order = font.getGlyphOrder()
    return [(order[i.codepoint], p.x_advance, p.x_offset)
            for i, p in zip(buf.glyph_infos, buf.glyph_positions)]


def glyph_contours(name, opsz, wght):
    """The raw contours of one glyph as a list of pathops paths (one per
    contour, overlaps not removed) so a single part, such as the crossbar of
    the H, can be moved before the union."""
    from fontTools.pens.recordingPen import RecordingPen
    font, _ = instance(opsz, wght)
    rec = RecordingPen()
    font.getGlyphSet()[name].draw(rec)
    contours, cur = [], []
    for op, args in rec.value:
        cur.append((op, args))
        if op in ("closePath", "endPath"):
            contours.append(cur)
            cur = []
    out = []
    for c in contours:
        p = pathops.Path()
        pen = p.getPen()
        for op, args in c:
            getattr(pen, op)(*args)
        out.append(p)
    return out


def glyph_path(name, opsz, wght, dx=0.0, dy=0.0, scale=1.0):
    font, _ = instance(opsz, wght)
    p = pathops.Path()
    font.getGlyphSet()[name].draw(TransformPen(p.getPen(), (scale, 0, 0, scale, dx, dy)))
    return p


def metrics(opsz, wght):
    font, _ = instance(opsz, wght)
    os2 = font["OS/2"]
    return {"upm": font["head"].unitsPerEm, "cap": os2.sCapHeight, "x": os2.sxHeight,
            "cmap": font.getBestCmap(), "hmtx": font["hmtx"]}


def union(paths):
    out = pathops.Path()
    for p in paths:
        out = pathops.op(out, p, pathops.PathOp.UNION)
    return out


def translate(p, dx, dy, s=1.0):
    q = pathops.Path()
    p.draw(TransformPen(q.getPen(), (s, 0, 0, s, dx, dy)))
    return q


def bounds(p):
    return p.bounds  # (xmin, ymin, xmax, ymax)
