"""Propunerile pentru patron: voucher pe e-mail, roata norocului, card de fidelitate și specialitățile casei.

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

    # --- Roata: felii egale, eticheta scrisă pe rază ---
    wheel = extra["roata"]
    prizes = wheel["premii"]
    n = len(prizes)
    slices = []
    for i, prize in enumerate(prizes):
        a0, a1 = math.radians(i * 360 / n - 90), math.radians((i + 1) * 360 / n - 90)
        x0, y0, x1, y1 = 100 + 98 * math.cos(a0), 100 + 98 * math.sin(a0), 100 + 98 * math.cos(a1), 100 + 98 * math.sin(a1)
        mid = (i + .5) * 360 / n
        slices.append(
            f'<path class="slice s{i % 3}" d="M100 100L{x0:.2f} {y0:.2f}A98 98 0 0 1 {x1:.2f} {y1:.2f}Z"/>'
            f'<text transform="rotate({mid:.1f} 100 100)" x="100" y="34" text-anchor="middle">{esc(prize["scurt"])}</text>'
        )
    wheel_svg = (
        '<svg class="wheel" viewBox="0 0 200 200" aria-hidden="true">'
        + "".join(slices)
        + '<circle cx="100" cy="100" r="98" class="wheel-rim"/><circle cx="100" cy="100" r="15" class="wheel-hub"/></svg>'
    )

    voucher = extra["voucher"]
    loyalty = extra["fidelitate"]
    mail = extra.get("email", {})
    stamps = "".join(f'<li><span class="sr-only">Ștampila {i}</span></li>' for i in range(1, loyalty["stampile"] + 1))
    config = {
        "prizes": [p["nume"] for p in prizes],
        "wheelValid": wheel["valabilitate"],
        "stamps": loyalty["stampile"],
        "pin": loyalty["pinDemo"],
        "supabaseUrl": mail.get("supabaseUrl", ""),
        "supabaseKey": mail.get("supabaseCheie", ""),
    }
    offers = (
        '<section class="section offers" id="oferte" aria-labelledby="offers-title"><div class="shell">'
        '<div class="section-intro"><h2 id="offers-title">Pentru tine, de la noi.</h2></div>'
        '<div class="offer-grid">'
        f'<article class="offer offer-wheel"><h3>{esc(wheel["titlu"])}</h3><p>{esc(wheel["text"])}</p>'
        f'<div class="wheel-wrap"><span class="wheel-pin" aria-hidden="true"></span>{wheel_svg}</div>'
        '<button type="button" class="button button-dark" data-spin>Învârte roata</button>'
        '<p class="wheel-result" role="status"></p></article>'
        f'<article class="offer offer-loyalty"><h3>{esc(loyalty["titlu"])}</h3><p>{esc(loyalty["text"])}</p>'
        f'<ol class="stamps">{stamps}</ol><p class="stamp-status" role="status"></p>'
        '<form class="stamp-form"><label for="stamp-pin">Pentru barista: codul de ștampilă</label>'
        '<div><input id="stamp-pin" inputmode="numeric" autocomplete="off" maxlength="6">'
        '<button class="button button-outline">Pune ștampila</button></div>'
        f'<small>Demonstrație: codul este {esc(loyalty["pinDemo"])}.</small></form></article>'
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
