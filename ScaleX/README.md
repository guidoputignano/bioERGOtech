# KAUST ScaleX deck

bioERGOtech's pitch for KAUST ScaleX 2026, and the documents behind it.

```
deck/slides.html          slide content: edit this
deck/theme.css            look: bioERGOtech colours, Mulish
deck/build.py             builds preview.html, and the PDF with --pdf
deck/preview.html         built deck; open in a browser, press P to present
deck/bioERGOtech-ScaleX.pdf
deck/assets/              logo, Mulish (OFL), map of Italy
deck/tools/make_map.py    rebuilds assets/italy.svg from ISTAT boundaries
notes/facts-and-sources.md  where every number on the slides comes from
sources/                  the source documents
bioERGOtech · ScaleX.html the earlier deck export, kept for reference
```

Build, from this folder:

```
python3 deck/build.py          # preview.html
python3 deck/build.py --pdf    # also the PDF, and a layout check
```

`--pdf` needs Playwright (`pip install playwright`). If Playwright has no
browser of its own, point it at one: `CHROMIUM=/path/to/chrome python3 deck/build.py --pdf`.
The layout check fails the build if text overflows a slide, reaches the
footer, or contains an em dash.
