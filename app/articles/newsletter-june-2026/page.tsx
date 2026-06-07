import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Newsletter: Founding Edition, June 2026 | bioERGOtech",
  description: "bioERGOtech is live. Read our founding newsletter covering our launch, research pillars, first members, and upcoming events.",
  alternates: { canonical: "/articles/newsletter-june-2026" },
};

export default function NewsletterJune2026() {
  return (
    <>
      <Navbar />
      <div style={{ paddingTop: "70px" }}>
        <style>{`
          .nl{--nl-primary:var(--primary,#10D8B0);--nl-ink:#1f2937;--nl-mid:#4b5563;--nl-soft:#6b7280;--nl-line:#e6e8ee;--nl-bg:#f7f8fa;}
          .nl *{box-sizing:border-box;}
          .nl{color:var(--nl-ink);line-height:1.7;}
          .nl-wrap{max-width:760px;margin:0 auto;padding:0 24px;}

          /* hero */
          .nl-hero{background:var(--nl-bg);padding:56px 0 36px;border-bottom:1px solid var(--nl-line);}
          .nl-tags{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:22px;font-size:13px;}
          .nl-tag{background:#ECFCF7;color:#088A74;font-weight:600;letter-spacing:.04em;text-transform:uppercase;font-size:11px;padding:6px 13px;border-radius:999px;}
          .nl-dot{color:var(--nl-soft);}
          .nl-date{color:var(--nl-primary);font-weight:600;}
          .nl-read{color:var(--nl-soft);}
          .nl-title{font-size:clamp(30px,5vw,46px);line-height:1.1;font-weight:800;letter-spacing:-.02em;color:var(--nl-ink);margin:0 0 18px;}
          .nl-title em{font-style:normal;color:var(--nl-primary);}
          .nl-lede{font-size:20px;line-height:1.55;color:var(--nl-mid);margin:0 0 26px;}
          .nl-by{display:flex;align-items:center;gap:10px;font-size:14px;color:var(--nl-soft);}
          .nl-by .nl-av{width:34px;height:34px;border-radius:50%;background:var(--nl-primary);color:#0F1422;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;}
          .nl-by strong{color:var(--nl-ink);font-weight:700;}

          /* body */
          .nl-body{padding:40px 0 56px;}
          .nl-body p{font-size:17px;color:var(--nl-mid);margin:0 0 22px;}
          .nl-body p strong{color:var(--nl-ink);}
          .nl-body h2{font-size:26px;font-weight:800;letter-spacing:-.015em;color:var(--nl-ink);margin:6px 0 8px;}
          .nl-kicker{display:block;font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#088A74;margin:44px 0 -2px;}

          /* hubs */
          .nl-hubs{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:26px 0 8px;}
          .nl-hub{background:#fff;border:1px solid var(--nl-line);border-radius:14px;padding:20px 20px;}
          .nl-hub .nl-city{font-size:15.5px;font-weight:800;color:var(--nl-ink);}
          .nl-hub .nl-role{font-size:12.5px;color:#088A74;font-weight:600;margin-top:3px;letter-spacing:.02em;}

          /* pillars */
          .nl-pillars{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:26px 0 8px;}
          .nl-pillar{background:#fff;border:1px solid var(--nl-line);border-radius:16px;overflow:hidden;box-shadow:0 8px 24px -16px rgba(32,40,56,.18);}
          .nl-pillar-top{background:var(--nl-primary);padding:16px 18px 14px;}
          .nl-pillar-num{font-size:11px;font-weight:700;letter-spacing:.1em;color:rgba(15,20,34,.55);margin-bottom:4px;}
          .nl-pillar-name{font-size:17px;font-weight:800;color:#0F1422;line-height:1.2;letter-spacing:-.01em;}
          .nl-pillar-body{padding:16px 18px;}
          .nl-pillar-body p{font-size:14px;color:var(--nl-mid);line-height:1.65;margin:0;}
          .nl-strip{background:#0F1422;color:#5DCAA5;border-radius:12px;padding:16px 20px;margin-top:16px;font-size:13.5px;text-align:center;font-style:italic;line-height:1.6;}

          /* members */
          .nl-members{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:26px 0 8px;}
          .nl-member{background:#fff;border:1px solid var(--nl-line);border-radius:16px;overflow:hidden;box-shadow:0 8px 24px -16px rgba(32,40,56,.18);}
          .nl-member-head{padding:20px 20px 16px;border-bottom:1px solid var(--nl-line);}
          .nl-member-badge{display:inline-block;background:#ECFCF7;color:#088A74;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:5px 11px;border-radius:999px;margin-bottom:10px;}
          .nl-member-name{font-size:18px;font-weight:800;color:var(--nl-ink);line-height:1.2;}
          .nl-member-loc{font-size:12.5px;color:var(--nl-soft);margin-top:3px;}
          .nl-member-body{padding:18px 20px;}
          .nl-member-body p{font-size:14px;color:var(--nl-mid);line-height:1.7;margin:0;}
          .nl-member-fit{margin-top:14px;padding-top:14px;border-top:1px solid var(--nl-line);}
          .nl-member-fit .l{font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#088A74;margin-bottom:4px;}
          .nl-member-fit .t{font-size:13px;color:var(--nl-mid);font-style:italic;line-height:1.55;margin:0;}

          /* event */
          .nl-event{background:#fff;border:1px solid var(--nl-line);border-left:4px solid var(--nl-primary);border-radius:16px;padding:24px 26px;margin:26px 0 8px;box-shadow:0 8px 24px -16px rgba(32,40,56,.18);}
          .nl-event .eye{display:inline-block;background:#ECFCF7;color:#088A74;font-size:11px;font-weight:700;letter-spacing:.04em;padding:5px 12px;border-radius:999px;margin-bottom:12px;}
          .nl-event h3{font-size:18px;font-weight:800;color:var(--nl-ink);margin:0 0 4px;}
          .nl-event .meta{font-size:12.5px;color:#088A74;font-weight:600;letter-spacing:.03em;margin-bottom:10px;}
          .nl-event p{font-size:14.5px;color:var(--nl-mid);line-height:1.7;margin:0 0 10px;}
          .nl-event a{color:var(--nl-primary);font-weight:700;text-decoration:none;}

          @media(max-width:680px){
            .nl-hubs,.nl-pillars,.nl-members{grid-template-columns:1fr;}
          }
        `}</style>

        <div className="nl">

          {/* HERO */}
          <header className="nl-hero">
            <div className="nl-wrap">
              <div className="nl-tags">
                <span className="nl-tag">Newsletter</span>
                <span className="nl-tag">Founding Edition</span>
                <span className="nl-date">June 2026</span>
                <span className="nl-dot">&middot;</span>
                <span className="nl-read">4 min read</span>
              </div>
              <h1 className="nl-title">A foundation is <em>born.</em></h1>
              <p className="nl-lede">bioERGOtech is live. We are building the ecosystem where diverse competencies meet, resources are shared, and collaboration replaces competition — turning concrete clinical needs into sustainable solutions.</p>
              <div className="nl-by">
                <span className="nl-av">b</span>
                <span>By <strong>bioERGOtech Foundation</strong></span>
              </div>
            </div>
          </header>

          {/* BODY */}
          <div className="nl-body">
            <div className="nl-wrap">

              <span className="nl-kicker">01 / The beginning</span>
              <h2>bioERGOtech is officially live.</h2>
              <p>Founded on <strong>12 April 2025</strong> in Taranto, Puglia, Fondazione bioERGOtech ETS is a participation foundation under the Italian Third Sector Code (D.Lgs. 117/2017). Its mission is clear: accelerate healthcare innovation through digital scientists, and transform concrete clinical needs into sustainable commercial solutions.</p>
              <p>bioERGOtech operates as a collaborative ecosystem bringing together specialised companies, research institutions, healthcare professionals, and entrepreneurs. Three strategic hubs anchor the network.</p>

              <div className="nl-hubs">
                <div className="nl-hub"><div className="nl-city">Taranto, Italy</div><div className="nl-role">Experimental Hub</div></div>
                <div className="nl-hub"><div className="nl-city">Zurich, Switzerland</div><div className="nl-role">Talent &amp; Innovation Hub</div></div>
                <div className="nl-hub"><div className="nl-city">Riyadh, Saudi Arabia</div><div className="nl-role">Clinical Translation Hub</div></div>
              </div>

              <span className="nl-kicker">02 / Scientific pillars</span>
              <h2>The four pillars of our science.</h2>
              <p>bioERGOtech organises its research across four integrated pillars. Each is powerful on its own. Together, they form a single system for creating predictable, manufacturable, controllable living medicines.</p>

              <div className="nl-pillars">
                <div className="nl-pillar">
                  <div className="nl-pillar-top"><div className="nl-pillar-num">PILLAR 01</div><div className="nl-pillar-name">Digital Twin Therapeutics</div></div>
                  <div className="nl-pillar-body"><p>Patient-specific computational models that predict therapeutic outcomes and enable real-time treatment optimisation, powered by AI and mechanistic modelling of immune dynamics and disease progression.</p></div>
                </div>
                <div className="nl-pillar">
                  <div className="nl-pillar-top"><div className="nl-pillar-num">PILLAR 02</div><div className="nl-pillar-name">Synthetic Biology &amp; Cell Engineering</div></div>
                  <div className="nl-pillar-body"><p>Design of programmable cellular systems with precise control over therapeutic function, safety, and persistence. From CRISPR editing to CAR/synthetic receptor design and next-generation armoured constructs.</p></div>
                </div>
                <div className="nl-pillar">
                  <div className="nl-pillar-top"><div className="nl-pillar-num">PILLAR 03</div><div className="nl-pillar-name">Automated Biomanufacturing &amp; Control</div></div>
                  <div className="nl-pillar-body"><p>Fully integrated robotic platforms manufacturing cell therapies in under 48 hours with minimal human intervention. Closed-loop control and AI-driven optimisation maximise potency, yield, and consistency.</p></div>
                </div>
                <div className="nl-pillar">
                  <div className="nl-pillar-top"><div className="nl-pillar-num">PILLAR 04</div><div className="nl-pillar-name">Integrated Multi-Omics Analytics</div></div>
                  <div className="nl-pillar-body"><p>Comprehensive molecular profiling throughout manufacturing and treatment. Simultaneous genomics, transcriptomics, proteomics, and metabolomics linking data directly to digital twins and clinical outcomes.</p></div>
                </div>
              </div>
              <div className="nl-strip">Digital twins predict the design &middot; Synthetic biology engineers it &middot; Automation produces it &middot; Multi-omics validates it</div>

              <span className="nl-kicker">03 / Member spotlight</span>
              <h2>Welcome to the first two members.</h2>
              <p>Two organisations have joined the Foundation as founding members, bringing complementary expertise rooted in the Puglia region and directly aligned with bioERGOtech&apos;s mission.</p>

              <div className="nl-members">
                <div className="nl-member">
                  <div className="nl-member-head">
                    <span className="nl-member-badge">SME &middot; Medical Imaging</span>
                    <div className="nl-member-name">Predict Healthcare</div>
                    <div className="nl-member-loc">Bari (BA), Puglia &middot; predictcare.it</div>
                  </div>
                  <div className="nl-member-body">
                    <p>Founded in 2008 in Bari, Predict Healthcare commercialises advanced diagnostic imaging systems including ultrasound and radiology platforms. As an authorised GE Healthcare distributor for Puglia and a provider of turnkey radiology departments, the company bridges clinical infrastructure and cutting-edge technology. It also brings holographic and robotic tools into educational settings, recognising knowledge access as a community value.</p>
                    <div className="nl-member-fit">
                      <div className="l">Ecosystem fit</div>
                      <p className="t">Clinical diagnostics infrastructure &middot; Regional healthcare access &middot; Medical imaging technology</p>
                    </div>
                  </div>
                </div>
                <div className="nl-member">
                  <div className="nl-member-head">
                    <span className="nl-member-badge">SME &middot; Industrial Engineering</span>
                    <div className="nl-member-name">Priver</div>
                    <div className="nl-member-loc">Carosino (TA), Puglia &middot; priver.it</div>
                  </div>
                  <div className="nl-member-body">
                    <p>Operating from Carosino (Taranto) since the early 1980s, Priver designs and builds industrial systems and plants across hydraulics, pneumatics, electromechanics, and automation. An Authorised Inspection Centre for Rossi Spa gearmotors, Priver invests in what it defines as secular trends: hydrogen, electrification, and thermal management. Since 2023, its headquarters run entirely on a self-produced 134-module photovoltaic grid.</p>
                    <div className="nl-member-fit">
                      <div className="l">Ecosystem fit</div>
                      <p className="t">Automation &amp; process engineering &middot; Industrial sustainability &middot; Biomanufacturing infrastructure support</p>
                    </div>
                  </div>
                </div>
              </div>

              <span className="nl-kicker">04 / Members only</span>
              <h2>Something is coming for our members.</h2>
              <p>We are organising our first informal catch-up session exclusively for Foundation members. A chance to connect, share progress across active projects, welcome new faces, and align on priorities for the second half of 2026.</p>

              <div className="nl-event">
                <span className="eye">👀 Keep an eye on your inbox</span>
                <h3>Project Genesis: Members Catch-Up</h3>
                <div className="meta">Online &middot; Members only &middot; June 2026</div>
                <p>Date and link will be shared directly with all registered members via email. Make sure your contact details are up to date and watch for our invitation. If you have questions or topics to propose for the agenda, reach out in advance.</p>
                <a href="mailto:info@bioergotech.org">→ info@bioergotech.org</a>
              </div>

            </div>
          </div>

        </div>
      </div>
      <SiteFooter />
    </>
  );
}
