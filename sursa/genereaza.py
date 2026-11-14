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
        return "Program [DE COMPLETAT]"
    lines = []
    for entry in schedule:
        days = entry["zile"]
        label = "Zilnic" if set(days) == set(DAY_LABELS) else ", ".join(DAY_LABELS[day] for day in days)
        lines.append(f'{label}, {entry["deschide"]}–{entry["inchide"]}')
    return " · ".join(lines)


def variants(file_name, width, ext):
    """Lista srcset pentru fișierele create de optimizeaza_imagini.py (doar cele existente)."""
    stem = file_name.rsplit(".", 1)[0]
    items = []
    for size in (480, 960):
        if (ROOT / IMG / f"{stem}-{size}{ext}").exists():
            items.append(f"{IMG}{stem}-{size}{ext} {size}w")
    if (ROOT / IMG / f"{stem}{ext}").exists():
        items.append(f"{IMG}{stem}{ext} {width}w")
    return ", ".join(items)


def image(key, *, hero=False, sizes="(min-width: 900px) 45vw, 100vw"):
    item = DATA["imagini"][key]
    alt = item["alt"]
    if DATA["fotografiiIlustrative"]:
        alt = "Imagine ilustrativă. " + alt
    loading = 'fetchpriority="high"' if hero else 'loading="lazy" decoding="async"'
    avif = variants(item["fisier"], item["latime"], ".avif")
    webp = variants(item["fisier"], item["latime"], ".webp") if item["fisier"].endswith(".webp") else ""
    img = (
        f'<img src="{esc(IMG + item["fisier"])}"' + (f' srcset="{esc(webp)}" sizes="{sizes}"' if webp else "")
        + f' width="{item["latime"]}" height="{item["inaltime"]}" alt="{esc(alt)}" {loading}>'
    )
    if not avif:
        return img
    return f'<picture><source type="image/avif" srcset="{esc(avif)}" sizes="{sizes}">{img}</picture>'


def frame(key, extra="", sizes="(min-width: 900px) 45vw, 100vw"):
    return f'<div class="image-frame depth{extra}">{image(key, sizes=sizes)}</div>'


def figure(key, extra=""):
    return f'<figure class="wood-figure{extra}">{frame(key, sizes="(min-width: 640px) 30vw, 100vw")}<figcaption>{esc(DATA["imagini"][key]["titlu"])}</figcaption></figure>'


def gallery_tile(key, index):
    item = DATA["imagini"][key]
    caption = item["titlu"]
    if DATA["fotografiiIlustrative"]:
        caption += " · Imagine ilustrativă"
    return (
        f'<a class="gallery-item g{index} image-frame depth" href="{esc(IMG + item["fisier"])}" '
        f'data-caption="{esc(caption)}" aria-label="Mărește imaginea. {esc(caption)}">'
        f'{image(key, sizes="(min-width: 640px) 60vw, 50vw")}<span class="gallery-caption">{esc(caption)}</span></a>'
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
    return f'<div class="menu-visual-item{active}" data-category="{esc(category["id"])}">{image(key, sizes="25vw")}</div>'


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
    # Recenziile se afișează exact cum sunt în date-site.json, cu linkul spre Google.
    if "rezumat" in item:
        author = esc(item["autor"])
        return (
            f'<article class="review"><p class="review-summary">{esc(item["rezumat"])}</p>'
            f'<a class="review-author" href="{esc(item["url"])}">{author} · Google Maps</a></article>'
        )
    return f'<figure class="review"><blockquote>{esc(item["text"])}</blockquote><figcaption>{esc(item["autor"])}</figcaption></figure>'


def contact_links(links):
    channels = []
    if links.get("whatsapp"):
        channels.append(f'<a href="https://wa.me/{esc(re.sub(r"[^0-9]", "", links["whatsapp"]))}">WhatsApp</a>')
    if links.get("email"):
        channels.append(f'<a href="mailto:{esc(links["email"])}">E-mail</a>')
    for key in ("instagram", "facebook"):
        if links.get(key):
            channels.append(f'<a href="{esc(links[key])}">{key.capitalize()}</a>')
    return '<ul class="contact-links">' + "".join(f"<li>{channel}</li>" for channel in channels) + "</ul>"


def contact_buttons(links):
    """Butoanele de lângă telefon. Apar doar când datele sunt completate."""
    buttons = []
    if links.get("whatsapp"):
        number = re.sub(r"[^0-9]", "", links["whatsapp"])
        buttons.append(f'<a class="chip" href="https://wa.me/{esc(number)}">WhatsApp</a>')
    if links.get("email"):
        buttons.append(f'<a class="chip" href="mailto:{esc(links["email"])}">E-mail</a>')
    return "".join(buttons)


def phone_link(number):
    if not number:
        return '<span class="todo">Telefon [DE COMPLETAT]</span>'
    return f'<a class="location-phone" href="tel:{re.sub(r"[^0-9+]", "", number)}">{esc(number)}</a>'


def map_embed(place):
    if place.get("latitudine") is not None:
        query = f'{place["latitudine"]},{place["longitudine"]}'
    else:
        query = place["cautareHarta"]
    return f"https://www.google.com/maps?q={quote(query)}&z=16&output=embed&hl=ro"


def shop_schema(place, *, primary):
    shop = {
        "@type": "CafeOrCoffeeShop",
        "name": f'{DATA["brand"]} {place["oras"]}',
        "address": {
            "@type": "PostalAddress",
            "streetAddress": place["adresa"],
            "addressLocality": place["oras"],
            "addressRegion": "Botoșani",
            "addressCountry": "RO",
        },
        "hasMap": maps("search", place["cautareHarta"]),
    }
    if primary:
        shop["description"] = DATA["description"]
    if place.get("telefon"):
        shop["telephone"] = place["telefon"]
    if place.get("latitudine") is not None:
        shop["geo"] = {"@type": "GeoCoordinates", "latitude": place["latitudine"], "longitude": place["longitudine"]}
    if place.get("program"):
        shop["openingHoursSpecification"] = [
            {"@type": "OpeningHoursSpecification", "dayOfWeek": row["zile"], "opens": row["deschide"], "closes": row["inchide"]}
            for row in place["program"]
        ]
    return shop


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
main_shop = shop_schema(dorohoi, primary=True)
second_shop = shop_schema(botosani, primary=False)
schema = {"@context": "https://schema.org", "@graph": [main_shop, second_shop]}
if site_url:
    for shop in (main_shop, second_shop):
        shop.update(url=site_url, hasMenu=site_url + "#meniu")
        if not illustrative:
            shop["image"] = urljoin(site_url, IMG + share["fisier"])
profiles = [links[key] for key in ("instagram", "facebook") if links.get(key)]
if profiles:
    main_shop["sameAs"] = profiles

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
    "heroImage": image("hero", hero=True, sizes="100vw").removeprefix("<picture>").removesuffix("</picture>"),
    "heroDesktopAvif": esc(variants(DATA["imagini"]["hero"]["fisier"], DATA["imagini"]["hero"]["latime"], ".avif")),
    "heroMobileAvif": esc(variants(DATA["imagini"]["hero"]["mobil"], DATA["imagini"]["hero"]["latimeMobil"], ".avif")),
    "heroMobileSet": esc(variants(DATA["imagini"]["hero"]["mobil"], DATA["imagini"]["hero"]["latimeMobil"], ".webp")),
    "heroDesktop": esc(IMG + DATA["imagini"]["hero"]["fisier"]),
    "heroMobile": esc(IMG + DATA["imagini"]["hero"]["mobil"]),
    "heroMobileWidth": DATA["imagini"]["hero"]["latimeMobil"],
    "heroMobileHeight": DATA["imagini"]["hero"]["inaltimeMobil"],
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
    "galleryInitial": esc(IMG + DATA["imagini"]["fereastra"]["fisier"]),
    "reviews": "".join(review(item) for item in DATA["recenzii"] if item),
    "contactLinks": contact_links(links),
    "contactButtons": contact_buttons(links),
    "phoneD": phone_link(dorohoi["telefon"]),
    "phoneB": phone_link(botosani.get("telefon")),
    "mapD": esc(links["harta"] or map_embed(dorohoi)),
    "mapB": esc(map_embed(botosani)),
    "storyLarge": frame("atelier", " story-large", "(min-width: 900px) 40vw, 80vw"),
    "storySmall": frame("cafea", " story-small", "(min-width: 900px) 24vw, 45vw"),
    "woodImages": "".join(figure(key, f" w{i}") for i, key in enumerate(("fibra", "lumina", "terasa"))),
    "menuTabs": "".join(menu_tab(row, i) for i, row in enumerate(DATA["meniu"])),
    "menuPanels": "".join(menu_panel(row) for row in DATA["meniu"]),
    "menuVisuals": "".join(menu_visual(row, i) for i, row in enumerate(DATA["meniu"])),
    "gallery": "".join(gallery_tile(key, i) for i, key in enumerate(("fereastra", "exterior", "terasaSeara", "vLapte"), start=1)),
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
