const fs = require('fs');
const f = 'app/courses/agentic-ai/CourseIntroClient.tsx';
let c = fs.readFileSync(f, 'utf8');
let count = 0;

// Replace all white rgba colours in body (outside hero) with proper token references
const replacements = [
  ['color: "rgba(255,255,255,0.85)"', 'color: TEXT_MID'],
  ['color: "rgba(255,255,255,0.72)"', 'color: TEXT_MID'],
  ['color: "rgba(255,255,255,0.6)"',  'color: TEXT_MID'],
  ['color: "rgba(255,255,255,0.55)"', 'color: TEXT_LIGHT'],
  ['color: "rgba(255,255,255,0.7)"',  'color: TEXT_LIGHT'],
];

// Find where the hero ends and body begins so we only fix body colours
const bodyStart = c.indexOf('{/* \u2500\u2500 Body \u2500\u2500 */}');
if (bodyStart === -1) { console.error('Body marker not found'); process.exit(1); }

const hero = c.slice(0, bodyStart);
let body = c.slice(bodyStart);

replacements.forEach(([from, to]) => {
  let idx = body.indexOf(from);
  while (idx !== -1) {
    body = body.slice(0, idx) + to + body.slice(idx + from.length);
    count++;
    idx = body.indexOf(from);
  }
});

fs.writeFileSync(f, hero + body, 'utf8');
console.log('Fixed ' + count + ' colour values in body section');
