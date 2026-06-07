import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join Us",
  description:
    "Join the bioERGOtech biotech ecosystem in Southern Italy. Whether you are a startup, company, hospital, or investor, see what you can access and how to become a member.",
  alternates: { canonical: "/join-us" },
};

export default function JoinUsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
