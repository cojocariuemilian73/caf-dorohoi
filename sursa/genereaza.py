"""Regenerează pagina statică după editarea fișierului date-site.json."""

import html
import json
import re
from datetime import date
from pathlib import Path
from urllib.parse import quote, urljoin

SOURCE = Path(__file__).resolve().parent
ROOT = SOURCE.parent
DATA = json.loads((SOURCE / "date-site.json").read_text(encoding="utf-8"))
IMG = "assets/img/caf/"
DAY_LABELS = dict(zip(
    ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"),
    ("Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă", "Duminică"),
))


def esc(value):
    return html.escape(str(value), quote=True)


def js(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")


def arrow(path):
    return (
        '<svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
        'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
        f'<path d="{path}"/></svg>'
    )


def maps(action, query):
    parameter = "destination" if action == "dir" else "query"
    return f"https://www.google.com/maps/{action}/?api=1&{parameter}={quote(query)}"


def schedule_label(schedule):
    if not schedule:
        return "Program [COMPLETEAZĂ]"
    lines = []
    for entry in schedule:
        days = entry["zile"]
        label = "Zilnic" if set(days) == set(DAY_LABELS) else ", ".join(DAY_LABELS[day] for day in days)
        lines.append(f'{label}, {entry["deschide"]}–{entry["inchide"]}')
    return " · ".join(lines)


def image(key, *, hero=False):
    item = DATA["imagini"][key]
    alt = item["alt"]
    if DATA["fotografiiIlustrative"]:
        alt = "Imagine ilustrativă. " + alt
    loading = 'fetchpriority="high"' if hero else 'loading="lazy" decoding="async"'
    return (
        f'<img src="{esc(IMG + item["fisier"])}" width="{item["latime"]}"'
        f' height="{item["inaltime"]}" alt="{esc(alt)}" {loading}>'
    )


def figure(key):
    return f'<figure><div class="image-frame">{image(key)}</div><figcaption>{esc(DATA["imagini"][key]["titlu"])}</figcaption></figure>'


def gallery_tile(key):
    item = DATA["imagini"][key]
    caption = item["titlu"]
    if DATA["fotografiiIlustrative"]:
        caption += " · Imagine ilustrativă"
    return (
        f'<a class="gallery-item image-frame" href="{esc(IMG + item["fisier"])}" '
        f'data-caption="{esc(caption)}" aria-label="Mărește imaginea. {esc(caption)}">'
        f'{image(key)}<span aria-hidden="true">↗</span></a>'
    )


def favorite_card(category):
    category_id = esc(category["id"])
    return (
        f'<a class="favorite-card" href="#meniu" data-menu-category="meniu-{category_id}">'
        f'<div class="image-frame">{image(category["fotografie"])}</div>'
        f'<div class="favorite-caption"><h3>{esc(category["nume"])}</h3>'
        '<span aria-hidden="true">↗</span></div></a>'
    )


def favorites_section():
    cards = [
        favorite_card(category)
        for category in DATA["meniu"]
        if category.get("fotografie") in DATA["imagini"]
    ]
    if not cards:
        return ""
    note = '<p class="caption">Imagini ilustrative</p>' if DATA["fotografiiIlustrative"] else ""
    return (
        '<section class="section shell favorites" aria-labelledby="favorites-title">'
        '<div class="section-head"><h2 id="favorites-title">Cafea și ceva bun</h2>'
        f'{note}</div><div class="favorites-grid">{"".join(cards)}</div></section>'
    )

def menu_panel(category):
    category_id = esc(category["id"])
    rows = []
    for product in category["produse"]:
        price = product["pret"]
        amount = (f"{price:g}".replace(".", ",") + " lei") if price is not None else "La cerere"
        featured = '<span class="favorite">Preferata casei</span>' if product.get("preferat") else ""
        rows.append(
            f'<li><div><div class="product-name"><h4>{esc(product["nume"])}</h4>{featured}</div>'
            f'<p>{esc(product["descriere"])}</p></div><span class="price">{amount}</span></li>'
        )
    return (
        f'<section class="menu-panel" id="meniu-{category_id}" aria-labelledby="titlu-{category_id}">'
        f'<h3 id="titlu-{category_id}">{esc(category["nume"])}</h3><ul>{"".join(rows)}</ul></section>'
    )


def review(item):
    if "rezumat" in item:
        author = esc(item["autor"])
        return (
            f'<article class="review"><p class="review-summary">{esc(item["rezumat"])}</p>'
            f'<a class="review-author" href="{esc(item["url"])}">{author} · Google Maps</a></article>'
        )
    return f'<figure class="review"><span aria-hidden="true">„</span><blockquote>{esc(item["text"])}</blockquote><figcaption>{esc(item["autor"])}</figcaption></figure>'


def contact_links(links):
    channels = []
    for key in ("instagram", "facebook", "email"):
        value = links[key]
        label = key.capitalize()
        if value:
            href = "mailto:" + value if key == "email" else value
            channels.append(f'<a href="{esc(href)}">{label}</a>')
        else:
            channels.append(f'<span>{label} [COMPLETEAZĂ]</span>')
    return '<ul class="contact-links">' + "".join(f"<li>{channel}</li>" for channel in channels) + "</ul>"


dorohoi = DATA["dorohoi"]
botosani = DATA["botosani"]
links = DATA["linkuri"]
video = DATA["video"]
video_id = quote(video["youtube"], safe="")
rating = DATA.get("evaluareGoogle")
social = links["instagram"] or links["facebook"]
social_label = "Instagram" if links["instagram"] else "Facebook"
illustrative = DATA["fotografiiIlustrative"]
site_url = DATA["publicUrl"].rstrip("/") + "/" if DATA["publicUrl"] else ""
map_search = maps("search", dorohoi["cautareHarta"])
map_query = quote(dorohoi["cautareHarta"])
map_url = links["harta"] or f"https://www.google.com/maps?q={map_query}&z=17&output=embed"
share = DATA["imagini"]["share"]
schema = {
    "@context": "https://schema.org",
    "@type": "CafeOrCoffeeShop",
    "name": DATA["brand"],
    "description": DATA["description"],
    "telephone": dorohoi["telefon"],
    "address": {
        "@type": "PostalAddress",
        "streetAddress": dorohoi["adresa"],
        "addressLocality": dorohoi["oras"],
        "addressRegion": dorohoi["judet"],
        "addressCountry": "RO",
    },
    "geo": {
        "@type": "GeoCoordinates",
        "latitude": dorohoi["latitudine"],
        "longitude": dorohoi["longitudine"],
    },
    "openingHoursSpecification": [
        {"@type": "OpeningHoursSpecification", "dayOfWeek": row["zile"], "opens": row["deschide"], "closes": row["inchide"]}
        for row in dorohoi["program"]
    ],
    "hasMap": map_search,
}
if site_url:
    schema.update(url=site_url, hasMenu=site_url + "#meniu")
    if not illustrative:
        schema["image"] = urljoin(site_url, IMG + share["fisier"])
profiles = [links[key] for key in ("instagram", "facebook") if links[key]]
if profiles:
    schema["sameAs"] = profiles

nav = (("poveste", "Poveste"), ("meniu", "Meniu"), ("spatiul", "Spațiul"), ("locatii", "Locații"), ("contact", "Contact"))
social_keys = ("vPahare", "vLapte", "vCappuccino", "vCroissante", "terasaSeara", "cafea")
social_images = "".join(
    f'<a class="image-frame" href="{esc(social)}" aria-label="Deschide profilul CAF pe {social_label}">{image(key)}</a>'
    if social else f'<div class="image-frame">{image(key)}</div>'
    for key in social_keys
)

values = {
    "title": esc(f'{DATA["brand"]} — Cafenea în Dorohoi'),
    "brand": esc(DATA["brand"]),
    "description": esc(DATA["description"]),
    "shareUrl": esc(urljoin(site_url, IMG + share["fisier"])),
    "shareWidth": share["latime"],
    "shareHeight": share["inaltime"],
    "shareAlt": esc(share["alt"]) + (" · Imagine ilustrativă" if illustrative else ""),
    "canonical": f'<link rel="canonical" href="{esc(site_url)}"><meta property="og:url" content="{esc(site_url)}">' if site_url else "",
    "schema": js(schema),
    "schedule": js(dorohoi["program"]),
    "atelier": esc(DATA["atelier"]),
    "deschidere": esc(DATA["deschidere"]),
    "navigation": "".join(f'<a href="#{key}">{label}</a>' for key, label in nav),
    "directionsD": esc(maps("dir", dorohoi["cautareHarta"])),
    "directionsB": esc(maps("dir", botosani["cautareHarta"])),
    "mapSearch": esc(map_search),
    "mapUrl": esc(map_url),
    "videoUrl": f"https://www.youtube.com/watch?v={video_id}",
    "videoEmbed": f"https://www.youtube-nocookie.com/embed/{video_id}?autoplay=1&amp;playsinline=1&amp;rel=0",
    "videoTitle": esc(video["titlu"]),
    "videoCredit": esc(video["credit"]),
    "heroVideoLat": esc(video["lat"]),
    "heroVideoMobil": esc(video["mobil"]),
    "heroPosterLat": esc(video["latPoster"]),
    "heroPosterMobil": esc(video["mobilPoster"]),
    "reviewsUrl": esc(links["recenzii"] or map_search),
    "reviewsRating": (
        f'<p class="reviews-rating"><strong>{esc(rating["scor"])} din 5</strong>'
        f' · {esc(rating["numar"])} de evaluări pe Google Maps</p>'
        if rating else ""
    ),
    "reviewsNote": '<p class="reviews-note">Selecție de recenzii rezumate</p>'
    if any(item and "rezumat" in item for item in DATA["recenzii"]) else "",
    "addressD": esc(dorohoi["adresa"]),
    "addressB": esc(botosani["adresa"]),
    "landmark": esc(dorohoi["reper"]),
    "phone": esc(dorohoi["telefon"]),
    "tel": "tel:" + re.sub(r"[^\d+]", "", dorohoi["telefon"]),
    "scheduleLabelD": esc(schedule_label(dorohoi["program"])),
    "scheduleLabelB": esc(schedule_label(botosani["program"])),
    "heroIllustration": '<figcaption class="hero-credit">Imagine ilustrativă</figcaption>' if illustrative else "",
    "illustrationSuffix": " · Imagine ilustrativă" if illustrative else "",
    "storyImage": image("atelier"),
    "storyDetail": image("cafea"),
    "arrowDown": arrow("M12 4v15m-6-6 6 6 6-6"),
    "arrowOut": arrow("M6 18 18 6M7 6h11v11"),
    "favorites": favorites_section(),
    "woodImages": "".join(figure(key) for key in ("fibra", "lumina", "terasa")),
    "woodNote": '<p class="caption">Imagini ilustrative</p>' if illustrative else "",
    "menuNotice": '<p class="sample-note">Exemplu de meniu și prețuri. Oferta actuală se confirmă la cafenea.</p>' if DATA["meniuExemplu"] else "",
    "menuNavigation": "".join(f'<a href="#meniu-{esc(row["id"])}">{esc(row["nume"])}</a>' for row in DATA["meniu"]),
    "menuPanels": "".join(menu_panel(row) for row in DATA["meniu"]),
    "menuImage": image("vEspresso"),
    "menuCaption": esc(DATA["imagini"]["vEspresso"]["titlu"]),
    "gallery": "".join(gallery_tile(key) for key in ("hero", "fereastra", "exterior", "terasaSeara", "vVitrina", "espresso")),
    "galleryInitial": esc(IMG + DATA["imagini"]["hero"]["fisier"]),
    "galleryNote": '<p class="caption">Imagini ilustrative · [COMPLETEAZĂ] Fotografii reale ale cafenelei</p>' if illustrative else "",
    "reviews": "".join(review(item) for item in DATA["recenzii"] if item),
    "instagramImages": social_images,
    "socialLink": f'<a class="text-link" href="{esc(social)}">{social_label} <span aria-hidden="true">↗</span></a>' if social else '<p class="caption">Instagram [COMPLETEAZĂ]</p>',
    "socialNote": '<p class="caption">Imagini ilustrative</p>' if illustrative else "",
    "contactLinks": contact_links(links),
    "photoCredits": '<p class="photo-credits">Fotografii din ' + " · ".join(
        f'<a href="{esc(source["url"])}">{esc(source["nume"])}</a>' for source in DATA["surseFoto"]
    ) + '</p>' if DATA["surseFoto"] else "",
    "year": date.today().year,
}
template = (SOURCE / "pagina.html").read_text(encoding="utf-8")
page = re.sub(r"\{\{(\w+)\}\}", lambda match: str(values[match[1]]), template)
(ROOT / "index.html").write_text(page, encoding="utf-8", newline="\n")

robots = "User-agent: *\nAllow: /\n"
if site_url:
    robots += f"Sitemap: {site_url}sitemap.xml\n"
    sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    sitemap += f"<url><loc>{esc(site_url)}</loc></url></urlset>\n"
    (ROOT / "sitemap.xml").write_text(sitemap, encoding="utf-8", newline="\n")
else:
    (ROOT / "sitemap.xml").unlink(missing_ok=True)
(ROOT / "robots.txt").write_text(robots, encoding="utf-8", newline="\n")
