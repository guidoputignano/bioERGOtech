"""Build the world maps used on the slides.

    python3 deck/tools/make_world.py

Writes two files in deck/assets, both cropped to the band from the United
States to Saudi Arabia:

    world.svg       country outlines, one <path data-country="ITA"> per country
    world-dots.svg  the same land drawn as a grid of dots, each dot tagged with
                    its country so a slide can colour the countries it names

Country shapes are Natural Earth 1:50m (public domain). Each SVG carries its
projection in data-* attributes, which build.py reads to place pins by
latitude and longitude.
"""

import json
import math
import pathlib
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
ASSETS = HERE.parent / "assets"
CACHE = HERE / "cache" / "ne_50m_admin_0_countries.geojson"
URL = ("https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/"
       "geojson/ne_50m_admin_0_countries.geojson")

# Equirectangular, scaled for latitude 36 so the band keeps its shape.
LAT0 = 36.0
LON_MIN, LON_MAX = -128.0, 64.0
LAT_MIN, LAT_MAX = 8.0, 62.0
SCALE = 10  # SVG units per degree of latitude
TOLERANCE = 0.06  # degrees, Douglas-Peucker
MIN_AREA = 0.15  # square degrees; drops small islands
DOT_STEP = 1.0  # degrees between dots
KX = math.cos(math.radians(LAT0))


def project(lon, lat):
    return ((lon - LON_MIN) * KX * SCALE, (LAT_MAX - lat) * SCALE)


def simplify(points, tol):
    if len(points) < 3:
        return points
    (x1, y1), (x2, y2) = points[0], points[-1]
    dx, dy = x2 - x1, y2 - y1
    norm = math.hypot(dx, dy) or 1e-12
    best, idx = 0.0, 0
    for i in range(1, len(points) - 1):
        px, py = points[i]
        d = abs(dy * px - dx * py + x2 * y1 - y2 * x1) / norm
        if d > best:
            best, idx = d, i
    if best <= tol:
        return [points[0], points[-1]]
    return simplify(points[: idx + 1], tol)[:-1] + simplify(points[idx:], tol)


def area(ring):
    return abs(sum(x1 * y2 - x2 * y1
                   for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]))) / 2


def inside(lon, lat, ring):
    hit = False
    for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
        if (y1 > lat) != (y2 > lat) and lon < (x2 - x1) * (lat - y1) / (y2 - y1) + x1:
            hit = not hit
    return hit


def near_band(ring):
    lons = [p[0] for p in ring]
    lats = [p[1] for p in ring]
    return (max(lons) > LON_MIN - 5 and min(lons) < LON_MAX + 5
            and max(lats) > LAT_MIN - 5 and min(lats) < LAT_MAX + 5)


def svg_root(width, height, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:.0f} {height:.0f}" '
            f'data-lat0="{LAT0}" data-lon-min="{LON_MIN}" data-lat-max="{LAT_MAX}" '
            f'data-scale="{SCALE}">{body}</svg>\n')


def main():
    if not CACHE.exists():
        CACHE.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(URL, CACHE)
    features = json.loads(CACHE.read_text())["features"]
    width, height = project(LON_MAX, LAT_MIN)

    countries = []  # (code, [outer rings in lon/lat])
    paths = []
    for feature in features:
        code = feature["properties"]["ADM0_A3"]
        geom = feature["geometry"]
        polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
        rings, d = [], []
        for poly in polys:
            ring = [tuple(p) for p in poly[0]]
            if not near_band(ring):
                continue
            rings.append(ring)
            if area(ring) < MIN_AREA:
                continue
            mid = len(ring) // 2
            simple = simplify(ring[: mid + 1], TOLERANCE)[:-1] + simplify(ring[mid:], TOLERANCE)
            if len(simple) < 4:
                continue
            pts = [project(lon, lat) for lon, lat in simple]
            d.append("M" + "L".join(f"{x:.1f},{y:.1f}" for x, y in pts) + "Z")
        if rings:
            countries.append((code, rings))
        if d:
            paths.append(f'<path data-country="{code}" d="{"".join(d)}"/>')
    (ASSETS / "world.svg").write_text(svg_root(width, height, "".join(paths)))

    # Dot grid: one dot per DOT_STEP degrees where the point falls on land.
    dots = {}
    lat = LAT_MAX - DOT_STEP / 2
    while lat > LAT_MIN:
        lon = LON_MIN + DOT_STEP / 2
        while lon < LON_MAX:
            for code, rings in countries:
                if any(inside(lon, lat, r) for r in rings):
                    dots.setdefault(code, []).append(project(lon, lat))
                    break
            lon += DOT_STEP
        lat -= DOT_STEP
    radius = DOT_STEP * SCALE * 0.32
    groups = "".join(
        f'<g data-country="{code}">'
        + "".join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{radius:.1f}"/>' for x, y in pts)
        + "</g>"
        for code, pts in sorted(dots.items()))
    (ASSETS / "world-dots.svg").write_text(svg_root(width, height, groups))
    for name in ("world.svg", "world-dots.svg"):
        size = (ASSETS / name).stat().st_size // 1024
        print(f"wrote deck/assets/{name} ({size} KB)")
    print(f"{sum(len(v) for v in dots.values())} dots, {len(paths)} countries")


if __name__ == "__main__":
    main()
