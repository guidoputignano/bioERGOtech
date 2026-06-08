const fs = require('fs');
const f = 'app/page.tsx';
let c = fs.readFileSync(f, 'utf8');

const courseSection = `
      {/* ── Agentic AI Course ── */}
      <section className="section" id="courses">
        <div className="container mx-auto px-6">
          <h2 className="section-title">Learn to build AI agents</h2>
          <p className="text-lg text-gray-700 max-w-3xl mb-12">
            A free 10-week programme for high school students. Go from understanding what AI agents are to building and demonstrating a working prototype — no prior coding experience required.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <div className="md:col-span-2 bg-white rounded-xl shadow-lg overflow-hidden block course-card-hover">
              <div className="w-full h-48 flex flex-col justify-end p-8" style={{ background: "linear-gradient(135deg, #071410 0%, #0a2a1f 100%)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#3a6050", marginBottom: 8 }}>Free Program · Open Enrollment</div>
                <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 800, color: "#fff", lineHeight: 1.2, margin: 0 }}>
                  Agentic AI <span style={{ color: "#1D9E75" }}>High School</span> Innovation Program
                </h3>
              </div>
              <div className="p-6">
                <div className="flex gap-6 mb-4">
                  {[["10", "Weeks"], ["21+", "Lessons"], ["3", "Technical Tracks"], ["100%", "Free"]].map(([num, label]) => (
                    <div key={label} className="text-center">
                      <div style={{ fontSize: 20, fontWeight: 800, color: "var(--primary)", fontFamily: "'Sora', sans-serif" }}>{num}</div>
                      <div style={{ fontSize: 11, color: "#718096" }}>{label}</div>
                    </div>
                  ))}
                </div>
                <p className="text-gray-600 text-sm mb-4">Build real AI agents that solve genuine problems. Choose your track — no-code, low-code, or full-code. Earn a verified certificate on completion.</p>
                <Link href="/courses/agentic-ai" className="btn-primary inline-block">Start learning →</Link>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              {[
                { icon: "🧠", title: "AI Foundations", desc: "Understand how LLMs and agents actually work." },
                { icon: "🛠", title: "Build a prototype", desc: "Ship a working agent in your chosen domain." },
                { icon: "🎓", title: "Verified certificate", desc: "Earn a certificate issued by the Foundation." },
              ].map((item) => (
                <div key={item.title} className="bg-white rounded-xl p-5 shadow" style={{ borderLeft: "3px solid var(--primary)" }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{item.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#1A2332", marginBottom: 4 }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: "#4A5568" }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
`;

// Find the community section marker
const marker = "      {/* \u2500\u2500 Who\u2019s already part of it \u2500\u2500 */}";
const marker2 = "      {/* \u2500\u2500 Who's already part of it \u2500\u2500 */}";

if (c.includes(marker)) {
  c = c.replace(marker, courseSection + '\n' + marker);
  fs.writeFileSync(f, c, 'utf8');
  console.log('Done — course section added (marker 1)');
} else if (c.includes(marker2)) {
  c = c.replace(marker2, courseSection + '\n' + marker2);
  fs.writeFileSync(f, c, 'utf8');
  console.log('Done — course section added (marker 2)');
} else {
  // Find it by searching for the community section id
  const fallback = 'id="community"';
  const idx = c.indexOf(fallback);
  if (idx !== -1) {
    // Find the start of that section tag
    const sectionStart = c.lastIndexOf('<section', idx);
    c = c.slice(0, sectionStart) + courseSection + '\n      ' + c.slice(sectionStart);
    fs.writeFileSync(f, c, 'utf8');
    console.log('Done — course section added (fallback)');
  } else {
    console.log('Could not find insertion point');
  }
}
