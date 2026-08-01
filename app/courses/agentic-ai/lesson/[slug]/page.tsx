import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { COURSE_LESSONS } from "../../../course-data";
import LessonPageClient from "./LessonPageClient";
import { studenteLiceiConfermato } from "@/lib/eventi/licei-server";
import {
  StudenteConsole,
  type SezioneStudente,
} from "@/app/eventi/vivere-piu-a-lungo/licei/studente/StudenteConsole";
import { LICEI } from "@/app/eventi/vivere-piu-a-lungo/licei/content";

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * Le due lezioni a cui il percorso licei attacca qualcosa di suo.
 *
 * La squadra sta alla 4.4 perche e la lezione che chiede di formarla, e la
 * consegna sta alla chiusura perche e l'ultima cosa che si fa. Metterle
 * altrove, o solo in una pagina a parte, significa chiedere a uno studente
 * di sedici anni di ricordarsi un indirizzo nel momento esatto in cui la
 * lezione gli dice di fare una cosa diversa.
 */
const LEZIONI_LICEI: Record<string, { sezione: SezioneStudente; titolo: string; sottotitolo: string }> = {
  "lesson-4-4": {
    sezione: "squadra",
    titolo: "La tua squadra",
    sottotitolo:
      "Questa lezione ti chiede di formare la squadra. Puoi farlo da qui, senza andare da nessuna parte.",
  },
  "course-closing": {
    sezione: "progetto",
    titolo: "Consegna il progetto",
    sottotitolo:
      "È l'ultimo passo del percorso. Quello che scrivete qui è quello che la Commissione leggerà.",
  },
};

export async function generateStaticParams() {
  return COURSE_LESSONS.filter((l) => l.slug !== "introduction").map((l) => ({
    slug: l.slug,
  }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const lesson = COURSE_LESSONS.find((l) => l.slug === slug);
  return {
    title: lesson
      ? `${lesson.number}: ${lesson.title} | bioERGOtech`
      : "Lesson | bioERGOtech",
  };
}

/**
 * Il riquadro del bando dentro la lezione.
 *
 * Si presenta per quello che e, invece di confondersi con il contenuto del
 * corso: il corso e in inglese e aperto a chiunque, questo pezzo e in
 * italiano e riguarda un bando a cui lo studente ha aderito tramite la sua
 * scuola. Fingere che siano la stessa cosa confonderebbe entrambi i pubblici.
 */
function RiquadroLicei({
  sezione,
  titolo,
  sottotitolo,
}: {
  sezione: SezioneStudente;
  titolo: string;
  sottotitolo: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E2E8F0",
        borderTop: "3px solid #00C4B4",
        borderRadius: 14,
        padding: 24,
        marginTop: 24,
        boxShadow: "0 1px 3px rgba(16,24,40,0.06)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#0A7A66",
          marginBottom: 8,
        }}
      >
        Percorso licei . {LICEI.titolo}
      </div>
      <h2
        style={{
          fontFamily: "'Sora', sans-serif",
          fontSize: 20,
          fontWeight: 700,
          color: "#1A2B4A",
          margin: "0 0 6px",
        }}
      >
        {titolo}
      </h2>
      <p style={{ fontSize: 14, color: "#5A6B85", margin: "0 0 20px", lineHeight: 1.6 }}>
        {sottotitolo}
      </p>
      <StudenteConsole sezione={sezione} intestazione={false} />
    </div>
  );
}

export default async function LessonPage({ params }: Props) {
  const { slug } = await params;

  const lesson = COURSE_LESSONS.find((l) => l.slug === slug);
  if (!lesson) redirect("/courses/agentic-ai");

  // Free lessons are publicly accessible
  if (lesson.free) {
    return <LessonPageClient lesson={lesson} isAuthenticated={false} />;
  }

  // Gated lessons: check Supabase session server-side
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Not logged in: render lesson with gate modal open
    return <LessonPageClient lesson={lesson} isAuthenticated={false} gateOpen />;
  }

  // Il riquadro del bando compare solo sulle due lezioni interessate e solo a
  // chi e iscritto e confermato. Il controllo si fa qui, lato server, cosi a
  // chi segue il corso per conto suo non compare e sparisce niente.
  const licei = LEZIONI_LICEI[slug];
  const mostraLicei = licei ? await studenteLiceiConfermato() : false;

  return (
    <LessonPageClient
      lesson={lesson}
      isAuthenticated={true}
      extra={
        mostraLicei && licei ? (
          <RiquadroLicei
            sezione={licei.sezione}
            titolo={licei.titolo}
            sottotitolo={licei.sottotitolo}
          />
        ) : undefined
      }
    />
  );
}
