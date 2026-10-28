import { LinguaPagina } from "./LinguaPagina";

/**
 * For the Italian sections of a site that declares itself English
 * (`<html lang="en">` in the root layout): the page says "it", so Chrome
 * does not offer "translate from English" to Italian readers. The inline
 * script covers the first load, before Chrome detects the language;
 * `LinguaPagina` covers navigation inside the site and puts "en" back on
 * the way out. Used by the layouts of the event pages and of the Italian
 * legal pages.
 */
export function LinguaItaliana() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: 'document.documentElement.lang="it";' }} />
      <LinguaPagina lingua="it" />
    </>
  );
}
