"""Type setting for direction 2: instance a variable serif, shape a string
with HarfBuzz, and return glyph outlines as pathops paths in font units
(y up).

Nothing here writes <text>: every letter leaves this module as an outline.
"""
from functools import lru_cache
from io import BytesIO
from pathlib import Path

import pathops
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

HERE = Path(__file__).resolve().parent
FONTS = HERE.parent / "fonts"

FILES = {
    "source-serif": FONTS / "SourceSerif4" / "SourceSerif4[opsz,wght].ttf",
    "eb-garamond": FONTS / "EBGaramond" / "EBGaramond[wght].ttf",
}


class Face:
    """One static instance of a font: outlines, metrics and shaping."""

    def __init__(self, family, axes):
        vf = TTFont(str(FILES[family]))
        static = instancer.instantiateVariableFont(vf, dict(axes)) if "fvar" in vf else vf
        buf = BytesIO()
        static.save(buf)
        self.data = buf.getvalue()
        self.font = TTFont(BytesIO(self.data))
        self.glyphs = self.font.getGlyphSet()
        self.order = self.font.getGlyphOrder()
        self.cmap = self.font.getBestCmap()
        os2 = self.font["OS/2"]
        self.upm = self.font["head"].unitsPerEm
        self.cap = os2.sCapHeight
        self.xh = os2.sxHeight

    def shape(self, s, features=None):
        """(glyph name, advance, x offset) per glyph, kerned by HarfBuzz."""
        import uharfbuzz as hb
        hbfont = hb.Font(hb.Face(self.data))
        buf = hb.Buffer()
        buf.add_str(s)
        buf.guess_segment_properties()
        hb.shape(hbfont, buf, features or {"kern": True, "liga": False})
        return [(self.order[i.codepoint], p.x_advance, p.x_offset)
                for i, p in zip(buf.glyph_infos, buf.glyph_positions)]

    def glyph(self, name, dx=0.0, dy=0.0, scale=1.0):
        p = pathops.Path()
        self.glyphs[name].draw(TransformPen(p.getPen(), (scale, 0, 0, scale, dx, dy)))
        return p

    def contours(self, name):
        """The raw contours of one glyph, one pathops path each, overlaps not
        removed, so a single part (the crossbar of the H) can be moved."""
        rec = RecordingPen()
        self.glyphs[name].draw(rec)
        out, cur = [], []
        for op, args in rec.value:
            cur.append((op, args))
            if op in ("closePath", "endPath"):
                p = pathops.Path()
                pen = p.getPen()
                for o, a in cur:
                    getattr(pen, o)(*a)
                out.append(p)
                cur = []
        return out

    def advance(self, name):
        return self.font["hmtx"][name][0]


@lru_cache(maxsize=None)
def face(family, **axes):
    return Face(family, tuple(sorted(axes.items())))


def union(paths):
    out = pathops.Path()
    for p in paths:
        out = pathops.op(out, p, pathops.PathOp.UNION)
    return out


def difference(a, b):
    return pathops.op(a, b, pathops.PathOp.DIFFERENCE)


def translate(p, dx, dy, s=1.0):
    q = pathops.Path()
    p.draw(TransformPen(q.getPen(), (s, 0, 0, s, dx, dy)))
    return q
