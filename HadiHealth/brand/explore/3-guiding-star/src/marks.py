"""The two symbols of direction 3, "The guiding star".

Both are centred on (0, 0) in SVG units (y down) and return a list of
(path, role) layers, where role is "ink" (deep green on light, warm light
on dark), "accent" (gold) or "tile" (deep green on light, gold on dark).

a. Four paths, one point. A four-point star with straight sides, taller
   than it is wide like a north star, cut along its two diagonals into four
   rays. The cuts and the ring around the centre share one width, so the
   four rays stop just short of a gold point where they all meet.

b. The open star. A rounded square cut through by a four-point star whose
   tips run out to the middle of each side: four solid blocks, and between
   them the star, made of the space they leave open.
"""
import math

from geom import circle, diff, poly, rotate, rrect

S2 = math.sqrt(2)


def star(rv, rh, waist):
    """Straight-sided four-point star: tips at rv (up, down) and rh (left,
    right), inner corners at distance `waist` from the centre on the
    diagonals."""
    w = waist / S2
    return poly([(0, -rv), (w, -w), (rh, 0), (w, w), (0, rv), (-w, w), (-rh, 0), (-w, -w)])


def band(angle, width, length=1000):
    b = poly([(-length, -width / 2), (length, -width / 2), (length, width / 2), (-length, width / 2)])
    return rotate(b, angle)


def mark_a(p):
    """p: rv, rh, waist, gap, dot."""
    gap, dot = p["gap"], p["dot"]
    s = star(p["rv"], p["rh"], p["waist"])
    rays = diff(s, band(45, gap), band(-45, gap), circle(0, 0, dot + gap))
    return [(rays, "ink"), (circle(0, 0, dot), "accent")]


def mark_a_small(p):
    """Small master of a, for 16 to 24 px. Below about 32 px the 6 unit cuts
    and ring close up and the gold point blurs into one pale pixel, so here
    the star is solid (same outline) and the gold point is larger
    (p["small_dot"]), sitting directly on the green."""
    s = star(p["rv"], p["rh"], p["waist"])
    return [(s, "ink"), (circle(0, 0, p["small_dot"]), "accent")]


def mark_b(p):
    """p: size, radius, waist, reach. The star's tips sit at `reach` from the
    centre, past the edge of the tile (size / 2), so they cut through it."""
    h = p["size"] / 2
    tile = rrect(-h, -h, 2 * h, 2 * h, p["radius"])
    cut = star(p["reach"], p["reach"], p["waist"])
    return [(diff(tile, cut), "tile")]
