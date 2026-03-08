/* =========================================
   bioERGOtech Foundation — Shared JavaScript
   ========================================= */

document.addEventListener('DOMContentLoaded', function () {
    setupScrollListeners();
    setupNavHighlighting();
    setupMobileMenu();
    setupBackToTop();
});

/* --- Scroll: navbar shrink + progress bar --- */
function setupScrollListeners() {
    var navbar = document.getElementById('navbar');
    var progressBar = document.getElementById('progressBar');

    if (!navbar || !progressBar) return;

    window.addEventListener('scroll', function () {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        var scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        var scrolled = (window.scrollY / scrollHeight) * 100;
        progressBar.style.width = scrolled + '%';

        if (typeof checkReveal === 'function') checkReveal();
    });
}

/* --- Active section highlighting in nav --- */
function setupNavHighlighting() {
    var sections = document.querySelectorAll('section[id]');
    var navLinks = document.querySelectorAll('.nav-link');
    var quickDots = document.querySelectorAll('.quick-nav-dot');

    window.addEventListener('scroll', function () {
        var current = '';

        sections.forEach(function (section) {
            if (window.pageYOffset >= section.offsetTop - 200) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(function (link) {
            link.classList.remove('active');
            var href = link.getAttribute('href');
            if (href && href.substring(1) === current) {
                link.classList.add('active');
            }
        });

        quickDots.forEach(function (dot) {
            dot.classList.remove('active');
            if (dot.getAttribute('data-target') === current) {
                dot.classList.add('active');
            }
        });
    });
}

/* --- Mobile menu toggle --- */
function setupMobileMenu() {
    var menuToggle = document.getElementById('menuToggle');
    var mobileMenu = document.getElementById('mobileMenu');
    var mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
    var closeMenu = document.getElementById('closeMenu');

    if (!menuToggle || !mobileMenu) return;

    menuToggle.addEventListener('click', function () {
        menuToggle.classList.toggle('active');
        mobileMenu.classList.toggle('active');
    });

    mobileNavLinks.forEach(function (link) {
        link.addEventListener('click', function () {
            menuToggle.classList.remove('active');
            mobileMenu.classList.remove('active');
        });
    });

    if (closeMenu) {
        closeMenu.addEventListener('click', function (e) {
            e.preventDefault();
            menuToggle.classList.remove('active');
            mobileMenu.classList.remove('active');
        });
    }
}

/* --- Back-to-top button --- */
function setupBackToTop() {
    var backToTop = document.getElementById('backToTop');
    if (!backToTop) return;

    window.addEventListener('scroll', function () {
        if (window.scrollY > 500) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    });

    backToTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}
