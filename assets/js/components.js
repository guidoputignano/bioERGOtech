/* =========================================
   bioERGOtech Foundation — Component Loader
   Injects shared header and footer from HTML
   snippets so they are maintained in one place.
   ========================================= */

(function () {
    var headerEl = document.getElementById('site-header');
    var footerEl = document.getElementById('site-footer');

    function load(url, target, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                target.innerHTML = xhr.responseText;
                if (callback) callback();
            }
        };
        xhr.send();
    }

    var pending = 0;

    function done() {
        pending--;
        if (pending === 0) {
            /* Re-initialise main.js listeners after components are injected */
            if (typeof setupScrollListeners === 'function') setupScrollListeners();
            if (typeof setupNavHighlighting === 'function') setupNavHighlighting();
            if (typeof setupMobileMenu === 'function') setupMobileMenu();
            if (typeof setupBackToTop === 'function') setupBackToTop();
        }
    }

    if (headerEl) { pending++; load('/assets/components/header.html', headerEl, done); }
    if (footerEl) { pending++; load('/assets/components/footer.html', footerEl, done); }
})();
