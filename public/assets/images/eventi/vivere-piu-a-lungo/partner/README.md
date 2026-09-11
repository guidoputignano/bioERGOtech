# Loghi delle realtà coinvolte

I file attesi dalla sezione "Con la partecipazione di" della pagina evento.
L'anagrafica sta in `app/eventi/vivere-piu-a-lungo/content.ts`, array `PARTNER`.

| File                  | Realtà             |
| --------------------- | ------------------ |
| `giffoni.webp`        | Giffoni Experience |
| `insuperabili.webp`   | Insuperabili       |
| `la-casa-di-sofia.webp` | La casa di Sofia |

Formato: webp, sfondo trasparente dove possibile, lato lungo circa 480px. La
pagina li scala dentro un riquadro alto 72px con `object-contain`, quindi
proporzioni diverse tra un logo e l'altro non sono un problema.

Quando il file è in questa cartella, togli la riga `daCaricare: true` dalla
voce corrispondente in `content.ts`: finché c'è, il logo non viene pubblicato,
così la pagina non mostra mai un'immagine rotta.
