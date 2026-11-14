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
        return "Programul îl găsești pe Google Maps"
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


def frame(key, extra=""):
    return f'<div class="image-frame depth{extra}">{image(key)}</div>'


def figure(key, extra=""):
    return f'<figure class="wood-figure{extra}">{frame(key)}<figcaption>{esc(DATA["imagini"][key]["titlu"])}</figcaption></figure>'


def gallery_tile(key, index):
    item = DATA["imagini"][key]
    caption = item["titlu"]
    if DATA["fotografiiIlustrative"]:
        caption += " · Imagine ilustrativă"
    return (
        f'<a class="gallery-item g{index} image-frame depth" href="{esc(IMG + item["fisier"])}" '
        f'data-caption="{esc(caption)}" aria-label="Mărește imaginea. {esc(caption)}">'
        f'{image(key)}<span class="gallery-caption">{esc(caption)}</span></a>'
    )


def menu_tab(category, index):
    category_id = esc(category["id"])
    return (
        f'<button type="button" class="menu-tab" role="tab" id="fila-{category_id}" '
        f'aria-controls="meniu-{category_id}" aria-selected="{"true" if index == 0 else "false"}" '
        f'tabindex="{0 if index == 0 else -1}" data-category="{category_id}">'
        f'<span class="tab-index">{index + 1:02d}</span>'
        f'<span class="tab-name">{esc(category["nume"])}</span>'
        f'<span class="tab-count">{len(category["produse"])}</span></button>'
    )


def menu_visual(category, index):
    key = category.get("imagine")
    if key not in DATA["imagini"]:
        return ""
    active = " is-active" if index == 0 else ""
    return f'<div class="menu-visual-item{active}" data-category="{esc(category["id"])}">{image(key)}</div>'


def menu_panel(category):
    category_id = esc(category["id"])
    rows = []
    for product in category["produse"]:
        price = product["pret"]
        amount = (f"{price:g}".replace(".", ",") + " lei") if price is not None else "La cerere"
        featured = '<span class="favorite">Preferata casei</span>' if product.get("preferat") else ""
        rows.append(
            f'<li class="dish"><div class="dish-line"><h4>{esc(product["nume"])}</h4>'
            f'<span class="dish-leader" aria-hidden="true"></span><span class="price">{amount}</span></div>'
            f'<p>{esc(product["descriere"])}{featured}</p></li>'
        )
    return (
        f'<section class="menu-panel" role="tabpanel" id="meniu-{category_id}" aria-labelledby="fila-{category_id}">'
        f'<h3 class="menu-panel-title">{esc(category["nume"])}</h3><ul>{"".join(rows)}</ul></section>'
    )


def review(item):
    if "rezumat" in item:
        return (
            f'<article class="review"><p class="review-summary">{esc(item["rezumat"])}</p>'
            f'<a class="review-author" href="{esc(item["url"])}">{esc(item["autor"])}, pe Google Maps</a></article>'
        )
    return f'<figure class="review"><blockquote>{esc(item["text"])}</blockquote><figcaption>{esc(item["autor"])}</figcaption></figure>'


def contact_links(links):
    channels = []
    for key in ("instagram", "facebook", "email"):
        value = links[key]
        if value:
            href = "mailto:" + value if key == "email" else value
            channels.append(f'<a href="{esc(href)}">{key.capitalize()}</a>')
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
    "videoCredit": esc(video["credit"]),
    "heroVideoLat": esc(video["lat"]),
    "heroVideoMobil": esc(video["mobil"]),
    "heroPosterLat": esc(video["latPoster"]),
    "heroPosterMobil": esc(video["mobilPoster"]),
    "reviewsUrl": esc(links["recenzii"] or map_search),
    "reviewsRating": (
        f'<p class="reviews-rating"><strong>{esc(rating["scor"])} / 5</strong>'
        f' din {esc(rating["numar"])} de păreri pe Google Maps</p>'
        if rating else ""
    ),
    "reviewsNote": '<p class="reviews-note">Am rezumat câteva recenzii de pe Google Maps. Le găsești întregi la link.</p>'
    if any(item and "rezumat" in item for item in DATA["recenzii"]) else "",
    "addressD": esc(dorohoi["adresa"]),
    "addressB": esc(botosani["adresa"]),
    "landmark": esc(dorohoi["reper"]),
    "phone": esc(dorohoi["telefon"]),
    "tel": "tel:" + re.sub(r"[^\d+]", "", dorohoi["telefon"]),
    "scheduleLabelD": esc(schedule_label(dorohoi["program"])),
    "scheduleLabelB": esc(schedule_label(botosani["program"])),
    "heroIllustration": '<figcaption class="hero-credit">Imagine ilustrativă</figcaption>' if illustrative else "",
    "arrowDown": arrow("M12 4v15m-6-6 6 6 6-6"),
    "arrowOut": arrow("M6 18 18 6M7 6h11v11"),
    "menuNotice": '<p class="sample-note">Meniul de aici e orientativ. Prețurile exacte le afli la bar.</p>' if DATA["meniuExemplu"] else "",
    "galleryInitial": esc(IMG + DATA["imagini"]["hero"]["fisier"]),
    "reviews": "".join(review(item) for item in DATA["recenzii"] if item),
    "contactLinks": contact_links(links),
    "storyLarge": frame("atelier", " story-large"),
    "storySmall": frame("cafea", " story-small"),
    "woodImages": "".join(figure(key, f" w{i}") for i, key in enumerate(("fibra", "lumina", "terasa"))),
    "menuTabs": "".join(menu_tab(row, i) for i, row in enumerate(DATA["meniu"])),
    "menuPanels": "".join(menu_panel(row) for row in DATA["meniu"]),
    "menuVisuals": "".join(menu_visual(row, i) for i, row in enumerate(DATA["meniu"])),
    "gallery": "".join(gallery_tile(key, i) for i, key in enumerate(("hero", "fereastra", "exterior", "terasaSeara", "vLapte"))),
    "socialLink": f'<a class="text-link" href="{esc(social)}">Urmărește-ne pe {social_label} {arrow("M6 18 18 6M7 6h11v11")}</a>' if social else "",
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
