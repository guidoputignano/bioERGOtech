-- =========================================================
-- Percorso licei: le immagini dei post nelle "Notizie dal percorso"
--
-- Lo staff invia agli studenti un'email con gli ultimi post di Instagram.
-- Instagram non permette di prendere le immagini dei post senza collegare
-- l'account alle sue API, quindi lo staff carica la grafica del post dal
-- pannello. Il pannello la riduce (lato lungo 600 px, JPEG) e la carica qui
-- con un URL firmato chiesto alla rotta /api/eventi/licei/admin/immagine,
-- che controlla che chi chiede sia staff.
--
-- Il bucket e PUBBLICO in lettura: le email mostrano l'immagine con il suo
-- URL pubblico, e un client di posta non puo usare URL firmati a scadenza.
-- Dentro ci sono solo grafiche gia pubblicate su Instagram, mai dati degli
-- studenti. Nessuna policy su storage.objects: ne anon ne authenticated
-- possono scrivere; scrive solo la rotta, con la service role.
--
-- COME SI APPLICA
--   Editor SQL di Supabase, progetto di produzione: incollare il file per
--   intero ed eseguire. Poi VERIFICA.sql: la riga "notizie licei: bucket
--   delle immagini" deve dire OK. Rieseguibile.
--
-- Senza questa migrazione le notizie partono lo stesso: il pannello dice
-- che il caricamento non e disponibile, e i post compaiono come link.
-- =========================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'licei-notizie',
  'licei-notizie',
  true,
  1048576,                     -- 1 MB: il pannello carica JPEG da 600 px
  array['image/jpeg']
)
on conflict (id) do update set
  public             = true,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Verifica:
-- select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'licei-notizie';
