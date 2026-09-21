# Alex Däckservice — lokalt koncept

Separat Next.js-demo inspirerat av Staark Inc:s komponentstruktur. Det ändrar inte alexdack.se och behöver ingen server eller API för att förhandsgranskas.

## Starta lokalt

```bash
npm install
npm run dev
```

Öppna http://localhost:3000. Kontrollera bygget med `npm run build`.

## Innan publicering eller kundöverlämning

- Ersätt konceptfotot i `public/images` med godkända bilder från verksamheten.
- Bekräfta företagets logotyp, öppettider, telefon, priser och geografiskt upptagningsområde.
- Koppla `/boka` till det befintliga bokningssystemet. Nu är det bara en interaktiv förhandsvisning; ingenting skickas.
- Byt ut kontaktlänken till produktionslösningen och gå igenom recensionens medgivande.
- Ta bort demomärkning och `noindex` först när kunden godkänt innehåll och rätt domän används.

## Struktur

`app/components` innehåller Header, Footer, Hero och återanvändbara sektioner. `app/boka` visar bokningsprototypen. `app/tjanster`, `app/priser`, `app/om-oss` och `app/kontakt` är separata undersidor. Layout, SEO och stil ligger i `app/layout.tsx` och `app/globals.css`.
