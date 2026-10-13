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
