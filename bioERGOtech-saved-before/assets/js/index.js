/* =========================================
   bioERGOtech Foundation — Homepage JavaScript
   ========================================= */

document.addEventListener('DOMContentLoaded', function () {
    createTechLines();
    createDnaAnimation();
    createParticles();
    initCounters();
    initTypingAnimation();
    setupQuickNavigation();
    initRevealAnimations();
});

/* --- Tech Lines (hero background) --- */
function createTechLines() {
    var el = document.getElementById('techLines');
    if (!el) return;
    for (var i = 0; i < 10; i++) {
        var line = document.createElement('div');
        line.className = 'tech-line';
        line.style.left = Math.random() * 100 + '%';
        line.style.animation = 'tech-line-animation ' + (5 + Math.random() * 10) + 's infinite ' + (Math.random() * 5) + 's';
        el.appendChild(line);
    }
}

/* --- DNA Helix --- */
function createDnaAnimation() {
    var el = document.getElementById('dnaAnimation');
    if (!el) return;
    var helix = document.createElement('div');
    helix.className = 'dna-helix';
    el.appendChild(helix);
    var count = 20;
    var step = 360 / count;
    for (var i = 0; i < count; i++) {
        for (var n = 0; n < 2; n++) {
            var strand = document.createElement('div');
            strand.className = 'dna-strand';
            strand.style.top = i * 20 + 'px';
            strand.style.transform = 'rotateY(' + (i * step + 180 * n) + 'deg) translateZ(30px)';
            helix.appendChild(strand);
        }
    }
}

/* --- Particles --- */
function createParticles() {
    var el = document.getElementById('particles');
    if (!el) return;
    for (var i = 0; i < 30; i++) {
        var p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.top  = Math.random() * 100 + '%';
        p.style.opacity = Math.random() * .5;
        var size = 2 + Math.random() * 4 + 'px';
        p.style.width  = size;
        p.style.height = size;
        p.style.animation = 'particle-animation ' + (10 + Math.random() * 20) + 's linear infinite ' + (Math.random() * 5) + 's';
        el.appendChild(p);
    }
}

/* --- Counter Animation --- */
function initCounters() {
    var counters = document.querySelectorAll('.counter-value');
    if (!counters.length) return;
    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                var target = entry.target;
                var end = parseInt(target.getAttribute('data-count'));
                var current = 0;
                var step = end / 200;
                (function tick() {
                    if (current < end) {
                        current += step;
                        target.innerText = Math.ceil(current);
                        setTimeout(tick, 1);
                    } else {
                        target.innerText = end;
                    }
                })();
                observer.unobserve(target);
            }
        });
    }, { threshold: .5 });
    counters.forEach(function (c) { observer.observe(c); });
}

/* --- Typing Animation --- */
function initTypingAnimation() {
    var el = document.getElementById('typingText');
    if (!el) return;
    var words = ['smarter', 'efficient', 'intelligent', 'optimized', 'precise'];
    var idx = 0;
    (function cycle() {
        el.textContent = words[idx];
        idx = (idx + 1) % words.length;
        setTimeout(cycle, 3000);
    })();
}

/* --- Quick Navigation Dots --- */
function setupQuickNavigation() {
    document.querySelectorAll('.quick-nav-dot').forEach(function (dot) {
        dot.addEventListener('click', function () {
            var target = document.getElementById(dot.getAttribute('data-target'));
            if (target) window.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
        });
    });
}

/* --- Reveal on Scroll --- */
function initRevealAnimations() {
    window.addEventListener('load', checkReveal);
    window.addEventListener('scroll', checkReveal);
}

function checkReveal() {
    document.querySelectorAll('.reveal').forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight - 100) {
            el.classList.add('active');
        }
    });
}

/* --- News Horizontal Scroll --- */
function scrollNews(direction) {
    var container = document.querySelector('.overflow-x-auto');
    if (!container) return;
    var amount = 300;
    container.scrollBy({
        left: direction === 'left' ? -amount : amount,
        behavior: 'smooth'
    });
}
