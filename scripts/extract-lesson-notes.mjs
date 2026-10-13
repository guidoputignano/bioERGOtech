/**
 * Builds lib/course/lesson-notes.json: the plain text of every lesson page.
 *
 * The admin "Draft reply" button gives Claude the lesson a student is asking
 * about, so the draft answers from what the course actually taught. The
 * lessons live as JSX in LessonPageClient.tsx, which the server cannot render
 * outside the page, so this script reads the source once and keeps the text.
 *
 * Re-run after editing lesson content:
 *
 *   node scripts/extract-lesson-notes.mjs
 */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const SOURCE = "app/courses/agentic-ai/lesson/[slug]/LessonPageClient.tsx";
const OUT = "lib/course/lesson-notes.json";

// Attributes that hold styling, URLs or ids rather than words a student reads.
const SKIP_ATTRS = new Set(["style", "src", "href", "id", "key", "className", "variant", "handle", "alt"]);

const text = fs.readFileSync(SOURCE, "utf8");
const sf = ts.createSourceFile(SOURCE, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

// slug -> component name, from the LESSON_CONTENT map.
const slugToComponent = new Map();
const components = new Map();
sf.forEachChild((node) => {
  if (ts.isFunctionDeclaration(node) && node.name) components.set(node.name.text, node);
  if (ts.isVariableStatement(node)) {
    for (const d of node.declarationList.declarations) {
      if (d.name.getText(sf) === "LESSON_CONTENT" && d.initializer && ts.isObjectLiteralExpression(d.initializer)) {
        for (const p of d.initializer.properties) {
          if (ts.isPropertyAssignment(p)) {
            slugToComponent.set(p.name.getText(sf).replace(/^["']|["']$/g, ""), p.initializer.getText(sf));
          }
        }
      }
    }
  }
});

function collect(node, out) {
  if (ts.isJsxAttribute(node) && SKIP_ATTRS.has(node.name.getText(sf))) return;
  if (ts.isJsxText(node)) {
    const t = node.getText(sf).replace(/\s+/g, " ").trim();
    if (t) out.push(t);
    return;
  }
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    const t = node.text.trim();
    // Prose only: skip colours, CSS values, file paths and single tokens.
    if (t.includes(" ") && !/^#[0-9a-f]{3,8}$/i.test(t) && !t.startsWith("/")) out.push(t);
    return;
  }
  node.forEachChild((c) => collect(c, out));
}

const notes = {};
for (const [slug, name] of slugToComponent) {
  const fn = components.get(name);
  if (!fn) continue;
  const parts = [];
  collect(fn, parts);
  notes[slug] = parts.join("\n").replace(/\n{3,}/g, "\n\n");
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(notes, null, 2) + "\n");
const words = Object.values(notes).join(" ").split(/\s+/).length;
console.log(`Wrote ${Object.keys(notes).length} lessons (${words} words) to ${OUT}`);
