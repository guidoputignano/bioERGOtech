# Hadi Health

Business plan and brand of Hadi Health, the bioERGOtech initiative that sells and runs
Frankura and VIS Pharma Compass in Italian health authorities, hospitals and regions.
The plan is in Italian, for investors and partners.

```
python3 HadiHealth/plan/build.py --pdf     both proposals, HTML and PDF
python3 HadiHealth/plan/build.py --brand A only proposal A (Hadi green and gold)
```

```
plan/plan.html     the text, with {{name}} placeholders for every figure
plan/model.py      the numbers: measured cases, public data, the scaling method, the scenario
plan/theme.css     A4 layout; data-brand="A" or "B" switches the palette
plan/build.py      fills the figures, draws the map, inlines fonts, logos and photos, prints the PDF
plan/assets/       Mulish (OFL), map of Italy (ISTAT via openpolis, CC BY 4.0), team photos
brand/A, brand/B   the two logo proposals: SVG set, palette, preview sheet, generator in src/
notes/             facts-and-sources.md: where every number comes from, and what is still open
sources/           source documents
```

Output: `plan/business-plan-A.pdf` and `plan/business-plan-B.pdf`. The build checks for em
dashes and for anything wider than the A4 text block, because a single overflowing element
makes Chromium shrink every page.
