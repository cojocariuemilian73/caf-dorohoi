"""Propunerile pentru patron: voucher pe e-mail, roata norocului și specialitățile casei.

Apar pe demo.html. Pe index.html apar doar când "extra.activ" e true în date-site.json.
"""
import json
import math


def build(data, esc, image, frame):
    extra = data["extra"]
    products = {p["nume"]: p for category in data["meniu"] for p in category["produse"]}

    def price(product):
        value = product["pret"]
        return (f"{value:g}".replace(".", ",") + " lei") if value is not None else "La cerere"

    # --- Specialitățile casei ---
    cards = []
    for name in extra["specialitati"]["produse"]:
        product = products.get(name)
        if not product:
            continue
        key = product.get("imagine")
        if key in data["imagini"]:
            visual = f'<div class="special-photo">{image(key, sizes="(min-width: 900px) 30vw, 85vw")}</div>'
        else:
            visual = f'<div class="special-photo is-type" aria-hidden="true"><span>{esc(product["nume"])}</span></div>'
        cards.append(
            f'<li class="special">{visual}<div class="special-copy"><h3>{esc(product["nume"])}</h3>'
            f'<p>{esc(product["descriere"])}</p><span class="price">{price(product)}</span></div></li>'
        )
    spec = extra["specialitati"]
    specials = (
        '<section class="section specials" id="specialitati" aria-labelledby="specials-title"><div class="shell">'
        f'<div class="section-intro"><h2 id="specials-title">{esc(spec["titlu"])}</h2><p>{esc(spec["text"])}</p></div>'
        f'<ul class="special-list">{"".join(cards)}</ul></div></section>'
    )

    # --- Roata: 12 felii (fiecare premiu de două ori, față în față), becuri, cuie, ac și butuc ---
    wheel = extra["roata"]
    prizes = wheel["premii"]
    n = len(prizes) * 2
    step = 360 / n
    C, R = 120, 100

    def point(radius, angle):
        rad = math.radians(angle - 90)
        return C + radius * math.cos(rad), C + radius * math.sin(rad)

    slices, pegs, lights = [], [], []
    for i in range(n):
        prize = prizes[i % len(prizes)]
        x0, y0 = point(R, i * step)
        x1, y1 = point(R, (i + 1) * step)
        mid = (i + .5) * step
        slices.append(
            f'<path class="slice s{i % 3}" data-slice="{i}" d="M{C} {C}L{x0:.2f} {y0:.2f}A{R} {R} 0 0 1 {x1:.2f} {y1:.2f}Z"/>'
            f'<text class="t{i % 3}" transform="rotate({mid:.1f} {C} {C}) translate({C} {C - R + 12}) rotate(90)" dominant-baseline="middle">{esc(prize["scurt"])}</text>'
        )
        px, py = point(R - 3, i * step)
        pegs.append(f'<circle class="peg" cx="{px:.2f}" cy="{py:.2f}" r="2.4"/>')
    for i in range(24):
        lx, ly = point(110, i * 15 + 7.5)
        lights.append(f'<circle class="bulb b{i % 2}" cx="{lx:.2f}" cy="{ly:.2f}" r="3.1"/>')
    wheel_svg = (
        '<svg class="wheel" viewBox="0 0 240 240" aria-hidden="true">'
        f'<circle class="wheel-frame" cx="{C}" cy="{C}" r="117"/>'
        f'<g class="wheel-lights">{"".join(lights)}</g>'
        f'<g class="wheel-disc">{"".join(slices)}'
        f'<circle class="wheel-inner" cx="{C}" cy="{C}" r="44"/>{"".join(pegs)}</g>'
        f'<circle class="wheel-edge" cx="{C}" cy="{C}" r="{R}"/>'
        f'<circle class="wheel-hub" cx="{C}" cy="{C}" r="25"/>'
        f'<text class="wheel-hub-text" x="{C}" y="{C + 1}" text-anchor="middle" dominant-baseline="middle">CAF</text>'
        '<g class="wheel-pointer"><path d="M120 30 L109 6 Q120 -2 131 6 Z"/><circle cx="120" cy="9" r="3.2"/></g>'
        '</svg>'
    )

    voucher = extra["voucher"]
    mail = extra.get("email", {})
    config = {
        "prizes": [p["nume"] for p in prizes],
        "wheelValid": wheel["valabilitate"],
        "supabaseUrl": mail.get("supabaseUrl", ""),
        "supabaseKey": mail.get("supabaseCheie", ""),
    }
    offers = (
        '<section class="section offers" id="oferte" aria-labelledby="offers-title"><div class="shell">'
        '<div class="section-intro"><h2 id="offers-title">Pentru tine, de la noi.</h2></div>'
        '<div class="offer-grid">'
        f'<article class="offer offer-wheel"><h3>{esc(wheel["titlu"])}</h3><p>{esc(wheel["text"])}</p>'
        f'<button type="button" class="wheel-wrap" aria-label="Învârte roata">{wheel_svg}</button>'
        '<button type="button" class="button button-dark" data-spin>Învârte roata</button>'
        '<p class="wheel-hint">Sau apasă direct pe roată.</p>'
        '<p class="wheel-result" role="status"></p></article>'
        '</div></div>'
        f'<script id="extra-config" type="application/json">{json.dumps(config, ensure_ascii=False)}</script>'
        '</section>'
    )

    # --- Fereastra cu voucherul: e-mail, cod de confirmare, voucher ---
    modal = (
        '<dialog class="welcome" aria-labelledby="welcome-title">'
        '<form method="dialog" class="welcome-close"><button aria-label="Închide">×</button></form>'
        f'<div class="welcome-photo" aria-hidden="true">{image("vEspresso", sizes="(min-width: 700px) 320px, 100vw")}</div>'
        '<div class="welcome-body">'
        f'<h2 id="welcome-title">{esc(voucher["titlu"])}</h2>'
        # Pasul 1: adresa de e-mail
        '<form class="welcome-step" data-step="email" novalidate>'
        f'<p>{esc(voucher["text"])}</p>'
        '<label for="welcome-email">Adresa de e-mail</label>'
        '<input id="welcome-email" type="email" autocomplete="email" required placeholder="nume@exemplu.ro">'
        f'<label class="welcome-consent"><input type="checkbox" required> <span>{esc(voucher["acord"])}</span></label>'
        '<button class="button button-dark">Trimite-mi codul</button>'
        '<p class="welcome-error" role="alert"></p></form>'
        # Pasul 2: codul primit
        '<form class="welcome-step" data-step="code" hidden novalidate>'
        '<p>Ți-am trimis un cod de 6 cifre la <strong class="welcome-to"></strong>. Scrie-l aici.</p>'
        '<label for="welcome-code">Codul de confirmare</label>'
        '<input id="welcome-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required>'
        '<button class="button button-dark">Confirmă</button>'
        '<p class="welcome-demo" hidden></p>'
        '<button type="button" class="welcome-back">Altă adresă de e-mail</button>'
        '<p class="welcome-error" role="alert"></p></form>'
        # Pasul 3: voucherul
        '<div class="welcome-step" data-step="voucher" hidden>'
        '<p>Gata! Arată voucherul la bar, la prima vizită.</p>'
        '<div class="ticket"><div class="ticket-qr" aria-hidden="true"></div>'
        '<div class="ticket-info"><span class="ticket-label">Espresso din partea casei</span>'
        '<strong class="ticket-code"></strong><span class="ticket-until"></span></div></div>'
        f'<small>{esc(voucher["conditii"])}</small></div>'
        '</div></dialog>'
        '<button type="button" class="voucher-pill" hidden>Voucherul tău ☕</button>'
    )
    return {"offers": offers, "afterMenu": specials, "modal": modal}
