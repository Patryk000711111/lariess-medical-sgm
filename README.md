# L'ariess Medical Online MVP

To jest gotowa baza pod wersję online z synchronizacją czasu rzeczywistego dla systemu SGM / CMMS.

## Co działa
- logowanie użytkownika demo
- współdzielone zadania
- czat zespołu w realtime
- aktualizacja telemetryczna O2 / N2O / AIR / VAC w realtime
- dzienniki dozoru generowane po zmianie telemetrii
- historia paszportów gniazd w realtime
- audyty
- upload dokumentów DTR
- obecność użytkowników online

## Uruchomienie
```bash
npm install
npm start
```

Aplikacja uruchomi się pod adresem:
```bash
http://localhost:3000
```

## Pliki
- `server.js` - backend Express + Socket.IO + prosty plikowy storage JSON
- `public/index.html` - panel web
- `public/app.js` - logika klienta
- `uploads/` - pliki DTR
- `db.json` - baza danych tworzona automatycznie przy pierwszym starcie

## Produkcyjne następne kroki
- zamiana plikowej bazy JSON na PostgreSQL
- prawdziwe uwierzytelnianie z hasłami i rolami
- tokeny JWT + refresh
- wersja mobilna Android / React Native
- powiadomienia push
- log audytowy zmian
- eksport PDF / raporty / backupy
