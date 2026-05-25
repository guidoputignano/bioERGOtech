const fs = require('fs');
const f = 'app/courses/agentic-ai/CourseIntroClient.tsx';
let c = fs.readFileSync(f, 'utf8');
let count = 0;

const fixes = [
  // DefBlock outer div background
  ['background: "rgba(255,255,255,0.2)",', 'background: TEAL_LIGHT,'],
  // DefBlock children text colour
  ['fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 1.65', 'fontSize: 14, color: TEXT_MID, lineHeight: 1.65'],
];

fixes.forEach(([from, to]) => {
  if (c.includes(from)) {
    c = c.split(from).join(to);
    count++;
    console.log('Fixed: ' + from);
  } else {
    console.log('NOT FOUND: ' + from);
  }
});

fs.writeFileSync(f, c, 'utf8');
console.log('\nTotal fixes: ' + count);
