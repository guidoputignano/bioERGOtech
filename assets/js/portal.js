/* =========================================
   bioERGOtech Foundation — Member Portal JS
   ========================================= */

(function () {
    'use strict';

    /* --- Data --- */
    var members = [
        { name: 'bioERGOtech Foundation', type: 'Foundation', location: 'Taranto, IT', icon: 'fas fa-dna' },
        { name: 'UZH Research Lab', type: 'University', location: 'Zurich, CH', icon: 'fas fa-university' },
        { name: 'ETH Student Project House', type: 'University', location: 'Zurich, CH', icon: 'fas fa-university' },
        { name: 'Xperbot', type: 'Startup', location: 'Zug, CH', icon: 'fas fa-rocket' },
        { name: 'CranioTech Solution', type: 'SME', location: 'Puglia, IT', icon: 'fas fa-industry' },
        { name: 'Riyadh Clinical Hub', type: 'Clinical Center', location: 'Riyadh, SA', icon: 'fas fa-hospital' }
    ];

    var projects = [
        { name: 'OncoTarget', pillar: 'Synthetic Biology', phase: 'Ideation', progress: 35 },
        { name: 'VERO Algorithm', pillar: 'Digital Twin', phase: 'Production', progress: 68 },
        { name: 'CranioTech', pillar: 'Multi-Omics', phase: 'Production', progress: 52 },
        { name: 'Lab AI Agents', pillar: 'Multi-Omics', phase: 'Ideation', progress: 20 },
        { name: 'Xperbot Automation', pillar: 'Biomanufacturing', phase: 'Ideation', progress: 15 }
    ];

    var equipment = [
        { name: 'Flow Cytometer BD FACSAria III', location: 'Taranto Lab A', status: 'available', utilization: 42 },
        { name: 'CRISPR Electroporation System', location: 'Zurich UZH', status: 'booked', utilization: 78 },
        { name: 'Raman Spectrometer', location: 'Taranto Lab B', status: 'available', utilization: 31 },
        { name: 'Organoid Culture Station', location: 'Zurich UZH', status: 'maintenance', utilization: 65 },
        { name: 'High-Throughput Sequencer', location: 'Taranto Lab A', status: 'available', utilization: 55 }
    ];

    var events = [
        { name: 'Progress Radar', date: '2026-03-15', description: 'Monthly cross-project sync and milestone review.', location: 'Virtual', type: 'Internal' },
        { name: 'National Event Rome', date: '2026-04-22', description: 'Biotech innovation showcase at national level.', location: 'Rome, IT', type: 'Conference' },
        { name: 'Project Genesis', date: '2026-05-10', description: 'New project kickoff and ideation sprint.', location: 'Taranto Hub', type: 'Workshop' },
        { name: 'Copy & Improve', date: '2026-06-05', description: 'Peer review sessions and iterative improvement workshop.', location: 'Virtual', type: 'Workshop' },
        { name: 'Taranto Biotech Days 2026', date: '2026-09-18', description: 'Flagship annual conference and BioShot competition.', location: 'Taranto, IT', type: 'Conference' }
    ];

    var knowledgeBase = [
        { title: 'EU IVDR Regulatory Pathway', category: 'Regulatory Pathways', description: 'Step-by-step guide to In Vitro Diagnostic Regulation compliance.' },
        { title: 'Horizon Europe Application Guide', category: 'Funding Programs', description: 'How to apply for EU Horizon Europe grants for biotech projects.' },
        { title: 'CRISPR Electroporation Protocol', category: 'Technical Protocols', description: 'Standard operating procedure for gene editing via electroporation.' },
        { title: 'Patent Filing Strategy for Biotech', category: 'IP Strategy', description: 'Best practices for intellectual property protection in life sciences.' },
        { title: 'New Member Onboarding Checklist', category: 'Onboarding', description: 'Everything you need to get started as a bioERGOtech ecosystem member.' },
        { title: 'Swiss Medtech Regulatory Framework', category: 'Regulatory Pathways', description: 'Overview of Swiss medical device regulation and approval process.' },
        { title: 'EIC Accelerator Program', category: 'Funding Programs', description: 'European Innovation Council funding for deep-tech startups.' },
        { title: 'Flow Cytometry Best Practices', category: 'Technical Protocols', description: 'Optimised protocols for multi-parameter flow cytometry analysis.' }
    ];

    /* --- State --- */
    var currentView = 'dashboard';
    var isLoggedIn = false;
    var selectedOrgType = '';

    /* --- DOM Ready --- */
    document.addEventListener('DOMContentLoaded', function () {
        renderMembers();
        setupAuthForms();
        setupSidebar();
        setupPortalViews();
    });

    /* --- Render current members grid --- */
    function renderMembers() {
        var grid = document.getElementById('membersGrid');
        if (!grid) return;

        var html = '';
        members.forEach(function (m) {
            var typeKey = m.type.toLowerCase().replace(/\s+/g, '');
            var typeClass = 'member-type-' + typeKey;
            var iconClass = 'member-icon-' + typeKey;

            // Map types to CSS class keys
            if (m.type === 'Clinical Center') {
                typeClass = 'member-type-clinical';
                iconClass = 'member-icon-clinical';
            }

            html += '<div class="member-card">' +
                '<div class="member-icon ' + iconClass + '"><i class="' + m.icon + '"></i></div>' +
                '<div class="member-name">' + m.name + '</div>' +
                '<span class="member-type ' + typeClass + '">' + m.type + '</span>' +
                '<div class="member-location"><i class="fas fa-map-marker-alt"></i> ' + m.location + '</div>' +
                '</div>';
        });
        grid.innerHTML = html;
    }

    /* --- Auth forms --- */
    function setupAuthForms() {
        // Tab switching
        var loginTab = document.getElementById('loginTab');
        var registerTab = document.getElementById('registerTab');
        var loginPanel = document.getElementById('loginPanel');
        var registerPanel = document.getElementById('registerPanel');

        if (loginTab && registerTab) {
            loginTab.addEventListener('click', function () {
                loginTab.classList.add('active');
                registerTab.classList.remove('active');
                loginPanel.style.display = 'block';
                registerPanel.style.display = 'none';
            });

            registerTab.addEventListener('click', function () {
                registerTab.classList.add('active');
                loginTab.classList.remove('active');
                registerPanel.style.display = 'block';
                loginPanel.style.display = 'none';
            });
        }

        // Org type selector
        var orgOptions = document.querySelectorAll('.org-type-option');
        var orgTypeInput = document.getElementById('orgTypeInput');
        orgOptions.forEach(function (opt) {
            opt.addEventListener('click', function () {
                orgOptions.forEach(function (o) { o.classList.remove('selected'); });
                opt.classList.add('selected');
                selectedOrgType = opt.getAttribute('data-type');
                if (orgTypeInput) orgTypeInput.value = selectedOrgType;
            });
        });

        // Login form
        var loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', function (e) {
                e.preventDefault();
                var email = document.getElementById('loginEmail').value;
                var password = document.getElementById('loginPassword').value;

                if (!email || !password) {
                    showToast('Please fill in all fields.', true);
                    return;
                }

                // Simulated login
                showToast('Welcome back!');
                isLoggedIn = true;
                setTimeout(function () {
                    showPortal(email);
                }, 600);
            });
        }

        // Register form
        var registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', function (e) {
                e.preventDefault();
                var orgName = document.getElementById('regOrgName').value;
                var contactName = document.getElementById('regContactName').value;
                var email = document.getElementById('regEmail').value;

                if (!orgName || !contactName || !email || !selectedOrgType) {
                    showToast('Please fill in all required fields and select an organisation type.', true);
                    return;
                }

                showToast('Application submitted! We will review your request and get back to you shortly.');
                registerForm.reset();
                orgOptions.forEach(function (o) { o.classList.remove('selected'); });
                selectedOrgType = '';
            });
        }

        // Switch links
        var showRegister = document.getElementById('showRegister');
        var showLogin = document.getElementById('showLogin');

        if (showRegister && registerTab) {
            showRegister.addEventListener('click', function (e) {
                e.preventDefault();
                registerTab.click();
            });
        }

        if (showLogin && loginTab) {
            showLogin.addEventListener('click', function (e) {
                e.preventDefault();
                loginTab.click();
            });
        }
    }

    /* --- Show portal (after login) --- */
    function showPortal(email) {
        var authView = document.getElementById('authView');
        var portalView = document.getElementById('portalView');
        var siteHeader = document.getElementById('site-header');
        var siteFooter = document.getElementById('site-footer');

        if (authView) authView.style.display = 'none';
        if (siteHeader) siteHeader.style.display = 'none';
        if (siteFooter) siteFooter.style.display = 'none';
        if (portalView) {
            portalView.classList.add('active');
            portalView.style.display = 'flex';
        }

        // Set user info
        var userName = email.split('@')[0];
        var userNameEl = document.getElementById('portalUserName');
        var userOrgEl = document.getElementById('portalUserOrg');
        var userAvatarEl = document.getElementById('portalUserAvatar');
        var greetingEl = document.getElementById('portalGreeting');

        if (userNameEl) userNameEl.textContent = userName;
        if (userOrgEl) userOrgEl.textContent = 'Ecosystem Member';
        if (userAvatarEl) userAvatarEl.textContent = userName.charAt(0).toUpperCase();
        if (greetingEl) greetingEl.textContent = 'Welcome back, ' + userName;

        renderDashboard();
        switchView('dashboard');
    }

    /* --- Sidebar --- */
    function setupSidebar() {
        var navItems = document.querySelectorAll('.sidebar-nav-item');
        navItems.forEach(function (item) {
            item.addEventListener('click', function () {
                var view = item.getAttribute('data-view');
                switchView(view);
            });
        });

        // Mobile toggle
        var toggleBtn = document.getElementById('sidebarToggle');
        var sidebar = document.getElementById('portalSidebar');
        var overlay = document.getElementById('sidebarOverlay');

        if (toggleBtn && sidebar) {
            toggleBtn.addEventListener('click', function () {
                sidebar.classList.toggle('open');
                if (overlay) overlay.classList.toggle('active');
            });
        }

        if (overlay && sidebar) {
            overlay.addEventListener('click', function () {
                sidebar.classList.remove('open');
                overlay.classList.remove('active');
            });
        }

        // Logout
        var logoutBtn = document.getElementById('portalLogout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function () {
                isLoggedIn = false;
                var authView = document.getElementById('authView');
                var portalView = document.getElementById('portalView');
                var siteHeader = document.getElementById('site-header');
                var siteFooter = document.getElementById('site-footer');

                if (portalView) {
                    portalView.classList.remove('active');
                    portalView.style.display = 'none';
                }
                if (authView) authView.style.display = 'block';
                if (siteHeader) siteHeader.style.display = 'block';
                if (siteFooter) siteFooter.style.display = 'block';

                showToast('You have been logged out.');
            });
        }
    }

    /* --- View switching --- */
    function switchView(view) {
        currentView = view;

        // Update sidebar active state
        var navItems = document.querySelectorAll('.sidebar-nav-item');
        navItems.forEach(function (item) {
            item.classList.remove('active');
            if (item.getAttribute('data-view') === view) {
                item.classList.add('active');
            }
        });

        // Show correct section
        var sections = document.querySelectorAll('.portal-section');
        sections.forEach(function (s) {
            s.classList.remove('active');
        });

        var target = document.getElementById('section-' + view);
        if (target) target.classList.add('active');

        // Update header
        var headers = {
            dashboard: { title: 'Dashboard', subtitle: 'Overview of your ecosystem activity' },
            projects: { title: 'Projects', subtitle: 'Active research and development projects' },
            lab: { title: 'Distributed Lab', subtitle: 'Shared equipment across our hubs' },
            events: { title: 'Events', subtitle: 'Upcoming events and workshops' },
            directory: { title: 'Member Directory', subtitle: 'Connect with ecosystem members' },
            knowledge: { title: 'Knowledge Base', subtitle: 'Resources, protocols, and guides' }
        };

        var header = headers[view];
        if (header) {
            var titleEl = document.getElementById('portalTitle');
            var subtitleEl = document.getElementById('portalSubtitle');
            if (titleEl) titleEl.textContent = header.title;
            if (subtitleEl) subtitleEl.textContent = header.subtitle;
        }

        // Render content for the view
        if (view === 'dashboard') renderDashboard();
        if (view === 'projects') renderProjects();
        if (view === 'lab') renderEquipment();
        if (view === 'events') renderEvents();
        if (view === 'directory') renderDirectory();
        if (view === 'knowledge') renderKnowledge();

        // Close mobile sidebar
        var sidebar = document.getElementById('portalSidebar');
        var overlay = document.getElementById('sidebarOverlay');
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
    }

    /* --- Setup portal views --- */
    function setupPortalViews() {
        // Knowledge base search and filter are set up when rendered
    }

    /* --- Render Dashboard --- */
    function renderDashboard() {
        var statsEl = document.getElementById('dashboardStats');
        if (!statsEl) return;

        statsEl.innerHTML =
            '<div class="stat-card"><div class="stat-icon stat-icon-projects"><i class="fas fa-project-diagram"></i></div><div class="stat-label">Active Projects</div><div class="stat-value" data-count="' + projects.length + '">0</div></div>' +
            '<div class="stat-card"><div class="stat-icon stat-icon-members"><i class="fas fa-users"></i></div><div class="stat-label">Ecosystem Members</div><div class="stat-value" data-count="' + members.length + '">0</div></div>' +
            '<div class="stat-card"><div class="stat-icon stat-icon-equipment"><i class="fas fa-microscope"></i></div><div class="stat-label">Shared Equipment</div><div class="stat-value" data-count="' + equipment.length + '">0</div></div>' +
            '<div class="stat-card"><div class="stat-icon stat-icon-events"><i class="fas fa-calendar-alt"></i></div><div class="stat-label">Upcoming Events</div><div class="stat-value" data-count="' + events.length + '">0</div></div>';

        // Animate counters
        var counters = statsEl.querySelectorAll('[data-count]');
        counters.forEach(function (el) {
            animateCounter(el, parseInt(el.getAttribute('data-count'), 10));
        });

        // Render recent projects in dashboard
        var recentEl = document.getElementById('dashboardProjects');
        if (recentEl) {
            var html = '';
            projects.slice(0, 3).forEach(function (p) {
                html += buildProjectItem(p);
            });
            recentEl.innerHTML = html;
            animateProgressBars(recentEl);
        }

        // Render upcoming events in dashboard
        var eventsEl = document.getElementById('dashboardEvents');
        if (eventsEl) {
            var ehtml = '';
            events.slice(0, 3).forEach(function (ev) {
                ehtml += buildEventItem(ev);
            });
            eventsEl.innerHTML = ehtml;
        }
    }

    /* --- Render Projects --- */
    function renderProjects() {
        var el = document.getElementById('projectsList');
        if (!el) return;

        var html = '';
        projects.forEach(function (p) {
            html += buildProjectItem(p);
        });
        el.innerHTML = html;
        animateProgressBars(el);
    }

    function buildProjectItem(p) {
        var phaseClass = 'phase-ideation';
        if (p.phase === 'Production') phaseClass = 'phase-production';
        if (p.phase === 'Validation') phaseClass = 'phase-validation';

        return '<div class="project-item">' +
            '<div class="project-header">' +
            '<span class="project-name">' + p.name + '</span>' +
            '<span class="project-phase ' + phaseClass + '">' + p.phase + '</span>' +
            '</div>' +
            '<div class="project-pillar">' + p.pillar + '</div>' +
            '<div class="progress-track"><div class="progress-fill" data-width="' + p.progress + '"></div></div>' +
            '</div>';
    }

    function animateProgressBars(container) {
        setTimeout(function () {
            var bars = container.querySelectorAll('.progress-fill');
            bars.forEach(function (bar) {
                bar.style.width = bar.getAttribute('data-width') + '%';
            });
        }, 100);
    }

    /* --- Render Equipment --- */
    function renderEquipment() {
        var el = document.getElementById('equipmentTable');
        if (!el) return;

        var html = '<table class="equipment-table"><thead><tr>' +
            '<th>Equipment</th><th>Location</th><th>Status</th><th>Utilization</th><th></th>' +
            '</tr></thead><tbody>';

        equipment.forEach(function (eq) {
            var statusClass = 'status-' + eq.status;
            var statusLabel = eq.status.charAt(0).toUpperCase() + eq.status.slice(1);
            var canBook = eq.status === 'available';

            html += '<tr>' +
                '<td data-label="Equipment"><span class="equipment-name">' + eq.name + '</span></td>' +
                '<td data-label="Location"><span class="equipment-location">' + eq.location + '</span></td>' +
                '<td data-label="Status"><span class="status-badge ' + statusClass + '">' + statusLabel + '</span></td>' +
                '<td data-label="Utilization"><div class="utilization-bar"><div class="utilization-track"><div class="utilization-fill" style="width:' + eq.utilization + '%"></div></div><span class="utilization-label">' + eq.utilization + '%</span></div></td>' +
                '<td data-label=""><button class="btn-book"' + (canBook ? '' : ' disabled') + '>' + (canBook ? 'Request' : statusLabel) + '</button></td>' +
                '</tr>';
        });

        html += '</tbody></table>';
        el.innerHTML = html;

        // Book button handlers
        el.querySelectorAll('.btn-book:not([disabled])').forEach(function (btn) {
            btn.addEventListener('click', function () {
                btn.textContent = 'Requested';
                btn.disabled = true;
                btn.style.background = 'var(--primary)';
                btn.style.color = '#fff';
                showToast('Equipment request submitted!');
            });
        });
    }

    /* --- Render Events --- */
    function renderEvents() {
        var el = document.getElementById('eventsList');
        if (!el) return;

        var html = '';
        events.forEach(function (ev) {
            html += buildEventItem(ev);
        });
        el.innerHTML = html;
        setupRSVPButtons(el);
    }

    function buildEventItem(ev) {
        var date = new Date(ev.date);
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        var month = months[date.getMonth()];
        var day = date.getDate();

        return '<div class="event-item">' +
            '<div class="event-date-badge"><span class="month">' + month + '</span><span class="day">' + day + '</span></div>' +
            '<div class="event-info">' +
            '<div class="event-name">' + ev.name + '</div>' +
            '<div class="event-description">' + ev.description + '</div>' +
            '<div class="event-meta"><i class="fas fa-map-marker-alt"></i> ' + ev.location + ' &middot; ' + ev.type + '</div>' +
            '</div>' +
            '<button class="btn-rsvp">RSVP</button>' +
            '</div>';
    }

    function setupRSVPButtons(container) {
        container.querySelectorAll('.btn-rsvp').forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (btn.classList.contains('rsvpd')) {
                    btn.classList.remove('rsvpd');
                    btn.textContent = 'RSVP';
                } else {
                    btn.classList.add('rsvpd');
                    btn.textContent = 'Going';
                    showToast('RSVP confirmed!');
                }
            });
        });
    }

    /* --- Render Directory --- */
    function renderDirectory() {
        var el = document.getElementById('directoryGrid');
        if (!el) return;

        var html = '';
        members.forEach(function (m) {
            var typeKey = m.type.toLowerCase().replace(/\s+/g, '');
            var iconClass = 'member-icon-' + typeKey;
            if (m.type === 'Clinical Center') iconClass = 'member-icon-clinical';

            var initials = m.name.split(' ').map(function (w) { return w.charAt(0); }).join('').substring(0, 2);

            html += '<div class="directory-card">' +
                '<div class="directory-avatar ' + iconClass + '">' + initials + '</div>' +
                '<div class="directory-info">' +
                '<div class="directory-name">' + m.name + '</div>' +
                '<div class="directory-org">' + m.type + '</div>' +
                '<div class="directory-location"><i class="fas fa-map-marker-alt"></i> ' + m.location + '</div>' +
                '</div>' +
                '</div>';
        });
        el.innerHTML = html;
    }

    /* --- Render Knowledge Base --- */
    function renderKnowledge(filter, search) {
        var el = document.getElementById('kbList');
        if (!el) return;

        filter = filter || 'All';
        search = (search || '').toLowerCase();

        var filtered = knowledgeBase.filter(function (item) {
            var matchCategory = filter === 'All' || item.category === filter;
            var matchSearch = !search || item.title.toLowerCase().indexOf(search) > -1 || item.description.toLowerCase().indexOf(search) > -1;
            return matchCategory && matchSearch;
        });

        var html = '';
        if (filtered.length === 0) {
            html = '<p style="color: var(--medium-gray); text-align: center; padding: 32px 0;">No resources found matching your criteria.</p>';
        } else {
            filtered.forEach(function (item) {
                html += '<div class="kb-item">' +
                    '<div class="kb-item-header">' +
                    '<span class="kb-item-title">' + item.title + '</span>' +
                    '<span class="kb-item-category">' + item.category + '</span>' +
                    '</div>' +
                    '<div class="kb-item-desc">' + item.description + '</div>' +
                    '</div>';
            });
        }
        el.innerHTML = html;

        // Set up category buttons
        setupKBFilters();
    }

    function setupKBFilters() {
        var buttons = document.querySelectorAll('.kb-category-btn');
        var searchInput = document.getElementById('kbSearch');

        buttons.forEach(function (btn) {
            // Remove old listeners by cloning
            var newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);

            newBtn.addEventListener('click', function () {
                document.querySelectorAll('.kb-category-btn').forEach(function (b) { b.classList.remove('active'); });
                newBtn.classList.add('active');
                var category = newBtn.getAttribute('data-category');
                var search = searchInput ? searchInput.value : '';
                renderKnowledge(category, search);
            });
        });

        if (searchInput) {
            var newSearch = searchInput.cloneNode(true);
            searchInput.parentNode.replaceChild(newSearch, searchInput);
            newSearch.id = 'kbSearch';

            newSearch.addEventListener('input', function () {
                var activeBtn = document.querySelector('.kb-category-btn.active');
                var category = activeBtn ? activeBtn.getAttribute('data-category') : 'All';
                renderKnowledge(category, newSearch.value);
            });
        }
    }

    /* --- Animated counter --- */
    function animateCounter(el, target) {
        var current = 0;
        var increment = Math.max(1, Math.floor(target / 30));
        var timer = setInterval(function () {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            el.textContent = current;
        }, 40);
    }

    /* --- Toast notification --- */
    function showToast(message, isError) {
        // Remove existing toast
        var existing = document.querySelector('.portal-toast');
        if (existing) existing.remove();

        var toast = document.createElement('div');
        toast.className = 'portal-toast' + (isError ? ' error' : '');
        toast.innerHTML = '<i class="fas ' + (isError ? 'fa-exclamation-circle' : 'fa-check-circle') + '" style="color:' + (isError ? '#E74C6F' : 'var(--primary)') + '"></i>' + message;

        document.body.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(function () {
            toast.classList.add('show');
        });

        setTimeout(function () {
            toast.classList.remove('show');
            setTimeout(function () { toast.remove(); }, 400);
        }, 3500);
    }

})();
