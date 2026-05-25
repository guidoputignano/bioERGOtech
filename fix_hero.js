const fs = require('fs');
const f = 'app/courses/agentic-ai/CourseIntroClient.tsx';
let c = fs.readFileSync(f, 'utf8');

const heroStart = c.indexOf('{/* \u2500\u2500 Hero \u2500\u2500 */');
const bodyStart = c.indexOf('{/* \u2500\u2500 Body \u2500\u2500 */');

if (heroStart === -1 || bodyStart === -1) {
  console.error('Markers not found. hero=' + heroStart + ' body=' + bodyStart);
  process.exit(1);
}

const newHero = [
  "      {/* \u2500\u2500 Hero \u2500\u2500 */}",
  "      <div style={{ background: '#00C896', padding: '80px 24px 0', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>",
  "        {/* Dot pattern overlay */}",
  "        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.09) 1px, transparent 1px)', backgroundSize: '24px 24px', pointerEvents: 'none' }} />",
  "        {/* Badge */}",
  "        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.4)', color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 16px', borderRadius: 20, marginBottom: 28, position: 'relative', zIndex: 1 }}>",
  "          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />",
  "          Free Program \xb7 Open Enrollment",
  "        </div>",
  "        {/* H1 */}",
  "        <h1 style={{ fontFamily: \"'Sora', sans-serif\", fontSize: 'clamp(30px, 5vw, 52px)', fontWeight: 800, lineHeight: 1.12, margin: '0 auto 20px', maxWidth: 720, color: '#fff', position: 'relative', zIndex: 1 }}>",
  "          Agentic AI{\" \"}",
  "          <span style={{ color: '#0A1628' }}>High School</span>",
  "          <br />Innovation Program",
  "        </h1>",
  "        {/* Subtitle */}",
  "        <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.82)', maxWidth: 520, margin: '0 auto 56px', lineHeight: 1.7, position: 'relative', zIndex: 1 }}>",
  "          Go from understanding what AI agents are to building and demonstrating a working prototype \u2014 no prior coding experience required.",
  "        </p>",
  "        {/* Stats card */}",
  "        <div style={{ display: 'inline-flex', background: '#fff', borderRadius: '20px 20px 0 0', padding: '28px 0', boxShadow: '0 -8px 40px rgba(0,0,0,0.12)', position: 'relative', zIndex: 2 }}>",
  "          {[",
  "            { num: '10',   label: 'Weeks' },",
  "            { num: '21+',  label: 'Lessons' },",
  "            { num: '3',    label: 'Technical Tracks' },",
  "            { num: '100%', label: 'Free Forever' },",
  "          ].map(({ num, label }, i) => (",
  "            <div key={label} style={{ textAlign: 'center', padding: '0 44px', borderLeft: i > 0 ? '1px solid #E2E8F0' : 'none' }}>",
  "              <div style={{ fontFamily: \"'Sora', sans-serif\", fontSize: 34, fontWeight: 800, color: '#0A1628', lineHeight: 1 }}>{num}</div>",
  "              <div style={{ fontSize: 11, color: '#718096', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700, marginTop: 6 }}>{label}</div>",
  "            </div>",
  "          ))}",
  "        </div>",
  "      </div>",
  "      "
].join('\n');

c = c.slice(0, heroStart) + newHero + c.slice(bodyStart);
fs.writeFileSync(f, c, 'utf8');
console.log('Done — hero replaced successfully');
