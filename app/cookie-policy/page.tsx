import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy - bioERGOtech Foundation",
};

export default function CookiePolicy() {
  return (
    <>
      <Navbar />
      <div style={{ paddingTop: "70px" }}>
        <section className="section">
          <div className="container mx-auto px-6 max-w-3xl">
            <h1 className="text-4xl font-bold mb-8 text-gray-800">Cookie Policy</h1>
            <div className="prose max-w-none text-gray-700 space-y-6">
              <p>This website uses cookies to ensure you get the best experience on our site.</p>
              <h2 className="text-2xl font-semibold text-gray-800">What are cookies?</h2>
              <p>Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work, or work more efficiently, as well as to provide information to the owners of the site.</p>
              <h2 className="text-2xl font-semibold text-gray-800">How we use cookies</h2>
              <p>We use cookies for the following purposes:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Strictly necessary cookies:</strong> Required for the website to function properly, including authentication for the Member Portal.</li>
                <li><strong>Analytics cookies:</strong> Help us understand how visitors interact with our website so we can improve it.</li>
              </ul>
              <h2 className="text-2xl font-semibold text-gray-800">Managing cookies</h2>
              <p>You can control and/or delete cookies as you wish. You can delete all cookies that are already on your computer and you can set most browsers to prevent them from being placed.</p>
              <h2 className="text-2xl font-semibold text-gray-800">Contact</h2>
              <p>If you have any questions about our use of cookies, please contact us at <a href="mailto:info@bioergotech.org" style={{ color: "var(--primary)" }}>info@bioergotech.org</a>.</p>
            </div>
          </div>
        </section>
      </div>
      <SiteFooter />
    </>
  );
}
