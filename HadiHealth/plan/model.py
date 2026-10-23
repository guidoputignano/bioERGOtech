"""The numbers of the Hadi Health business plan.

Every figure in plan.html comes from compute(), so it is written once.
Sources are in HadiHealth/notes/facts-and-sources.md; the short tags below
point to it:

    VIS     VIS Pharma Compass, Descrizione del prodotto (v4) and Percorso
            Euro Farmaceutico: tested on the four ASL of Regione Abruzzo.
    VCO     Proposta Progetto ASL VCO (v6, 1 June 2026): Frankura modules A to C.
    HADI    Hadi Health draft business plan, June 2026 (ScaleX/sources).
    AIFA    Monitoraggio della spesa farmaceutica, gennaio-dicembre 2025,
            consuntivo (29 July 2026). Gross = Tab. 8.1, classes A+H+C.
    ISTAT   Resident population at 1 January 2025 (POSAS 2025).
    AIRTUM  I numeri del cancro in Italia 2019, Tab. 25: new cases by region,
            the latest regional table published.

Method, in one paragraph. VIS value scales with the pharmaceutical spending
it governs: we take the value per euro of spend estimated for Abruzzo and apply
it to AIFA 2025 spending. Frankura value scales with the number of new cancer
patients: we take the value per patient estimated for ASL VCO and apply it to
AIRTUM new cases. A local health authority gets its region's figure in
proportion to its residents. These are orders of magnitude, not offers; the
diagnostic analysis and the before and after measurement replace them with
the client's own numbers.
"""

# ---------------------------------------------------------------- anchor estimates

# VIS, Abruzzo (VIS §9). Perimeter: four ASL, yearly spend.
VIS_PERIMETER = 452_700_000
VIS_PRUDENT = 808_000          # 205k programming + 384k purchasing + 60k registries + 159k benchmark
VIS_MINIMUM = 404_000
VIS_STAGES = [                 # (stage, value per year, what it is)
    ("Programmazione", 205_000, "governo del prontuario e della crescita della spesa"),
    ("Acquisto", 384_000, "scadenze brevettuali (240.000 €) e biosimilari disponibili (144.000 €)"),
    ("Rendicontazione", 60_000, "note di credito dei registri AIFA richieste in tempo"),
    ("Benchmark fra aziende", 159_000, "confronto per attività fra le ASL della stessa regione"),
]
VIS_DAYS_FREED = 71            # pharmacist days a year (Percorso)
VIS_HOURS_FREED = 497
VIS_RECORDS = 261_153

# VIS price list (VIS §9.3 to §9.5), euro, VAT excluded.
VIS_DIAGNOSTIC = 9_000
VIS_ASL_FULL = 72_000
VIS_ASL_M12 = 26_000
VIS_ASL_M123 = 36_000
VIS_ASL_ACTIVATION = 6_000
VIS_REG_BASE = 135_000          # all modules, regional share
VIS_REG_PER_AZIENDA = 6_000
VIS_REG_ACT_BASE = 15_000
VIS_REG_ACT_PER_AZIENDA = 2_000
VIS_DIRECT_AWARD = 140_000      # D.Lgs. 36/2023 art. 50, on the total value of the award
VIS_REG_ABRUZZO_FULL = VIS_REG_BASE + 4 * VIS_REG_PER_AZIENDA   # 159,000: four ASL, all modules (VIS §9.6)
VIS_REG_M1238 = 105_000         # four ASL, M1+M2+M3 and the benchmark per attività M8 (VIS §9.6)
VIS_BREAKEVEN = VIS_REG_ABRUZZO_FULL / VIS_PRUDENT         # 19.7% of the prudent case pays the full configuration
VIS_BREAKEVEN_M1238 = VIS_REG_M1238 / VIS_PRUDENT          # 13.0%, the figure quoted in VIS §9.6
# M1+M2 act on programming and purchasing only; registries need M3, the benchmark M8 (VIS §9.3, §9.6)
VIS_M12_SHARE = (205_000 + 384_000) / VIS_PRUDENT

# Frankura, ASL VCO (VCO pp. 3 to 10).
VCO_CAS = 1_100                 # intake forms a year: one per new oncology patient
VCO_VISITS = 525
VCO_GIC = 1_547
VCO_HOURLY = 48
VCO_MODULES = [                 # (module, hours a year)
    ("A. Acquisizione dei dati della visita", 406),
    ("B. Trasferimento dalla scheda CAS alla scheda GIC", 600),
    ("C. Sintesi del caso per la riunione GIC", 386),
]
VCO_HOURS = sum(h for _, h in VCO_MODULES)          # 1,392
VCO_VALUE = VCO_HOURS * VCO_HOURLY                   # 66,816

# Frankura price (HADI §4.3): licence per hospital plus a yearly fee.
FRK_LICENCE_LOW, FRK_LICENCE_HIGH = 50_000, 150_000


# ---------------------------------------------------------------- public data

ITALY_POP = 58_943_464
IT_REGIONS = 21                        # 19 regions and 2 autonomous provinces

# Public aziende per region and autonomous province, October 2026: ASL (Lombardy: ATS), ASST,
# AO, AOU and public IRCCS, counted as legal entities. Ministry of Health ASL list (23 Apr 2026)
# and AO/AOU/IRCCS list (1 Jan 2022), updated for later changes; total 202.
AZIENDE_IT = {
    "Piemonte": 19, "Valle d'Aosta": 1, "Lombardia": 39, "PA Bolzano": 1, "PA Trento": 1,
    "Veneto": 12, "Friuli Venezia Giulia": 5, "Liguria": 3, "Emilia-Romagna": 13, "Toscana": 7,
    "Umbria": 4, "Marche": 7, "Lazio": 17, "Abruzzo": 4, "Molise": 1, "Campania": 17,
    "Puglia": 10, "Basilicata": 4, "Calabria": 8, "Sicilia": 18, "Sardegna": 11,
}
ITALY_GROSS = 18_172_057_828           # AIFA Tab. 8.1, A+H+C
ITALY_NET = 16_002_381_144             # AIFA Tab. 10.2 col. F
ITALY_OVERRUN = 4_767_097_229
ITALY_SHARE = 11.82                    # % of the national health fund, ceiling 8.30
ITALY_CASES = 390_000                  # AIOM/AIRTUM, 2024 and 2025 estimate
ITALY_ONCOLOGY_UNITS = 347             # AIOM Libro bianco 2023: units surveyed, 301 of them public
OSMED_PUBLIC = 18.9e9                  # OsMed 2025, spending by public structures
DIGITAL_2025 = 2.7e9                   # Osservatorio Sanità Digitale, Politecnico di Milano
DIGITAL_STRUCTURES_2024 = 1.79e9
DIGITAL_REGIONS_2024 = 0.58e9
PNRR_M6 = 15.63e9

# region: residents, AIFA gross A+H+C, AIFA net, overrun, share of fund (%),
# AIRTUM new cases (2019), local health authorities, and all public aziende (ASL, AO, AOU, public
# IRCCS, as in AZIENDE_IT) for the regional VIS fee
REGIONS = {
    "Piemonte":       dict(pop=4_251_868, gross=1_287_449_936, net=1_130_640_079, overrun=309_984_195, share=11.44, cases=30_000, asl=12, aziende=19),
    "Lombardia":      dict(pop=10_033_918, gross=2_648_140_584, net=2_293_417_057, overrun=398_494_112, share=10.05, cases=60_000, asl=8),
    "Veneto":         dict(pop=4_853_472, gross=1_390_677_804, net=1_212_340_327, overrun=288_194_889, share=10.89, cases=32_000, asl=9),
    "Liguria":        dict(pop=1_510_143, gross=523_897_951, net=461_207_494, overrun=156_327_398, share=12.56, cases=11_900, asl=5, aziende=3),
    "Emilia-Romagna": dict(pop=4_461_998, gross=1_501_605_526, net=1_329_665_571, overrun=477_921_059, share=12.96, cases=29_500, asl=8),
    "Abruzzo":        dict(pop=1_269_118, gross=426_873_171, net=376_863_878, overrun=132_719_590, share=12.81, cases=8_300, asl=4, aziende=4),
    "Campania":       dict(pop=5_582_337, gross=1_919_583_965, net=1_726_801_651, overrun=677_669_792, share=13.66, cases=32_500, asl=7, aziende=17),
    "Puglia":         dict(pop=3_877_395, gross=1_249_691_052, net=1_103_021_937, overrun=361_559_634, share=12.35, cases=21_500, asl=6, aziende=10),
    "Sardegna":       dict(pop=1_562_381, gross=571_097_767, net=535_188_513, overrun=236_423_815, share=14.87, cases=10_200, asl=8),
}

# ---------------------------------------------------------------- the network

BETA, DIRECT = "beta", "diretto"
VIS, FRK, BOTH = "VIS Pharma Compass", "Frankura", "Entrambi"

# kind: region | asl | hospital. pop is given for an ASL (ISTAT; VCO is the ASL's 81 comuni).
NETWORK = [
    dict(n=1, name="ASL VCO", kind="asl", region="Piemonte", pop=163_337, city="Verbania", lat=45.92, lon=8.55,
         who="Mario Franchini", role="Direttore SOC Oncologia", product=FRK, status=BETA,
         note="Progetto pilota in attesa dell'approvazione regionale"),
    dict(n=2, name="ASL Caserta", kind="asl", region="Campania", pop=908_451, city="Caserta", lat=41.07, lon=14.33,
         who="Claudia Pagliaro", role="Farmacista ospedaliera", product=VIS, status=BETA),
    dict(n=3, name="ASL Salerno", kind="asl", region="Campania", pop=1_055_372, city="Salerno", lat=40.68, lon=14.77,
         who="Gennaro Sosto", role="Direttore Generale", product=VIS, status=BETA),
    dict(n=4, name="Regione Campania", kind="region", region="Campania", city="", lat=41.15, lon=15.15,
         who="Ugo Trama", role="Dirigente, Settore Accreditamento, HTA e Rapporti con il Mercato", product=VIS, status=DIRECT),
    dict(n=5, name="Regione Piemonte", kind="region", region="Piemonte", city="", lat=44.85, lon=7.95,
         who="Assessorato alla Sanità", role="", product=FRK, status=DIRECT),
    dict(n=6, name="Regione Abruzzo", kind="region", region="Abruzzo", city="", lat=42.25, lon=13.85,
         who="Alberto Costantini", role="Dirigente, Servizio Assistenza Farmaceutica", product=VIS, status=DIRECT,
         note="VIS provato sui dati delle quattro ASL"),
    dict(n=7, name="Regione Puglia", kind="region", region="Puglia", city="", lat=41.45, lon=15.6,
         who="", role="", product=BOTH, status=DIRECT),
    dict(n=8, name="Ospedale Miulli", kind="hospital", region="Puglia", city="Acquaviva delle Fonti", lat=40.90, lon=16.84,
         who="", role="", product=BOTH, status=DIRECT, note="600 posti letto, oncologia ed ematologia"),
    dict(n=9, name="ASL Taranto", kind="asl", region="Puglia", pop=550_436, city="Taranto", lat=40.47, lon=17.24,
         who="", role="", product=BOTH, status=DIRECT),
    dict(n=10, name="ASL Gallura", kind="asl", region="Sardegna", pop=159_222, city="Olbia", lat=40.92, lon=9.50,
         who="", role="", product=BOTH, status=DIRECT),
    dict(n=11, name="Regione Liguria", kind="region", region="Liguria", city="", lat=44.42, lon=8.9,
         who="Barbara Rebesco", role="Coordinatrice, DIAR Farmaceutico", product=VIS, status=DIRECT),
    dict(n=12, name="Humanitas", kind="hospital", region="Lombardia", city="Rozzano", lat=45.38, lon=9.15,
         who="", role="", product=BOTH, status=DIRECT, note="IRCCS, Cancer Center"),
    dict(n=13, name="AULSS 9 Scaligera", kind="asl", region="Veneto", pop=928_622, city="Verona", lat=45.44, lon=10.99,
         who="Marina Tommasi", role="Direttrice Farmacia Ospedaliera di Legnago e Dipartimento dei Servizi", product=VIS, status=DIRECT),
    dict(n=14, name="Ospedale Pederzoli", kind="hospital", region="Veneto", city="Peschiera del Garda", lat=45.44, lon=10.69,
         who="Marco Gambera", role="Farmacista ospedaliero", product=VIS, status=DIRECT, note="Presidio ospedaliero dell'AULSS 9, oncologia accreditata ESMO"),
    dict(n=15, name="AUSL Modena", kind="asl", region="Emilia-Romagna", pop=708_340, city="Modena", lat=44.65, lon=10.93,
         who="Mattia Altini", role="Direttore Generale", product=BOTH, status=DIRECT),
]

# ---------------------------------------------------------------- method

VIS_RATE_PRUDENT = VIS_PRUDENT / VIS_PERIMETER       # value per euro of spend
VIS_RATE_MINIMUM = VIS_MINIMUM / VIS_PERIMETER
FRK_PER_PATIENT = VCO_VALUE / VCO_CAS                 # euro per new patient
FRK_HOURS_PER_PATIENT = VCO_HOURS / VCO_CAS

FRK_FEE_SHARE = 0.20      # assumption: yearly fee = 20% of the licence, from the year after installation
FRK_LICENCE_MID = 100_000  # assumption for a mid-sized centre in the scenario


def spend(e):
    """Pharmaceutical spending of the territory (AIFA gross A+H+C)."""
    r = REGIONS[e["region"]]
    if e["kind"] == "region":
        return r["gross"]
    if e["kind"] == "asl":
        return r["gross"] * e["pop"] / r["pop"]
    return None


def patients(e):
    """New cancer patients a year in the territory."""
    if e["name"] == "ASL VCO":
        return VCO_CAS
    r = REGIONS[e["region"]]
    if e["kind"] == "region":
        return r["cases"]
    if e["kind"] == "asl":
        return r["cases"] * e["pop"] / r["pop"]
    return None


def population(e):
    return REGIONS[e["region"]]["pop"] if e["kind"] == "region" else e.get("pop")


def vis_value(e):
    """(minimum, prudent) euro a year, or None for a single hospital."""
    if e["name"] == "Regione Abruzzo":
        return VIS_MINIMUM, VIS_PRUDENT
    s = spend(e)
    return None if s is None else (s * VIS_RATE_MINIMUM, s * VIS_RATE_PRUDENT)


def frk_value(e):
    """(euro a year, doctor hours a year), or None for a single hospital."""
    if e["name"] == "ASL VCO":
        return VCO_VALUE, VCO_HOURS
    p = patients(e)
    return None if p is None else (p * FRK_PER_PATIENT, p * FRK_HOURS_PER_PATIENT)


def vis_fee(e):
    """Yearly VIS fee at list price for the configuration that fits the client."""
    if e["kind"] == "region":
        if e["name"] == "Regione Abruzzo":
            return VIS_REG_ABRUZZO_FULL, "Regione, 4 ASL, tutti i moduli"
        n = REGIONS[e["region"]]["aziende"]
        what = f"{n} aziende"
        return VIS_REG_BASE + VIS_REG_PER_AZIENDA * n, f"Regione, {what}, tutti i moduli"
    if e["kind"] == "asl":
        if e["pop"] < 300_000:
            return VIS_ASL_M12, "Azienda singola, M1+M2"
        return VIS_ASL_FULL, "Azienda singola, tutti i moduli"
    return None, ""


def vis_fee_value(e):
    """(minimum, prudent) value of what the fee buys: M1+M2 cover programming and purchasing only."""
    v, fee = vis_value(e), vis_fee(e)[0]
    if not v or not fee:
        return None
    k = VIS_M12_SHARE if fee == VIS_ASL_M12 else 1
    return v[0] * k, v[1] * k


def top_level(e):
    """True if the entity is not inside a region that is itself in the network
    and is not a single hospital: this is how the totals avoid double counting."""
    if e["kind"] == "hospital":
        return False
    if e["kind"] == "region":
        return True
    return not any(x["kind"] == "region" and x["region"] == e["region"] for x in NETWORK)


# ---------------------------------------------------------------- formatting (Italian)

def num(x, d=0):
    s = f"{x:,.{d}f}"
    return s.replace(",", "X").replace(".", ",").replace("X", ".")


NB = "\u00a0"   # non-breaking space, so a unit never starts a line on its own


def eur(x):
    return f"{num(round(x))}{NB}€"


def est(x):
    """An estimate, rounded so it does not look more precise than it is."""
    if x >= 1e6:
        return f"{num(x / 1e6, 1)}{NB}mln{NB}€"
    if x >= 100_000:
        return f"{num(round(x, -4))}{NB}€"
    return f"{num(round(x, -3))}{NB}€"


def bn(x, d=1):
    return f"{num(x / 1e9, d)}{NB}mld{NB}€"


def mln(x, d=1):
    return f"{num(x / 1e6, d)}{NB}mln{NB}€"


def pct(x, d=1):
    s = num(x, d)
    return (s[:-2] if d == 1 and s.endswith(",0") else s) + "%"


def hours(x, exact=False):
    return f"{num(round(x) if exact or x < 1000 else round(x, -1))}{NB}h"


def vis_fmt(e, x):
    """The VIS value measured in Abruzzo is shown as documented; estimates are rounded."""
    return eur(x) if e["name"] == "Regione Abruzzo" else est(x)


def mult(x):
    return f"{num(x, 1)}×"


def span(a, b):
    """A range in Italian, «da 470.000 a 940.000 €»: the unit is written once when both ends share it."""
    na, _, ua = a.partition(NB)
    ub = b.partition(NB)[2]
    if not ua and a.endswith("×") and b.endswith("×"):
        return f"da {a[:-1]} a {b}"
    return f"da {na} a {b}" if ua and ua == ub else f"da {a} a {b}"


# ---------------------------------------------------------------- tables

def place(e):
    return "Amministrazione regionale" if e["kind"] == "region" else f'{e["city"]}, {e["region"]}'


def table_network():
    rows = []
    for e in NETWORK:
        who = e["who"] + (f'<span>{e["role"]}</span>' if e["role"] else "")
        status = '<b class="tag beta">In prova</b>' if e["status"] == BETA else '<b class="tag direct">Contatto diretto</b>'
        note = f'<span>{e["note"]}</span>' if e.get("note") else ""
        rows.append(
            f'<tr><td class="n"><i class="dot {e["status"]}">{e["n"]}</i></td>'
            f'<td><strong>{e["name"]}</strong><span>{place(e)}</span></td>'
            f'<td class="who">{who or "<em>su richiesta</em>"}</td>'
            f'<td>{e["product"]}{note}</td><td>{status}</td></tr>')
    return ('<table class="data network"><thead><tr><th></th><th>Ente</th><th>Referente</th>'
            '<th>Prodotto proposto</th><th>Stato</th></tr></thead><tbody>'
            + "".join(rows) + "</tbody></table>")


def table_value():
    rows = []
    for e in NETWORK:
        v, f = vis_value(e), frk_value(e)
        pop = population(e)
        vco = e["name"] == "ASL VCO"
        vis_cell = span(vis_fmt(e, v[0]), vis_fmt(e, v[1])) if v else '<em>sui volumi della struttura</em>'
        frk_cell = (f"{eur(f[0]) if vco else est(f[0])}<span>{hours(f[1], vco)}</span>"
                    if f else '<em>sui volumi della struttura</em>')
        mark_v = ' class="focus"' if e["product"] in (VIS, BOTH) and v else ""
        mark_f = ' class="focus"' if e["product"] in (FRK, BOTH) and f else ""
        measured = e["name"] in ("ASL VCO", "Regione Abruzzo")  # one product measured there
        rows.append(
            f'<tr{" class=measured" if measured else ""}><td class="n"><i class="dot {e["status"]}">{e["n"]}</i></td>'
            f'<td><strong>{e["name"]}</strong>{"<span>" + num(pop) + " residenti</span>" if pop else "<span>ospedale</span>"}</td>'
            f'<td{mark_v}>{vis_cell}</td><td{mark_f}>{frk_cell}</td></tr>')
    return ('<table class="data value"><thead><tr><th></th><th>Ente e territorio</th>'
            '<th>VIS Pharma Compass<span>valore annuo, scenario minimo e prudenziale</span></th>'
            '<th>Frankura<span>valore annuo e ore di medico liberabili</span></th></tr></thead><tbody>'
            + "".join(rows) + "</tbody></table>")


def table_fees():
    rows = []
    for e in NETWORK:
        v = vis_fee_value(e)
        fee, label = vis_fee(e)
        if not v:
            continue
        rows.append(f'<tr><td><strong>{e["name"]}</strong></td><td>{label}</td><td>{eur(fee)}</td>'
                    f'<td>{span(mult(v[0] / fee), mult(v[1] / fee))}</td></tr>')
    return ('<table class="data fees"><thead><tr><th>Ente</th><th>Configurazione VIS</th><th>Canone annuo</th>'
            '<th>Valore su canone</th></tr></thead><tbody>' + "".join(rows) + "</tbody></table>")


def bars_vis():
    """Horizontal bars, one per top-level territory: minimum, then the prudent extension."""
    items = [(e, vis_value(e)) for e in NETWORK if top_level(e)]
    items.sort(key=lambda t: -t[1][1])
    top = max(v[1] for _, v in items)
    out = []
    for e, (lo, hi) in items:
        out.append(
            f'<div class="hbar"><span class="lbl">{e["name"]}</span>'
            f'<span class="track"><b class="lo" style="width:{100 * lo / top:.1f}%"></b>'
            f'<b class="hi" style="width:{100 * (hi - lo) / top:.1f}%"></b></span>'
            f'<span class="val">{span(vis_fmt(e, lo), vis_fmt(e, hi))}</span></div>')
    return '<div class="hbars">' + "".join(out) + "</div>"


def bars_frk():
    items = [(e, frk_value(e)) for e in NETWORK if top_level(e)]
    items.sort(key=lambda t: -t[1][0])
    top = max(v[0] for _, v in items)
    out = []
    for e, (val, h) in items:
        out.append(
            f'<div class="hbar"><span class="lbl">{e["name"]}</span>'
            f'<span class="track"><b class="one" style="width:{100 * val / top:.1f}%"></b></span>'
            f'<span class="val">{est(val)}<small>{hours(h)}</small></span></div>')
    return '<div class="hbars">' + "".join(out) + "</div>"


def bars_share():
    """Direct-purchase spending as a share of the regional health fund, 2025, against the 8.30% ceiling."""
    items = sorted(REGIONS.items(), key=lambda t: -t[1]["share"])
    top = 16.0
    out = []
    for name, r in items:
        out.append(
            f'<div class="hbar"><span class="lbl">{name}</span>'
            f'<span class="track"><b class="hi" style="width:{100 * 8.30 / top:.1f}%"></b>'
            f'<b class="lo" style="width:{100 * (r["share"] - 8.30) / top:.1f}%"></b></span>'
            f'<span class="val">{pct(r["share"], 2)}<small>+{mln(r["overrun"], 0)}</small></span></div>')
    return '<div class="hbars share">' + "".join(out) + "</div>"


def bars_revenue(y):
    """Stacked bars per year: VIS, then Frankura."""
    top = max(v["total"] for v in y.values())
    out = []
    for k in sorted(y):
        v = y[k]
        out.append(
            f'<div class="hbar"><span class="lbl">{k}</span>'
            f'<span class="track"><b class="lo" style="width:{100 * v["vis"] / top:.1f}%"></b>'
            f'<b class="acc" style="width:{100 * v["frk"] / top:.1f}%"></b></span>'
            f'<span class="val">{eur(v["total"])}</span></div>')
    return '<div class="hbars revenue">' + "".join(out) + "</div>"


def full_market():
    """The whole Italian market at list prices: VIS in every regional health system, over all its
    public aziende (a single-azienda system takes the single-azienda configuration), and Frankura
    in every oncology unit at the scenario's licence and fee."""
    fee = act = 0
    for n in AZIENDE_IT.values():
        if n > 1:
            fee += VIS_REG_BASE + n * VIS_REG_PER_AZIENDA
            act += VIS_REG_ACT_BASE + n * VIS_REG_ACT_PER_AZIENDA
        else:
            fee += VIS_ASL_FULL
            act += VIS_ASL_ACTIVATION
    lic = ITALY_ONCOLOGY_UNITS * FRK_LICENCE_MID
    frk_fee = FRK_FEE_SHARE * lic
    return dict(vis_fee=fee, vis_act=act, frk_lic=lic, frk_fee=frk_fee,
                first=fee + act + lic, recurring=fee + frk_fee, aziende=sum(AZIENDE_IT.values()))


def table_market(m):
    rows = [
        (f"VIS Pharma Compass<span>{num(IT_REGIONS)} configurazioni regionali, {num(m['aziende'])} aziende sanitarie pubbliche</span>",
         m["vis_fee"] + m["vis_act"], m["vis_fee"]),
        (f"Frankura<span>{num(ITALY_ONCOLOGY_UNITS)} unità di oncologia medica, licenza e canone annuo</span>",
         m["frk_lic"], m["frk_fee"]),
    ]
    body = "".join(f"<tr><td><strong>{a.split('<span>')[0]}</strong><span>{a.split('<span>')[1]}</td><td>{mln(b)}</td><td>{mln(c)}</td></tr>" for a, b, c in rows)
    return ('<table class="data market"><thead><tr><th>Prodotto</th><th>Primo anno<span>canoni, attivazioni e licenze</span></th>'
            '<th>Ogni anno dopo<span>canoni ricorrenti</span></th></tr></thead><tbody>' + body +
            f'</tbody><tfoot><tr><td>Totale</td><td>{mln(m["first"])}</td><td>{mln(m["recurring"])}</td></tr></tfoot></table>')


# ---------------------------------------------------------------- scenario

def scenario():
    """An illustrative path, not a forecast: client counts are assumptions,
    prices come from the list prices above."""
    y = {}
    abruzzo_fee, abruzzo_act = VIS_REG_ABRUZZO_FULL, VIS_REG_ACT_BASE + 4 * VIS_REG_ACT_PER_AZIENDA
    n_lig = REGIONS["Liguria"]["aziende"]
    liguria_fee = VIS_REG_BASE + n_lig * VIS_REG_PER_AZIENDA
    liguria_act = VIS_REG_ACT_BASE + n_lig * VIS_REG_ACT_PER_AZIENDA
    asl_y1 = VIS_ASL_M123 + VIS_ASL_ACTIVATION

    # 2027: two beta testers sign, four diagnostics, VCO converts, one more oncology centre
    y[2027] = dict(
        vis_lines=[("Analisi diagnostiche", 4, 4 * VIS_DIAGNOSTIC),
                   ("Contratti ASL, M1+M2+M3 (primo anno)", 2, 2 * asl_y1)],
        frk_lines=[("Licenze per centro oncologico", 2, FRK_LICENCE_LOW + FRK_LICENCE_MID)],
        frk_installed=FRK_LICENCE_LOW + FRK_LICENCE_MID,
    )
    # 2028: one regional configuration, two more ASL, three new oncology centres
    y[2028] = dict(
        vis_lines=[("Rinnovi ASL", 2, 2 * VIS_ASL_M123),
                   ("Configurazione regionale, 4 ASL (primo anno)", 1, abruzzo_fee + abruzzo_act),
                   ("Nuovi contratti ASL (primo anno)", 2, 2 * asl_y1),
                   ("Analisi diagnostiche", 3, 3 * VIS_DIAGNOSTIC)],
        frk_lines=[("Canoni annui sui centri installati", 2, FRK_FEE_SHARE * y[2027]["frk_installed"]),
                   ("Licenze per centro oncologico", 3, 3 * FRK_LICENCE_MID)],
        frk_installed=y[2027]["frk_installed"] + 3 * FRK_LICENCE_MID,
    )
    # 2029: a second region, two more ASL, five new oncology centres
    y[2029] = dict(
        vis_lines=[("Rinnovo regionale", 1, abruzzo_fee),
                   ("Rinnovi ASL", 4, 4 * VIS_ASL_M123),
                   ("Seconda configurazione regionale (primo anno)", 1, liguria_fee + liguria_act),
                   ("Nuovi contratti ASL (primo anno)", 2, 2 * asl_y1)],
        frk_lines=[("Canoni annui sui centri installati", 5, FRK_FEE_SHARE * y[2028]["frk_installed"]),
                   ("Licenze per centro oncologico", 5, 5 * FRK_LICENCE_MID)],
        frk_installed=y[2028]["frk_installed"] + 5 * FRK_LICENCE_MID,
    )
    for k, v in y.items():
        v["vis"] = sum(t for _, _, t in v["vis_lines"])
        v["frk"] = sum(t for _, _, t in v["frk_lines"])
        v["total"] = v["vis"] + v["frk"]
    # recurring revenue running into 2030
    recurring_vis = abruzzo_fee + liguria_fee + 6 * VIS_ASL_M123
    recurring_frk = FRK_FEE_SHARE * y[2029]["frk_installed"]
    centres = 2 + 3 + 5
    return y, recurring_vis, recurring_frk, centres


def table_scenario(y):
    years = sorted(y)
    head = "".join(f"<th>{k}</th>" for k in years)

    def block(title, key, lines_key):
        labels = []
        for k in years:
            for lbl, _, _ in y[k][lines_key]:
                if lbl not in labels:
                    labels.append(lbl)
        rows = [f'<tr class="group"><td colspan="{len(years) + 1}">{title}</td></tr>']
        for lbl in labels:
            cells = []
            for k in years:
                hit = [(c, t) for l2, c, t in y[k][lines_key] if l2 == lbl]
                cells.append(f"<td>{eur(hit[0][1])}<span>{hit[0][0]}</span></td>" if hit else "<td></td>")
            rows.append(f"<tr><td>{lbl}</td>{''.join(cells)}</tr>")
        rows.append(f'<tr class="sub"><td>Totale {title}</td>' + "".join(f"<td>{eur(y[k][key])}</td>" for k in years) + "</tr>")
        return "".join(rows)

    total = '<tr class="total"><td>Ricavi totali</td>' + "".join(f"<td>{eur(y[k]['total'])}</td>" for k in years) + "</tr>"
    return (f'<table class="data scenario"><thead><tr><th></th>{head}</tr></thead><tbody>'
            + block("VIS Pharma Compass", "vis", "vis_lines") + block("Frankura", "frk", "frk_lines") + total
            + "</tbody></table>")


# ---------------------------------------------------------------- compute

def compute():
    v = {}
    # measured cases
    v.update(
        vis_perimeter=mln(VIS_PERIMETER), vis_prudent=eur(VIS_PRUDENT), vis_minimum=eur(VIS_MINIMUM),
        vis_days=num(VIS_DAYS_FREED), vis_hours=num(VIS_HOURS_FREED), vis_records=num(VIS_RECORDS),
        vis_breakeven=pct(100 * VIS_BREAKEVEN), vis_breakeven_m1238=pct(100 * VIS_BREAKEVEN_M1238),
        vis_fee_abruzzo=eur(VIS_REG_ABRUZZO_FULL), vis_reg_m1238=eur(VIS_REG_M1238),
        vis_m12_share=pct(100 * VIS_M12_SHARE, 0), vis_m12_value=eur(205_000 + 384_000),
        vis_reg_4_3y=eur(3 * VIS_REG_ABRUZZO_FULL + VIS_REG_ACT_BASE + 4 * VIS_REG_ACT_PER_AZIENDA),
        vis_asl_full_2y=eur(2 * VIS_ASL_FULL + VIS_ASL_ACTIVATION), vis_asl_full_1y=eur(VIS_ASL_FULL + VIS_ASL_ACTIVATION),
        vis_asl_m123_3y=eur(3 * VIS_ASL_M123 + VIS_ASL_ACTIVATION),
        vis_rate_prudent=pct(100 * VIS_RATE_PRUDENT, 2),
        vis_rate_minimum=pct(100 * VIS_RATE_MINIMUM, 2),
        vis_per_million_prudent=eur(1e6 * VIS_RATE_PRUDENT), vis_per_million_minimum=eur(1e6 * VIS_RATE_MINIMUM),
        vis_diagnostic=eur(VIS_DIAGNOSTIC), vis_asl_full=eur(VIS_ASL_FULL), vis_asl_m12=eur(VIS_ASL_M12),
        vis_asl_m123=eur(VIS_ASL_M123), vis_asl_activation=eur(VIS_ASL_ACTIVATION),
        vis_reg_base=eur(VIS_REG_BASE), vis_reg_per=eur(VIS_REG_PER_AZIENDA),
        vis_reg_act=eur(VIS_REG_ACT_BASE), vis_reg_act_per=eur(VIS_REG_ACT_PER_AZIENDA),
        direct_award=eur(VIS_DIRECT_AWARD),
        vco_cas=num(VCO_CAS), vco_visits=num(VCO_VISITS), vco_gic=num(VCO_GIC), vco_hourly=eur(VCO_HOURLY),
        vco_hours=num(VCO_HOURS), vco_value=eur(VCO_VALUE),
        frk_per_patient=f"{num(FRK_PER_PATIENT, 2)}{NB}€", frk_hours_per_patient=num(FRK_HOURS_PER_PATIENT, 2),
        frk_per_1000=est(1000 * FRK_PER_PATIENT), frk_hours_per_1000=num(round(1000 * FRK_HOURS_PER_PATIENT)),
        frk_low=eur(FRK_LICENCE_LOW), frk_high=eur(FRK_LICENCE_HIGH), frk_mid=eur(FRK_LICENCE_MID),
        frk_fee_share=pct(100 * FRK_FEE_SHARE, 0),
    )
    for name, value, what in VIS_STAGES:
        key = name.lower().split()[0]
        v[f"vis_stage_{key}"] = eur(value)
    v["vis_stages"] = "".join(f"<tr><td><strong>{n}</strong><span>{w}</span></td><td>{eur(x)}</td></tr>" for n, x, w in VIS_STAGES)
    v["vco_modules"] = "".join(f"<tr><td>{m}</td><td>{num(h)}{NB}h</td><td>{eur(h * VCO_HOURLY)}</td></tr>" for m, h in VCO_MODULES)
    vco_ab = sum(h for m, h in VCO_MODULES if not m.startswith("C"))   # modules A and B only, before CE marking of C
    v["vco_hours_ab"], v["vco_value_ab"] = num(vco_ab), eur(vco_ab * VCO_HOURLY)

    # VCO cross-check: CAS per 1,000 residents against Piemonte's incidence
    vco = NETWORK[0]
    v["vco_pop"] = num(vco["pop"])
    v["vco_cas_rate"] = num(1000 * VCO_CAS / vco["pop"], 1)
    v["piemonte_rate"] = num(1000 * REGIONS["Piemonte"]["cases"] / REGIONS["Piemonte"]["pop"], 1)

    # Italy
    v["it_regions"] = num(IT_REGIONS)
    v.update(
        italy_net=bn(ITALY_NET), italy_gross=bn(ITALY_GROSS), italy_overrun=bn(ITALY_OVERRUN, 2),
        italy_share=pct(ITALY_SHARE, 2), italy_cases=num(ITALY_CASES), italy_units=num(ITALY_ONCOLOGY_UNITS),
        osmed_public=bn(OSMED_PUBLIC), digital_2025=bn(DIGITAL_2025), digital_structures=bn(DIGITAL_STRUCTURES_2024, 2),
        digital_regions=mln(DIGITAL_REGIONS_2024, 0), pnrr_m6=bn(PNRR_M6, 2),
        italy_vis=span(mln(ITALY_GROSS * VIS_RATE_MINIMUM, 0), mln(ITALY_GROSS * VIS_RATE_PRUDENT, 0)),
        italy_frk=mln(ITALY_CASES * FRK_PER_PATIENT, 0), italy_frk_hours=num(round(ITALY_CASES * FRK_HOURS_PER_PATIENT, -3)),
    )
    camp = REGIONS["Campania"]
    v["campania_overrun"] = mln(camp["overrun"], 0)
    v["campania_share"] = pct(camp["share"], 2)

    # network totals, without double counting
    tops = [e for e in NETWORK if top_level(e)]
    pop = sum(population(e) for e in tops)
    vis_lo = sum(vis_value(e)[0] for e in tops)
    vis_hi = sum(vis_value(e)[1] for e in tops)
    frk_eur = sum(frk_value(e)[0] for e in tops)
    frk_h = sum(frk_value(e)[1] for e in tops)
    spend_tot = sum(VIS_PERIMETER if e["name"] == "Regione Abruzzo" else spend(e) for e in tops)
    v.update(
        net_entities=num(len(NETWORK)), net_beta=num(sum(e["status"] == BETA for e in NETWORK)),
        net_direct=num(sum(e["status"] == DIRECT for e in NETWORK)),
        net_regions=num(sum(e["kind"] == "region" for e in NETWORK)),
        net_asl=num(sum(e["kind"] == "asl" for e in NETWORK)),
        net_hospitals=num(sum(e["kind"] == "hospital" for e in NETWORK)),
        net_regions_touched=num(len({e["region"] for e in NETWORK})),
        net_pop=f"{num(pop / 1e6, 1)}{NB}milioni",
        net_pop_share=pct(100 * pop / ITALY_POP, 0),
        net_spend=bn(spend_tot, 1),
        net_vis_lo=mln(vis_lo), net_vis_hi=mln(vis_hi),
        net_frk=mln(frk_eur), net_frk_hours=num(round(frk_h, -3)),
        net_total_lo=mln(vis_lo + frk_eur), net_total_hi=mln(vis_hi + frk_eur),
    )

    # regional examples used in the text
    for e in NETWORK:
        key = e["name"].lower().replace("regione ", "").replace(" ", "_").replace("ospedale_", "")
        vv, ff = vis_value(e), frk_value(e)
        if vv:
            v[f"{key}_vis_lo"], v[f"{key}_vis_hi"] = vis_fmt(e, vv[0]), vis_fmt(e, vv[1])
        if ff:
            exact = e["name"] == "ASL VCO"
            v[f"{key}_frk"], v[f"{key}_frk_h"] = (eur if exact else est)(ff[0]), hours(ff[1], exact)
        fee, fv = vis_fee(e)[0], vis_fee_value(e)
        if fv:
            v[f"{key}_mult_lo"], v[f"{key}_mult_hi"] = mult(fv[0] / fee), mult(fv[1] / fee)
            v[f"{key}_fee"] = eur(fee)

    # map pins; a few are nudged apart where two places are a few km from each other
    nudge = {"AULSS 9 Scaligera": (8, 0), "Ospedale Pederzoli": (-8, 0), "ASL Caserta": (-3, -4)}
    def pins(numbered):
        out = []
        for e in NETWORK:
            dx, dy = nudge.get(e["name"], (0, 0))
            out.append(f'<i class="pin {e["status"]}" data-lat="{e["lat"]}" data-lon="{e["lon"]}" '
                       f'data-dx="{dx}" data-dy="{dy}">{e["n"] if numbered else ""}</i>')
        return "".join(out)
    v["map_pins"], v["cover_pins"] = pins(True), pins(False)
    v["map_regions"] = ",".join(e["region"] for e in NETWORK if e["kind"] == "region")

    v["table_network"] = table_network()
    v["table_value"] = table_value()
    v["table_fees"] = table_fees()
    pairs = [(e, vis_fee_value(e), vis_fee(e)[0]) for e in NETWORK]
    pairs = [(e, val[0] / fee, val[1] / fee) for e, val, fee in pairs if val]
    lo = min(pairs, key=lambda t: t[1])
    hi = max(pairs, key=lambda t: t[1])
    v["mult_min"], v["mult_min_name"] = num(lo[1], 1), lo[0]["name"]
    v["mult_max"], v["mult_max_name"] = num(hi[1], 1), hi[0]["name"]
    v["bars_vis"] = bars_vis()
    v["bars_frk"] = bars_frk()

    y, rec_vis, rec_frk, centres = scenario()
    v["bars_revenue"] = bars_revenue(y)
    v["bars_share"] = bars_share()
    v["regions_above"] = num(len(REGIONS))

    # one health authority, both products: ASL Salerno
    sal = next(e for e in NETWORK if e["name"] == "ASL Salerno")
    sv, sf = vis_value(sal), frk_value(sal)
    first = VIS_ASL_FULL + VIS_ASL_ACTIVATION + FRK_LICENCE_MID
    after = VIS_ASL_FULL + FRK_FEE_SHARE * FRK_LICENCE_MID
    lo_t, hi_t = round(sv[0], -4) + round(sf[0], -4), round(sv[1], -4) + round(sf[0], -4)
    v.update(sal_value=span(mln(lo_t), mln(hi_t)), sal_frk_hours=num(round(sf[1], -1)),
             sal_cost_first=eur(first), sal_cost_after=eur(after),
             sal_pop=num(sal["pop"]), sal_patients=num(round(patients(sal), -1)),
             sal_spend=mln(spend(sal), 0))
    v["table_scenario"] = table_scenario(y)
    m = full_market()
    v["table_market"] = table_market(m)
    v.update(it_aziende=num(m["aziende"]), it_first=mln(m["first"]), it_recurring=mln(m["recurring"]),
             it_vis_fee=mln(m["vis_fee"]), it_frk_lic=mln(m["frk_lic"]), it_units=num(ITALY_ONCOLOGY_UNITS),
             it_units_public=num(301))
    value_lo = ITALY_GROSS * VIS_RATE_MINIMUM + ITALY_CASES * FRK_PER_PATIENT
    value_hi = ITALY_GROSS * VIS_RATE_PRUDENT + ITALY_CASES * FRK_PER_PATIENT
    v["it_value"] = span(mln(value_lo, 0), mln(value_hi, 0))
    v["it_fee_share"] = span(pct(100 * m["recurring"] / value_hi, 0), pct(100 * m["recurring"] / value_lo, 0))
    for k in y:
        v[f"rev_{k}"] = eur(y[k]["total"])
    v["rec_vis"], v["rec_frk"], v["rec_total"] = eur(rec_vis), eur(rec_frk), eur(rec_vis + rec_frk)
    v["scenario_centres"] = num(centres)
    return v


if __name__ == "__main__":
    import re
    for k, x in compute().items():
        if not str(x).startswith("<"):
            print(f"{k:28} {x}")
        else:
            print(f"{k:28} [html {len(x)} chars]", re.sub(r"<[^>]+>", " ", x)[:0])
