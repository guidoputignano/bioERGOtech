/**
 * Escapes text for an HTML email. Anything a student typed (name, question,
 * comment) goes through this, so nobody can put links or markup into a
 * message sent under the bioERGOtech name.
 */
export const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
