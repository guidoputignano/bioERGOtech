import { createClient } from "@/lib/supabase/server";
import CourseIntroClient from "./CourseIntroClient";

export default async function CourseIntroductionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <CourseIntroClient isAuthenticated={!!user} />;
}
