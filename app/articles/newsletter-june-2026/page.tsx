import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Newsletter — Founding Edition, June 2026 | bioERGOtech",
  description:
    "bioERGOtech is live. Read our founding newsletter — covering our launch, research pillars, first members, and upcoming events.",
};

export default function NewsletterJune2026() {
  return (
    <main style={{ background: "#F7F9FC", minHeight: "100vh", padding: "48px 16px 80px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
          *{box-sizing:border-box;}
          .nl{max-width:640px;margin:0 auto;font-family:'DM Sans',sans-serif;color:#1A2332;}
          .hero{background:#071410;padding:0;overflow:hidden;border-radius:10px 10px 0 0;position:relative;}
          .hero-topbar{display:flex;justify-content:space-between;align-items:center;padding:9px 28px;border-bottom:1px solid #1a3028;}
          .hero-topbar span{font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#3a6050;}
          .hero-body{padding:28px 28px 32px;position:relative;}
          .teal-bar{position:absolute;left:0;top:0;bottom:0;width:4px;background:#1D9E75;}
          .logo-row{display:flex;align-items:baseline;gap:0;margin-bottom:4px;}
          .logo-bio,.logo-tech{font-family:'DM Serif Display',serif;font-size:32px;color:#fff;}
          .logo-ergo{font-family:'DM Serif Display',serif;font-size:32px;color:#1D9E75;}
          .issue-tag{font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#3a6050;margin-bottom:22px;margin-top:2px;}
          .hero-rule{height:1px;background:linear-gradient(90deg,#1D9E75 0%,transparent 100%);margin-bottom:20px;opacity:.35;}
          .hero-headline{font-family:'DM Serif Display',serif;font-size:30px;color:#fff;line-height:1.2;margin-bottom:10px;}
          .hero-sub{font-size:13px;color:#7aab93;line-height:1.75;max-width:520px;}
          .body{background:#fff;padding:0 28px;}
          .section{padding:26px 0;border-bottom:.5px solid #E2E8F0;}
          .section:last-child{border-bottom:none;}
          .section-label{font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#1D9E75;font-weight:600;margin-bottom:8px;}
          .teal-rule{width:32px;height:2px;background:#1D9E75;margin-bottom:10px;border-radius:1px;}
          .section-title{font-family:'DM Serif Display',serif;font-size:21px;color:#1A2332;margin-bottom:12px;line-height:1.25;}
          .body-text{font-size:13.5px;color:#4A5568;line-height:1.8;}
          .body-text+.body-text{margin-top:10px;}
          .hubs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:16px;}
          .hub{background:#E1F5EE;border:.5px solid #9FE1CB;border-radius:6px;padding:10px 12px;display:flex;align-items:flex-start;gap:8px;}
          .hub-dot{width:6px;height:6px;border-radius:50%;background:#1D9E75;flex-shrink:0;margin-top:4px;}
          .hub-city{font-size:11.5px;font-weight:600;color:#085041;}
          .hub-role{font-size:10px;color:#0F6E56;margin-top:1px;}
          .pillars-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px;}
          .pillar-card{background:#F8FAFB;border:.5px solid #E2E8F0;border-radius:8px;overflow:hidden;}
          .pillar-top{background:#1D9E75;padding:12px 14px 10px;}
          .pillar-num{font-size:9px;font-weight:600;letter-spacing:.12em;color:#9FE1CB;margin-bottom:4px;}
          .pillar-name{font-family:'DM Serif Display',serif;font-size:15px;color:#fff;line-height:1.25;}
          .pillar-body{padding:12px 14px;}
          .pillar-desc{font-size:11.5px;color:#4A5568;line-height:1.7;}
          .pillars-strip{background:#071410;border-radius:6px;padding:11px 16px;margin-top:10px;font-size:11px;color:#5DCAA5;text-align:center;letter-spacing:.02em;font-style:italic;}
          .event-card{background:#E1F5EE;border:.5px solid #9FE1CB;border-radius:8px;padding:18px 20px;margin-top:16px;display:flex;gap:18px;position:relative;overflow:hidden;}
          .event-accent{position:absolute;left:0;top:0;bottom:0;width:4px;background:#1D9E75;}
          .event-title{font-family:'DM Serif Display',serif;font-size:15px;color:#071410;margin-bottom:4px;}
          .event-meta{font-size:10.5px;color:#0F6E56;font-weight:600;letter-spacing:.04em;margin-bottom:8px;}
          .event-desc{font-size:12px;color:#085041;line-height:1.7;}
          .event-cta{display:inline-block;margin-top:10px;font-size:10.5px;font-weight:600;color:#1D9E75;letter-spacing:.04em;}
          .event-eye{background:#fff;border:.5px solid #9FE1CB;border-radius:20px;padding:4px 12px;display:inline-block;font-size:10px;color:#0F6E56;font-weight:600;letter-spacing:.06em;margin-bottom:10px;}
          .members-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px;}
          .member-card{background:#F8FAFB;border:.5px solid #E2E8F0;border-radius:8px;overflow:hidden;}
          .member-head{background:#071410;padding:14px;}
          .member-num{display:inline-block;background:#1D9E75;color:#fff;font-size:9px;font-weight:600;border-radius:12px;padding:2px 8px;margin-bottom:6px;letter-spacing:.06em;}
          .member-name{font-family:'DM Serif Display',serif;font-size:15px;color:#fff;margin-bottom:3px;}
          .member-loc{font-size:10px;color:#3a6050;}
          .member-badge{background:#0F6E56;color:#9FE1CB;font-size:9px;font-weight:600;letter-spacing:.06em;padding:3px 8px;border-radius:4px;display:inline-block;margin-top:6px;}
          .member-body-wrap{padding:12px 14px;}
          .member-desc{font-size:11.5px;color:#4A5568;line-height:1.7;}
          .member-fit{margin-top:10px;padding-top:8px;border-top:.5px solid #E2E8F0;}
          .member-fit-label{font-size:9px;font-weight:600;letter-spacing:.1em;color:#1D9E75;text-transform:uppercase;margin-bottom:3px;}
          .member-fit-text{font-size:10.5px;color:#4A5568;font-style:italic;line-height:1.6;}
          .footer{background:#071410;padding:20px 28px;border-radius:0 0 10px 10px;}
          .footer-logo{font-family:'DM Serif Display',serif;font-size:16px;margin-bottom:5px;}
          .footer-logo .tl{color:#1D9E75;}
          .footer-logo .wt{color:#fff;}
          .footer-links{display:flex;gap:14px;margin-bottom:12px;flex-wrap:wrap;}
          .footer-links a{font-size:10px;color:#5DCAA5;text-decoration:none;letter-spacing:.04em;}
          .footer-rule{height:.5px;background:#1a3028;margin-bottom:10px;}
          .footer-meta{font-size:10px;color:#3a6050;line-height:1.7;}
        `}</style>

        <div className="nl">
          {/* HERO */}
          <div className="hero">
            <div className="hero-topbar">
              <span>Fondazione bioERGOtech ETS</span>
              <span>Issue #1 &nbsp;·&nbsp; June 2026</span>
            </div>
            <div className="hero-body">
              <div className="teal-bar"></div>
              <div className="logo-row">
                <span className="logo-bio">bio</span>
                <span className="logo-ergo">ERGO</span>
                <span className="logo-tech">tech</span>
              </div>
              <div className="issue-tag">Newsletter &nbsp;·&nbsp; Founding Edition</div>
              <div className="hero-rule"></div>
              <div className="hero-headline">A foundation is born.</div>
              <div className="hero-sub">bioERGOtech is live. We are building the ecosystem where diverse competencies meet, resources are shared, and collaboration replaces competition.</div>
            </div>
          </div>

          <div className="body">
            {/* SECTION 1 */}
            <div className="section">
              <div className="section-label">The beginning</div>
              <div className="teal-rule"></div>
              <div className="section-title">bioERGOtech is officially live.</div>
              <p className="body-text">Founded on <strong>12 April 2025</strong> in Taranto, Puglia, Fondazione bioERGOtech ETS is a participation foundation under the Italian Third Sector Code (D.Lgs. 117/2017). Its mission is clear: accelerate healthcare innovation through digital scientists, and transform concrete clinical needs into sustainable commercial solutions.</p>
              <p className="body-text">bioERGOtech operates as a collaborative ecosystem bringing together specialised companies, research institutions, healthcare professionals, and entrepreneurs. Three strategic hubs anchor the network.</p>
              <div className="hubs">
                <div className="hub"><div className="hub-dot"></div><div><div className="hub-city">Taranto, Italy</div><div className="hub-role">Experimental Hub</div></div></div>
                <div className="hub"><div className="hub-dot"></div><div><div className="hub-city">Zurich, Switzerland</div><div className="hub-role">Talent &amp; Innovation Hub</div></div></div>
                <div className="hub"><div className="hub-dot"></div><div><div className="hub-city">Riyadh, Saudi Arabia</div><div className="hub-role">Clinical Translation Hub</div></div></div>
              </div>
            </div>

            {/* SECTION 2 */}
            <div className="section">
              <div className="section-label">Research framework</div>
              <div className="teal-rule"></div>
              <div className="section-title">Four pillars. One integrated system.</div>
              <p className="body-text">bioERGOtech organises its research across four integrated pillars. Each is powerful on its own. Together, they form a single system for creating predictable, manufacturable, controllable living medicines.</p>
              <div className="pillars-grid">
                <div className="pillar-card">
                  <div className="pillar-top"><div className="pillar-num">PILLAR 01</div><div className="pillar-name">Digital Twin Therapeutics</div></div>
                  <div className="pillar-body"><p className="pillar-desc">Patient-specific computational models that predict therapeutic outcomes and enable real-time treatment optimisation, powered by AI and mechanistic modelling of immune dynamics and disease progression.</p></div>
                </div>
                <div className="pillar-card">
                  <div className="pillar-top"><div className="pillar-num">PILLAR 02</div><div className="pillar-name">Synthetic Biology &amp; Cell Engineering</div></div>
                  <div className="pillar-body"><p className="pillar-desc">Design of programmable cellular systems with precise control over therapeutic function, safety, and persistence. From CRISPR editing to CAR/synthetic receptor design and next-generation armoured constructs.</p></div>
                </div>
                <div className="pillar-card">
                  <div className="pillar-top"><div className="pillar-num">PILLAR 03</div><div className="pillar-name">Automated Biomanufacturing &amp; Control</div></div>
                  <div className="pillar-body"><p className="pillar-desc">Fully integrated robotic platforms manufacturing cell therapies in under 48 hours with minimal human intervention. Closed-loop control and AI-driven optimisation maximise potency, yield, and consistency.</p></div>
                </div>
                <div className="pillar-card">
                  <div className="pillar-top"><div className="pillar-num">PILLAR 04</div><div className="pillar-name">Integrated Multi-Omics Analytics</div></div>
                  <div className="pillar-body"><p className="pillar-desc">Comprehensive molecular profiling throughout manufacturing and treatment. Simultaneous genomics, transcriptomics, proteomics, and metabolomics linking data directly to digital twins and clinical outcomes.</p></div>
                </div>
              </div>
              <div className="pillars-strip">Digital twins predict the design &nbsp;·&nbsp; Synthetic biology engineers it &nbsp;·&nbsp; Automation produces it &nbsp;·&nbsp; Multi-omics validates it</div>
            </div>

            {/* SECTION 3 */}
            <div className="section">
              <div className="section-label">Members only</div>
              <div className="teal-rule"></div>
              <div className="section-title">Something is coming for our members.</div>
              <p className="body-text">We are organising our first informal catch-up session exclusively for Foundation members. A chance to connect, share progress across active projects, welcome new faces, and align on priorities for the second half of 2026.</p>
              <div className="event-card">
                <div className="event-accent"></div>
                <div style={{ flex: 1 }}>
                  <div className="event-eye">👀 &nbsp;Keep an eye on your inbox</div>
                  <div className="event-title">Project Genesis: Members Catch-Up</div>
                  <div className="event-meta">Online &nbsp;·&nbsp; Members only &nbsp;·&nbsp; June 2026</div>
                  <p className="event-desc">Date and link will be shared directly with all registered members via email. Make sure your contact details are up to date and watch for our invitation. If you have questions or topics to propose for the agenda, reach out in advance.</p>
                  <div className="event-cta">→ &nbsp;info@bioergotech.org</div>
                </div>
              </div>
            </div>

            {/* SECTION 4 */}
            <div className="section">
              <div className="section-label">Member spotlight</div>
              <div className="teal-rule"></div>
              <div className="section-title">Welcome to the first two members.</div>
              <p className="body-text">Two organisations have joined the Foundation as founding members, bringing complementary expertise rooted in the Puglia region and directly aligned with bioERGOtech&apos;s mission.</p>
              <div className="members-grid">
                <div className="member-card">
                  <div className="member-head">
                    <div className="member-num">MEMBER 01</div>
                    <div className="member-name">Predict Healthcare</div>
                    <div className="member-loc">Bari (BA), Puglia &nbsp;·&nbsp; predictcare.it</div>
                    <div className="member-badge">SME &nbsp;·&nbsp; Medical Imaging</div>
                  </div>
                  <div className="member-body-wrap">
                    <p className="member-desc">Founded in 2008 in Bari, Predict Healthcare commercialises advanced diagnostic imaging systems including ultrasound and radiology platforms. As an authorised GE Healthcare distributor for Puglia and a provider of turnkey radiology departments, the company bridges clinical infrastructure and cutting-edge technology.</p>
                    <div className="member-fit">
                      <div className="member-fit-label">Ecosystem fit</div>
                      <div className="member-fit-text">Clinical diagnostics infrastructure · Regional healthcare access · Medical imaging technology</div>
                    </div>
                  </div>
                </div>
                <div className="member-card">
                  <div className="member-head">
                    <div className="member-num">MEMBER 02</div>
                    <div className="member-name">Priver</div>
                    <div className="member-loc">Carosino (TA), Puglia &nbsp;·&nbsp; priver.it</div>
                    <div className="member-badge">SME &nbsp;·&nbsp; Industrial Engineering</div>
                  </div>
                  <div className="member-body-wrap">
                    <p className="member-desc">Operating from Carosino (Taranto) since the early 1980s, Priver designs and builds industrial systems across hydraulics, pneumatics, electromechanics, and automation. Since 2023, its headquarters run entirely on a self-produced 134-module photovoltaic grid.</p>
                    <div className="member-fit">
                      <div className="member-fit-label">Ecosystem fit</div>
                      <div className="member-fit-text">Automation &amp; process engineering · Industrial sustainability · Biomanufacturing infrastructure support</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="footer">
            <div className="footer-logo"><span className="wt">bio</span><span className="tl">ERGO</span><span className="wt">tech</span></div>
            <div className="footer-links">
              <a href="https://bioergotech.org">bioergotech.org</a>
              <a href="/join-us">Join us</a>
              <a href="/articles">Articles</a>
              <a href="mailto:info@bioergotech.org">Contact</a>
            </div>
            <div className="footer-rule"></div>
            <div className="footer-meta">
              Fondazione bioERGOtech ETS &nbsp;·&nbsp; Via Ciro Giovinazzi 70, 74123 Taranto, Italia &nbsp;·&nbsp; C.F. 90287640735<br />
              info@bioergotech.org &nbsp;·&nbsp; GDPR-compliant.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
