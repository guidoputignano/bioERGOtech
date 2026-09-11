# Foto dei relatori

Un file per relatore, con il nome che compare nel campo `img` dell'array
`RELATORI` in `app/eventi/vivere-piu-a-lungo/content.ts`.

Formato: webp quadrato, 480x480, volto centrato. La pagina li ritaglia in un
cerchio da 52px con `object-cover`.

## File ancora mancanti

Finché il file non è in questa cartella, la scheda del relatore resta in
`content.ts` con `daAutorizzare: true`, quindi fuori dalla pagina, dal
contatore e dai dati strutturati. Quando il file arriva, togli quella riga.

| File                      | Relatore          | Panel |
| ------------------------- | ----------------- | ----- |
| `olivia-botticelli.webp`  | Olivia Botticelli | 1     |
| `valentina-vezzali.webp`  | Valentina Vezzali | 6     |

Adriana Chirico e Giulia Chironi non sono relatrici: stanno nel team
organizzativo, quindi le loro foto vanno in `/assets/images/About-us/` e le
schede stanno in `TEAM_ORGANIZZATIVO` dentro `page.tsx`, con lo stesso flag
`daCaricare` usato per i loghi.
