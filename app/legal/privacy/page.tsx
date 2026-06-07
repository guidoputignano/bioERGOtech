import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for the bioERGOtech Foundation website.",
};

export default function PrivacyPolicy() {
  return (
    <>
      <Navbar />
      <div style={{ paddingTop: "70px" }}>
        <section className="section">
          <div className="container mx-auto px-6 max-w-3xl">
            <h1 className="text-4xl font-bold mb-2 text-gray-800">Privacy Policy</h1>
            <p className="text-sm text-gray-500 mb-10">Last updated: March 2026</p>

            <div className="prose max-w-none text-gray-700 space-y-8">

              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-3">1. Data Controller</h2>
                <p>The data controller responsible for your personal data is:</p>
                <div className="mt-3 p-4 rounded-xl bg-gray-50 border border-gray-100 text-sm">
                  <p><strong>Fondazione bioERGOtech ETS</strong></p>
                  <p>Via Ciro Giovinazzi 70, 74123 Taranto, Italy</p>
                  <p>C.F. 90287640735</p>
                  <p className="mt-2"><a href="mailto:info@bioergotech.org" style={{ color: "var(--primary)" }}>info@bioergotech.org</a></p>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-3">2. What Data We Collect</h2>
                <p className="mb-3">We collect the following categories of personal data depending on how you interact with our website:</p>
                <div className="space-y-3">
                  {[
                    { title: "Membership Applications", items: ["Full name and job title", "Email address", "Organisation name, type, website", "Country and city", "Scientific areas of interest", "Statement of what you bring to and seek from the ecosystem"] },
                    { title: "Member Portal Accounts", items: ["Email address and encrypted password", "Full name and organisation details", "Partnership level and access permissions", "Login timestamps and session data"] },
                    { title: "Website Usage", items: ["IP address and browser type (anonymised where possible)", "Pages visited and time spent", "Referring website or search query", "Cookie preferences"] },
                  ].map((section) => (
                    <div key={section.title} className="rounded-xl border border-gray-100 p-4 bg-gray-50">
                      <h3 className="text-sm font-semibold text-gray-800 mb-2">{section.title}</h3>
                      <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                        {section.items.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-3">3. How We Use Your Data</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 pr-4 font-semibold text-gray-700">Purpose</th>
                        <th className="text-left py-3 pr-4 font-semibold text-gray-700">Legal Basis</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[
                        { purpose: "Processing membership applications", basis: "Legitimate interest / Pre-contractual steps" },
                        { purpose: "Providing Member Portal access", basis: "Performance of a contract" },
                        { purpose: "Sending application status updates", basis: "Legitimate interest" },
                        { purpose: "Sending platform notifications", basis: "Consent / Legitimate interest" },
                        { purpose: "Improving website performance", basis: "Consent (analytics cookies)" },
                        { purpose: "Complying with legal obligations", basis: "Legal obligation" },
                      ].map((row) => (
                        <tr key={row.purpose}>
                          <td className="py-3 pr-4 text-gray-700">{row.purpose}</td>
                          <td className="py-3 text-gray-600">{row.basis}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-3">4. Data Retention</h2>
                <p>We retain your personal data only for as long as necessary for the purposes described in this policy:</p>
                <ul className="list-disc pl-6 space-y-2 mt-3 text-sm">
                  <li><strong>Membership applications:</strong> Retained for 2 years from the date of submission, or until you request deletion.</li>
                  <li><strong>Member Portal accounts:</strong> Retained for the duration of your membership plus 1 year after account closure.</li>
                  <li><strong>Website analytics:</strong> Aggregated data retained for up to 26 months.</li>
                  <li><strong>Email communications:</strong> Retained for up to 3 years for record-keeping purposes.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-3">5. Data Sharing</h2>
                <p className="mb-3">We do not sell your personal data. We share data only with trusted service providers who process it on our behalf:</p>
                <ul className="list-disc pl-6 space-y-2 text-sm">
                  <li><strong>Supabase Inc.</strong> — Database and authentication hosting (EU data residency available)</li>
                  <li><strong>Vercel Inc.</strong> — Website hosting and deployment</li>
                  <li><strong>Google LLC</strong> — Maps and productivity tools (Google for Nonprofits)</li>
                </ul>
                <p className="mt-3 text-sm">All third-party processors are bound by Data Processing Agreements and are required to process data only as instructed by us.</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-3">6. International Transfers</h2>
                <p>Some of our service providers are based outside the European Economic Area (EEA). Where data is transferred outside the EEA, we ensure appropriate safeguards are in place, including Standard Contractual Clauses approved by the European Commission.</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-3">7. Your Rights</h2>
                <p className="mb-3">Under GDPR and Italian data protection law, you have the following rights:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { right: "Right of Access", desc: "Request a copy of the personal data we hold about you." },
                    { right: "Right to Rectification", desc: "Request correction of inaccurate or incomplete data." },
                    { right: "Right to Erasure", desc: "Request deletion of your personal data ('right to be forgotten')." },
                    { right: "Right to Restriction", desc: "Request that we limit how we use your data." },
                    { right: "Right to Portability", desc: "Receive your data in a structured, machine-readable format." },
                    { right: "Right to Object", desc: "Object to processing based on legitimate interests." },
                    { right: "Right to Withdraw Consent", desc: "Withdraw consent at any time where processing is consent-based." },
                    { right: "Right to Complain", desc: "Lodge a complaint with the Italian Data Protection Authority (Garante)." },
                  ].map((item) => (
                    <div key={item.right} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="text-sm font-semibold text-gray-800">{item.right}</div>
                      <div className="text-xs text-gray-600 mt-1">{item.desc}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm">To exercise any of these rights, contact us at <a href="mailto:info@bioergotech.org" style={{ color: "var(--primary)" }}>info@bioergotech.org</a>. We will respond within 30 days.</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-3">8. Security</h2>
                <p>We implement appropriate technical and organisational measures to protect your personal data against unauthorised access, alteration, disclosure, or destruction. These include encrypted data transmission (HTTPS), password hashing, and role-based access controls within the Member Portal.</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-3">9. Children's Privacy</h2>
                <p>Our website and services are not directed at children under the age of 16. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact us and we will delete it promptly.</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-3">10. Updates to This Policy</h2>
                <p>We may update this Privacy Policy from time to time. The date at the top of this page indicates when it was last revised. We will notify registered members of any significant changes by email.</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-3">11. Supervisory Authority</h2>
                <p>You have the right to lodge a complaint with the Italian Data Protection Authority:</p>
                <div className="mt-3 p-4 rounded-xl bg-gray-50 border border-gray-100 text-sm">
                  <p><strong>Garante per la protezione dei dati personali</strong></p>
                  <p>Piazza Venezia 11, 00187 Roma, Italy</p>
                  <p><a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)" }}>www.garanteprivacy.it</a></p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <Link href="/cookie-policy" style={{ color: "var(--primary)", fontWeight: 600, fontSize: 14 }}>
                  → View our Cookie Policy
                </Link>
              </div>

            </div>
          </div>
        </section>
      </div>
      <SiteFooter />
    </>
  );
}
