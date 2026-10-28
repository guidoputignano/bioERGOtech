import { LinguaItaliana } from "@/components/LinguaItaliana";

/** The Italian version of this legal page: the page declares it (`components/LinguaItaliana`). */
export default function LayoutItaliano({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LinguaItaliana />
      {children}
    </>
  );
}
