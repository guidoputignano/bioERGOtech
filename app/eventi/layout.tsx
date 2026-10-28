import { LinguaPagina } from "./LinguaPagina";

/**
 * The event pages, and the high-school and university programmes under
 * them, are in Italian. The root layout declares "en" for the whole site, so
 * here the page says "it": with the inline script at first load, before
 * Chrome detects the language and offers a translation, and with
 * `LinguaPagina` when arriving from another page of the site.
 */
export default function EventiLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: 'document.documentElement.lang="it";' }} />
      <LinguaPagina lingua="it" />
      {children}
    </>
  );
}
