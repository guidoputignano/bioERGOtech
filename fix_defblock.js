const fs = require('fs');
const f = 'app/courses/agentic-ai/CourseIntroClient.tsx';
let c = fs.readFileSync(f, 'utf8');
let count = 0;

const fixes = [
  // DefBlock background — was designed for dark bg, needs proper light bg now
  ['background: "rgba(255,255,255,0.2)",\n        borderRadius: "0 8px 8px 0"',
   'background: TEAL_LIGHT,\n        borderRadius: "0 8px 8px 0"'],

  // Any other rgba white backgrounds in components
  ['background: "rgba(255,255,255,0.15)"', 'background: TEAL_LIGHT'],
  ['background: "rgba(255,255,255,0.1)"',  'background: TEAL_LIGHT'],

  // White text colours that may still exist in component definitions (not hero)
  ['color: "#fff",\n          marginBottom', 'color: TEXT,\n          marginBottom'],
];

fixes.forEach(([from, to]) => {
  if (c.includes(from)) {
    c = c.split(from).join(to);
    count++;
    console.log('Fixed: ' + from.slice(0, 50));
  }
});

fs.writeFileSync(f, c, 'utf8');
console.log('\nTotal fixes: ' + count);
