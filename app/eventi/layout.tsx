import { LinguaItaliana } from "@/components/LinguaItaliana";

/**
 * The event pages, and the high-school and university programmes under
 * them, are in Italian: the page declares it (`components/LinguaItaliana`).
 */
export default function EventiLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LinguaItaliana />
      {children}
    </>
  );
}
