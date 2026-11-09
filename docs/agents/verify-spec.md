# /verify-spec w openGym

Serwery: `preview_start` z `.claude/launch.json`, najpierw `api`, potem `frontend`. Apka wisi na splashu, dopóki API nie odpowiada. `.claude/launch.json` nie jest w gicie, a w worktree porty i `DATA_DIR` są inne (`windows-tests.md`).

## Statystyki+ bez konta

`GET /api/ext/ptv4` wymaga sesji i profilu `PTV4_UID`, więc gość dostaje 401, a apka czyści wtedy zapisane zbiory (`ext_ptv4_*`). Zasianie samego localStorage nie wystarcza. Przechwyć to żądanie w Playwright (`browser_run_code_unsafe`), przed wejściem na stronę:

```js
await page.route('**/api/ext/ptv4*', r => {
  const set = new URL(r.request().url()).searchParams.get('set')
  return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FIXTURES[set] ?? []) })
})
await page.goto('http://localhost:5173/#/ptv4')
await page.getByText(/Continue without account|Kontynuuj bez konta/).click()
```

`[]` wystarcza dla paska nawigacji, a pozostałe widoki pokazują „Brak danych”. Przykłady wierszy są w testach `frontend/src/ext/views/Ptv4Stats.*.test.jsx`. Dwa błędy 401 z `/api/me` w konsoli gościa są normalne.

## Czego ten stub nie dowodzi

- Liczb wyliczanych przez ptv4 (np. kto dostaje alert `strength_guard`). To sprawdzaj na `analyze.py` w repo ptv4, na danych testowych.
- Odczytu `S.ext` przez ptv4 i całego przepływu przez sidecar.
- Wspólnych ustawień między urządzeniami, bo gość nie synchronizuje. Bez lokalnego profilu to NIESPRAWDZONE.

Pełny przepływ (api → sidecar → analyze → UI) daje konto testowe z izolowanym katalogiem danych, opisane niżej. Stub z gościem zostaje tylko dla widoków, które nie potrzebują danych.

## Konto testowe i sidecar na izolowanym katalogu

Nie używaj `data/` z repo ani danych użytkownika. Katalog tymczasowy, np. `$TEMP/<nazwa>-data`, a potem wszystko z nim:

1. **api z logowaniem hasłem**, bez zmiany `.env`:
   `DATA_DIR=<katalog> ORIGIN=http://localhost:5173 PASSWORD_LOGIN=1 node api/server.js`
2. **Konto w UI**: gość → „Zaloguj się” (lub wyczyść `gym_guest` w localStorage i przeładuj) → „Utwórz nowy profil” → „Hasło”. Hasło i imię generuj na potrzeby testu; nie wpisuj ich do repo ani do dokumentu.
3. **UID konta** z `<katalog>/db.json` (klucz pod `users`). Losowy, nie `1`.
4. **Stan testowy** zapisz jako `<katalog>/state-<UID>.json` (surowy obiekt stanu: `routines`, `workouts`, `bodyweight`, `ext.phases`, …). Sidecar i api czytają ten plik z tego katalogu.
5. **Sidecar** z katalogu `ptv4/sidecar`, na tym samym katalogu danych:
   `OPENGYM_UID=<UID> MCP_SECRET=<min. 32 znaki> EXT_KEY=<klucz testowy> OPENGYM_DATA=<katalog> SIDECAR_STATE=<osobny katalog> PTV4_SKILL=<ptv4-skill> GARMIN_SYNC_MIN=0 python server.py`
   Port 8091 (ext) i 8090 (MCP). `GARMIN_SYNC_MIN=0` wyłącza próbę łączenia z Garmin.
6. **api z proxy** ptv4: dodaj `PTV4_URL=http://127.0.0.1:8091 PTV4_KEY=<ten sam EXT_KEY> PTV4_UID=<UID>`. Bez tego `/api/ext/ptv4` daje 503.
7. **Sprawdzenie**: po zalogowaniu `fetch('/api/ext/ptv4?set=strength_guard')` ma dać 200. Bez klucza sidecar daje 401.

Zmiana stanu testowego: podmień `state-<UID>.json` i zmień `--today` albo daty, sidecar liczy od nowa (czyta plik przy każdym żądaniu). Daty względem dzisiaj: sidecar używa zegara systemowego, a `analyze.main(..., --today)` pozwala podać datę.

Pułapki:
- `ptv4-skill/data/opengym.json` mapuje `deload_blocks` dla planu `FocusPlecy5Dni` (T5, T14). Każdy stan z piątym blokiem treningu dostanie fałszywy deload. Trzymaj ≤4 bloki na dzień tygodnia albo używaj innego planu.
- Wykresy biorą fazy z `S.ext.phases` w przeglądarce, a sidecar z pliku stanu. Ustaw oba, inaczej legenda i pasy nie zgadzają się z liczbami.
- Procesy Node/Python uruchamiane z tej sesji zatrzymuj po PID (`taskkill /PID`), nie filtrem po nazwie `python.exe`. Uruchomione z Git Bash zatrzymasz przez `kill` z zapisanego `$!`, bo `netstat` i `Get-NetTCPConnection` mogą pokazywać PID 0.

## Uruchomienie krok po kroku

Kolejność ma znaczenie, bo sidecar i proxy potrzebują UID konta, a konto powstaje dopiero po starcie api:

1. `frontend` przez `preview_start` z katalogu `OpenGymSource` (tam jest `.claude/launch.json`).
2. api bez proxy (pkt 1 wyżej), konto testowe. Po „Utwórz profil” czekaj na powitanie „Cześć, …”, bo przy zimnym Vite trwa to dłużej niż kilka sekund. Bez tego nie ma `db.json`, UID jest pusty, a sidecar tworzy `state-.json`.
3. UID z `db.json`: `users` to lista, więc `users[0].id`.
4. Zatrzymaj api, uruchom je z `PTV4_*`, potem sidecar. Do testów dodaj `RATE_PER_MIN=100000`, bo każde otwarcie Home liczy zbiory od nowa.
5. Bez konta i bez sidecara zostaje stub gościa (wyżej), który nie pokazuje karty „Dziś” z prawdziwymi danymi.

Gdy porty 8090 lub 8091 są zajęte przez proces spoza sesji, nie zatrzymuj go. Sidecar ma je wpisane na stałe, więc uruchom go skryptem w katalogu tymczasowym, który czyta `server.py`, podmienia `port=8090` i `port=8091` na wolne, dodaje `sidecar/` do `sys.path` i wykonuje kod przez `exec` z `__name__ == "__main__"`. `PTV4_URL` ustaw na nowy port.

## Przeglądarka i sianie danych

Playwright MCP bywa zajęty przez inną sesję („Browser is already in use”), a drugie urządzenie wymaga osobnego kontekstu. Działa samodzielny skrypt Node z katalogu tymczasowego: `playwright` przez `createRequire` z cache'u `npm-cache/_npx/*/node_modules`, a w `chromium.launch` `executablePath` na zainstalowany Chrome, bo wersja Chromium z `ms-playwright` może nie pasować do biblioteki.

- **Sesja:** po założeniu konta zapisz `context.storageState()` i w kolejnych kontekstach ładuj same ciasteczka. Pusty localStorage sprawia, że apka bierze stan z serwera.
- **Zasianie:** zapisz `state-<UID>.json` z rosnącym `_rev` i otwórz nowy kontekst. Zanim nadpiszesz plik, odczekaj około 2,5 s po zamknięciu poprzedniego kontekstu, bo spóźniony PUT z niego przywróci stary stan. Po odczycie porównaj `bodyweight` w pliku z zasianym.
- **Przeładowanie:** `page.goto` na ten sam adres z hashem nie przeładowuje strony. Użyj `page.reload()`.
- **Ładowanie:** `goto` z `waitUntil: 'domcontentloaded'`, potem czekaj na element. Pod Vite zdarzenie `load` potrafi nie przyjść w 30 s.
- **Karta wagi:** `showWeightCard: false` w stanie ukrywa wbudowaną kartę, więc `.card:has(button.bw-rate)` na Home wskazuje tylko kartę forka. Linię w Statystykach znajdziesz po `button.bw-rate` na `/#/stats`.
- **Karta „Dziś”:** znika, gdy ptv4 nie ma ani jednego punktu MA7 (np. 3 ważenia), więc czekanie na nią kończy się timeoutem.
- **Wartości oczekiwane:** trend z 21 dni liczy pozycję dnia w czasie lokalnym, więc zmiana czasu w oknie przesuwa wynik o 0,01 względem rachunku w UTC.
