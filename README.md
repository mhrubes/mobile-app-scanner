# mobile-app-scanner

Edukativní nástroj: přes USB kabel přečte seznam nainstalovaných aplikací z mobilu (Android a/nebo iPhone), dohledá k nim krátký popis z obchodu (Google Play / App Store) a uloží do souborů. Funguje pro obě platformy zároveň — připoj cokoliv, nástroj sám pozná, co je připojené.

## Co umí

- Scan aplikací z Android telefonu (přes `adb`) i iPhonu (přes `libimobiledevice`), i oba zároveň.
- Dohledání názvu, popisu a kategorie z Google Play / App Store.
- Uložení výsledku do vlastní složky pro každý běh (historie se nemaže).
- Terminálový režim (`npm start`) i webové UI (`npm run dev`) se stejnou logikou pod kapotou.
- Ve webovém UI: živý průběh scanu, world round-trip (scan běží na serveru dál i po odchodu ze stránky a po návratu se k němu jde znovu připojit), přehled předchozích běhů, detail po kartách dle kategorie s hledáním, uložený log průběhu ke každému běhu, přepínač světlý/tmavý režim.

## Instalace

```
npm install
```

## Android — příprava

1. V telefonu: Nastavení → O telefonu → 7× klepnout na "Číslo sestavení" (odemkne vývojářské možnosti).
2. Nastavení → Možnosti pro vývojáře → zapnout "Ladění USB" (USB debugging).
3. Nainstalovat platform-tools (`adb`) a přidat do PATH: https://developer.android.com/tools/releases/platform-tools (na Windows nejsnáz přes `scoop install adb`, viz `CLAUDE.md`).
4. Připojit kabelem, na telefonu potvrdit dialog "Povolit ladění USB?" (zaškrtnout "vždy z tohoto počítače"). Dialog s výběrem USB režimu (přenos souborů / jen nabíjet) na to nemá vliv, jde nechat na čemkoliv.
5. Ověřit: `adb devices` — zařízení musí být ve stavu `device` (ne `unauthorized`).

## iPhone — příprava

1. Nainstalovat libimobiledevice pro Windows (obsahuje `idevice_id`, `ideviceinstaller`, `idevicename`) — přesný postup pro Windows je v `CLAUDE.md` (není ve standardních scoop bucketech, stahuje se přímo z GitHub releases).
2. Připojit kabelem, na iPhonu potvrdit "Trust This Computer" a zadat PIN.
3. Ověřit: `idevice_id -l` — musí vypsat UDID zařízení.

Poznámka: u nejailbreaknutého iPhonu jde tímto způsobem přečíst jen uživatelem nainstalované aplikace (ne systémové Apple aplikace) — to je i tak, jak funguje např. Apple Configurator / iTunes.

## Spuštění — terminál

```
npm start
```

Volitelně `npm start -- --all` pro zahrnutí i systémových/předinstalovaných aplikací (jinak jen aplikace nainstalované uživatelem).

## Spuštění — prohlížeč

```
npm run dev
```

Spustí lokální server na `http://localhost:4321` a rovnou otevře prohlížeč.

### Hlavní stránka

- Rozbalovací panel nahoře "Jak připravit telefon před připojením kabelem" — postup pro Android i iPhone, sbalený ve výchozím stavu.
- Tlačítko "Spustit scan" (volitelně s "vč. systémových aplikací") — spustí scan, průběh se streamuje živě do boxu pod tlačítkem, po dokončení jde box zavřít křížkem.
- Pokud scan právě běží (spuštěný dřív, i z jiné záložky) a stránku načteš/obnovíš, průběh se automaticky znovu napojí a doplní o vše, co už proběhlo — jako bys ze stránky neodešel. Scan běží na serveru nezávisle na tom, jestli je někdo připojený.
- Seznam všech předchozích běhů. Klik na běh otevře detail — ale **jen pokud** běh obsahuje aplikace (běhy s 0 aplikacemi/daty nejsou klikatelné). U každého běhu je navíc samostatné tlačítko se šipkou, které přímo v seznamu rozbalí/sbalí uložený log průběhu daného scanu (`process.json`), bez nutnosti chodit na detail.
- U každého běhu je i tlačítko na smazání (koš) — po potvrzení smaže celou složku daného běhu z `output/` natrvalo, včetně `data.json`/`data.txt`/`process.json`.

### Detail běhu

- Karty po kategoriích (Komunikace, Hry, Nástroje, ...), klik na hlavičku karty ji sbalí/rozbalí; nahoře tlačítka "Rozbalit vše" / "Zabalit vše" pro všechny karty najednou.
- Nad kartami (pokud běh log má) samostatná karta "Průběh scanu" se stejným uloženým logem, jen ke čtení, výchozí stav sbalený.
- Pole pro hledání (tlačítko "Hledat" nebo Enter) — filtruje karty a aplikace podle názvu/popisu/kategorie, s křížkem uvnitř pole pro rychlé vymazání a návrat k plnému výpisu.
- Na šířce obrazovky 1440px a více je v mřížce 5 karet vedle sebe místo 3, na menších rozlišeních beze změny.
- Přepínač světlý/tmavý režim v hlavičce (vpravo nahoře), volba se pamatuje, přechod barev je plynulý (ne skokový).

## Výstup

Každý běh (ať už z `npm start` nebo z UI) vytvoří vlastní složku `output/<zařízení>_<ddmmyyyy_hhmmss>/` s:

- `data.json` — `{ device, generatedAt, totalApps, categories: { "Kategorie": [ { platform, packageId, name, description, genre, foundInStore }, ... ] } }`
- `data.txt` — čitelný seznam po sekcích pro rychlé prohlédnutí
- `process.json` — `{ generatedAt, lines: [...] }`, přesný log průběhu daného scanu (co se dělo a v jakém pořadí)

Starší běhy se nepřepisují, zůstávají v `output/` jako historie.

Popisy se stahují z veřejných obchodů (Google Play přes `google-play-scraper`, App Store přes oficiální `itunes.apple.com/lookup` API), takže notebook musí mít při běhu internet. U aplikací, které v obchodě nejsou (interní/OEM apky), zůstane `description: null` a `foundInStore: false`.
