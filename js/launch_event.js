
        // Initialize all functionality
        document.addEventListener('DOMContentLoaded', function() {
            // Create tech lines animation
            createTechLines();

            // Create particle effect
            createParticles();

            // Initialize typing animation
            initTypingAnimation();

            // Setup scroll listeners
            setupScrollListeners();

            // Navigation highlighting
            setupNavHighlighting();

            // Mobile menu toggle
            setupMobileMenu();

            // Setup back to top button
            setupBackToTop();
        });

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

        // Initialize typing animation for hero text
        function initTypingAnimation() {
            const typingElement = document.getElementById('typingText');
            if (!typingElement) return;

            const words = ['Innovation', 'Research', 'Collaboration', 'Discovery', 'Future'];
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
            });
        }

        // Handle navigation highlighting on scroll
        function setupNavHighlighting() {
            const sections = document.querySelectorAll('section[id]');
            const navLinks = document.querySelectorAll('.nav-link');

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

        // Smooth scroll for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
