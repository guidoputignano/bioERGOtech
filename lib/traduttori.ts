/**
 * Google Translate, and browser extensions that rewrite text, replace the
 * page's text nodes with their own (`<font>` around the translation). React
 * keeps references to the original nodes: when it later inserts or removes
 * next to one that is no longer there, the browser throws "insertBefore /
 * removeChild: not a child of this node", React stops, and the site shows
 * "This page couldn't load". It happened to a teacher whose Chrome
 * translated every page "from English", because the site declared itself
 * English.
 *
 * This script runs before React and makes those two operations tolerant:
 * removing a node that has already left is a no-op, and inserting before a
 * node that has left appends instead. The translated text can then lag
 * behind, but the page keeps working. It is the workaround suggested by the
 * React team (facebook/react#11538). The Italian pages also declare their
 * language (`app/eventi/layout.tsx`), and the reserved areas are not
 * translated at all (`translate="no"`), so data never goes stale there.
 */
export const SCRIPT_TRADUTTORI = `(function () {
  if (typeof Node !== "function" || !Node.prototype || Node.prototype.__tolleraTraduttori) return;
  Node.prototype.__tolleraTraduttori = true;
  var rimuovi = Node.prototype.removeChild;
  Node.prototype.removeChild = function (figlio) {
    if (figlio && figlio.parentNode !== this) return figlio;
    return rimuovi.apply(this, arguments);
  };
  var inserisci = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (nuovo, riferimento) {
    if (riferimento && riferimento.parentNode !== this) return inserisci.call(this, nuovo, null);
    return inserisci.apply(this, arguments);
  };
})();`;
