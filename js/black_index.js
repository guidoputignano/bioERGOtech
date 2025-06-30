
        // Initialize AOS animations
        document.addEventListener('DOMContentLoaded', function() {
            AOS.init({
                duration: 800,
                once: true,
                mirror: false
            });

            // Create tech lines animation
            createTechLines();

            // Create DNA animation
            createDnaAnimation();

            // Create particle effect
            createParticles();

            // Initialize counters
            initCounters();

            // Initialize typing animation
            initTypingAnimation();

            // Initialize custom cursor
            initCustomCursor();

            // Setup scroll listeners
            setupScrollListeners();

            // Navigation highlighting
            setupNavHighlighting();

            // Mobile menu toggle
            setupMobileMenu();

            // Quick navigation
            setupQuickNavigation();

            // Initialize reveal animations
            initRevealAnimations();

            // Setup back to top button
            setupBackToTop();
        });

        // Custom cursor
        function initCustomCursor() {
            const cursor = document.querySelector('.custom-cursor');
            const links = document.querySelectorAll('a, button, .btn-primary, .btn-outline');

            document.addEventListener('mousemove', (e) => {
                cursor.style.left = e.clientX + 'px';
                cursor.style.top = e.clientY + 'px';
            });

            links.forEach(link => {
                link.addEventListener('mouseenter', () => {
                    cursor.classList.add('cursor-grow');
                });

                link.addEventListener('mouseleave', () => {
                    cursor.classList.remove('cursor-grow');
                });
            });

            // Hide cursor when it leaves the window
            document.addEventListener('mouseleave', () => {
                cursor.style.opacity = '0';
            });

            document.addEventListener('mouseenter', () => {
                cursor.style.opacity = '0.6';
            });
        }

        // Create tech lines for hero background
        function createTechLines() {
            const techLines = document.getElementById('techLines');
            const lineCount = 10;

            for (let i = 0; i < lineCount; i++) {
                const line = document.createElement('div');
                line.className = 'tech-line';
                line.style.left = (Math.random() * 100) + '%';
                line.style.animation = `tech-line-animation ${5 + Math.random() * 10}s infinite ${Math.random() * 5}s`;
                techLines.appendChild(line);
            }
        }

        // Create DNA animation
        function createDnaAnimation() {
            const dnaAnimation = document.getElementById('dnaAnimation');
            if (!dnaAnimation) return;

            const dnaHelix = document.createElement('div');
            dnaHelix.className = 'dna-helix';
            dnaAnimation.appendChild(dnaHelix);

            const strandCount = 20;
            const strandDistance = 360 / strandCount;

            for (let i = 0; i < strandCount; i++) {
                for (let j = 0; j < 2; j++) {
                    const strand = document.createElement('div');
                    strand.className = 'dna-strand';
                    strand.style.top = (i * 20) + 'px';
                    strand.style.transform = `rotateY(${i * strandDistance + (j * 180)}deg) translateZ(30px)`;
                    dnaHelix.appendChild(strand);
                }
            }
        }

        // Create particle effect
        function createParticles() {
            const particles = document.getElementById('particles');
            if (!particles) return;

            const particleCount = 30;

            for (let i = 0; i < particleCount; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';

                const x = Math.random() * 100;
                const y = Math.random() * 100;

                particle.style.left = x + '%';
                particle.style.top = y + '%';
                particle.style.opacity = Math.random() * 0.5;
                particle.style.width = (2 + Math.random() * 4) + 'px';
                particle.style.height = particle.style.width;

                const duration = 10 + Math.random() * 20;
                const delay = Math.random() * 5;

                particle.style.animation = `particle-animation ${duration}s linear infinite ${delay}s`;

                particles.appendChild(particle);
            }
        }

        // Initialize counter animations
        function initCounters() {
            const counters = document.querySelectorAll('.counter-value');
            const speed = 200;

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const counter = entry.target;
                        const target = parseInt(counter.getAttribute('data-count'));
                        let count = 0;
                        const updateCount = () => {
                            const increment = target / speed;
                            if (count < target) {
                                count += increment;
                                counter.innerText = Math.ceil(count);
                                setTimeout(updateCount, 1);
                            } else {
                                counter.innerText = target;
                            }
                        };
                        updateCount();
                        observer.unobserve(counter);
                    }
                });
            }, { threshold: 0.5 });

            counters.forEach(counter => {
                observer.observe(counter);
            });
        }

        // Initialize typing animation for hero text
        function initTypingAnimation() {
            const typingElement = document.getElementById('typingText');
            if (!typingElement) return;

            const words = ['smarter', 'efficient', 'intelligent', 'optimized', 'precise'];
            let wordIndex = 0;

            const animateTyping = () => {
                const currentWord = words[wordIndex];
                typingElement.textContent = currentWord;

                wordIndex = (wordIndex + 1) % words.length;
                setTimeout(animateTyping, 3000);
            };

            animateTyping();
        }

        // Setup scroll listeners for scroll-based effects
        function setupScrollListeners() {
            const navbar = document.getElementById('navbar');
            const progressBar = document.getElementById('progressBar');

            window.addEventListener('scroll', () => {
                // Update navbar style on scroll
                if (window.scrollY > 50) {
                    navbar.classList.add('scrolled');
                } else {
                    navbar.classList.remove('scrolled');
                }

                // Update progress bar
                const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
                const scrolled = (window.scrollY / scrollHeight) * 100;
                progressBar.style.width = scrolled + '%';

                // Check for reveal animations
                checkReveal();
            });
        }

        // Handle navigation highlighting on scroll
        function setupNavHighlighting() {
            const sections = document.querySelectorAll('section[id]');
            const navLinks = document.querySelectorAll('.nav-link');
            const quickNavDots = document.querySelectorAll('.quick-nav-dot');

            window.addEventListener('scroll', () => {
                let current = '';

                sections.forEach(section => {
                    const sectionTop = section.offsetTop;
                    const sectionHeight = section.clientHeight;

                    if (window.pageYOffset >= (sectionTop - 200)) {
                        current = section.getAttribute('id');
                    }
                });

                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href').substring(1) === current) {
                        link.classList.add('active');
                    }
                });

                quickNavDots.forEach(dot => {
                    dot.classList.remove('active');
                    if (dot.getAttribute('data-target') === current) {
                        dot.classList.add('active');
                    }
                });
            });
        }

        // Mobile menu functionality
        function setupMobileMenu() {
            const menuToggle = document.getElementById('menuToggle');
            const mobileMenu = document.getElementById('mobileMenu');
            const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

            menuToggle.addEventListener('click', () => {
                menuToggle.classList.toggle('active');
                mobileMenu.classList.toggle('active');
            });

            mobileNavLinks.forEach(link => {
                link.addEventListener('click', () => {
                    menuToggle.classList.remove('active');
                    mobileMenu.classList.remove('active');
                });
            });
        }

        // Quick navigation dots functionality
        function setupQuickNavigation() {
            const quickNavDots = document.querySelectorAll('.quick-nav-dot');

            quickNavDots.forEach(dot => {
                dot.addEventListener('click', () => {
                    const target = document.getElementById(dot.getAttribute('data-target'));
                    window.scrollTo({
                        top: target.offsetTop,
                        behavior: 'smooth'
                    });
                });
            });
        }

        // Initialize reveal animations
        function initRevealAnimations() {
            window.addEventListener('load', checkReveal);
            window.addEventListener('scroll', checkReveal);
        }

        // Check elements to reveal on scroll
        function checkReveal() {
            const reveals = document.querySelectorAll('.reveal');

            reveals.forEach(reveal => {
                const revealTop = reveal.getBoundingClientRect().top;
                const windowHeight = window.innerHeight;

                if (revealTop < windowHeight - 100) {
                    reveal.classList.add('active');
                }
            });
        }

        // Back to top button functionality
        function setupBackToTop() {
            const backToTop = document.getElementById('backToTop');

            window.addEventListener('scroll', () => {
                if (window.scrollY > 500) {
                    backToTop.classList.add('visible');
                } else {
                    backToTop.classList.remove('visible');
                }
            });

            backToTop.addEventListener('click', () => {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            });
        }
