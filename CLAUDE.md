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

Kód je rozdělený na malé jednoúčelové moduly — při dalších úpravách hledat správné místo mezi nimi, neduplikovat logiku napříč soubory a nevracet vše zpátky do pár velkých souborů.

### Backend (`src/`, CommonJS)

- `src/android.js` / `src/ios.js` — komunikace se zařízením (`adb` / `idevice_id`+`ideviceinstaller`+`idevicename` přes `child_process`).
- `src/playStore.js` / `src/appStore.js` — dohledání názvu/popisu/kategorie (`google-play-scraper`, `itunes.apple.com/lookup`).
- `src/enrich.js` — `enrichAndroid`/`enrichIos`: pro seznam balíčků z zařízení dohledá store data s prodlevou mezi dotazy (`DELAY_MS`).
- `src/categorize.js` — `groupByCategory`: seskupení aplikací podle žánru, `UNCATEGORIZED` fallback.
- `src/filenames.js` — `sanitizeForFilename`, `formatTimestamp` (formát `ddmmyyyy_hhmmss`).
- `src/runStore.js` — souborová vrstva pro výsledky scanu: `writeOutputs` (zápis `data.json`/`data.txt` do `output/<runId>/`), `writeProcessLog` (zápis `process.json`), `listRuns`, `getRunData`, `deleteRun`, `resolveRunDir` (validace `runId` proti path traversal), `OUTPUT_DIR`.
- `src/scan.js` — tenký orchestrátor: `runScan()` skládá dohromady android/ios + enrich + runStore. Re-exportuje `listRuns`/`getRunData`/`deleteRun`/`OUTPUT_DIR` z `runStore.js`, aby volající (`index.js`, `server.js`) měli jeden vstupní bod. Jakoukoliv změnu **průběhu** scanu dělat tady, změnu **ukládání** v `runStore.js`.
- `src/scanSession.js` — třída `ScanSession`: stav jednoho běžícího scanu (`lines`, `subscribers`, `finished`) + `broadcast`/`logProgress`/`finish`. Server drží jednu instanci v modulové proměnné `session`, díky čemu se k běžícímu scanu může připojit víc SSE klientů najednou (viz `GET /api/scan/stream`).
- `src/staticServer.js` — `createStaticServer(publicDir)` vrací funkci pro servírování `public/` (MIME typy, ochrana proti path traversal).
- `src/server.js` — jen HTTP routing, deleguje na `scan.js` / `scanSession.js` / `staticServer.js`:
  - `GET /api/runs` — seznam běhů (souhrn).
  - `GET /api/runs/:id` — detail běhu vč. `processLog`.
  - `DELETE /api/runs/:id` — smaže celou složku běhu.
  - `GET /api/scan` — spustí nový scan (odmítne, pokud jeden už běží).
  - `GET /api/scan/status` — `{ running }`, pro zjištění stavu bez otevření SSE spojení.
  - `GET /api/scan/stream` — připojení k **už běžícímu** scanu: přehraje dosavadní řádky logu a streamuje živě dál. Umožňuje, aby se uživatel po odchodu ze stránky a návratu napojil na scan, který mezitím běžel na serveru dál.
- `src/index.js` — tenký CLI vstupní bod, volá `runScan` ze `scan.js`.

### Frontend (`public/`, ES moduly v prohlížeči — žádný bundler, žádný build krok)

- `public/theme.js` — klasický (ne-module) skript, přepínač světlý/tmavý režim, sdílený beze změny oběma stránkami.
- `public/js/format.js` — `formatDate`.
- `public/js/confirmDialog.js` — `confirmDialog(message)`, vlastní potvrzovací modal (Promise<boolean>) místo nativního `confirm()`.
- `public/js/api.js` — jediné místo, které volá `fetch`/`EventSource` na `/api/*`; ostatní moduly importují funkce odsud, ne `fetch` napřímo.
- `public/js/collapsible.js` — `buildCollapsibleCard(...)`, sdílený stavební blok pro sbalovací karty (kategorie i log průběhu).
- `public/js/runList.js` — hlavní stránka: `loadRuns(container)`, řádek běhu, tlačítko smazání, inline rozbalení `process.json`.
- `public/js/scanClient.js` — `initScanClient({...})`: spuštění nového scanu i navázání na již běžící (`/api/scan`, `/api/scan/stream`), společná logika streamování do log boxu.
- `public/js/detailCards.js` — detail: `renderCards`, `buildProcessLogCard`, `setAllCollapsed`.
- `public/js/search.js` — `wireSearch({...})`, filtrování karet/aplikací podle zadaného textu.
- `public/app.js` / `public/detail.js` — tenké vstupní body (`<script type="module">`), jen najdou DOM elementy a zavolají funkce z `public/js/*`.

Import cesty v `public/js/*` musí mít explicitní příponu `.js` (prohlížeč, na rozdíl od Node, žádnou příponu sám nedohledává).

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
