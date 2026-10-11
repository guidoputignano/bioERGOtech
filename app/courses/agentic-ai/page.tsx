import { createClient } from "@/lib/supabase/server";
import CourseIntroClient from "./CourseIntroClient";
import { JsonLd } from "@/components/json-ld";
import { courseLd } from "./course-ld";
import { RiquadroArea, type PercorsoArea } from "./RiquadroArea";
import { studenteLiceiConfermato } from "@/lib/eventi/licei-server";
import { candidatoUniversitaConfermato } from "@/lib/eventi/universita-server";

export default async function CourseIntroductionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Il rimando all'area compare solo a chi e confermato in uno dei due
  // percorsi, e la domanda si fa lato server come nelle lezioni: a chi segue
  // il corso per conto suo non deve comparire niente. Licei prima, e
  // l'universitario solo se il liceale ha risposto di no.
  let percorso: PercorsoArea | null = null;
  if (user) {
    if (await studenteLiceiConfermato()) percorso = "licei";
    else if (await candidatoUniversitaConfermato()) percorso = "universita";
  }

  return (
    <>
      <JsonLd data={courseLd()} />
      <CourseIntroClient
        isAuthenticated={!!user}
        area={percorso ? <RiquadroArea percorso={percorso} /> : undefined}
      />
    </>
  );
}
