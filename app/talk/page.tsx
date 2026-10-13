import { permanentRedirect } from "next/navigation";
import { TALK_PATH } from "@/app/eventi/vivere-piu-a-lungo/talk/content";

/**
 * L'indirizzo breve dei talk, quello di locandine e post:
 * bioergotech.org/talk. Rimanda per sempre (308) alla pagina della serie,
 * come `app/courses/page.tsx` fa con il corso.
 */
export default function TalkAliasPage() {
  permanentRedirect(TALK_PATH);
}
