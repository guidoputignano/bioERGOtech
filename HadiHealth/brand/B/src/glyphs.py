"""Drawn glyphs for the Hadi Health wordmark, in the geometric rounded-square
construction of the bioERGOtech wordmark.

Every glyph function returns (path, advance width). A metrics dict `p` holds
XH (x-height), ASC (ascender), W (vertical stem), H (horizontal stroke),
R and r (outer and inner corner radius), BW (bowl width), NW (h arch width)."""
from geo import rrect, rect, poly, union, diff, moved


def g_arch(width, p):
    XH, W, H, R, r = p["XH"], p["W"], p["H"], p["R"], p["r"]
    outer = rrect(0, -XH, width, 0, tl=R, tr=R)
    inner = rrect(W, -XH + H, width - W, 10, tl=r, tr=r)
    return diff(outer, inner)


def g_h(p):
    return union([rect(0, -p["ASC"], p["W"], 0), g_arch(p["NW"], p)]), p["NW"]


def pennant_h(p, apex, head, line, stub):
    """The h of hadi. Its ascender ends in the bioERGOtech half arrowhead, built
    as on the t of bioERGOtech: the head's vertical edge continues the left edge
    of the stem, the hypotenuse runs at 45 degrees from the apex, and a short
    piece of the line (thickness `line`, length `stub`) enters from the left,
    flush with the base of the head. Read together: the end of a line.

    apex: height of the point above the baseline; head: height and width of
    the head. Returns (path, advance)."""
    W = p["W"]
    base = -apex + head
    parts = [rect(0, base, W, 0),                                  # stem below the head
             poly([(0, -apex), (head, base), (0, base)]),           # half arrowhead
             g_arch(p["NW"], p)]
    if stub > 0 and line > 0:
        parts.append(rect(-stub, base - line, 0.5, base))          # the end of the line
    return union(parts), p["NW"]


def g_bowl(width, p):
    XH, W, H, R, r = p["XH"], p["W"], p["H"], p["R"], p["r"]
    outer = rrect(0, -XH, width, 0, R, R, R, R)
    inner = rrect(W, -XH + H, width - W, -H, r, r, r, r)
    return outer, inner


def g_a(p, top=None):
    XH, W, bw = p["XH"], p["W"], p["BW"]
    outer, inner = g_bowl(bw, p)
    stem = rect(bw - W, -(top or XH), bw, 0)
    return diff(union([outer, stem]), inner), bw


def g_d(p):
    return g_a(p, top=p["ASC"])


def g_i_stem(p):
    return rect(0, -p["XH"], p["W"], 0), p["W"]


def g_e(p):
    XH, W, H, R, r = p["XH"], p["W"], p["H"], p["R"], p["r"]
    bw = p["BW"] - 2
    outer, _ = g_bowl(bw, p)
    bar_top = -XH * 0.58
    bar_bot = bar_top + H
    top_c = rrect(W, -XH + H, bw - W, bar_top, r, r, 2, 2)
    bot_c = rrect(W, bar_bot, bw - W, -H, 2, 2, r, r)
    gap = rect(bw - W - 1, bar_bot, bw + 1, -XH * 0.30)
    return diff(outer, union([top_c, bot_c, gap])), bw


def g_l(p):
    return rect(0, -p["ASC"], p["W"], 0), p["W"]


def g_t(p, foot=30, bar_left=14, bar_right=24, top=None):
    XH, W, H, R, r = p["XH"], p["W"], p["H"], p["R"], p["r"]
    top = top or (XH + 30)
    tw = W + foot
    outer = rrect(0, -top, tw, 0, bl=R * 0.9)
    inner = rrect(W, -top - 1, tw + 1, -H, bl=r * 0.8)
    stemfoot = diff(outer, inner)
    bar = rect(-bar_left, -XH, W + bar_right, -XH + H)
    return union([stemfoot, bar]), tw


def ergo_caps(CH, SV, SH, RO, widths):
    """Capitals in the construction of ERGO in the bioERGOtech wordmark:
    monoline, square with a large outer radius on round shoulders (about a
    third of the cap height), a near-square E with a slightly softened corner.
    CH cap height, SV vertical stroke, SH horizontal stroke, RO outer radius."""
    ri = max(RO - SV, 1)
    soft = CH * 0.035                     # the faint corner of ERGO's E

    def H_():
        w = widths["H"] * CH
        return union([rect(0, -CH, SV, 0), rect(w - SV, -CH, w, 0),
                      rect(0, -CH * 0.5 - SH / 2, w, -CH * 0.5 + SH / 2)]), w

    def E_():
        w = widths["E"] * CH
        body = diff(rrect(0, -CH, w, 0, bl=soft), rect(SV, -CH + SH, w + 1, -SH))
        mid = rect(SV - 1, -CH * 0.5 - SH / 2, w * 0.93, -CH * 0.5 + SH / 2)
        return union([body, mid]), w

    def A_():
        w = widths["A"] * CH
        outer = rrect(0, -CH, w, 0, tl=RO, tr=RO)
        inner = rrect(SV, -CH + SH, w - SV, 1, tl=ri, tr=ri)
        bar_c = -CH * 0.42
        return union([diff(outer, inner), rect(0, bar_c - SH / 2, w, bar_c + SH / 2)]), w

    def L_():
        w = widths["L"] * CH
        return diff(rrect(0, -CH, w, 0, bl=soft), rect(SV, -CH - 1, w + 1, -SH)), w

    def T_():
        w = widths["T"] * CH
        return union([rect(0, -CH, w, -CH + SH), rect(w / 2 - SV / 2, -CH, w / 2 + SV / 2, 0)]), w

    return dict(H=H_, E=E_, A=A_, L=L_, T=T_)


def setline(items):
    """items: (path, advance, space before). Returns placed paths and the width."""
    x = 0
    out = []
    for g, adv, kern in items:
        x += kern
        out.append(moved(g, x, 0))
        x += adv
    return out, x
