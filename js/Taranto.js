
        document.addEventListener('DOMContentLoaded', function() {
            // Slideshow functionality
            const slides = document.querySelectorAll('.slideshow-slide');
            let currentSlide = 0;

            function showSlide(index) {
                slides.forEach((slide, i) => {
                    slide.classList.remove('active');
                    if (i === index) {
                        slide.classList.add('active');
                    }
                });
            }

            function nextSlide() {
                currentSlide = (currentSlide + 1) % slides.length;
                showSlide(currentSlide);
            }

            setInterval(nextSlide, 5000);

            // Image comparison slider
            const slider = document.querySelector('.comparison-slider');
            const beforeImage = document.querySelector('.comparison-before');
            const container = document.querySelector('.comparison-container');

            let isDragging = false;

            slider.addEventListener('mousedown', () => {
                isDragging = true;
            });

            document.addEventListener('mouseup', () => {
                isDragging = false;
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;

                const rect = container.getBoundingClientRect();
                let offsetX = e.clientX - rect.left;
                let width = container.offsetWidth;

                if (offsetX < 0) offsetX = 0;
                if (offsetX > width) offsetX = width;

                slider.style.left = `${(offsetX / width) * 100}%`;
                beforeImage.style.width = `${(offsetX / width) * 100}%`;
            });

            // AOS initialization
            if (typeof AOS !== 'undefined') {
                AOS.init({
                    duration: 800,
                    once: true,
                    mirror: false
                });
            }

            // Navbar scroll effect
            const navbar = document.getElementById('navbar');
            window.addEventListener('scroll', () => {
                if (window.scrollY > 50) {
                    navbar.classList.add('scrolled');
                } else {
                    navbar.classList.remove('scrolled');
                }
            });

            // Mobile menu toggle
            const menuToggle = document.getElementById('menuToggle');
            const mobileMenu = document.getElementById('mobileMenu');
            if (menuToggle && mobileMenu) {
                menuToggle.addEventListener('click', () => {
                    mobileMenu.classList.toggle('active');
                });
            }
        });
