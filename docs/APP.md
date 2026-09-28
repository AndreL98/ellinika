# APP.md – Zentrale Projektdatei

> Diese Datei ist die „einzige Wahrheit“ für das Projekt. Computer liest sie vor jeder Aufgabe.
> Stand: 28.09.2026 (Phase 1, Schritt 1) · Verantwortlich: Andre Löwen

## 1. Vision
Eine kostenlose, quelloffene Lern-App, die die Orthodoxie nahbar macht: Wer z. B. Spanisch spricht, aber kein Griechisch oder Kirchenslawisch, lernt Vaterunser, Glaubensbekenntnis und die wichtigsten Begriffe und Rufe der Liturgie – mit Aussprache, Umschrift und belegter Erklärung.
Zweitens dient dieselbe App mir persönlich, um Griechisch und Russisch im Alltag zu lernen.

## 2. Grundsätze
1. Kostenlos, ohne Werbung, ohne Tracking, offline nutzbar.
2. Treue zur Kirche: nur kirchlich belegte Texte, keine eigene Theologie, Freigabeprozess.
3. Nachhaltig: wenig Abhängigkeiten, klare Datenformate, Tests, Doku. Jemand anderes muss das Projekt übernehmen können.
4. Erst Web, dann Plattformen: Die Web-App muss stabil sein, bevor iOS/Android/Linux kommen.
5. Mehrsprachig von Anfang an: Oberfläche und Inhalte sind getrennt übersetzbar, auch Rechts-nach-links (Arabisch, Aramäisch/Syrisch).

## 3. Zwei Sprachachsen
- Oberflächensprache (UI): in der der Nutzer die App bedient und Erklärungen liest (z. B. de, en, es).
- Lernsprache: die Sprache, die gelernt wird (z. B. el, cu = Kirchenslawisch, ru, ro, ar).
Jede Kombination soll funktionieren, soweit Inhalte vorhanden sind.

## 4. Architektur (Web-App)
- Vite + TypeScript, ohne großes Framework (später optional Preact, falls die Oberfläche wächst). Node.js ≥ 22.12 für Entwicklung und CI.
- Module:
  - `engine/` – Übungen erzeugen, Lernpfad, Wiederholung (Spaced Repetition), Punkte/Serie
  - `content/` – Laden und Prüfen der Inhaltspakete
  - `speech/` – Vorlesen: 1. Audiodatei, falls vorhanden, 2. Web Speech API, 3. Hinweis „keine Stimme“
  - `storage/` – Fortschritt lokal (IndexedDB, Fallback localStorage), Export/Import
  - `i18n/` – Oberflächentexte im Format i18next JSON v4 (Weblate-kompatibel)
  - `ui/` – Bildschirme: Lernpfad, Lektion, Texte, Wörterbuch, Einstellungen
- PWA: Manifest + Service Worker, offline-fähig. `sw.js` wird beim Build erzeugt (`app/build/sw-plugin.ts`); der Cache-Name enthält einen Hash aller Dateien, alte Caches werden gelöscht.
- Tests: Vitest (Logik), Playwright (Klickpfade), JSON-Schema-Prüfung aller Inhalte.
- Deployment: GitHub Actions baut, testet und veröffentlicht auf GitHub Pages (Source = „GitHub Actions“).

## 5. Repository-Struktur (Ziel)
```
/app            Quellcode (src/, public/, index.html, vite.config.ts, build/)
/content
  /schema       JSON-Schemas (item.schema.json, pack.schema.json)
  /packs
    /orthodox   core.json (IDs, Themen, Reihenfolge) + <lang>.json (Texte je Sprache)
    /general    core.json + el.json, ru.json …
  /audio        <lang>/<item-id>.mp3 (Aufnahmen von Muttersprachlern)
/locales        UI-Texte: de.json, en.json, es.json … (i18next v4)
/docs           APP.md, CONTRIBUTING.md, SOURCES.md, REVIEW.md
/prototype      Dateien des ersten Prototyps „Ellinika“ (Referenz für Phase 1)
/scripts        validate-content, import-notion, build-report
/tests          unit/ (Vitest), e2e/ (Playwright), fixtures/
```

## 6. Datenmodell (Inhalte)
### 6.1 core.json (sprachunabhängig)
```json
{ "pack": "orthodox", "version": 1,
  "units": [{ "id": "prayer.lords", "icon": "🙏", "order": 10, "items": ["prayer.lords.1", "prayer.lords.2"] }],
  "items": [{ "id": "prayer.lords.5", "kind": "prayer_line", "tags": ["prayer", "lords-prayer"] }] }
```
### 6.2 <lang>.json (Texte einer Lernsprache)
```json
{ "lang": "el", "script": "Grek", "dir": "ltr",
  "items": {
    "prayer.lords.5": {
      "text": "Τὸν ἄρτον ἡμῶν τὸν ἐπιούσιον δὸς ἡμῖν σήμερον·",
      "translit": "Ton árton imón ton epiúsion dos imín símeron",
      "translit_status": "ai_suggestion",
      "pron": { "de": "ton AR-ton i-MON …" },
      "pron_status": "ai_suggestion",
      "audio": null,
      "source": { "title": "Göttliche Liturgie, Ökumenisches Patriarchat", "url": "" },
      "status": "approved", "reviewed_by": "", "reviewed_at": "" } } }
```
### 6.3 Erklärungen je Oberflächensprache
`/content/packs/<pack>/gloss/<ui-lang>.json` → Bedeutung + Hinweis + Quelle je Item-ID, optional Titel je Einheit (`units`).
```json
{ "lang": "de", "units": { "prayer.lords": { "title": "Vaterunser" } }, "items": { "prayer.lords.5": { "meaning": "…", "note": "…", "source": { "title": "…" }, "status": "draft" } } }
```

Regeln: Item-IDs sind stabil (nie umbenennen). `status` ∈ draft | reviewed | approved. Öffentliche Builds zeigen nur `approved`. `approved` verlangt `reviewed_by` und `reviewed_at`. `translit_status`/`pron_status` ∈ ai_suggestion | verified; fehlt das Feld, gilt es als KI-Vorschlag. Die Schemas liegen in `/content/schema` (pack, item, gloss), geprüft mit `npm run validate:content`.

## 7. Übungstypen (Stand Prototyp „Ellinika“)
Bedeutung wählen, Übersetzung wählen, Hören und wählen, Satz bauen (beide Richtungen), Hören und Satz bauen, Paare finden. Fehler kommen am Ende der Lektion erneut. Kronen 0–3 je Einheit, XP, Tagesziel, Serie.

### 7.1 Umsetzung in der Engine (`app/src/engine`)
| Typ | Kennung | Wann |
|---|---|---|
| Bedeutung wählen | `choose_meaning` | Wörter (unter 3 Wörtern), immer |
| Übersetzung wählen | `choose_translation` | Wörter, ab 1 Krone |
| Hören und wählen | `listen_choose` | Wörter, nur wenn Audio oder Stimme vorhanden |
| Satz bauen → Oberflächensprache | `build_to_ui` | Sätze (ab 3 Wörtern), immer |
| Satz bauen → Lernsprache | `build_to_learn` | Sätze, ab 1 Krone |
| Hören und Satz bauen | `listen_build` | Sätze, ab 1 Krone und mit Stimme |
| Paare finden | `match_pairs` | einmal je Lektion, wenn die Einheit mind. 3 Wörter hat |

Regeln: Eine Lektion hat 8 Aufgaben. Falsche Antworten kommen am Ende erneut (höchstens 2 Wiederholungen je Aufgabe). Antwortmöglichkeiten haben nie dieselbe Bedeutung bzw. denselben Text. Eine Lektion bringt 10 XP, ohne Fehler 15 XP, und +1 Krone (höchstens 3). Tagesziel 20 XP. Die Serie zählt Tage mit mindestens einer Lektion. Ein Item ist nur spielbar, wenn Text **und** Erklärung sichtbar sind (öffentlich: beide `approved`). Der lokale Entwicklungsserver (`npm run dev`) zeigt zusätzlich Entwürfe, deutlich markiert.

## 8. Roadmap
| Phase | Ziel | Fertig wenn … |
|---|---|---|
| 0 Fundament | Repo-Struktur, APP.md, Schemas, CI mit Tests | Leere App baut und deployt automatisch |
| 1 MVP Web | Engine aus Prototyp übernehmen, Pakete orthodox/el + general/el, UI de | Alle Einheiten spielbar, Tests grün, online |
| 2 Kirchenslawisch & Russisch | Pakete orthodox/cu, general/ru, Audio-Fallback | Vaterunser/Credo in el + cu, Grundwortschatz ru |
| 3 Mehrsprachige Oberfläche | UI en + es, Weblate angebunden, RTL-Test | Spanier kann App komplett auf Spanisch nutzen |
| 4 Kirchliche Prüfung | REVIEW.md, Prüfer gefunden, Status-Workflow | Liturgische Texte freigegeben |
| 5 Weitere Sprachen | ro, ar, ka, sr, bg … nach Freiwilligen | je Sprache ein Betreuer |
| 6 Plattformen | Capacitor (iOS/Android), Tauri (Linux) | Store-Einträge, ggf. über gemeinnützigen Träger |

## 9. Kosten-Rahmen
- Hosting: GitHub Pages (0 €). Übersetzung: Hosted Weblate für Libre-Projekte (0 €).
- Credits: ein gebündelter Computer-Lauf pro Monat für Inhalte, sonst gezielte Feature-Aufgaben. Budget ab 12/2026: 10.000 Credits/Monat, davon Ziel ≤ 2.000 für dieses Projekt.
- Später: Google Play 25 $ einmalig, Apple 99 $/Jahr (oder Gebührenbefreiung über gemeinnützige Organisation).

## 10. Offene Fragen
- Endgültiger App-Name? (Arbeitstitel „Logos“; Repo `ellinika` wird nach der Entscheidung umbenannt)
- Wer prüft liturgische Texte (Pfarrer, Metropolie)?
- Welche offiziellen Textfassungen je Sprache (Liste in SOURCES.md)?

## 11. Entscheidungslog
| Datum | Entscheidung | Grund |
|---|---|---|
| 27.09.2026 | Erst Web-App (PWA), Plattformen später | Stabilität und Aufwand |
| 27.09.2026 | Eine App, zwei Inhaltswelten (orthodox, general) | Gleiche Engine, weniger Pflege |
| 27.09.2026 | Große Dateien nicht über den GitHub-Connector | Übertragungsabbrüche am 27.09. |
| 27.09.2026 | UI-Texte im Format i18next JSON v4 | Weblate-kompatibel |
| 28.09.2026 | Phase 0 lokal gebaut: Vite 8, TypeScript 7, Vitest 5, Playwright 1.63, Ajv 8 | Aktuelle stabile Versionen, alle MIT bzw. Apache-2.0 |
| 28.09.2026 | Node.js ≥ 22.12 als Voraussetzung | Vitest 5 läuft nicht mehr auf Node 20 |
| 28.09.2026 | `base: './'` (relative Pfade) im Build | Läuft auf GitHub Pages unabhängig vom Repo-Namen |
| 28.09.2026 | Eigener kleiner Übersetzer für i18next-v4-Dateien statt i18next-Bibliothek | Keine Abhängigkeit; Dateiformat bleibt Weblate-kompatibel, Wechsel jederzeit möglich |
| 28.09.2026 | Service Worker wird beim Build erzeugt, Cache-Name mit Inhalts-Hash | Keine veralteten Versionen im Cache, ohne Zusatzbibliothek |
| 28.09.2026 | Felder `translit_status`/`pron_status` und `gloss.schema.json` ergänzt | Inhaltsregel „KI-Vorschlag kennzeichnen“ maschinell prüfbar |
| 28.09.2026 | Prüfskript als JavaScript mit JSDoc-Typen (`// @ts-check`) | Läuft direkt mit Node, keine Zusatzabhängigkeit wie tsx |
| 28.09.2026 | Code unter MIT-Lizenz | Kompatibel mit App Store und Google Play (Phase 6); GPL verträgt sich nicht mit den App-Store-Bedingungen; einfach für Mitwirkende |
| 28.09.2026 | Eigene Inhalte unter CC BY-SA 4.0; liturgische Texte behalten die Lizenz bzw. Erlaubnis ihrer Quelle | Inhalte bleiben frei; kirchliche Texte werden nicht umlizenziert |
| 28.09.2026 | Repo `ellinika` wird umgebaut (kein neues Repo), alter Prototyp liegt in `prototype/` | Repo ist schon öffentlich (GitHub Pages im Gratis-Tarif nur für öffentliche Repos); Umbenennen später möglich, Pfade sind relativ |
| 28.09.2026 | Übertragung per Git (Branch + PR), nicht über den Connector | Auch große Dateien wie package-lock.json kommen vollständig an |
| 28.09.2026 | Übungen nach Abschnitt 7 neu gebaut (Prototyp-Code nicht verfügbar) | Engine als reine Funktionen, vollständig mit Vitest getestet |
| 28.09.2026 | Fortschritt in IndexedDB, Rückfall auf localStorage, dann Arbeitsspeicher; Export/Import als JSON-Funktion vorbereitet | Offline, ohne Konto, Daten bleiben auf dem Gerät |
| 28.09.2026 | Browser-Tests laufen gegen einen eigenen Build mit Test-Paket (`npm run build:e2e`, `tests/fixtures/packs-e2e`) | Echte Pakete enthalten noch keine freigegebenen Texte; Test-Inhalte landen nie im öffentlichen Build |
| 28.09.2026 | Öffentlicher Build zeigt nur `approved`, `npm run dev` zeigt auch Entwürfe (markiert) | Inhaltsregel bleibt gewahrt, Redaktion kann trotzdem testen |
