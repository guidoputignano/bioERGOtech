"""preview.png for direction 6: both options side by side. Each logo large on
white and on deep green, each mark at 64 and 16 px, each logo at 24 px tall,
the small sizes also at one device pixel per px and enlarged, and a family
check next to the bioERGOtech logo. Rendered at device scale 1 so that 16 px
means 16 pixels.
"""
import base64
from pathlib import Path

from playwright.sync_api import sync_playwright

import option_a
import option_b
from lib import GOLD, GREEN, INK, LIGHT, ROOT, svg, union

REPO = ROOT.parents[3]
MULISH = REPO / "HadiHealth" / "plan" / "assets" / "fonts"
BIO = REPO / "ScaleX" / "deck" / "assets"
CHROMIUM = "/opt/pw-browsers/chromium"

TEXT = {
    "a": ("The North Seal",
          "A serif H inside a fine ring. The ring opens at twelve o'clock for a gold "
          "four-point star, like the north mark of a compass: the star points the way, "
          "the H stays at the centre. Literata: the H of the seal and the name share one cap height and one baseline."),
    "b": ("The Open Square",
          "A rounded square, the shape of a document stamp, opened at the top and the "
          "bottom: its two halves become the stems of an H and one bar holds them "
          "together. One colour only. Libre Franklin capitals."),
}


def uri(text, mime="image/svg+xml"):
    data = text if isinstance(text, bytes) else text.encode()
    return f"data:{mime};base64," + base64.b64encode(data).decode()


def ratio(s):
    vb = s.split('viewBox="')[1].split('"')[0].split()
    return float(vb[2]) / float(vb[3])


def reversed_mark(mod):
    from build import box
    light = mod.layers("mark")
    return svg("mark, reversed colours", mod.layers("mark", dark=True), box(light, square=True), 1000)


def pixels(src, w, h, zoom, bg):
    """A canvas that draws the SVG at w x h device pixels, then enlarges it
    without smoothing."""
    return (f"<canvas class=px data-src='{src}' data-w='{w}' data-h='{h}' data-z='{zoom}' "
            f"data-bg='{bg}' width='{w * zoom}' height='{h * zoom}'></canvas>")


def column(key, mod, built):
    name, about = TEXT[key]
    L, D, M = built[f"{key}/logo.svg"], built[f"{key}/logo-reversed.svg"], built[f"{key}/mark.svg"]
    MD = reversed_mark(mod)
    r = ratio(L)
    w24 = round(24 * r)
    big_h = min(150, round(560 / r))
    return f"""
<section>
  <header><span class=key>{key}</span><div><h2>{name}</h2><p>{about}</p></div></header>
  <div class="card white big"><label>logo.svg on white</label><img src="{uri(L)}" style="height:{big_h}px"></div>
  <div class="card green big"><label>logo-reversed.svg on #1A3825</label><img src="{uri(D)}" style="height:{big_h}px"></div>
  <div class=pair>
    <div class="card white"><label>mark.svg, 64 and 16 px</label>
      <div class=row><img src="{uri(M)}" width=64 height=64><img src="{uri(M)}" width=16 height=16>
      <span class=sp></span>{pixels(uri(M), 16, 16, 4, '#ffffff')}<small>16 px, true pixels, x4</small></div></div>
    <div class="card green"><label>mark, reversed colours, 64 and 16 px</label>
      <div class=row><img src="{uri(MD)}" width=64 height=64><img src="{uri(MD)}" width=16 height=16>
      <span class=sp></span>{pixels(uri(MD), 16, 16, 4, GREEN)}<small>16 px, true pixels, x4</small></div></div>
  </div>
  <div class="card white"><label>logo at 24 px tall</label>
    <div class=row><img src="{uri(L)}" style="height:24px;width:{w24}px"><span class=sp></span>{pixels(uri(L), w24, 24, 3, '#ffffff')}<small>true pixels, x3</small></div></div>
  <div class="card green"><label>logo-reversed at 24 px tall</label>
    <div class=row><img src="{uri(D)}" style="height:24px;width:{w24}px"><span class=sp></span>{pixels(uri(D), w24, 24, 3, GREEN)}<small>true pixels, x3</small></div></div>
</section>"""


def family(built):
    bio = uri((BIO / "logo.png").read_bytes(), "image/png")
    bio_w = uri((BIO / "logo-white.png").read_bytes(), "image/png")
    cells = []
    for bg, b, k in (("white", bio, "logo.svg"), ("green", bio_w, "logo-reversed.svg")):
        items = "".join(f"<i class=rule></i><img src='{uri(built[f'{o}/{k}'])}' style='height:{h}px'>"
                        for o, h in (("a", 56), ("b", 44)))
        cells.append(f"<div class='card {bg} fam'><img src='{b}' style='height:34px'>{items}</div>")
    return ("<div class=full><h3>Family check: next to the bioERGOtech logo</h3>"
            + "".join(cells) + "</div>")


def palette():
    sw = [(GREEN, "Deep green #1A3825, the letters and the marks"),
          (GOLD, "Gold #DAA13C, the star of a only, never text (2.2:1 on white)"),
          (LIGHT, "Warm light #F2EEE3, the letters on deep green"),
          (INK, "Ink #1C2620, running text")]
    items = "".join(f"<span><i style='background:{c}'></i>{t}</span>" for c, t in sw)
    return f"<div class='full pal'>{items}</div>"


def font_face():
    rules = []
    for w in (400, 600, 700, 800):
        data = uri((MULISH / f"Mulish-{w}.ttf").read_bytes(), "font/ttf")
        rules.append(f"@font-face{{font-family:Mulish;font-weight:{w};src:url({data}) format('truetype')}}")
    return "".join(rules)


CSS = """
*{box-sizing:border-box;margin:0}
body{background:#EAE6DC;font-family:Mulish;color:#1C2620;width:1480px}
.sheet{padding:44px 40px 40px}
h1{font-size:26px;font-weight:700;color:#1A3825}
.sub{font-size:14.5px;color:#4a524c;margin:8px 0 26px;max-width:1300px;line-height:1.5}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:28px}
section{display:flex;flex-direction:column;gap:14px}
section>header{display:flex;gap:14px;align-items:flex-start;min-height:96px}
.key{flex:none;width:34px;height:34px;border-radius:50%;background:#1A3825;color:#F2EEE3;
  display:flex;align-items:center;justify-content:center;font-weight:700;font-size:17px;margin-top:2px}
h2{font-size:21px;font-weight:700;color:#1A3825}
header p{font-size:14px;line-height:1.5;color:#4a524c;margin-top:4px}
.card{border-radius:12px;padding:16px 22px 20px;position:relative}
.card label{display:block;font-size:11px;letter-spacing:.09em;text-transform:uppercase;font-weight:700;margin-bottom:14px}
.white{background:#fff}.white label{color:#7a817c}
.green{background:#1A3825}.green label{color:#9fb0a3}
.green small{color:#9fb0a3}.white small{color:#7a817c}
.big{height:250px;display:flex;flex-direction:column}
.big img{margin:auto}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.row{display:flex;align-items:center;gap:20px}
.sp{flex:1}
small{font-size:11.5px;margin-left:-8px}
canvas.px{image-rendering:pixelated;display:block}
.full{margin-top:28px}
h3{font-size:12px;letter-spacing:.09em;text-transform:uppercase;font-weight:700;color:#1A3825;margin-bottom:12px}
.fam{display:flex;align-items:center;justify-content:center;gap:44px;padding:34px;margin-bottom:14px}
.rule{display:block;width:1px;height:64px;background:#cfd3cf}.green .rule{background:#3b5443}
.pal{display:flex;gap:30px;font-size:13px;color:#4a524c;flex-wrap:wrap}
.pal span{display:flex;align-items:center;gap:9px}
.pal i{display:block;width:26px;height:26px;border-radius:6px;border:1px solid rgba(0,0,0,.08)}
"""

JS = """
async function draw(){
  for (const c of document.querySelectorAll('canvas.px')){
    const w=+c.dataset.w,h=+c.dataset.h,z=+c.dataset.z;
    const img=new Image(); img.src=c.dataset.src; await img.decode();
    const o=document.createElement('canvas'); o.width=w; o.height=h;
    const ox=o.getContext('2d'); ox.fillStyle=c.dataset.bg; ox.fillRect(0,0,w,h); ox.drawImage(img,0,0,w,h);
    const cx=c.getContext('2d'); cx.imageSmoothingEnabled=false; cx.drawImage(o,0,0,w*z,h*z);
  }
  await document.fonts.ready;
  document.body.dataset.done='1';
}
draw();
"""


def html(built):
    return f"""<!doctype html><html><head><meta charset=utf-8><style>{font_face()}{CSS}</style></head>
<body><div class=sheet>
<h1>Hadi Health, direction 6: Monogram seal. Two options</h1>
<p class=sub>A compact monogram to sign documents with, and a horizontal lockup with the name. Deep green #1A3825,
gold #DAA13C for the star only, warm light #F2EEE3. All lettering converted to outlines.</p>
<div class=cols>{column('a', option_a, built)}{column('b', option_b, built)}</div>
{family(built)}
{palette()}
</div><script>{JS}</script></body></html>"""


def main(built, out=None):
    out = Path(out or ROOT / "preview.png")
    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path=CHROMIUM)
        try:
            pg = b.new_page(viewport={"width": 1480, "height": 1000}, device_scale_factor=1)
            pg.set_content(html(built), wait_until="load")
            pg.wait_for_selector("body[data-done]")
            pg.screenshot(path=str(out), full_page=True)
        finally:
            b.close()
    print("wrote", out.relative_to(REPO))
