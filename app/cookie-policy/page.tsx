import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cookie Policy - bioERGOtech Foundation",
  description: "Cookie Policy for the bioERGOtech Foundation website.",
};

export default function CookiePolicy() {
  return (
    <>
      <Navbar />
      <div style={{ paddingTop: "70px" }}>
        <section className="section">
          <div className="container mx-auto px-6 max-w-3xl">
            <h1 className="text-4xl font-bold mb-2 text-gray-800">Cookie Policy</h1>
            <p className="text-sm text-gray-500 mb-10">Last updated: March 2026</p>

            <div className="prose max-w-none text-gray-700 space-y-8">

              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-3">1. What Are Cookies</h2>
                <p>Cookies are small text files placed on your device when you visit a website. They allow the website to recognise your device and remember information about your visit. Cookies are used by most websites and do not harm your device.</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-3">2. Who We Are</h2>
                <p>This Cookie Policy applies to the website operated by <strong>Fondazione bioERGOtech ETS</strong>, Via Ciro Giovinazzi 70, 74123 Taranto, Italy (C.F. 90287640735). For questions, contact us at <a href="mailto:info@bioergotech.org" style={{ color: "var(--primary)" }}>info@bioergotech.org</a>.</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-3">3. Categories of Cookies We Use</h2>

                <div className="space-y-5 mt-4">
                  {[
                    {
                      title: "3.1 Strictly Necessary Cookies",
                      badge: "Always Active",
                      badgeColor: "#0D9373",
                      badgeBg: "#E6F9F5",
                      desc: "These cookies are essential for the website to function and cannot be switched off. They are set in response to actions you take, such as logging into the Member Portal, setting your privacy preferences, or filling in forms. Without these cookies, services you have asked for cannot be provided.",
                      examples: [
                        { name: "sb-access-token", purpose: "Supabase authentication session token", duration: "Session" },
                        { name: "sb-refresh-token", purpose: "Supabase session refresh token", duration: "30 days" },
                      ],
                    },
                    {
                      title: "3.2 Functional Cookies",
                      badge: "Optional",
                      badgeColor: "#7C5CFC",
                      badgeBg: "#F0EDFF",
                      desc: "These cookies enable enhanced functionality and personalisation. They may be set by us or by third-party providers whose services we use on our pages. If you do not allow these cookies, some or all of these features may not function correctly.",
                      examples: [
                        { name: "bioergotech_cookie_consent", purpose: "Stores your cookie preferences", duration: "1 year" },
                      ],
                    },
                    {
                      title: "3.3 Analytics Cookies",
                      badge: "Optional",
                      badgeColor: "#F0A500",
                      badgeBg: "#FFF8E6",
                      desc: "These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site. All information these cookies collect is aggregated and therefore anonymous. If you do not allow these cookies, we will not know when you have visited our site.",
                      examples: [],
                    },
                    {
                      title: "3.4 Marketing Cookies",
                      badge: "Optional",
                      badgeColor: "#E74C6F",
                      badgeBg: "#FDECF1",
                      desc: "These cookies may be set through our site by our advertising partners. They may be used to build a profile of your interests and show you relevant content on other sites. We do not currently use marketing cookies, but this policy will be updated if we do so in the future.",
                      examples: [],
                    },
                  ].map((cat) => (
                    <div key={cat.title} className="rounded-2xl border border-gray-100 p-5 bg-gray-50">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-base font-semibold text-gray-800">{cat.title}</h3>
                        <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 20, background: cat.badgeBg, color: cat.badgeColor, fontWeight: 700 }}>
                          {cat.badge}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{cat.desc}</p>
                      {cat.examples.length > 0 && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-2 pr-4 font-semibold text-gray-700 text-xs uppercase tracking-wide">Cookie Name</th>
                                <th className="text-left py-2 pr-4 font-semibold text-gray-700 text-xs uppercase tracking-wide">Purpose</th>
                                <th className="text-left py-2 font-semibold text-gray-700 text-xs uppercase tracking-wide">Duration</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cat.examples.map((ex) => (
                                <tr key={ex.name} className="border-b border-gray-100 last:border-0">
                                  <td className="py-2 pr-4 font-mono text-xs text-gray-700">{ex.name}</td>
                                  <td className="py-2 pr-4 text-gray-600">{ex.purpose}</td>
                                  <td className="py-2 text-gray-600">{ex.duration}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-3">4. Managing Your Cookie Preferences</h2>
                <p className="mb-3">When you first visit our website, a cookie banner will ask for your consent. You can accept all cookies, reject optional cookies, or manage your preferences by category.</p>
                <p className="mb-3">You can change your preferences at any time by clearing your browser cookies and revisiting the site. You can also control cookies through your browser settings:</p>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)" }}>Google Chrome</a></li>
                  <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)" }}>Mozilla Firefox</a></li>
                  <li><a href="https://support.apple.com/en-gb/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)" }}>Apple Safari</a></li>
                  <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)" }}>Microsoft Edge</a></li>
                </ul>
                <p className="mt-3 text-sm text-gray-500">Please note that disabling strictly necessary cookies may affect the functionality of the Member Portal.</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-3">5. Legal Basis</h2>
                <p>Our use of cookies is governed by the EU General Data Protection Regulation (GDPR), the Italian Data Protection Code (D.Lgs. 196/2003 as amended by D.Lgs. 101/2018), and the ePrivacy Directive. Strictly necessary cookies are used on the basis of our legitimate interest in providing a functional website. All other cookies are used only with your explicit consent.</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-3">6. Updates to This Policy</h2>
                <p>We may update this Cookie Policy from time to time to reflect changes in technology, legislation, or our data practices. The date at the top of this page indicates when it was last updated. We encourage you to review this page periodically.</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-3">7. Contact Us</h2>
                <p>For any questions about this Cookie Policy or our data practices, please contact:</p>
                <div className="mt-3 p-4 rounded-xl bg-gray-50 border border-gray-100 text-sm">
                  <p><strong>Fondazione bioERGOtech ETS</strong></p>
                  <p>Via Ciro Giovinazzi 70, 74123 Taranto, Italy</p>
                  <p>C.F. 90287640735</p>
                  <p className="mt-2">
                    <a href="mailto:info@bioergotech.org" style={{ color: "var(--primary)" }}>info@bioergotech.org</a>
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <Link href="/legal/privacy" style={{ color: "var(--primary)", fontWeight: 600, fontSize: 14 }}>
                  → View our Privacy Policy
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
