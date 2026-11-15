# Energy Management: strona główna

Statyczny HTML/CSS/JS (bez frameworka) i jedna funkcja serverless Vercel dla formularza.

```
index.html          cała treść strony (SEO: wszystko istotne jest w HTML, nie w canvas)
styles.css          wygląd strony
app.js              interakcje: hero, oscyloskop, usługi, eksplorator, formularz
grid.js             model przebiegu napięcia (symulacja do oscyloskopu)
hero3d.js           turbina 3D (three.js z CDN); bez WebGL zostaje assets/hero-poster.jpg
scrollcraft.js/.css silnik przewijania (nie modyfikować bez potrzeby)
api/contact.js      POST /api/contact → e-mail przez Resend
scripts/dev.mjs     lokalny podgląd z działającym /api/contact
scripts/test-contact.mjs  testy endpointu (mock dostawcy poczty)
robots.txt, sitemap.xml, vercel.json, .env.example
```

## Uruchomienie lokalne

Wymaga Node.js 18+. Nie ma zależności do instalowania.

```bash
npm run dev        # http://localhost:4530
npm test           # 14 testów endpointu formularza
```

Bez pliku `.env.local` formularz odpowiada „nie jest jeszcze podłączony” (HTTP 503). To zamierzone: strona nigdy nie pokazuje sukcesu bez potwierdzenia wysyłki z serwera.

## Formularz: status NIEGOTOWY (wymaga konfiguracji)

Kod jest gotowy. Do działania potrzebne są konto Resend i zweryfikowana domena nadawcza.

1. Załóż konto na https://resend.com (plan darmowy: 3000 maili/mies.).
2. **Domains → Add domain** → `energymgmt.pl`. Dodaj u dostawcy DNS rekordy, które poda Resend (SPF/DKIM). Poczekaj na status *Verified*.
3. **API Keys → Create** (uprawnienie *Sending access*).
4. W Vercel: **Project → Settings → Environment Variables** (Production, opcjonalnie Preview):
   - `RESEND_API_KEY` = klucz z punktu 3
   - `CONTACT_TO` = `info@energymgmt.pl` (można podać kilka adresów po przecinku)
   - `CONTACT_FROM` = `Formularz Energy Management <formularz@energymgmt.pl>` (adres w zweryfikowanej domenie)
   - opcjonalnie `ALLOWED_ORIGINS` = `https://www.energymgmt.pl,https://energymgmt.pl`
5. **Redeploy**, wyślij testowe zapytanie i sprawdź skrzynkę. Odpowiedź „Odpowiedz” w mailu trafia do osoby, która wypełniła formularz (`reply_to`).

Zabezpieczenia: walidacja po stronie serwera, limity długości pól, honeypot (ukryte pole `website`), pułapka czasowa (odrzuca wysyłkę szybszą niż 2,5 s od wejścia), limit 5 zapytań na IP na 10 minut (w obrębie jednej instancji, bez zewnętrznej bazy), escapowanie HTML w treści maila i brak sekretów we frontendzie. Bez JavaScriptu formularz wysyła się zwykłym POST-em i dostaje prostą stronę z wynikiem.

Gdy spam zacznie przechodzić, kolejnym krokiem jest Cloudflare Turnstile. Wymaga osobnego klucza, więc nie jest włączony.

## Wdrożenie na Vercel

1. Wypchnij repo na GitHub, potem **Vercel → Add New → Project → Import**.
2. Framework preset: **Other**. Build command: puste. Output directory: puste (katalog główny).
3. Ustaw zmienne środowiskowe (sekcja wyżej) i wdróż.
4. Po podłączeniu domeny (Settings → Domains) zrób w kodzie:
   - `index.html`: odkomentuj blok „DO UZUPEŁNIENIA PO POTWIERDZENIU DOMENY” (canonical, og:url, og:image z pełnym adresem). Usuń wtedy względny `og:image`.
   - `sitemap.xml`: zamień `DOMENA` na domenę.
   - `robots.txt`: odkomentuj linię `Sitemap:`.
   - Vercel: ustaw przekierowanie wersji bez `www` na `www` (lub odwrotnie).

`vercel.json` dodaje `X-Robots-Tag: noindex` na wszystkich adresach `*.vercel.app`. Podgląd nie trafi więc do Google jako duplikat strony produkcyjnej. Na własnej domenie nagłówka nie ma.

## Zmiana treści

- Usługi: `index.html`, sekcja `#uslugi`. Każda usługa to para `h3.svc__h` + `div.svc__body`. Nowa usługa wymaga też nowej opcji w `<select id="f-topic">` i w zbiorze `TOPICS` w `api/contact.js`.
- Punkty pomiarowe: `index.html`, sekcja `#obiekty`. Lista `ol.site__list` w każdym panelu jest źródłem danych. Znaczniki `.spot` (pozycja w %) muszą mieć tę samą kolejność co lista.
- Długość przewijania hero i oscyloskopu: `data-sc-span` w HTML **oraz** te same wartości w `styles.css` (`html.js #obiekt`, `html.js #pomiar`). Inaczej wraca przesunięcie układu (CLS).
