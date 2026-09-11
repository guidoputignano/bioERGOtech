import { createClient } from "@/lib/supabase/server";
import CourseIntroClient from "./CourseIntroClient";
import { JsonLd } from "@/components/json-ld";
import { courseLd } from "./course-ld";

export default async function CourseIntroductionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <JsonLd data={courseLd()} />
      <CourseIntroClient isAuthenticated={!!user} />
    </>
  );
}
