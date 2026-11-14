# CAF coffee&more · Dorohoi

Deschide `index.html` în browser pentru previzualizare. Pagina, imaginile, fonturile și animațiile funcționează local. Harta și filmarea au nevoie de internet. Dintr-un fișier local clipul se deschide pe YouTube. Pe site-ul servit prin HTTP sau HTTPS clipul pornește în pagină. Pentru a testa local playerul, rulează `python -m http.server 8080 --bind 127.0.0.1` din acest folder și deschide `http://127.0.0.1:8080/`.

## Actualizare

Datele editabile sunt în `sursa/date-site.json`. După modificări, rulează `python sursa/genereaza.py` din acest folder. Comanda actualizează `index.html`, `robots.txt` și, când adaugi domeniul public, `sitemap.xml`.

O categorie cu o cheie `fotografie` din `imagini` apare și la „Cafea și ceva bun”, cu link spre categoria ei.

Sursele animațiilor sunt în `sursa/motion/`. Pentru a recompila, rulează `npm ci` și `npm run build` din acel folder. Site-ul include deja fișierul compilat. Lenis îndulcește derularea cu mouse-ul, GSAP animă fotografiile, iar componenta Animated Content de la React Bits intră odată cu secțiunea filmului. Preferința pentru mișcare redusă dezactivează aceste efecte.

## Înainte de lansare

1. Fotografiile actuale arată locația CAF de pe Bulevardul Victoriei. Confirmă acordul pentru republicarea fotografiilor din presă înainte de lansare sau folosește fișierele autorizate furnizate de CAF. Dacă schimbi fotografiile, actualizează `imagini`, `surseFoto` și imaginea de distribuire.
2. Completează meniul și prețurile reale. Setează `meniuExemplu` la `false` după confirmare.
3. Verifică scorul și numărul de evaluări de pe Google Maps în `evaluareGoogle`. Cele trei recenzii afișate au `rezumat`, `autor` și `url` către original. Pentru citate literale, folosește `text` după acordul autorului.
4. Confirmă programul de la Botoșani și adaugă profilul Instagram și adresa de email. Zona „Urmărește-ne” duce spre pagina CAF Dorohoi de pe Facebook până când configurezi Instagram.
5. Adaugă adresa finală în `publicUrl` pentru linkul canonic, previzualizarea de distribuire și sitemap. Regenerează pagina și publică `index.html`, `assets/`, `robots.txt` și `sitemap.xml` la rădăcina site-ului. Verifică pe domeniul final linkurile către Google Maps și previzualizarea de distribuire.

## Date și referințe

- Fotografii din [Botoșăneanul](https://www.botosaneanul.ro/o-poveste-pornita-de-la-botosani-3-ani-de-caf-cu-stil-trei-cafenele-sub-acelasi-brand-in-trei-orase) și din galeriile Dorohoi News de la [inaugurare](https://www.dorohoinews.ro/informatii_utile-4707-CAF-Dorohoi-%E2%80%93-Savureaza-o-cafea-sau-o-gustare-si-relaxeaza-te-la-cea-mai-noua-cafenea-din-oras-%E2%80%93-VIDEO---FOTO.html) și [deschiderea gelateriei cu terasa extinsă](https://www.dorohoinews.ro/informatii_utile-5022-Oaza-ta-de-relaxare-se-transforma--CAF-Dorohoi-deschide-GELATERIE-ARTIZANALA-cu-specific-italian!.html).
- Deschiderea în Dorohoi și proiectul ArtLegno. [Dorohoi News](https://www.dorohoinews.ro/informatii_utile-4705-CAF---O-noua-cafenea-cu-atmosfera-relaxanta-si-placut-se-deschide-la-Dorohoi.html)
- Adresa și contactul din Dorohoi. [Fișa cafenelei](https://fr.restaurantguru.com/CAF-coffeeandmore-Dorohoi)
- Adresa din Botoșani. [Visit Botoșani](https://visitbotosani.ro/gastronomie/caf)
- Filmarea inaugurării. [DorohoiNews Stiri](https://www.youtube.com/watch?v=doRFsG95dz8)
- Animații. [GSAP](https://gsap.com/) · [Lenis](https://github.com/darkroomengineering/lenis) · [React Bits Animated Content](https://www.reactbits.dev/animations/animated-content)
- Cormorant Garamond și DM Sans sunt găzduite local. Licențele sunt în `assets/fonts/`.
