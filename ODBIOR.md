# Energy Management: modernizacja strony, protokół odbioru (15.11.2026)

Kod wyjściowy: `energy-strona2-main (2).zip` (identyczny z wersją na https://energy-strona2-bv7m.vercel.app/). Pierwszy commit w repozytorium roboczym to nietknięty stan wyjściowy, więc każdą zmianę można porównać przez `git diff`.

Zrzutów ekranu od klienta (drugi ZIP) nie było w materiałach, więc stan „przed” oceniłem na żywej wersji uruchomionej lokalnie.

## A. Audyt: najważniejsze problemy

| # | Problem | Plik | Status | Priorytet |
|---|---|---|---|---|
| 1 | Formularz udawał wysyłkę: `setTimeout` 700 ms i komunikat „zapytanie przyjęte” bez żadnego żądania do serwera | app.js | potwierdzony w kodzie | P0 |
| 2 | Bez JavaScriptu cała treść poza hero była niewidoczna (`[data-sc-in] { opacity: 0 }` zdejmuje dopiero skrypt) | scrollcraft.css | potwierdzony testem | P1 |
| 3 | CLS ok. 1,0 na telefonie: przed startem silnika scena hero ma 0 px, a następna sekcja wskakuje na górę ekranu | styles.css / silnik | potwierdzony Lighthouse | P1 |
| 4 | Hero: drugi komunikat `.hero__beat` i pin 1,8 ekranu z pustym etapem po zniknięciu nagłówka | index.html, app.js | potwierdzony | P1 |
| 5 | Oscyloskop: 3,4 ekranu przewijania, 4 kroki, brak oznaczenia, że to symulacja | index.html, app.js | potwierdzony | P1 |
| 6 | Usługi: 9 dużych akordeonów (do 3 rem) z animowanym SVG, sekcja rozpychała się przy każdym kliknięciu | index.html, styles.css | potwierdzony | P1 |
| 7 | Proces: poziomy „pan” na 3 ekrany dla 4 krótkich kroków; szyna wychodziła poza ekran (overflow elementów przy 1024–1920 px) | index.html, styles.css | potwierdzony pomiarem | P1 |
| 8 | Eksplorator: małe pulsujące kropki bez numerów, opis zmieniany tylko kliknięciem/hoverem, brak listy punktów na telefonie, cienkie linie SVG | index.html, styles.css | potwierdzony | P1 |
| 9 | Nagłówek przezroczysty nad treścią: logo nachodziło na nagłówki sekcji | styles.css | potwierdzony zrzutami | P1 |
| 10 | Wydajność: CSS fontów blokuje render, H1 (element LCP) startował z `opacity: 0`, loga PNG 130 KB wyświetlane w 46 px | index.html, styles.css, assets | potwierdzony Lighthouse | P1 |
| 11 | SEO/techniczne: brak robots.txt, sitemap, JSON-LD, obrazu OG, apple-touch-icon; favicon 155 KB; kopia na `*.vercel.app` indeksowalna | – | potwierdzony | P1 |
| 12 | Dostępność: brak „Przejdź do treści”, etykiety formularza tylko w spanach, błędy pól bez `aria-invalid`/`aria-describedby` | index.html | potwierdzony | P2 |

## B. Co zmieniono: przed → po (według sekcji)

**Hero**
- Przed: H1 + lead + CTA, potem drugi komunikat „Od rozdzielni…”, pin 1,8 ekranu.
- Po: tylko H1 „Mierzymy to, czego w sieci nie widać.”, skrócony lead i CTA „Poproś o ofertę” / „Poznaj usługi”. Pin 1,35 ekranu: nagłówek odjeżdża, a technicy i pierwszy plan przybliżają się przez cały czas trwania pinu.
- Usunięte z HTML, CSS i `heroTick()` (także z gałęzi reduced motion). Dodany delikatny scrim po lewej dla kontrastu.
- H1 maluje się od razu (LCP), animacja wejścia została tylko na leadzie i przyciskach.

**Problem**
- Sekcja ma `min-height` 60vh na desktopie (było 92vh), na telefonie wysokość według treści.
- Te same 3 problemy, krótsze zdania.

**Pomiar (oscyloskop)**
- Długość 2,2 ekranu (było 3,4), 3 kroki zamiast 4: przebieg, rozkład na harmoniczne, utrzymanie w limitach.
- Stały podpis „Symulacja poglądowa”.
- Na końcu CTA „Zapytaj o analizę jakości energii”, które wstępnie wybiera temat w formularzu.
- Limit THD 8% / EN 50160 pozostał na wykresie (do weryfikacji przez inżyniera).
- Na telefonie bez poświaty i z mniejszą liczbą próbek, żeby odciążyć GPU.

**Usługi**
- Desktop: lista 9 usług (40%) i jeden stały panel szczegółów (60%): tag, nazwa, 1–2 zdania, schemat i link „Zapytaj o usługę”. Panel nie rozpycha strony.
- Telefon: zwarty akordeon (przyciski 56 px, jedna pozycja otwarta).
- Obsługa klawiatury: strzałki góra/dół, Home/End, `aria-expanded`/`aria-controls`.
- Kolejność zgodna z mailem klienta, domyślnie otwarte „Testy NC RfG”.
- Model analizatora A.Eberle - PQ Box 150 jest wymieniony raz w usłudze i raz w procesie (wcześniej 5 razy).

**Zaufali nam** (przeniesione przed eksplorator; przeprojektowane 15.11)
- Kompaktowe karty z gradientową krawędzią: monogram (miejsce na logo klienta), nazwa i obiekt, krótki cytat, tagi zakresu.
- Pełny fragment po rozwinięciu.
- Animacja przy wejściu: smuga światła przez kartę. Hover unosi kartę. Przy reduced motion animacja jest wyłączona.
- 20.11: na prośbę klienta usunięte zielone pieczątki „OPNU uzyskane”.
- 21.11: dodana trzecia referencja: DOLMEB Sp. z o.o. (Świdnica), list z 16.11.2026; karty w 3 kolumnach na desktopie.
- Logotypów klientów nie dodałem: potrzebne pliki i zgoda (patrz lista od klienta).
- Cytaty dosłowne z listów. Skróty oznaczone „[…]”.

**Obiekty (eksplorator)**
- Nagłówek „Sprawdź, co mierzymy w Twoim obiekcie”.
- Numerowane znaczniki na schemacie i lista punktów w panelu (główna kontrolka, działa bez hovera i na telefonie).
- Szczegóły: tytuł, „Co sprawdzamy”, „Co zyskujesz”, „Zapytaj o ten obiekt” (wpisuje obiekt i temat do formularza) i „Zobacz usługę”.
- Grubsze linie, wyraźniejszy kontrast.
- Zakładki w standardzie ARIA tabs (strzałki, Home/End).
- Treść punktów jest w HTML (SEO, działa bez JS).
- Na tablecie szczegóły są pod schematem.

**Proces** (aktualizacja 15.11, na życzenie klienta)
- Przywrócony pełnoekranowy poziomy przejazd (pin 3 ekrany): kółko myszy przesuwa etapy w bok, a przewód „ładuje się” w trakcie.
- Dodane numery etapów 01–04.
- Na telefonie pionowa oś, ustawiona w CSS, więc bez przeskoku przy ładowaniu (CLS).

**Kontakt**
- Prawdziwa wysyłka (`/api/contact`).
- Etykiety `<label>`, pola 48 px, temat jako lista 9 usług + „Inne”, wymagane tylko imię i e-mail.
- Stany: „Wysyłanie…”, sukces wyłącznie po `ok:true` z serwera, błąd z „Spróbuj ponownie” i adresem mailowym.
- Brak polityki prywatności (czeka na treść od klienta). Informacja o administratorze danych bez obietnic zgodności.

**Całość**
- „Przejdź do treści”, nagłówek z tłem po zjechaniu z hero, fallback bez JS, CLS naprawiony, fonty nieblokujące.
- Loga 5,7 KB (było 130 KB), favicon 2,6 KB, OG 1200×630, JSON-LD, robots, sitemap, noindex na `*.vercel.app`.

## C. Zmienione pliki

- `index.html`: nowa struktura sekcji, kolejność (referencje przed eksploratorem), nowe copy, ARIA, formularz z etykietami i honeypotem, meta/OG/Twitter, JSON-LD Organization (nazwa, e-mail, adres ze stopki potwierdzonej mailem klienta z 21.10), skip link, nieblokujące fonty.
- `styles.css`: przepisane style sekcji usług, eksploratora, procesu, referencji i formularza; fallback no-JS; stałe wysokości pinów (CLS); nagłówek z tłem; breakpointy 1100/860/380 px; usunięte martwe style (`.meter`, `.hero__beat`, chips, kwit).
- `app.js`: hero bez `L.beat`; oscyloskop na 3 kroki; usługi master-detail/akordeon; eksplorator z listą punktów; usunięta logika pana; wysyłka `fetch` z timeoutem 15 s i rzetelnymi stanami; wstępne zaznaczanie tematu.
- `api/contact.js` (nowy): funkcja Vercel + Resend.
- `vercel.json`, `package.json`, `.env.example`, `.gitignore`, `robots.txt`, `sitemap.xml`, `favicon.ico` (nowe).
- `assets/`: nowe `logo-light-sm.png`, `logo-dark-sm.png`, `favicon-32.png`, `apple-touch-icon.png`, `og-image.jpg`. Oryginały zostały jako źródła.
- `scripts/dev.mjs`, `scripts/test-contact.mjs`, `README.md`, `ODBIOR.md` (nowe).
- Bez zmian: `scrollcraft.js`, `scrollcraft.css`, `grid.js`, `hero3d.js`, `BRIEF.md`.

## D. Wyniki testów (wykonane lokalnie, 15.11.2026)

**Endpoint formularza** (`npm test`, mock Resend): 14/14 OK. Pokryte przypadki:
- brak konfiguracji → 503 bez wysyłki
- GET → 405
- walidacja → 422
- honeypot → 400
- pułapka czasowa → 400
- sukces tylko z `id` dostawcy
- escapowanie HTML
- błąd dostawcy, brak `id` i awaria sieci → 502
- POST bez JS → strona HTML
- limit IP → 429

**Formularz w przeglądarce** (headless Chrome, lokalny serwer bez kluczy):
- Puste pola → komunikaty przy polach i fokus na pierwszym błędnym.
- Poprawne dane → „Formularz nie jest jeszcze podłączony… napisz na info@energymgmt.pl”, bez sukcesu.
- Podstawiona odpowiedź `{ok:true}` → sukces i reset pól.
- 200 bez `ok` oraz awaria sieci → błąd z „Spróbuj ponownie”.

**Rzeczywistej wysyłki NIE testowałem:** nie ma kluczy Resend ani zweryfikowanej domeny.

**Lighthouse 12**, lokalnie (localhost + gzip, throttling symulowany Lighthouse):

| | Perf | A11y | Best pr. | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| Przed, mobile | 65 | 100 | 100 | 100 | 3,3 s | 1,005 | 70 ms |
| Po, mobile (2 przebiegi) | 100 | 100 | 100 | 100 | 1,7 s | 0,004–0,01 | 40–60 ms |
| Przed, desktop | 74 | 100 | 100 | 100 | 0,8 s | 1,0 | 0 ms |
| Po, desktop | 100 | 100 | 100 | 100 | 0,4 s | 0 | 0 ms |

Po zmianach z 15.11 (poziomy proces, nowe referencje): mobile 99/100/100/100 (LCP 1,7 s, CLS 0,004–0,009), desktop 100/100/100/100.

Zastrzeżenia:
- Stara wersja była serwowana innym lokalnym serwerem (bez gwarancji kompresji), więc porównanie Perf jest orientacyjne. CLS i LCP H1 są porównywalne.
- Wyniki z Vercel/CDN i realnych telefonów mogą się różnić.
- INP i realne Core Web Vitals (dane polowe) nie były mierzone. Pojawią się w PageSpeed/CrUX po ruchu na domenie produkcyjnej.

**Długość przewijania** (po przywróceniu poziomego procesu 15.11: 1440 px → 11,3 ekranu, 390 px → 11,6; poniżej pomiar przed tą zmianą):
- 1440 px: 14,4 → 9,2 ekranu (−36%)
- 1920 px: 13,8 → 8,7
- 1024 px: 14,9 → 10,2
- 390 px: 14,2 → 11,9 (−16%)
- 320 px: 18,1 → 15,5

**Szerokości** 320, 375, 390, 430, 768, 1024, 1440, 1920: brak poziomego overflow. Zrzuty sprawdzone przy 320, 390, 900, 1440. Wszystkie elementy klikalne mają co najmniej 24 px (poza linkami w zdaniach, które WCAG wyłącza z tego wymogu).

**Pozostałe testy:**
- Klawiatura: strzałki w usługach otwierają kolejną pozycję, strzałki w zakładkach przełączają panel. Skip link działa. Jeden H1, H2 w kolejności sekcji.
- Kotwica „Poznaj usługi” przy przypiętym hero ląduje dokładnie na początku sekcji.
- Reduced motion: hero statyczne, oscyloskop zatrzymany w czasie, przejścia wyłączone, cała treść dostępna.
- Bez WebGL (zablokowany CDN three.js): zostaje plakat `hero-poster.jpg`, brak błędów.
- Bez JavaScriptu: 0 ukrytych elementów treści, 9 usług rozwiniętych, 5 obiektów z listami punktów, formularz wysyła się POST-em.
- Konsola: brak błędów JS. Jedyny wpis to oczekiwane 503 z niepodłączonego formularza.

**Nie dało się potwierdzić:**
- realnej wysyłki maila
- zachowania na fizycznych urządzeniach iOS/Android i w Safari (testy w Chrome z emulacją)
- czytnika ekranu (VoiceOver/NVDA)
- działania nagłówka `X-Robots-Tag` na Vercel (wymaga wdrożenia)
- poprawności merytorycznej opisów norm i usług

## Checklista testów manualnych (po wdrożeniu)

- [ ] iPhone (Safari) i Android (Chrome): przewinięcie całej strony, brak zacięć w hero i oscyloskopie
- [ ] „Poznaj usługi” i „Poproś o ofertę” z hero prowadzą do właściwych sekcji
- [ ] Usługi: desktop przełącza panel bez skoku strony, telefon otwiera jedną pozycję
- [ ] „Zapytaj o usługę” i „Zapytaj o ten obiekt” ustawiają temat w formularzu
- [ ] Eksplorator: każda z 5 zakładek, każdy punkt z listy i ze schematu
- [ ] „Pełny fragment referencji” rozwija się i zwija
- [ ] Formularz: puste pola → błędy; poprawne dane → mail w skrzynce `CONTACT_TO`; „Odpowiedz” trafia do nadawcy
- [ ] Formularz przy wyłączonym internecie → komunikat błędu i „Spróbuj ponownie”
- [ ] Tab/Shift+Tab po całej stronie: widoczny fokus, skip link
- [ ] `https://DOMENA/robots.txt` i `/sitemap.xml` po uzupełnieniu domeny; `curl -I https://…vercel.app` zwraca `x-robots-tag: noindex`
- [ ] Podgląd linku (Facebook Sharing Debugger / LinkedIn Post Inspector) po ustawieniu absolutnego `og:image`
- [ ] PageSpeed Insights na domenie produkcyjnej (mobile i desktop)

## Potrzebne od klienta

1. **Domena produkcyjna** (czy `www.energymgmt.pl`?) → canonical, og:url, og:image, sitemap, `ALLOWED_ORIGINS`.
2. **Formularz:** dostęp do DNS domeny (weryfikacja nadawcy w Resend) albo decyzja o innym dostawcy; adres odbiorcy (`info@energymgmt.pl`?).
3. **Dane firmy do potwierdzenia** w stopce i JSON-LD: nazwa, adres ul. Graniczna 9 lok. 23, e-mail. Czy dodać NIP/KRS/telefon?
4. **Referencje:** zgoda Kopalni Soli „Wieliczka” S.A., DP SOLAR Sp. z o.o. i DOLMEB Sp. z o.o. na publikację nazwy i cytatów oraz **pliki logotypów (SVG/PNG) ze zgodą na użycie**. W kodzie jest gotowe miejsce (`.ref__logo`), dziś pokazuje monogramy KSW i DP.
5. **Polityka prywatności** (zatwierdzona treść) → dodam link przy formularzu.
6. **Weryfikacja merytoryczna przez inżyniera:**
   - limit THD 8% / EN 50160 na wykresie
   - opisy 9 usług
   - teksty „Co sprawdzamy / Co zyskujesz” dla 19 punktów pomiarowych (nowe teksty korzyści napisałem ja; są ostrożne, ale wymagają akceptacji)
   - etap „Analiza i raport” (EN 50160 + warunki przyłączenia)
7. **Zdjęcia** (opcjonalnie): prawdziwe zdjęcia ekipy, sprzętu i realizacji. Obecnie hero to ilustracja.

## Poza budżetem 3000 PLN (propozycje na kolejny etap)

- Sesja zdjęciowa / wideo z realizacji
- Podstrony usług pod SEO (np. „Testy NC RfG”, „Analiza jakości energii”). Osobny etap z badaniem fraz.
- CMS do samodzielnej edycji treści i referencji
- Pełny audyt prawny RODO i polityka prywatności, rejestr czynności
- Wersja angielska
- Cloudflare Turnstile / zaawansowana ochrona antyspamowa, CRM dla zapytań
- Self-hosting fontów i three.js (mniej zależności od CDN), testy na fizycznych urządzeniach i czytnikach ekranu
- Analityka zgodna z RODO (np. Plausible) i baner zgód, jeśli będą narzędzia marketingowe
