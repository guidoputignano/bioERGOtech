"""Option b, "The Open Square": a rounded square, the shape of a document
stamp, opened at the top and at the bottom. Its two halves become the stems
of an H and one bar holds them together: the container is the letter.
Wordmark: Libre Franklin capitals.

All units: the square is 1000 wide, y up, centre (0, 0).
"""
from lib import GREEN, LIGHT, diff, face, move, rect, union

P = dict(
    S=1000,          # outer size of the square
    r=220,           # outer corner radius
    stem=185,        # weight of the two sides (the stems)
    arm=160,         # weight of the top and bottom returns
    r_in=50,         # inner corner radius of the counters
    opening=290,     # width of the openings at top and bottom
    bar=150,         # weight of the bar (horizontals a little lighter, as in type)
    # wordmark
    w_wght=600,
    w_cap=330,
    track=95,        # letter spacing, font units of Libre Franklin (1000 upm)
    gap=260,
    word="HADI HEALTH",
)


def open_square(p=P):
    h = p["S"] / 2
    outer = rect(-h, -h, h, h, p["r"])
    counter = rect(-h + p["stem"], -h + p["arm"], h - p["stem"], h - p["arm"], p["r_in"])
    frame = diff(outer, counter)
    o = p["opening"] / 2
    cuts = union([rect(-o, h - p["arm"] - 10, o, h + 10), rect(-o, -h - 10, o, -h + p["arm"] + 10)])
    frame = diff(frame, cuts)
    b = p["bar"] / 2
    return union([frame, rect(-h + p["stem"] - 5, -b, h - p["stem"] + 5, b)])


def wordmark(p=P):
    f = face("librefranklin", wght=p["w_wght"])
    s = p["w_cap"] / f.cap
    w = f.setline(p["word"], tracking=p["track"], scale=s)
    # tracking is added after the last letter too; measure from the outlines
    x0 = w.bounds[0]
    return move(w, p["S"] / 2 + p["gap"] - x0, -p["w_cap"] / 2)


def layers(kind, dark=False, p=P):
    ink = LIGHT if dark else GREEN
    m = open_square(p)
    if kind == "logo":
        return [(union([m, wordmark(p)]), ink)]
    return [(m, ink)]
