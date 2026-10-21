# Hadi Health business plan: facts and sources

Every figure in `plan/business-plan-*.pdf` comes from `plan/model.py`. This file says
where each input comes from and what is an estimate. Checked October 2026.

Tags used below:

- **VIS-D**: VIS Pharma Compass, *Descrizione del prodotto* v4 (`ScaleX/sources/VIS_Descrizione_Prodotto 1 2.pdf`; v4 upload identical).
- **VIS-P**: VIS Pharma Compass, *Percorso Euro Farmaceutico* (`HadiHealth/sources/VIS_Percorso_Euro_Farmaceutico.pdf`).
- **VCO**: *Proposta Progetto ASL VCO*, v6, 1 June 2026 (`ScaleX/sources/Proposta_Progetto_ASL_VCO (1).pdf`; v6 upload identical in content).
- **HADI**: *Hadi Health S.r.l.* draft business plan, June 2026 (`ScaleX/sources/Hadi_Health_Updated (1).pdf`).
- **Guido**: confirmed by Guido Putignano in conversation.

## Measured cases (the two anchors of the model)

| Figure | Source |
|---|---|
| VIS tested on four Abruzzo ASL, 261,153 dispensing records, EUR 452.7M yearly spend | VIS-D cover and §8 |
| VIS value by stage: programming 205,000; purchasing 384,000 (240,000 patent expiries + 144,000 biosimilars); reporting 60,000; benchmark 159,000 | VIS-D §9.2, VIS-P |
| VIS total EUR 808,000 prudent, EUR 404,000 minimum | VIS-D §9.2 |
| 71 pharmacist days, 497 h a year, "poco più di tre mesi" of a dirigente farmacista | VIS-P (time section) |
| Break-even at 13.0% of the prudent case | VIS-D §9.6 |
| Not a medical device; read-only | VIS-D cover and §3.1 |
| Price list (M1 to M8, 72,000 full single ASL, 135,000 + 6,000 per azienda regional, activation 6,000 or 15,000 + 2,000, diagnostic 9,000) | VIS-D §9.3, §9.4 |
| 140,000 direct-award threshold on the total value; no artificial splitting | VIS-D §9.5 (D.Lgs. 36/2023 art. 50) |
| Value/fee 2.5x to 5.1x for Abruzzo, all modules, fee 159,000 | VIS-D §9.6 |
| No shared-savings fee: fixed fee, quarterly in arrears, exit at month 6 | VIS-D §9.7 |
| Art. 28 GDPR, EU hosting, access log, reversibility; 90-day activation | VIS-D §10 |
| Quote "Il valore non sta nel produrre..." | VIS-D |
| ASL VCO: 1,100 CAS, 525 visits, 1,547 GIC a year; EUR 48/h | VCO pp. 3 to 10 |
| Modules A 406 h, B 600 h, C 386 h; total 1,392 h, EUR 66,816; about 7 months of a doctor | VCO p. 10; HADI §4.5 |
| Five modules A to E, FSE 2.0 / HL7 FHIR / PDF/A, "Non sostituisce il giudizio clinico: lo prepara e lo struttura" | VCO; HADI §4.5 |
| Pilot agreement signed with ASL VCO | Guido; HADI §1.6 |
| Frankura price 50,000 to 150,000 per hospital plus a yearly fee | HADI §4.3 |
| About 25,000 signed, about 120,000 advanced pipeline, June 2026 | HADI §1.6. **Update if there are newer figures.** |

## Public data

| Figure | Source |
|---|---|
| Direct purchases 2025: EUR 16,002.4M net (A+H, excl. medical gases), 11.82% of FSN vs 8.30% ceiling, overrun EUR 4,767.1M; no region within the ceiling | AIFA, *Monitoraggio della spesa farmaceutica gennaio-dicembre 2025, consuntivo*, Tab. 10.2 (29.07.2026). https://www.aifa.gov.it/documents/20142/3073807/Monitoraggio_Spesa_gennaio-dicembre-2025_consuntivo.pdf |
| Regional gross spend A+H+C, net spend, overrun, share of fund (Piemonte, Lombardia, Veneto, Liguria, Emilia-Romagna, Abruzzo, Campania, Puglia, Sardegna) | Same report, Tab. 8.1 (gross) and Tab. 10.2. Values in `model.py`, `REGIONS` |
| Italy gross A+H+C EUR 18,172.1M | Same report, Tab. 8.1 |
| Public-structure spending EUR 18.9bn in 2025 | AIFA, Rapporto OsMed 2025. https://www.aifa.gov.it/-/aifa-pubblica-rapporto-osmed-2025 |
| Population at 1 Jan 2025 (regions; ASL Caserta 908,451; ASL Salerno 1,055,372; ASL Taranto 550,436; AULSS 9 928,622; AUSL Modena 708,340; ASL Gallura 159,222; Italy 58,943,464) | ISTAT POSAS 2025, https://demo.istat.it |
| ASL VCO territory 163,337 residents in 81 comuni (province alone 153,283) | Ministero della Salute, corrispondenze ASL-comuni 2024, https://www.dati.salute.gov.it |
| ASL per region (Piemonte 12, Lombardia 8 ATS, Veneto 9, Emilia-Romagna 8, Abruzzo 4, Campania 7, Puglia 6, Sardegna 8; Liguria single ATS with 5 areas from 1 Jan 2026) | Ministero della Salute ASL list (23.04.2026); regional sites; L.R. Liguria 18/2025 |
| New cancer cases by region (Piemonte 30,000; Lombardia 60,000; Veneto 32,000; Liguria 11,900; Emilia-Romagna 29,500; Abruzzo 8,300; Campania 32,500; Puglia 21,500; Sardegna 10,200) | AIRTUM, *I numeri del cancro in Italia 2019*, Tab. 25. The latest regional table; later editions give national totals only. https://www.epicentro.iss.it/tumori/pdf/NC2019-operatori-web.pdf |
| About 390,000 new diagnoses a year | AIOM/AIRTUM, *I numeri del cancro* 2024 and 2025 |
| 323 medical oncology units (2022); public oncology beds 5,262 (2012) to 4,159 (2022) | AIOM census reported by Milano Finanza (Oct 2022); LaPresse, 8 Nov 2024 |
| Rete Oncologica Piemonte e Valle d'Aosta: 36 CAS, 283 GIC | https://reteoncologica.it (retrieved Oct 2026) |
| Digital health spend EUR 2.7bn in 2025 (+9%); 2024: structures EUR 1.79bn, Regions EUR 580M; 61% of specialists use generative AI; 33% of public structures fear post-PNRR cuts; 50% cite limited resources | Osservatorio Sanità Digitale, Politecnico di Milano, editions 2025 and 2026 |
| PNRR Mission 6: EUR 15.63bn | Camera dei deputati, https://temi.camera.it/leg19/post/OCD15_14428/pnrr-risorse-missione-salute-m6.html |
| Legge 132/2025 in force 10 Oct 2025, art. 7 | https://www.normattiva.it/eli/id/2025/09/25/25G00143/CONSOLIDATED |
| ETS commercial activity only secondary and instrumental | D.Lgs. 117/2017, art. 6 |
| AI Act obligations for high-risk AI in Annex I products from 2 Aug 2027 | Regulation (EU) 2024/1689, art. 113 |
| MDR rule 11 (decision-support software, class IIa or higher) | Regulation (EU) 2017/745, Annex VIII |
| IQVIA Farma360 free of charge for Regione Calabria | Regione Calabria, decreto 14885 of 20 Oct 2025 |
| BI Health acquired by Maps for EUR 3.7M | Teleborsa, 15 Sep 2026 |
| Tandem Health USD 100M (2026) | HLTH, Sep 2026 |
| Corti integrated in Dedalus ORBIS | corti.ai, April 2026 |

## Contacts (public roles, October 2026)

| Entity | Contact | Role in the plan | Source and confidence |
|---|---|---|---|
| ASL VCO | Mario Franchini | Direttore SOC Oncologia | aslvco.it, high |
| ASL Caserta | Claudia Pagliaro | Farmacista | ASL Caserta staff page (about 2022, search index), **low** |
| ASL Salerno | Gennaro Sosto | Direttore Generale | Quotidiano Sanità, June 2025, high |
| Regione Campania | Ugo Trama | Dirigente, Settore Accreditamento, HTA e Rapporti con il Mercato | BURC, high |
| Regione Piemonte | Federico Riboldi | Assessore alla Sanità | regione.piemonte.it, high |
| Regione Abruzzo | Alberto Costantini | Dirigente, Servizio Assistenza Farmaceutica | trasparenza.regione.abruzzo.it, high |
| Regione Liguria | Barbara Rebesco | Coordinatrice, DIAR Farmaceutico | liguriasalute.atsliguria.it, high |
| AULSS 9 Scaligera | Marina Tommasi | Direttrice Farmacia Ospedaliera Legnago and Dipartimento dei Servizi | L'Arena, May 2025, medium |
| Ospedale Pederzoli | Marco Gabrera | none shown | **Not found.** A "Marco Gambera" at Gruppo Pederzoli exists on LinkedIn; please confirm the spelling |
| AUSL Modena | Mattia Altini | Direttore Generale | DPGR 16/2025, high |
| Puglia, Miulli, ASL Taranto, ASL Gallura, Humanitas | not given | "su richiesta" | |

Hospitals: Miulli 600 beds (BURP, July 2024); Humanitas assumed to be the Rozzano IRCCS
(**please confirm the site**); Pederzoli is a presidio ospedaliero of AULSS 9, so the plan does not
add its value to AULSS 9's.

## The model (what is an estimate)

- **VIS value rate**: 808,000 / 452.7M = 0.178% (prudent), 0.089% (minimum), applied to AIFA 2025
  gross A+H+C regional spending. For Abruzzo the documented figures are used as they are (AIFA
  gross for Abruzzo, EUR 426.9M, is below the VIS perimeter, so the rate is conservative there).
- **Frankura value per patient**: 66,816 / 1,100 = EUR 60.74 and 1.265 h, applied to AIRTUM new
  cases. Check: VCO has 6.7 CAS per 1,000 residents; Piemonte 7.1 new cases per 1,000.
- **ASL share**: regional figure times the ASL's share of residents. It includes spending by the
  hospital trusts in that territory, so it is the value for the territory, not for the ASL's own budget.
- **No double counting**: totals use regions in the network plus ASL whose region is not in the
  network; hospitals are not added.
- **VIS fee per client**: regional full configuration over the region's ASL (Liguria: 5 areas);
  single ASL full configuration, or M1+M2 below 300,000 residents.
- **Revenue scenario** (illustrative, not a forecast): client counts are assumptions; Frankura
  licence 50,000 at VCO and 100,000 elsewhere; Frankura yearly fee 20% of the licence from the year
  after installation (**an assumption**, HADI gives no figure).

## To settle

1. Marco Gabrera (Pederzoli): spelling and role.
2. Which Humanitas hospital, and who the contact is.
3. Claudia Pagliaro's current title at ASL Caserta.
4. Names for Regione Puglia, Miulli, ASL Taranto, ASL Gallura and Humanitas, if they can be shown.
5. The ScaleX deck used 153,000 for ASL VCO (the province); the ASL territory is 163,337.
6. Signed contracts and pipeline: the June 2026 figures (25,000 and 120,000) need updating.
7. Frankura's yearly fee: a real figure would replace the 20% assumption.
8. Domenico Putignano is CMO in the June plan but is not in this team (as in the deck).
9. Regulatory reading of Frankura modules A, B and D (not a medical device) to be confirmed formally.
