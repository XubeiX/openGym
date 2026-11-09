# Testy na Windowsie i praca w worktree

Pomiar z 2026-11-08: commit `a3f3bf3e3`, Windows 11, Node 24.13.0 (CI i obrazy Docker używają Node 22).
CI działa na Linuksie. Lista poniżej dotyczy lokalnego Windowsa i nie była sprawdzana na Node 22.

## Co zrobić, gdy testy nie przechodzą

1. Porównaj nazwy porażek z tabelami poniżej. Test z listy to znana porażka, nie regresja.
2. **Nie twórz worktree, żeby to sprawdzić.** Worktree dziedziczy `core.autocrlf=true` i powtarza
   te same porażki, więc niczego nie rozstrzyga.
3. Test z sekcji „Obciążenie” uruchom ponownie sam: `npx vitest run <plik>`.
4. Test spoza listy traktuj jak regresję i sprawdź go.
5. Przy większych przebiegach wystarczą testy dotkniętego modułu. Pełny zestaw i tak sprawdza CI.

Oczekiwany wynik w głównym checkoucie: frontend około 21 porażek (29 przy obciążeniu), API 31.
MCP: 1 porażka, po wcześniejszym `npm ci` w `mcp/`.

## Końce linii (CRLF)

Przyczyna: `core.autocrlf=true` i brak `.gitattributes`, więc pliki na dysku mają CRLF, a testy
porównują je bajt po bajcie albo wyrażeniami z `\n`. Na kopii z LF wszystko poniżej przechodzi.

| Gdzie | Test lub polecenie |
|---|---|
| frontend | `scripts/app-icons.test.mjs`: finds nothing out of date |
| frontend | `src/lib/csp.test.js`: allows every inline script in index.html by its hash |
| frontend | `src/views/settings-pages.test.jsx`: the root marks the page rows |
| api | api/nudge-copy.js matches the frontend strings |
| api | api/wrapped-copy.js matches the frontend strings |
| api | core/prompts.js matches api/coach/prompts/*.md byte for byte |
| api | every error code the e-mail and password signup routes return is in their spec entry |
| check | `node scripts/catalogue/build.mjs --check` |
| check | `node scripts/build-coach-assets.mjs --check` |

Komunikat „out of date, run ...” jest tu fałszywym alarmem, więc nie regeneruj plików z tego powodu.

Żeby naprawdę sprawdzić aktualność wygenerowanych plików, użyj kopii z LF. W Git Bash:

```bash
mkdir /tmp/og-lf && git -c core.autocrlf=false archive HEAD | tar -x -C /tmp/og-lf
```

Kopia nie ma `node_modules`, a kopia HEAD nie zawiera niezacommitowanych zmian.

## Ścieżka do fixture coacha (18 testów API)

`api/coach/adapters/index.js:27` używa `new URL(...).pathname`, co na Windowsie daje
`C:\E:\...\fixture-cli.mjs`. Dotyczy tylko dostawcy testowego. Zamiana na `fileURLToPath`
naprawiła wszystkie 18 testów (sprawdzone na kopii).

Objaw to `'failed' !== 'ready'`, `'failed' !== 'nochange'`, `'provider' !== 'unusable'` albo
`Cannot read properties of null`. Testy:

- the instance cap is reserved at enqueue
- a scheduled review reads a batch of workouts once
- a workout the phone dated tomorrow is not re-read
- an answer the model was paid for counts as the review
- a proposal nobody has answered is not replaced
- an answer that stays unusable fails cleanly
- an expired proposal disappears on read
- a runtime that cannot be cancelled still has its late answer discarded
- a review job produces a checked change-set
- a create job produces a bundle
- a well-formed answer naming an exercise nobody has is refused
- the one repair round rescues an answer
- "nothing to change" keeps the reason it gave
- a refine carries the plan it is refining
- a debrief is enqueued as its own kind
- Ask the Coach mid-workout
- the admin test-run completes a round trip
- the admin test-run answers to the same privilege gate

## Funkcje POSIX, których Windows nie ma

| Przyczyna | Gdzie | Test |
|---|---|---|
| Tryby plików (`438 !== 384`, czyli 0666 zamiast 0600) | api | a profile credential lives in its own file |
| | api | atomicWrite: bytes flushed, then the rename |
| | api | connections are capped on the way in |
| | api | db.json unreadable after a sign-up |
| | api | folders are 0700 and files 0600 |
| `chmod` nie blokuje zapisu | api | a data directory the server cannot write to is 503 |
| | api | an unwritable ./data cannot take the process down |
| | mcp | `test/state.test.js`: a permission failure names the file |
| Gniazdo Unix `admin.sock` | api | recover.js asks the running server |
| | api | the admin socket is private |
| Brak `sh` w PATH PowerShella | frontend | `src/lib/api-base.test.js`: 9 testów BASE_PATH |

Testy BASE_PATH przechodzą w Git Bash na kopii z LF (48 z 48).

## Separator ścieżek `\`

| Plik (frontend) | Testy |
|---|---|
| `scripts/check-mobile-bundle.test.mjs` | 4 testy „fails ...” |
| `src/color-mix-fallback.test.js` | finds the CSS (przyczyna wywnioskowana z kodu testu) |
| `src/components/Seasonal.lazy.test.jsx` | only components/Seasonal.jsx names a theme module (2) |
| `src/lib/android-asset-packs.test.js` | hold exactly the drawings, refuse a pack with a drawing missing |

## Obciążenie (timeouty, zmienne między przebiegami)

Przekraczają limit czasu, gdy działa kilka przebiegów naraz. Uruchomione same przechodzą (66 z 66).

- `src/search-count.test.jsx`
- `src/lib/backup-media.test.js`
- `src/lib/workout-at.test.js`
- `src/seasonal/advent-doors.test.js`
- `src/views/History.grow.test.jsx`
- `src/views/GymReminder.test.jsx` (test debounce wyszukiwania)

## Brakujące zależności

| Objaw | Co zrobić |
|---|---|
| `ERR_MODULE_NOT_FOUND` w `mcp/` | `npm ci` w `mcp/` (test end-to-end potrzebuje też `api/node_modules`) |
| `Cannot find package 'js-yaml'` w `build-api-docs.mjs` | `npm ci` w katalogu głównym repo |

Nowy worktree nie ma żadnych `node_modules`, więc `npm ci` trzeba zrobić w każdym używanym katalogu.

## Porty w worktree

Kilku agentów na tych samych portach kończy się błędem „port zajęty”. **Każdy worktree uruchamia serwery na własnych portach i z własnym `DATA_DIR`.**

| Checkout | API (`PORT`) | Strona (Vite `--port`) |
|---|---|---|
| główny | 3000 | 5173 |
| worktree `.wt/tN` | 3100+N | 5200+N |
| inny worktree | wolny port z zakresu 3100-3199 | wolny port z zakresu 5200-5299 |

Sprawdzenie, czy port jest wolny (brak wyniku oznacza wolny):

```powershell
Get-NetTCPConnection -State Listen -LocalPort 3105,5205 -ErrorAction SilentlyContinue
```

Uruchomienie dla `t5`, w PowerShellu, z głównego katalogu worktree (dwa osobne procesy):

```powershell
$env:PORT='3105'; $env:DATA_DIR="$PWD\.tmp-data"; node api/server.js
```

```powershell
$env:API_TARGET='http://127.0.0.1:3105'; npm --prefix frontend run dev -- --port 5205 --strictPort
```

- Zawsze podawaj `--strictPort`. Bez niego Vite po cichu weźmie inny port.
- `API_TARGET` jest obowiązkowy, bo inaczej proxy `/api` trafi do API na porcie 3000, czyli
  do cudzego serwera.
- `.tmp-data` nie może trafić do commita. `DATA_DIR` nigdy nie wskazuje na `data/` innego checkoutu.
- Zamykaj po sobie uruchomione serwery.

`.claude/launch.json` nie jest w gicie, więc w nowym worktree go nie ma. Agent tworzy tam własny
z portami tego worktree:

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "frontend-t5",
      "runtimeExecutable": "cmd",
      "runtimeArgs": ["/c", "set API_TARGET=http://127.0.0.1:3105&& npm --prefix frontend run dev -- --port 5205 --strictPort"],
      "port": 5205
    }
  ]
}
```

Same testy nie zajmują stałych portów, więc nie kolidują ze sobą. Równoległe pełne przebiegi
powodują jednak timeouty z sekcji „Obciążenie”.
