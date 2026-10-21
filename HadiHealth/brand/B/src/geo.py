"""Geometry helpers: rounded rectangles, polygons, a four point star, boolean
operations through skia-pathops, and SVG path output.

Coordinates are SVG style: y grows downward, the baseline is y = 0 and the
x-height is y = -XH."""
import pathops

K = 0.5522847498  # cubic approximation of a quarter circle


def rrect(x0, y0, x1, y1, tl=0, tr=0, br=0, bl=0):
    """Rounded rectangle with x0 < x1 and y0 < y1 (y0 is the top edge)."""
    p = pathops.Path()
    w, h = x1 - x0, y1 - y0
    m = min(w, h) / 2
    tl, tr, br, bl = [min(r, m) for r in (tl, tr, br, bl)]
    p.moveTo(x0 + tl, y0)
    p.lineTo(x1 - tr, y0)
    if tr:
        p.cubicTo(x1 - tr + tr * K, y0, x1, y0 + tr - tr * K, x1, y0 + tr)
    p.lineTo(x1, y1 - br)
    if br:
        p.cubicTo(x1, y1 - br + br * K, x1 - br + br * K, y1, x1 - br, y1)
    p.lineTo(x0 + bl, y1)
    if bl:
        p.cubicTo(x0 + bl - bl * K, y1, x0, y1 - bl + bl * K, x0, y1 - bl)
    p.lineTo(x0, y0 + tl)
    if tl:
        p.cubicTo(x0, y0 + tl - tl * K, x0 + tl - tl * K, y0, x0 + tl, y0)
    p.close()
    return p


def rect(x0, y0, x1, y1):
    return rrect(x0, y0, x1, y1)


def poly(pts):
    p = pathops.Path()
    p.moveTo(*pts[0])
    for q in pts[1:]:
        p.lineTo(*q)
    p.close()
    return p


def star4(cx, cy, r, waist=0.3, ry=None):
    """Four point star. r is the horizontal arm, ry the vertical arm. Each side
    is one cubic whose control points sit on the two arms at `waist` of their
    length from the centre: a larger waist gives a fuller, less concave star."""
    p = pathops.Path()
    ry = ry or r
    pts = [(cx, cy - ry), (cx + r, cy), (cx, cy + ry), (cx - r, cy)]
    p.moveTo(*pts[0])
    for i in range(4):
        a, b = pts[i], pts[(i + 1) % 4]
        c1 = (cx + (a[0] - cx) * waist, cy + (a[1] - cy) * waist)
        c2 = (cx + (b[0] - cx) * waist, cy + (b[1] - cy) * waist)
        p.cubicTo(c1[0], c1[1], c2[0], c2[1], b[0], b[1])
    p.close()
    return p


def union(paths):
    out = pathops.Path()
    for p in paths:
        out = pathops.op(out, p, pathops.PathOp.UNION)
    return out


def diff(a, b):
    return pathops.op(a, b, pathops.PathOp.DIFFERENCE)


def moved(p, dx, dy, s=1.0):
    """Copy of p scaled by s about the origin, then shifted by (dx, dy)."""
    q = pathops.Path()
    p.draw(_TPen(q.getPen(), dx, dy, s))
    return q


class _TPen:
    def __init__(self, pen, dx, dy, s):
        self.pen, self.dx, self.dy, self.s = pen, dx, dy, s

    def _t(self, pt):
        return (pt[0] * self.s + self.dx, pt[1] * self.s + self.dy)

    def moveTo(self, pt):
        self.pen.moveTo(self._t(pt))

    def lineTo(self, pt):
        self.pen.lineTo(self._t(pt))

    def curveTo(self, *pts):
        self.pen.curveTo(*[self._t(p) for p in pts])

    def qCurveTo(self, *pts):
        self.pen.qCurveTo(*[self._t(p) for p in pts if p is not None])

    def closePath(self):
        self.pen.closePath()

    def endPath(self):
        self.pen.endPath()


def f(v):
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def to_d(p):
    out = []
    for verb, pts in p.segments:
        if verb == "moveTo":
            out.append(f"M{f(pts[0][0])} {f(pts[0][1])}")
        elif verb == "lineTo":
            out.append(f"L{f(pts[0][0])} {f(pts[0][1])}")
        elif verb == "curveTo":
            out.append("C" + " ".join(f"{f(x)} {f(y)}" for x, y in pts))
        elif verb == "qCurveTo":
            offs, end = list(pts[:-1]), pts[-1]
            if end is None:
                end = ((offs[-1][0] + offs[0][0]) / 2, (offs[-1][1] + offs[0][1]) / 2)
            for k, o in enumerate(offs):
                nxt = end if k == len(offs) - 1 else ((o[0] + offs[k + 1][0]) / 2, (o[1] + offs[k + 1][1]) / 2)
                out.append(f"Q{f(o[0])} {f(o[1])} {f(nxt[0])} {f(nxt[1])}")
        elif verb == "closePath":
            out.append("Z")
    return "".join(out)
