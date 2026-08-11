# mobile-app-scanner — poznámky pro Claude Code

Edukativní nástroj: scan aplikací z mobilu (Android/iPhone) přes USB kabel, popisy z Google Play / App Store, výstup do JSON/TXT + web UI. Detailní popis funkcí je v `README.md` — tenhle soubor řeší hlavně **jak prostředí zprovoznit na novém stroji** a **jak je projekt poskládaný**, aby to nebylo nutné znovu objevovat.

## Instalace na novém stroji (Windows)

1. Node.js 18+ (testováno na v22). `npm install` v kořeni projektu.
2. **Android** — nainstalovat `adb`:
   ```
   scoop install adb
   ```
   (pokud `scoop` chybí, nejdřív `irm get.scoop.sh | iex` v PowerShell). Na telefonu povolit USB debugging (Nastavení → Možnosti pro vývojáře → Ladění USB) a po zapojení kabelu potvrdit RSA popup. Ověřit `adb devices` → stav `device`.
3. **iPhone** — `libimobiledevice` **není** ve standardních scoop bucketech (`main`/`extras`), scoop instalace selže. Funkční postup, který byl použit a ověřen:
   - Stáhnout `libimobiledevice.*-win-x64.zip` z https://github.com/libimobiledevice-win32/imobiledevice-net/releases (obsahuje `idevice_id.exe`, `ideviceinstaller.exe`, `idevicename.exe` a potřebné DLL).
   - Rozbalit do vlastní složky, např. `C:\Tools\libimobiledevice`.
   - Přidat tuhle složku natrvalo do uživatelského PATH (`[Environment]::SetEnvironmentVariable('Path', "$current;C:\Tools\libimobiledevice", 'User')`).
   - Na iPhonu po zapojení potvrdit "Trust This Computer" + PIN. Ověřit `idevice_id -l`.

## Důležitá past: zděděný PATH v rámci jedné Claude Code relace

Pokud se `adb`/`idevice_id` nainstalují (scoop nebo ručně do PATH) **až po** startu Claude Code hostitelského procesu, poduprocesy spouštěné přes Bash/PowerShell tool v téže relaci nový PATH nevidí — zdědily starý stav prostředí při startu hostitele. Windows to samo nedožene, dokud se Claude Code celý nerestartuje (nebo se neotevře čerstvý terminál mimo něj).

Příznak: `adb devices` / `idevice_id -l` v Bash tool selže s "not recognized"/"Could not find files", i když je telefon fyzicky připojený a autorizovaný — a scan pak ve webovém UI hlásí "Nenalezeno žádné připojené zařízení", i když je vše v pořádku.

Dokud se relace nerestartuje, obcházet ručně: každý příkaz (včetně spuštění `npm run dev` na pozadí) prefixovat:
```
export PATH="$HOME/scoop/shims:/c/Tools/libimobiledevice:$PATH"
```
Po restartu Claude Code / novém terminálu se PATH už chová normálně a export není potřeba.

## Spuštění

- `npm start` — jednorázový scan z terminálu (`src/index.js`).
- `npm run dev` — webový server na `http://localhost:4321` (`src/server.js`), na Windows automaticky otevře prohlížeč. Pokud port 4321 zůstal obsazený po předchozím běhu (např. po killnutí terminálu, ne serveru), najít proces přes `netstat -ano | grep ':4321.*LISTENING'` a ukončit `taskkill //F //PID <pid>` před dalším startem.

## Architektura

- `src/scan.js` — sdílená logika scanu (`runScan`, `listRuns`, `getRunData`), volají ji jak CLI (`src/index.js`), tak server (`src/server.js`). Jakoukoliv změnu chování scanu dělat tady, ne duplikovat v obou vstupních bodech.
- `src/android.js` / `src/ios.js` — komunikace se zařízením (`adb` / `idevice_id`+`ideviceinstaller`+`idevicename` přes `child_process`).
- `src/playStore.js` / `src/appStore.js` — dohledání názvu/popisu/kategorie (`google-play-scraper`, `itunes.apple.com/lookup`).
- `src/server.js` — čistý Node `http` modul (žádný Express), statické servírování `public/`, JSON API a SSE endpointy pro scan:
  - `GET /api/runs` — seznam běhů (souhrn).
  - `GET /api/runs/:id` — detail běhu vč. `processLog`.
  - `DELETE /api/runs/:id` — smaže celou složku běhu (`scan.js#deleteRun`, validace `runId` přes `resolveRunDir` proti path traversal).
  - `GET /api/scan` — spustí nový scan (odmítne, pokud jeden už běží).
  - `GET /api/scan/status` — `{ running }`, pro zjištění stavu bez otevření SSE spojení.
  - `GET /api/scan/stream` — připojení k **už běžícímu** scanu: přehraje dosavadní řádky logu a pak streamuje živě dál. Umožňuje, aby se uživatel po odchodu ze stránky a návratu napojil na scan, který mezitím běžel na serveru dál (stav drží modulová proměnná `currentScan`, ne per-request).
- `public/` — vanilla JS/HTML/CSS, žádný framework, žádný build krok. `theme.js` řeší přepínač světlý/tmavý režim (sdílený mezi `index.html` a `detail.html`), `app.js` hlavní stránka, `detail.js` detail běhu.

## Konvence, které dodržet při dalších úpravách

- Text z externích zdrojů (název/popis aplikace z obchodu) se do DOM vkládá vždy přes `textContent`/`createElement`, nikdy `innerHTML` — jde o nedůvěryhodný cizí vstup (XSS).
- Motiv (light/dark) se řeší přes CSS custom properties + `data-theme` atribut na `<html>` + inline skript v `<head>` (spouští se synchronně před vykreslením, aby nebliklo špatné téma) — tenhle vzor zachovat i při dalších stránkách.
- Sbalování karet/sekcí (kategorie, log průběhu) je přes CSS `grid-template-rows` animační trik (`.collapsible`/`.collapsible-inner`), ne `display:none` — kvůli plynulé animaci. Nové sbalovací prvky stavět stejně.
- Texty viditelné ve webovém UI mají mít správnou českou diakritiku. Zprávy z `onProgress` v `scan.js` (sdílené s terminálovým CLI výstupem) diakritiku záměrně nemají — jsou to log řádky tisknuté i do terminálu.

## Údržba dokumentace

Po každé změně chování, API nebo instalačního postupu aktualizovat v rámci téže úpravy **oba** soubory:

- `README.md` — co nástroj umí a jak se používá (uživatelský pohled).
- `CLAUDE.md` (tenhle soubor) — instalace/prostředí, architektura, konvence (pohled na údržbu projektu).

Neaktualizovat jen když jde o čistě interní refaktoring beze změny chování/rozhraní/postupu instalace.
