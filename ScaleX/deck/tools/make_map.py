"""Build deck/assets/italy.svg, the simplified map of Italy used on the slides.

The region boundaries are ISTAT's, redistributed by openpolis under CC BY 4.0
(https://github.com/openpolis/geojson-italy). The script downloads them once,
simplifies each outline and writes one <path> per region, with the region name
in data-region so slides.html can highlight a region by name.

    python3 deck/tools/make_map.py
"""

import json
import math
import pathlib
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
DECK = HERE.parent
CACHE = HERE / "cache" / "limits_IT_regions.geojson"
OUT = DECK / "assets" / "italy.svg"
URL = ("https://cdn.jsdelivr.net/gh/openpolis/geojson-italy@master/"
       "geojson/limits_IT_regions.geojson")

# Equirectangular projection around the middle of Italy. Good enough at this
# scale. The projection is written into the SVG, where build.py reads it to
# place pins.
LAT0 = 42.0
KX = math.cos(math.radians(LAT0))
LON_MIN, LAT_MAX = 6.6, 47.1
SCALE = 100  # SVG units per degree of latitude
TOLERANCE = 0.02  # degrees, Douglas-Peucker
MIN_AREA = 0.004  # square degrees; drops the smallest islands


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
    left = simplify(points[: idx + 1], tol)
    return left[:-1] + simplify(points[idx:], tol)


def area(ring):
    return abs(sum(x1 * y2 - x2 * y1
                   for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]))) / 2


def main():
    if not CACHE.exists():
        CACHE.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(URL, CACHE)
    data = json.loads(CACHE.read_text())
    paths = []
    for feature in data["features"]:
        name = feature["properties"]["reg_name"].split("/")[0]
        geom = feature["geometry"]
        polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
        d = []
        for poly in polys:
            ring = [tuple(p) for p in poly[0]]
            if area(ring) < MIN_AREA:
                continue
            # A closed ring starts and ends on the same point, which leaves
            # Douglas-Peucker no baseline, so simplify it as two open halves.
            mid = len(ring) // 2
            ring = simplify(ring[: mid + 1], TOLERANCE)[:-1] + simplify(ring[mid:], TOLERANCE)
            if len(ring) < 4:
                continue
            pts = [project(lon, lat) for lon, lat in ring]
            d.append("M" + "L".join(f"{x:.1f},{y:.1f}" for x, y in pts) + "Z")
        paths.append(f'<path data-region="{name}" d="{"".join(d)}"/>')
    w, h = project(18.6, 36.6)
    OUT.write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" '
        f'data-lat0="{LAT0}" data-lon-min="{LON_MIN}" data-lat-max="{LAT_MAX}" data-scale="{SCALE}">'
        + "".join(paths) + "</svg>\n")
    print(f"wrote {OUT} ({OUT.stat().st_size // 1024} KB, {len(paths)} regions)")


if __name__ == "__main__":
    main()
