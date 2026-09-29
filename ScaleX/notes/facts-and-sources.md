# Facts and sources: KAUST ScaleX deck

Every number and factual claim in `deck/slides.html`, and where it comes from.
Change a figure here first, then on the slide.

Last full check: 29 September 2026 (second version: 18 slides).

## How to read the status column

| Status | Meaning |
|---|---|
| **Doc** | In a document in `sources/`. The page or section is given. |
| **Site** | On bioergotech.org, in the repo file named. |
| **Web** | Checked online on 29 September 2026. The URL is given. |
| **Guido** | Confirmed by Guido Putignano on 29 September 2026. No document in the repo. |
| **Plan** | A goal or plan. It is not a fact. |

Source documents in `sources/`:

- **VCO**: `Proposta_Progetto_ASL_VCO (1).pdf`, benefits of the oncology project for ASL VCO, dated 27 Sept 2026
- **HADI**: `Hadi_Health_Updated (1).pdf`, the Hadi Health S.r.l. business plan, June 2026. The older `Hadi_Health (1).pdf` has the same figures.
- **VIS**: `VIS_Descrizione_Prodotto 1 2.pdf`, VIS Pharma Compass product description. It is marked *Documento riservato*.
- **PROSSIMA**: `Studio_PROSSIMA_Proposta_CReI (1).pdf`, the study proposal to CReI
- **SKIPPY**: `Skippy_Proposal_EMBRACE_Initiative (1).pdf`, the proposal to EMBRACE
- **INTRO**: `../intro.pdf` (repo root), the Foundation report from December 2025
- **UZH**: `UZH_Innovation_Grant_Project_Overview.md`, the project text of OncoTarget's UZH
  Innovation Grant application. Guido shared the .docx on 29 Sept 2026; the applicant's
  personal details are left out of the repo copy.

## Slide by slide

### 1. Title

| Claim | Status | Source |
|---|---|---|
| Guido Putignano, Founder and President | Doc, Site | INTRO p.19 ("President: Dott. Guido Putignano"); `lib/team.ts` |
| Taranto and Zurich | Site | `app/people/people.ts` (ETH Zurich affiliation); HADI §3.1 (Taranto office) |

The cover photo is `public/assets/images/Taranto/Main/third.webp` from the website. Its caption comes from slide 12 ("Our lab and offices are in Taranto").

### 2. What we do

| Claim | Status | Source |
|---|---|---|
| Started in April 2025 | Doc | INTRO p.3: "established on April 12, 2025" |
| Frankura: pilot running with ASL VCO | Guido | HADI §1.6 (June 2026) says "il primo pilot dimostrativo è in corso con l'ASL VCO". Guido confirmed a signed pilot agreement. **The website contradicts this; see the end of this file.** |
| VIS tested on data from Regione Abruzzo | Doc, Guido | VIS §8 names "four health authorities" in one region and keeps the region anonymous. Guido confirmed it is Abruzzo and that the region can be named. There is no contract. |
| Bonnie designed with CReI | Doc, Guido | PROSSIMA is a proposal to CReI's board. Guido said CReI has agreed informally. |
| Skippy with the University of Maryland, Baltimore | Doc, Guido, Web | SKIPPY names EMBRACE. Guido confirmed EMBRACE has agreed. EMBRACE is a UMB initiative under the Office of the Provost: https://www.umaryland.edu/embrace/ |
| Removed: "this year we are profitable" | | Not in any document. HADI §7.2 shows only a *projected* year-1 result. Guido chose to drop it. |
| 3 countries: Italy, Switzerland, the US | Derived | Taranto, Zurich, and Skippy in Baltimore |
| 4 products | Derived | Frankura, VIS, Bonnie, Skippy |
| Status badges | Guido, Doc | Frankura "Pilot running" (Guido). VIS "Prototype" (VIS cover). Bonnie and Skippy "Interface prototype" (PROSSIMA and SKIPPY covers). |

### 3. Team

| Claim | Status | Source |
|---|---|---|
| Guido Putignano: biomedical engineer, ETH Zurich, Harvard, MIT | Doc | HADI §3.4 |
| Olufemi Olusola: technical lead, biostatistician, 10 years | Doc | HADI §3.4 |
| Domenica Leone: COO, lawyer, operations, legal and compliance | Doc, Site | HADI §3.4 (COO, resources and organisation); `lib/team.ts` and `app/eventi/.../content.ts` ("Avv.", legal expert, Vice President of the Foundation) |
| Saria Miccoli: communication lead; designer, visual identity and communications | Site | `lib/team.ts` ("Communication Lead. Experienced designer who shapes the Foundation's visual identity and communications.") |
| Mario Tagarelli: economic manager, finance, grants and reporting | Guido | **The website says "Auditor"** (`lib/team.ts`). Guido confirmed the deck's title. |
| Daniela Marotto: rheumatologist, CReI | Site | `app/people/people.ts`, `lib/team.ts`. Changed from "President of CReI", which no source supports. |
| Pasquale Persico: market access at Gilead Sciences | Site | `lib/team.ts` |
| Roberto De Ponti: Managing Director, 3B Future Health Fund | Site | `lib/team.ts`. Changed from the generic "venture capital and fundraising". |
| Foundation board: Guido Putignano, Domenica Leone, Carmine Pisano | Site | `lib/team.ts`. Mino Fabbiano was removed; he appears in no source. |

Photos: the website's headshots in `public/assets/images/About-us/`, resized. Domenica Leone's photo is `Mimma-Leone.webp`. The slide shows the eight people Guido listed on 29 Sept 2026, plus the board line. Domenico Putignano (CMO, HADI §3.4) was left out at Guido's request; he has no photo on the website.

### 4. Who we work with

| Claim | Status | Source |
|---|---|---|
| Pharmacists use VIS; the authority or region signs the contract | Doc | VIS §2: the hospital pharmacy is "utente operativo", and the purchase decision is "aziendale o regionale" |
| CReI works with us on the design of the Bonnie study | Guido | Informal agreement |
| UMB runs Skippy with us | Guido | See slide 2 |

### 5. Frankura

| Claim | Status | Source |
|---|---|---|
| 1,100 intake forms (CAS), 525 oncology visits, 1,547 tumour board (GIC) cases a year | Doc | VCO p.2 and p.10 |
| 406 h, 600 h, 386 h | Doc | VCO pp.3 to 6 and p.10; HADI §4.5 |
| About 1,400 h, close to €67,000 at €48/h | Doc | VCO p.10: 1,392 h, €66,816 |
| Roughly seven months of one doctor's full-time work | Doc | VCO p.11: "circa 7 mesi lavorativi a tempo pieno". This is the document's own conversion. |
| The four functions | Doc | VCO modules A to D. Module E (marketing) is left out. |
| Third function: "a one-page summary of each case for the board, with the options suggested by the AIOM and ESMO guidelines. The board confirms, changes or rejects them." | Doc, Site | VCO module C: the pre-analysis follows "linee guida nazionali e internazionali", suggesting an orientation "che il team può confermare, modificare o rigettare". `lib/programmes.ts`: the agent "searches published AIOM and ESMO guidance and returns one page the panel can read in the room". |
| 406 h, 600 h, 386 h placed on the first three functions | Doc | VCO: module A = 406 h, module B = 600 h, module C (the board pre-analysis) = 386 h |
| Runs on top of existing software | Doc | HADI §1.3 |
| Pilot agreement with ASL VCO, pilot running | Guido | See slide 2 |

### 6. Market

| Claim | Status | Source |
|---|---|---|
| AI agents in healthcare: $1.1B (2025) to $6.9B (2030) | Doc, Web | HADI §5.1. MarketsandMarkets press release, 26 Jan 2026: USD 1.11B to 6.92B, 44.1% CAGR. https://www.marketsandmarkets.com/PressReleases/ai-agents-in-healthcare.asp |
| AI-powered clinical documentation: about $14B by 2030 | Web | The Business Research Company, *AI-Powered Clinical Documentation Market Report 2026*, sold by Research and Markets: $4.01B (2025) to $13.99B (2030). The label was changed from "AI that writes clinical notes". The narrower "AI medical scribe software" market is $5.08B by 2030. https://www.researchandmarkets.com/reports/6226000/ai-powered-clinical-documentation-market-report |
| 198 health authorities and hospital trusts in Italy | Web | CERGAS Bocconi, Rapporto OASI 2025, ch. 2: 128 ASL/ASST + 42 AO + 9 AOU + 19 public IRCCS. https://cergas.unibocconi.eu/sites/default/files/media/attach/02_Broccolo_et%20al_OASI25.pdf |
| 20 health clusters in Saudi Arabia | Web | Health Holding Company: "twenty health clusters". https://www.health.sa/en/about-us |
| €50,000 to €150,000 per licence, plus a yearly fee | Doc | HADI §4.3 |
| €11 to €33 million | Arithmetic | 218 × €50k to €150k = €10.9M to €32.7M |
| 20 hospitals in three years, €1 to €3 million | Doc | HADI §2.2; 20 × €50k to €150k |
| ASL Salerno, Ospedale Miulli, ASL Taranto, ASL Caserta in talks | Doc | HADI §5.2 |

Caveat: HHC is taking over the clusters from the Ministry of Health gradually. The Health Sector Transformation Report 2024 lists 3 transferred in 2024. Slide 15 says "moving to" for this reason.

### 7. VIS Pharma Compass

| Claim | Status | Source |
|---|---|---|
| 2025: €4.8B above the legal ceiling, up from €4.0B in 2024 | Web | AIFA, final Jan to Dec 2024 (29.07.2025): +€4,016.2M, 11.32% against 8.30%. Final Jan to Dec 2025 (29.07.2026): +€4,767.1M, 11.82%. Both are net of payback and exclude medical gases. https://www.aifa.gov.it/documents/20142/2505785/Monitoraggio_Spesa_gennaio-dicembre-2024_consultivo.pdf |
| Replaced: "€14.6B spent in 2024, €3.6B above the ceiling" | | That was AIFA's *provisional* 2024 report. The VIS document's €17.8B is OsMed 2024 gross spending, a different measure that cannot be set against the ceiling. |
| Teams work in spreadsheets | Doc | VIS §1.1 |
| The three functions | Doc | VIS modules M1, M2, M6 |
| Not a medical device | Doc | VIS §3.1 |
| Over 250,000 dispensing records, about €450 million of yearly spend | Doc | VIS §8: 261,153 records, €452.7M. Rounded at Guido's request, because the document is confidential. |
| Fee €159,000 a year, region with four authorities, all modules | Doc | VIS §9.6 (the €182,000 year-1 figure in §9.5 includes activation) |
| Value €404,000 (minimum case), €808,000 (prudent case) | Doc | VIS §9.2 summary. The labels were changed from "cautious" and "expected" to the document's own. |
| 2.5× and 5.1× the fee | Doc | VIS §9.6: region, four authorities, all modules: minimum 2.5×, prudent 5.1× |
| €9,000 analysis in three weeks | Doc | VIS §9.4 |
| Not yet under contract | Guido | |

### 8. Bonnie

| Claim | Status | Source |
|---|---|---|
| Visits every three to six months | Doc | PROSSIMA, letter |
| Weekly, about two minutes, no account | Doc | PROSSIMA, summary |
| A small cartoon skeleton that reacts to the answer being given, never to its content | Doc | PROSSIMA §5 ("uno scheletrino"; "reagisce al fatto che il paziente ha risposto, mai al contenuto") |
| About 500 rheumatologists | Doc | PROSSIMA, summary |
| RA, PsA, axial SpA | Doc | PROSSIMA §3.2 and §10.1 |
| CReI would own the study and data; prototype built at our own cost | Doc | PROSSIMA, letter and summary |
| Built on the Frankura platform | Doc, Guido | PROSSIMA cover ("Piattaforma: Frankura"). Guido: Frankura is both the oncology product and the platform. |
| Interface prototype ready; not a medical device | Doc | PROSSIMA cover and summary (no backend, no patients yet) |

### 9. Skippy

| Claim | Status | Source |
|---|---|---|
| Referral counted when sent | Doc | SKIPPY, executive summary |
| The three functions | Doc | SKIPPY §2 |
| 20, 500, 2,000, later | Doc | SKIPPY §3 |
| EMBRACE owns programme and data; we build and run the software | Doc | SKIPPY, letter and §8 |
| Interface prototype ready | Doc | SKIPPY cover |
| Our first project in the United States | Deck | Not in any document. No other US project appears in the repo. |

The step chart of 20, 500, 2,000 and later shows the order of the phases. Its heights are not to scale.

### 10. How we work

| Claim | Status | Source |
|---|---|---|
| Paid analysis like the €9,000 one for VIS | Doc | VIS §9.4 |
| First prototype at our own cost | Doc | PROSSIMA, letter; SKIPPY, letter |
| Platform: consent, audit trails, AI layer, EU storage | Doc | SKIPPY §6 and §10; VIS §10 (EU infrastructure); HADI §3.2 |
| ASL VCO follows the intake and tumour board (CAS and GIC) model of the Piedmont oncology network | Web | https://reteoncologica.it/cas/verbania-c-a-s-ospedale-verbania-asl-vco/ ; https://www.aslvco.it/come-fare-per/accedere-al-cas-centro-assistenza-servizi/ |
| A new VIS region needs a data adapter | Doc | VIS §4.3 |
| Hadi Health S.r.l. is our clinical AI venture | Guido, Doc | Guido; HADI §3.5 (the Foundation is a shareholder) |

### 11. Where we are in 2026

| Claim | Status | Source |
|---|---|---|
| Pilot agreement with ASL VCO | Guido | |
| VIS on four Abruzzo health authorities | Doc, Guido | VIS §8 |
| Four in talks | Doc | HADI §5.2 |
| €25,000 signed, about €120,000 advanced pipeline, as of June 2026 | Doc | HADI §1.6. Update this if there are newer figures. |
| Replaced: "SAR 400,000 contracted in 2026, about $107,000" | | Not in any document. Guido chose the documented figures. |
| Map | Web | ISTAT boundaries via openpolis/geojson-italy, CC BY 4.0. Pins are placed at the city (Verbania, Caserta, Salerno, Acquaviva delle Fonti, Taranto). The Abruzzo pin sits mid-region. |

### 12. Research

| Claim | Status | Source |
|---|---|---|
| *Cancers* 2026, with Daniela Marotto; 356,022 patients; risk highest in year one | Site | `lib/publications.ts`, `lib/programmes.ts`. DOI 10.3390/cancers18061027 |
| Cancer risk by subgroup, CODIGE, AGE-IT | Site | `lib/programmes.ts` (PNRR M4C2, PE00000015) |
| Cell-therapy models at ETH Zurich; *Frontiers in Immunology* 2025 | Site | `app/people/people.ts`; `lib/publications.ts`, DOI 10.3389/fimmu.2025.1581210 |
| Propionic acidemia in Saudi Arabia, in progress | Site | `lib/programmes.ts` |
| Lab and offices in Taranto | Site | `app/build-with-us/page.tsx` |
| Guido at ETH Zurich D-BSSE | Site | `app/people/people.ts` |
| Removed: VERO "our cancer risk algorithm", the OncoTarget gastric organoid pipeline, "Xperbot in Zug", protein language models, "most of our science is in Switzerland" | | Not documented. VERO under "patient-specific models" also contradicted the site, which says our cancer-risk work gives "never an individual risk score". Guido chose to use documented research only. |
| Badges: Published, Completed, Published, In progress | Site | The stage of each item in `lib/programmes.ts` and `lib/publications.ts` |

### 13. OncoTarget

| Claim | Status | Source |
|---|---|---|
| Drug testing on organoids grown from a patient's own tumour, for gastric cancer | Doc | UZH, "Project title" and "Solution" |
| A project at the University of Zurich, led by Giovanni Papa | Doc | UZH: applicant Giovanni Papa, doctoral student, IMCR, University of Zurich; "Giovanni Papa will lead the project" |
| Grant application submitted | Guido | Guido confirmed on 29 Sept 2026 that the UZH Innovation Grant application has been submitted, and that the people can be named |
| Patients respond differently; profiling does not always show which drug will work | Doc | UZH, "Problem" |
| Biopsy grown into organoids; automated screening against a panel of clinical cancer drugs; responses read with the molecular profile | Doc | UZH, "Solution" |
| Protocols with the Departments of Visceral Surgery and Pathology at USZ | Doc | UZH, "Technology Status" |
| Drug screening in 3D organoids with the Children's Hospital Zurich | Doc | UZH, "Technology Status" |
| Responses linked to genetic backgrounds, most hits validated individually | Doc | UZH, "Technology Status": "the vast majority of hits individually validated" |
| Prof. Anne Müller as mentor; Guido builds the data model, the analysis pipeline and the quality criteria | Doc | UZH, "Team" |
| OncoTarget and Frankura are separate projects that could meet in future at the tumour board | Guido | Guido, 29 Sept 2026: "they are two different things. But we could connect them in the future". This is a possibility, not a plan. |

### 14. How we get to Saudi Arabia

| Claim | Status | Source |
|---|---|---|
| The questions and partners per country | | As on slides 2 to 13. The University of Zurich is documented by UZH. |
| Map | Web | Natural Earth 1:50m countries, public domain (https://www.naturalearthdata.com). Pins are placed at the cities: Baltimore, Zurich, Taranto, Riyadh, and KAUST in Thuwal. The routes are drawn for the story; they are not travel routes. |

### 15. Our plan to 2029

| Claim | Status | Source |
|---|---|---|
| What we keep; the 2026 to 2029 timeline | Plan | Unchanged from the earlier deck |

### 16. Who this reaches

| Claim | Status | Source |
|---|---|---|
| VCO 153,000 | Web | ISTAT, 1 Jan 2025: 153,283 |
| Abruzzo 1.27 million | Web | ISTAT, 1 Jan 2025: 1,269,118 |
| Salerno, Taranto and Caserta 2.5 million | Web | ISTAT, 1 Jan 2025: 1,055,372 + 550,436 + 908,451 = 2,514,259 |
| A Saudi cluster serves about 1 million | Web | Ministry of Health, via Saudi Gazette, 18 Jan 2024: https://saudigazette.com.sa/article/639736 |
| 20 clusters serve over 20 million | Web | Health Holding Company: https://www.health.sa/en/about-us |
| Total about 5 million | Arithmetic | 0.153 + 1.269 + 2.514 + 1.0 = 4.94 million |
| 5 million by 2029 | Plan | |
| Skippy, 2,000 people | Doc | SKIPPY §3 |

ISTAT population files: https://demo.istat.it (POSAS 2025).

### 17. What we ask from ScaleX

| Claim | Status | Source |
|---|---|---|
| 20 clusters, about 1 million people each | Web | As on slide 14 |
| Three-week analysis, running in 90 days, review at six months | Doc | VIS §9.4 and §10.1 |

### 18. Closing

A summary of slides 2, 5 and 16. Nothing new. The photo is `public/assets/images/Taranto/Main/second.webp`.

## To settle before ScaleX, outside the deck

These do not change the slides, but a reviewer who opens bioergotech.org will see them.

1. **Tumour board pilot.** `lib/programmes.ts` (published 11 Sept 2026) says "There is no written agreement yet", "the pilot is waiting on regional approval" and "the agent is not in use in care". The deck now says the pilot agreement with ASL VCO is signed and running. One of the two needs updating.
2. **Medical device status.** The same page treats the case-summary function as within EU MDR Rule 11 (class IIa or higher, not CE marked). Slide 5 lists that function as part of Frankura. Expect the question for Saudi Arabia (SFDA).
3. **Rheumatology.** `lib/programmes.ts` says "no clinical site agreement". That fits an informal agreement with CReI, but check the wording.
4. **VIS figures.** `lib/programmes.ts` deliberately publishes no VIS figures ("marked confidential"). The deck now shows rounded figures and names Abruzzo, at Guido's request.
5. **Team titles.** `lib/team.ts` lists Mario Tagarelli as "Auditor" and Domenica Leone as "Mimma Leone, Board Member". The deck uses "Economic manager" and "COO".
6. **OncoTarget on the website.** `app/build-with-us/page.tsx` calls OncoTarget a "UZH Zurich
   spin-off targeting Asian markets". The grant application describes a research project that
   aims to become a venture later. The deck follows the application.
7. **Domenico Putignano** is CMO in the Hadi Health plan but is not on the website or on the
   team slide.
8. **VIS document, opening paragraph.** It uses OsMed gross spending (€17.8B) and the Jan to Oct 2025 overrun. AIFA's final 2025 report (+€4.77B) is newer.
