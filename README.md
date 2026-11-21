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

Wymaga Node.js 18+. Przed pierwszym uruchomieniem: `npm install` (jedna zależność: nodemailer).

```bash
npm run dev        # http://localhost:4530
npm test           # 19 testów endpointu formularza (SMTP i Resend, z atrapą serwera poczty)
```

Bez pliku `.env.local` formularz odpowiada „nie jest jeszcze podłączony” (HTTP 503). To zamierzone: strona nigdy nie pokazuje sukcesu bez potwierdzenia wysyłki z serwera.

## Formularz

Formularz wysyła maile na dwa sposoby. Wystarczy skonfigurować jeden.

### Sposób A (domyślny): skrzynka firmy w home.pl, przez SMTP

Bez dodatkowych usług i opłat. Mail wychodzi z istniejącej skrzynki w domenie energymgmt.pl.

Zmienne w Vercel (Project → Settings → Environment Variables, Production):

| Zmienna | Wartość |
|---|---|
| `SMTP_HOST` | `cloudserver3223481-3223512.home.pl` (ustawione) |
| `SMTP_PORT` | `465` (ustawione) |
| `ALLOWED_ORIGINS` | `https://www.energymgmt.pl,https://energymgmt.pl` (ustawione) |
| `SMTP_USER` | pełny adres skrzynki, z której idą maile, np. `formularz@energymgmt.pl` lub `info@energymgmt.pl` |
| `SMTP_PASS` | hasło tej skrzynki (wpisuje właściciel, nikomu go nie podaje) |
| `CONTACT_TO` | opcjonalnie: gdzie mają trafiać zapytania (domyślnie na `SMTP_USER`), kilka adresów po przecinku |

Po dodaniu zmiennych: Deployments → ⋯ → **Redeploy**. Przycisk „Odpowiedz” w otrzymanym mailu odpisuje osobie z formularza.

Najlepiej założyć w panelu home.pl osobną skrzynkę `formularz@energymgmt.pl`. Wtedy hasło głównej skrzynki nie trafia do Vercela, a zapytania można przekierować na info@ w ustawieniach poczty lub przez `CONTACT_TO`.

### Sposób B: Resend (alternatywa)

`RESEND_API_KEY`, `CONTACT_TO`, `CONTACT_FROM` (nadawca w domenie zweryfikowanej w Resend). Darmowy plan Resend: 3000 maili miesięcznie.

### Zabezpieczenia

- walidacja po stronie serwera i limity długości pól
- honeypot (ukryte pole `website`)
- pułapka czasowa (odrzuca wysyłkę szybszą niż 2,5 s od wejścia)
- limit 5 zapytań na IP na 10 minut (w obrębie jednej instancji)
- lista dozwolonych domen (`ALLOWED_ORIGINS`)
- escapowanie HTML w treści maila
- brak sekretów we frontendzie

Sukces pokazuje się tylko, gdy serwer poczty przyjmie wiadomość. Bez konfiguracji formularz odpowiada „nie jest jeszcze podłączony” i podaje adres mailowy. Bez JavaScriptu formularz wysyła się zwykłym POST-em i dostaje prostą stronę z wynikiem.

## Wdrożenie na Vercel

1. Wypchnij repo na GitHub, potem **Vercel → Add New → Project → Import**.
2. Framework preset: **Other**. Build command: puste. Output directory: puste (katalog główny).
3. Ustaw zmienne środowiskowe (sekcja wyżej) i wdróż.
4. Domena:
   Zrobione 21.11.2026 dla `https://www.energymgmt.pl` (canonical, og:url, og:image, sitemap, robots, przekierowanie `energymgmt.pl` → `www`).

`vercel.json` dodaje `X-Robots-Tag: noindex` na wszystkich adresach `*.vercel.app`. Podgląd nie trafi więc do Google jako duplikat strony produkcyjnej. Na własnej domenie nagłówka nie ma.

## Zmiana treści

- Usługi: `index.html`, sekcja `#uslugi`. Każda usługa to para `h3.svc__h` + `div.svc__body`. Nowa usługa wymaga też nowej opcji w `<select id="f-topic">` i w zbiorze `TOPICS` w `api/contact.js`.
- Punkty pomiarowe: `index.html`, sekcja `#obiekty`. Lista `ol.site__list` w każdym panelu jest źródłem danych. Znaczniki `.spot` (pozycja w %) muszą mieć tę samą kolejność co lista.
- Długość przewijania hero i oscyloskopu: `data-sc-span` w HTML **oraz** te same wartości w `styles.css` (`html.js #obiekt`, `html.js #pomiar`). Inaczej wraca przesunięcie układu (CLS).
