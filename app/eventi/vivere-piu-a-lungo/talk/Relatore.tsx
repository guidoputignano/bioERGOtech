import Image from "next/image";

/**
 * Il volto del relatore: la foto in un cerchio con il bordo teal, oppure,
 * finche la foto non c'e, un monogramma con le iniziali nello stesso cerchio.
 *
 * Nessun import da `content.ts`: lo usano anche i componenti client, che
 * ricevono nome, iniziali e foto come props.
 *
 * La foto si ritaglia nel cerchio con il punto di fuoco in alto
 * (`50% 25%`): in un ritratto la testa sta nel terzo superiore, e un taglio
 * centrato la decapiterebbe. Per cambiarla basta il percorso in `TALKS`.
 */
export function VoltoRelatore({
  nome,
  iniziali,
  foto,
  dimensione = 72,
}: {
  nome: string;
  iniziali: string;
  foto: string | null;
  dimensione?: number;
}) {
  const bordo = Math.max(2, Math.round(dimensione / 24));
  const cerchio: React.CSSProperties = {
    width: dimensione,
    height: dimensione,
    borderRadius: "50%",
    border: `${bordo}px solid var(--primary)`,
    flexShrink: 0,
    overflow: "hidden",
    position: "relative",
    background: "#fff",
  };

  if (foto) {
    return (
      <span style={cerchio}>
        <Image
          src={foto}
          alt={nome}
          fill
          sizes={`${dimensione}px`}
          style={{ objectFit: "cover", objectPosition: "50% 25%" }}
        />
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={nome}
      style={{
        ...cerchio,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--primary-light)",
        color: "#0A7A66",
        fontWeight: 700,
        fontSize: Math.round(dimensione * 0.36),
        letterSpacing: "0.02em",
      }}
    >
      {iniziali}
    </span>
  );
}

/**
 * Il ritratto quadrato del relatore, con gli angoli arrotondati: grande
 * nella pagina del talk, medio nella scheda dell'indice. Solo con la foto;
 * senza, le pagine usano `VoltoRelatore` con il monogramma.
 *
 * La foto e un ritratto su fondo grigio da studio, come quelle dei relatori
 * dell'evento, gia tagliato con la testa nel terzo superiore: si mostra
 * intera, e il grigio sotto e solo il colore di attesa mentre si carica.
 * La larghezza la decide chi lo usa (classe o stile del contenitore);
 * `sizes` deve dire la stessa cosa, perche `next/image` scelga il file
 * giusto.
 */
export function RitrattoRelatore({
  nome,
  foto,
  sizes,
  raggio = 24,
  preload = false,
  className,
}: {
  nome: string;
  foto: string;
  sizes: string;
  raggio?: number;
  /** Per il ritratto in cima alla pagina, che e l'immagine piu grande della prima schermata. */
  preload?: boolean;
  className?: string;
}) {
  return (
    <span
      className={className}
      style={{
        position: "relative",
        display: "block",
        aspectRatio: "1 / 1",
        borderRadius: raggio,
        overflow: "hidden",
        background: "#E4E7EA",
        flexShrink: 0,
      }}
    >
      <Image
        src={foto}
        alt={nome}
        fill
        sizes={sizes}
        preload={preload}
        style={{ objectFit: "cover", objectPosition: "50% 30%" }}
      />
    </span>
  );
}
