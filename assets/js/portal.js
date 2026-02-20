/* =========================================
   bioERGOtech Foundation — Member Portal JS
   Supabase-powered authentication, data, and admin
   ========================================= */

(function () {
    'use strict';

    /* --- State --- */
    var currentUser = null;   // Supabase user object
    var currentProfile = null; // profiles row
    var currentView = 'dashboard';
    var selectedOrgType = '';
    var selectedTier = 'community';

    /* --- Fallback data (shown on public page before Supabase loads) --- */
    var fallbackMembers = [
        { org_name: 'bioERGOtech Foundation', org_type: 'Foundation', location: 'Taranto, IT' },
        { org_name: 'UZH Research Lab', org_type: 'University', location: 'Zurich, CH' },
        { org_name: 'ETH Student Project House', org_type: 'University', location: 'Zurich, CH' },
        { org_name: 'Xperbot', org_type: 'Startup', location: 'Zug, CH' },
        { org_name: 'CranioTech Solution', org_type: 'SME', location: 'Puglia, IT' },
        { org_name: 'Riyadh Clinical Hub', org_type: 'Clinical Center', location: 'Riyadh, SA' }
    ];

    /* --- Org type to icon map --- */
    var orgIcons = {
        'Foundation': 'fas fa-dna',
        'Startup / Biotech': 'fas fa-rocket',
        'Startup': 'fas fa-rocket',
        'Hospital / Clinical Center': 'fas fa-hospital',
        'Clinical Center': 'fas fa-hospital',
        'University / Research Lab': 'fas fa-university',
        'University': 'fas fa-university',
        'Investor / VC': 'fas fa-chart-line',
        'Technology Partner': 'fas fa-cogs',
        'Policy / Advocacy Org': 'fas fa-landmark',
        'SME': 'fas fa-industry'
    };

    /* --- Org type to CSS key map --- */
    function getTypeKey(orgType) {
        if (!orgType) return 'foundation';
        var t = orgType.toLowerCase();
        if (t.indexOf('clinical') > -1 || t.indexOf('hospital') > -1) return 'clinical';
        if (t.indexOf('university') > -1 || t.indexOf('research') > -1) return 'university';
        if (t.indexOf('startup') > -1 || t.indexOf('biotech') > -1) return 'startup';
        if (t.indexOf('sme') > -1 || t.indexOf('industry') > -1) return 'sme';
        if (t.indexOf('foundation') > -1) return 'foundation';
        return 'foundation';
    }

    /* --- Avatar URL (no storage needed) ---
       Priority: 1) custom photo_url  2) UI Avatars initials fallback
       Members can paste any public image URL (LinkedIn, personal site, etc.)
       UI Avatars generates initials-based avatars from a URL — zero storage. */
    function avatarUrl(name, size, photoUrl) {
        size = size || 64;
        // If the member has a custom photo URL, use it directly
        if (photoUrl) return photoUrl;
        // Otherwise, generate an initials avatar via UI Avatars API
        var encoded = encodeURIComponent(name || 'U');
        return 'https://ui-avatars.com/api/?name=' + encoded + '&background=13d6b0&color=fff&size=' + size + '&font-size=0.4&bold=true';
    }

    /* Build an <img> tag with fallback to initials if the custom URL fails */
    function avatarImg(name, size, photoUrl, extraStyle) {
        size = size || 64;
        var src = avatarUrl(name, size, photoUrl);
        var fallback = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name || 'U') + '&background=13d6b0&color=fff&size=' + size + '&font-size=0.4&bold=true';
        var style = 'width:' + size + 'px;height:' + size + 'px;border-radius:50%;object-fit:cover;' + (extraStyle || '');
        // onerror fallback: if custom URL fails, switch to initials
        var onerror = photoUrl ? ' onerror="this.onerror=null;this.src=\'' + escHtml(fallback) + '\'"' : '';
        return '<img src="' + escHtml(src) + '" alt=""' + onerror + ' style="' + style + '">';
    }

    /* --- DOM Ready --- */
    document.addEventListener('DOMContentLoaded', function () {
        renderPublicMembers();
        setupAuthTabs();
        setupOrgTypeSelector();
        setupTierSelector();
        setupSidebar();
        checkSession();
    });

    /* ===========================================
       AUTH TABS (Login / Register toggle)
       =========================================== */

    function setupAuthTabs() {
        var loginTab = document.getElementById('loginTab');
        var registerTab = document.getElementById('registerTab');
        var loginPanel = document.getElementById('loginPanel');
        var registerPanel = document.getElementById('registerPanel');

        if (!loginTab || !registerTab) return;

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

        // Switch links
        var showRegister = document.getElementById('showRegister');
        var showLogin = document.getElementById('showLogin');
        if (showRegister) showRegister.addEventListener('click', function (e) { e.preventDefault(); registerTab.click(); });
        if (showLogin) showLogin.addEventListener('click', function (e) { e.preventDefault(); loginTab.click(); });

        // Login form
        var loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', function (e) {
                e.preventDefault();
                handleLogin();
            });
        }

        // Register form
        var registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', function (e) {
                e.preventDefault();
                handleRegister();
            });
        }
    }

    /* --- Org type selector --- */
    function setupOrgTypeSelector() {
        var options = document.querySelectorAll('.org-type-option');
        options.forEach(function (opt) {
            opt.addEventListener('click', function () {
                options.forEach(function (o) { o.classList.remove('selected'); });
                opt.classList.add('selected');
                selectedOrgType = opt.getAttribute('data-type');
                var input = document.getElementById('orgTypeInput');
                if (input) input.value = selectedOrgType;
            });
        });
    }

    /* --- Partnership tier selector --- */
    function setupTierSelector() {
        var options = document.querySelectorAll('.tier-option');
        options.forEach(function (opt) {
            opt.addEventListener('click', function () {
                options.forEach(function (o) { o.classList.remove('selected'); });
                opt.classList.add('selected');
                selectedTier = opt.getAttribute('data-tier');
                var input = document.getElementById('tierInput');
                if (input) input.value = selectedTier;
            });
        });
    }

    /* ===========================================
       SUPABASE AUTH
       =========================================== */

    /* Check if user is already logged in */
    function checkSession() {
        if (typeof supabase === 'undefined') return;

        supabase.auth.getSession().then(function (result) {
            var session = result.data.session;
            if (session && session.user) {
                loadProfile(session.user);
            }
        });

        // Listen for auth changes
        supabase.auth.onAuthStateChange(function (event, session) {
            if (event === 'SIGNED_IN' && session && session.user) {
                loadProfile(session.user);
            } else if (event === 'SIGNED_OUT') {
                currentUser = null;
                currentProfile = null;
                showAuthView();
            }
        });
    }

    /* Load user profile from Supabase */
    function loadProfile(user) {
        currentUser = user;

        supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
            .then(function (result) {
                if (result.error) {
                    showToast('Error loading profile.', true);
                    return;
                }

                currentProfile = result.data;

                if (currentProfile.status === 'approved') {
                    showPortal();
                } else if (currentProfile.status === 'pending') {
                    showToast('Your application is under review. You will receive access once approved.');
                    supabase.auth.signOut();
                } else if (currentProfile.status === 'rejected') {
                    showToast('Your application was not approved. Contact info@bioergotech.org for details.', true);
                    supabase.auth.signOut();
                }
            });
    }

    /* Login handler */
    function handleLogin() {
        var email = document.getElementById('loginEmail').value.trim();
        var password = document.getElementById('loginPassword').value;
        var btn = document.querySelector('#loginForm .btn-primary');

        if (!email || !password) {
            showToast('Please fill in all fields.', true);
            return;
        }

        btn.textContent = 'Signing in...';
        btn.disabled = true;

        supabase.auth.signInWithPassword({ email: email, password: password })
            .then(function (result) {
                btn.textContent = 'Sign In';
                btn.disabled = false;

                if (result.error) {
                    showToast(result.error.message, true);
                    return;
                }

                showToast('Welcome back!');
            });
    }

    /* Register handler */
    function handleRegister() {
        var orgName = document.getElementById('regOrgName').value.trim();
        var contactName = document.getElementById('regContactName').value.trim();
        var email = document.getElementById('regEmail').value.trim();
        var password = document.getElementById('regPassword').value;
        var website = document.getElementById('regWebsite').value.trim();
        var photoUrl = document.getElementById('regPhotoUrl') ? document.getElementById('regPhotoUrl').value.trim() : '';
        var interest = document.getElementById('regInterest').value.trim();
        var btn = document.querySelector('#registerForm .btn-primary');

        if (!orgName || !contactName || !email || !password || !selectedOrgType) {
            showToast('Please fill in all required fields, select an organisation type, and create a password.', true);
            return;
        }

        if (password.length < 6) {
            showToast('Password must be at least 6 characters.', true);
            return;
        }

        btn.textContent = 'Submitting...';
        btn.disabled = true;

        supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: { full_name: contactName }
            }
        }).then(function (result) {
            btn.textContent = 'Submit Application';
            btn.disabled = false;

            if (result.error) {
                showToast(result.error.message, true);
                return;
            }

            var userId = result.data.user ? result.data.user.id : null;

            if (userId) {
                // Update profile with application details
                var profileData = {
                    full_name: contactName,
                    org_name: orgName,
                    org_type: selectedOrgType,
                    website: website,
                    interest: interest,
                    partnership_tier: selectedTier,
                    status: 'pending'
                };
                if (photoUrl) profileData.photo_url = photoUrl;

                supabase
                    .from('profiles')
                    .update(profileData)
                    .eq('id', userId)
                    .then(function () {
                        showToast('Application submitted! We will review your request and get back to you shortly.');
                        document.getElementById('registerForm').reset();
                        document.querySelectorAll('.org-type-option').forEach(function (o) { o.classList.remove('selected'); });
                        document.querySelectorAll('.tier-option').forEach(function (o) {
                            o.classList.remove('selected');
                            if (o.getAttribute('data-tier') === 'community') o.classList.add('selected');
                        });
                        selectedOrgType = '';
                        selectedTier = 'community';

                        // Sign out so they can't access portal until approved
                        supabase.auth.signOut();
                    });
            } else {
                showToast('Application submitted! Check your email to confirm your account.');
            }
        });
    }

    /* ===========================================
       VIEW SWITCHING
       =========================================== */

    function showAuthView() {
        var authView = document.getElementById('authView');
        var portalView = document.getElementById('portalView');
        var siteHeader = document.getElementById('site-header');
        var siteFooter = document.getElementById('site-footer');

        if (portalView) { portalView.classList.remove('active'); portalView.style.display = 'none'; }
        if (authView) authView.style.display = 'block';
        if (siteHeader) siteHeader.style.display = 'block';
        if (siteFooter) siteFooter.style.display = 'block';
    }

    function showPortal() {
        var authView = document.getElementById('authView');
        var portalView = document.getElementById('portalView');
        var siteHeader = document.getElementById('site-header');
        var siteFooter = document.getElementById('site-footer');

        if (authView) authView.style.display = 'none';
        if (siteHeader) siteHeader.style.display = 'none';
        if (siteFooter) siteFooter.style.display = 'none';
        if (portalView) { portalView.classList.add('active'); portalView.style.display = 'flex'; }

        // Set user info in sidebar
        var name = (currentProfile && currentProfile.full_name) || (currentUser && currentUser.email.split('@')[0]) || 'User';
        var org = (currentProfile && currentProfile.org_name) || 'Ecosystem Member';
        var tier = (currentProfile && currentProfile.partnership_tier) || 'community';

        var userNameEl = document.getElementById('portalUserName');
        var userOrgEl = document.getElementById('portalUserOrg');
        var userAvatarEl = document.getElementById('portalUserAvatar');
        var greetingEl = document.getElementById('portalGreeting');

        var photoUrl = (currentProfile && currentProfile.photo_url) || '';

        if (userNameEl) userNameEl.textContent = name;
        if (userOrgEl) userOrgEl.textContent = org + ' \u00B7 ' + capitalize(tier);
        if (userAvatarEl) userAvatarEl.innerHTML = avatarImg(name, 36, photoUrl);
        if (greetingEl) greetingEl.textContent = 'Welcome back, ' + name.split(' ')[0];

        // Show/hide admin nav
        var adminNav = document.getElementById('adminNavItem');
        if (adminNav) {
            var isAdmin = currentProfile && (currentProfile.role === 'admin' || currentProfile.role === 'board');
            adminNav.style.display = isAdmin ? 'flex' : 'none';
        }

        switchView('dashboard');
    }

    /* ===========================================
       SIDEBAR NAVIGATION
       =========================================== */

    function setupSidebar() {
        var navItems = document.querySelectorAll('.sidebar-nav-item');
        navItems.forEach(function (item) {
            item.addEventListener('click', function () {
                switchView(item.getAttribute('data-view'));
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
                if (typeof supabase !== 'undefined') {
                    supabase.auth.signOut().then(function () {
                        showToast('You have been logged out.');
                        showAuthView();
                    });
                } else {
                    showAuthView();
                }
            });
        }
    }

    function switchView(view) {
        currentView = view;

        // Update sidebar active state
        document.querySelectorAll('.sidebar-nav-item').forEach(function (item) {
            item.classList.remove('active');
            if (item.getAttribute('data-view') === view) item.classList.add('active');
        });

        // Show correct section
        document.querySelectorAll('.portal-section').forEach(function (s) { s.classList.remove('active'); });
        var target = document.getElementById('section-' + view);
        if (target) target.classList.add('active');

        // Update header
        var headers = {
            dashboard: { title: 'Dashboard', subtitle: 'Overview of your ecosystem activity' },
            projects: { title: 'Projects', subtitle: 'Active research and development projects' },
            lab: { title: 'Distributed Lab', subtitle: 'Shared equipment across our hubs' },
            events: { title: 'Events', subtitle: 'Upcoming events and workshops' },
            directory: { title: 'Member Directory', subtitle: 'Connect with ecosystem members' },
            knowledge: { title: 'Knowledge Base', subtitle: 'Resources, protocols, and guides' },
            profile: { title: 'Profile Settings', subtitle: 'Manage your profile and photo' },
            admin: { title: 'Admin Panel', subtitle: 'Manage applications and ecosystem members' }
        };

        var h = headers[view];
        if (h) {
            var titleEl = document.getElementById('portalTitle');
            var subtitleEl = document.getElementById('portalSubtitle');
            if (titleEl) titleEl.textContent = h.title;
            if (subtitleEl) subtitleEl.textContent = h.subtitle;
        }

        // Load data
        if (view === 'dashboard') renderDashboard();
        if (view === 'projects') renderProjects();
        if (view === 'lab') renderEquipment();
        if (view === 'events') renderEvents();
        if (view === 'directory') renderDirectory();
        if (view === 'knowledge') renderKnowledge();
        if (view === 'profile') renderProfile();
        if (view === 'admin') renderAdmin();

        // Close mobile sidebar
        var sidebar = document.getElementById('portalSidebar');
        var overlay = document.getElementById('sidebarOverlay');
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
    }

    /* ===========================================
       PUBLIC MEMBERS (Auth page)
       =========================================== */

    function renderPublicMembers() {
        var grid = document.getElementById('membersGrid');
        if (!grid) return;

        // Try loading from Supabase first
        if (typeof supabase !== 'undefined') {
            supabase
                .from('profiles')
                .select('org_name, org_type, full_name')
                .eq('status', 'approved')
                .then(function (result) {
                    if (result.data && result.data.length > 0) {
                        renderMemberCards(grid, result.data);
                    } else {
                        renderMemberCards(grid, fallbackMembers);
                    }
                });
        } else {
            renderMemberCards(grid, fallbackMembers);
        }
    }

    function renderMemberCards(grid, members) {
        var html = '';
        members.forEach(function (m) {
            var name = m.org_name || m.full_name || 'Member';
            var type = m.org_type || 'Foundation';
            var typeKey = getTypeKey(type);
            var icon = orgIcons[type] || 'fas fa-building';

            html += '<div class="member-card">' +
                '<div class="member-icon member-icon-' + typeKey + '"><i class="' + icon + '"></i></div>' +
                '<div class="member-name">' + escHtml(name) + '</div>' +
                '<span class="member-type member-type-' + typeKey + '">' + escHtml(type.split('/')[0].trim()) + '</span>' +
                '</div>';
        });
        grid.innerHTML = html;
    }

    /* ===========================================
       DASHBOARD
       =========================================== */

    function renderDashboard() {
        if (typeof supabase === 'undefined') return;

        var statsEl = document.getElementById('dashboardStats');
        var projectsEl = document.getElementById('dashboardProjects');
        var eventsEl = document.getElementById('dashboardEvents');

        // Fetch counts in parallel
        Promise.all([
            supabase.from('projects').select('*', { count: 'exact', head: true }),
            supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
            supabase.from('equipment').select('*', { count: 'exact', head: true }),
            supabase.from('events').select('*', { count: 'exact', head: true })
        ]).then(function (results) {
            if (statsEl) {
                var counts = results.map(function (r) { return r.count || 0; });
                statsEl.innerHTML =
                    statCard('Active Projects', counts[0], 'fas fa-project-diagram', 'stat-icon-projects') +
                    statCard('Ecosystem Members', counts[1], 'fas fa-users', 'stat-icon-members') +
                    statCard('Shared Equipment', counts[2], 'fas fa-microscope', 'stat-icon-equipment') +
                    statCard('Upcoming Events', counts[3], 'fas fa-calendar-alt', 'stat-icon-events');

                statsEl.querySelectorAll('[data-count]').forEach(function (el) {
                    animateCounter(el, parseInt(el.getAttribute('data-count'), 10));
                });
            }
        });

        // Recent projects
        supabase.from('projects').select('*').order('created_at', { ascending: false }).limit(3)
            .then(function (result) {
                if (projectsEl && result.data) {
                    var html = '';
                    result.data.forEach(function (p) { html += buildProjectItem(p); });
                    projectsEl.innerHTML = html || '<p class="empty-state">No projects yet.</p>';
                    animateProgressBars(projectsEl);
                }
            });

        // Upcoming events
        supabase.from('events').select('*').gte('event_date', new Date().toISOString().split('T')[0]).order('event_date').limit(3)
            .then(function (result) {
                if (eventsEl && result.data) {
                    var html = '';
                    result.data.forEach(function (ev) { html += buildEventItem(ev); });
                    eventsEl.innerHTML = html || '<p class="empty-state">No upcoming events.</p>';
                }
            });
    }

    function statCard(label, count, icon, cls) {
        return '<div class="stat-card"><div class="stat-icon ' + cls + '"><i class="' + icon + '"></i></div>' +
            '<div class="stat-label">' + label + '</div>' +
            '<div class="stat-value" data-count="' + count + '">0</div></div>';
    }

    /* ===========================================
       PROJECTS
       =========================================== */

    function renderProjects() {
        var el = document.getElementById('projectsList');
        if (!el || typeof supabase === 'undefined') return;

        supabase.from('projects').select('*').order('name')
            .then(function (result) {
                if (!result.data || result.data.length === 0) {
                    el.innerHTML = '<p class="empty-state">No projects available.</p>';
                    return;
                }
                var html = '';
                result.data.forEach(function (p) { html += buildProjectItem(p); });
                el.innerHTML = html;
                animateProgressBars(el);
            });
    }

    function buildProjectItem(p) {
        var phaseClass = 'phase-ideation';
        if (p.phase === 'Production') phaseClass = 'phase-production';
        if (p.phase === 'Validation') phaseClass = 'phase-validation';

        return '<div class="project-item">' +
            '<div class="project-header">' +
            '<span class="project-name">' + escHtml(p.name) + '</span>' +
            '<span class="project-phase ' + phaseClass + '">' + escHtml(p.phase) + '</span>' +
            '</div>' +
            '<div class="project-pillar">' + escHtml(p.pillar || '') + '</div>' +
            '<div class="progress-track"><div class="progress-fill" data-width="' + (p.progress || 0) + '"></div></div>' +
            '</div>';
    }

    function animateProgressBars(container) {
        setTimeout(function () {
            container.querySelectorAll('.progress-fill').forEach(function (bar) {
                bar.style.width = bar.getAttribute('data-width') + '%';
            });
        }, 100);
    }

    /* ===========================================
       EQUIPMENT (Distributed Lab)
       =========================================== */

    function renderEquipment() {
        var el = document.getElementById('equipmentTable');
        if (!el || typeof supabase === 'undefined') return;

        supabase.from('equipment').select('*').order('name')
            .then(function (result) {
                if (!result.data || result.data.length === 0) {
                    el.innerHTML = '<p class="empty-state">No equipment listed.</p>';
                    return;
                }

                var html = '<table class="equipment-table"><thead><tr>' +
                    '<th>Equipment</th><th>Location</th><th>Status</th><th>Utilization</th><th></th>' +
                    '</tr></thead><tbody>';

                result.data.forEach(function (eq) {
                    var statusClass = 'status-' + eq.status;
                    var statusLabel = capitalize(eq.status);
                    var canBook = eq.status === 'available';

                    html += '<tr>' +
                        '<td data-label="Equipment"><span class="equipment-name">' + escHtml(eq.name) + '</span></td>' +
                        '<td data-label="Location"><span class="equipment-location">' + escHtml(eq.location || '') + '</span></td>' +
                        '<td data-label="Status"><span class="status-badge ' + statusClass + '">' + statusLabel + '</span></td>' +
                        '<td data-label="Utilization"><div class="utilization-bar"><div class="utilization-track"><div class="utilization-fill" style="width:' + (eq.utilization || 0) + '%"></div></div><span class="utilization-label">' + (eq.utilization || 0) + '%</span></div></td>' +
                        '<td data-label=""><button class="btn-book" data-equipment-id="' + eq.id + '"' + (canBook ? '' : ' disabled') + '>' + (canBook ? 'Request' : statusLabel) + '</button></td>' +
                        '</tr>';
                });

                html += '</tbody></table>';
                el.innerHTML = html;

                // Booking buttons
                el.querySelectorAll('.btn-book:not([disabled])').forEach(function (btn) {
                    btn.addEventListener('click', function () { bookEquipment(btn); });
                });
            });
    }

    function bookEquipment(btn) {
        var equipId = btn.getAttribute('data-equipment-id');
        btn.textContent = 'Requesting...';
        btn.disabled = true;

        supabase.from('equipment_bookings')
            .insert({ equipment_id: equipId, user_id: currentUser.id })
            .then(function (result) {
                if (result.error) {
                    btn.textContent = 'Request';
                    btn.disabled = false;
                    showToast('Booking failed: ' + result.error.message, true);
                } else {
                    btn.textContent = 'Requested';
                    btn.style.background = 'var(--primary)';
                    btn.style.color = '#fff';
                    showToast('Equipment request submitted!');
                }
            });
    }

    /* ===========================================
       EVENTS
       =========================================== */

    function renderEvents() {
        var el = document.getElementById('eventsList');
        if (!el || typeof supabase === 'undefined') return;

        // Fetch events and user's RSVPs
        Promise.all([
            supabase.from('events').select('*').order('event_date'),
            supabase.from('event_rsvps').select('event_id').eq('user_id', currentUser.id)
        ]).then(function (results) {
            var events = results[0].data || [];
            var rsvps = (results[1].data || []).map(function (r) { return r.event_id; });

            if (events.length === 0) {
                el.innerHTML = '<p class="empty-state">No upcoming events.</p>';
                return;
            }

            var html = '';
            events.forEach(function (ev) {
                var isGoing = rsvps.indexOf(ev.id) > -1;
                html += buildEventItem(ev, isGoing);
            });
            el.innerHTML = html;

            // RSVP buttons
            el.querySelectorAll('.btn-rsvp').forEach(function (btn) {
                btn.addEventListener('click', function () { toggleRSVP(btn); });
            });
        });
    }

    function buildEventItem(ev, isGoing) {
        var dateStr = ev.event_date || ev.date;
        var date = new Date(dateStr + 'T00:00:00');
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        return '<div class="event-item">' +
            '<div class="event-date-badge"><span class="month">' + months[date.getMonth()] + '</span><span class="day">' + date.getDate() + '</span></div>' +
            '<div class="event-info">' +
            '<div class="event-name">' + escHtml(ev.name) + '</div>' +
            '<div class="event-description">' + escHtml(ev.description || '') + '</div>' +
            '<div class="event-meta"><i class="fas fa-map-marker-alt"></i> ' + escHtml(ev.location || '') + ' &middot; ' + escHtml(ev.type || '') + '</div>' +
            '</div>' +
            '<button class="btn-rsvp' + (isGoing ? ' rsvpd' : '') + '" data-event-id="' + ev.id + '">' + (isGoing ? 'Going' : 'RSVP') + '</button>' +
            '</div>';
    }

    function toggleRSVP(btn) {
        var eventId = btn.getAttribute('data-event-id');
        var isGoing = btn.classList.contains('rsvpd');

        if (isGoing) {
            supabase.from('event_rsvps')
                .delete()
                .eq('event_id', eventId)
                .eq('user_id', currentUser.id)
                .then(function () {
                    btn.classList.remove('rsvpd');
                    btn.textContent = 'RSVP';
                });
        } else {
            supabase.from('event_rsvps')
                .insert({ event_id: eventId, user_id: currentUser.id })
                .then(function (result) {
                    if (result.error) {
                        showToast('RSVP failed.', true);
                    } else {
                        btn.classList.add('rsvpd');
                        btn.textContent = 'Going';
                        showToast('RSVP confirmed!');
                    }
                });
        }
    }

    /* ===========================================
       DIRECTORY
       =========================================== */

    function renderDirectory() {
        var el = document.getElementById('directoryGrid');
        if (!el || typeof supabase === 'undefined') return;

        supabase.from('profiles').select('*').eq('status', 'approved').order('org_name')
            .then(function (result) {
                if (!result.data || result.data.length === 0) {
                    el.innerHTML = '<p class="empty-state">No members found.</p>';
                    return;
                }

                var html = '';
                result.data.forEach(function (m) {
                    var name = m.org_name || m.full_name || 'Member';
                    var typeKey = getTypeKey(m.org_type);
                    var tier = m.partnership_tier || 'community';

                    html += '<div class="directory-card">' +
                        avatarImg(name, 48, m.photo_url, 'flex-shrink:0') +
                        '<div class="directory-info">' +
                        '<div class="directory-name">' + escHtml(name) + '</div>' +
                        '<div class="directory-org"><span class="member-type member-type-' + typeKey + '" style="font-size:.7rem">' + escHtml((m.org_type || '').split('/')[0].trim()) + '</span>' +
                        ' <span class="tier-badge tier-' + tier + '">' + capitalize(tier) + '</span></div>' +
                        (m.full_name ? '<div class="directory-location" style="font-size:.8rem;color:var(--medium-gray)"><i class="fas fa-user"></i> ' + escHtml(m.full_name) + '</div>' : '') +
                        '</div>' +
                        '</div>';
                });
                el.innerHTML = html;
            });
    }

    /* ===========================================
       KNOWLEDGE BASE
       =========================================== */

    var kbData = [];

    function renderKnowledge(filter, search) {
        var el = document.getElementById('kbList');
        if (!el) return;

        filter = filter || 'All';
        search = (search || '').toLowerCase();

        // Fetch if empty
        if (kbData.length === 0 && typeof supabase !== 'undefined') {
            supabase.from('knowledge_base').select('*').order('title')
                .then(function (result) {
                    kbData = result.data || [];
                    renderKBItems(el, filter, search);
                    setupKBFilters();
                });
        } else {
            renderKBItems(el, filter, search);
            setupKBFilters();
        }
    }

    function renderKBItems(el, filter, search) {
        var filtered = kbData.filter(function (item) {
            var matchCat = filter === 'All' || item.category === filter;
            var matchSearch = !search || item.title.toLowerCase().indexOf(search) > -1 || (item.description || '').toLowerCase().indexOf(search) > -1;
            return matchCat && matchSearch;
        });

        if (filtered.length === 0) {
            el.innerHTML = '<p style="color:var(--medium-gray);text-align:center;padding:32px 0">No resources found.</p>';
            return;
        }

        var html = '';
        filtered.forEach(function (item) {
            html += '<div class="kb-item">' +
                '<div class="kb-item-header">' +
                '<span class="kb-item-title">' + escHtml(item.title) + '</span>' +
                '<span class="kb-item-category">' + escHtml(item.category || '') + '</span>' +
                '</div>' +
                '<div class="kb-item-desc">' + escHtml(item.description || '') + '</div>' +
                '</div>';
        });
        el.innerHTML = html;
    }

    function setupKBFilters() {
        var buttons = document.querySelectorAll('.kb-category-btn');
        var searchInput = document.getElementById('kbSearch');

        buttons.forEach(function (btn) {
            var newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', function () {
                document.querySelectorAll('.kb-category-btn').forEach(function (b) { b.classList.remove('active'); });
                newBtn.classList.add('active');
                renderKnowledge(newBtn.getAttribute('data-category'), searchInput ? searchInput.value : '');
            });
        });

        if (searchInput) {
            var newSearch = searchInput.cloneNode(true);
            searchInput.parentNode.replaceChild(newSearch, searchInput);
            newSearch.id = 'kbSearch';
            newSearch.addEventListener('input', function () {
                var activeBtn = document.querySelector('.kb-category-btn.active');
                var cat = activeBtn ? activeBtn.getAttribute('data-category') : 'All';
                renderKnowledge(cat, newSearch.value);
            });
        }
    }

    /* ===========================================
       PROFILE SETTINGS
       =========================================== */

    function renderProfile() {
        if (!currentProfile) return;

        var name = currentProfile.full_name || currentUser.email.split('@')[0] || 'User';
        var org = currentProfile.org_name || 'Ecosystem Member';
        var photoUrl = currentProfile.photo_url || '';

        var avatarEl = document.getElementById('profileAvatar');
        var nameEl = document.getElementById('profileName');
        var orgEl = document.getElementById('profileOrg');
        var photoInput = document.getElementById('profilePhotoUrl');
        var saveBtn = document.getElementById('saveProfileBtn');

        if (avatarEl) avatarEl.innerHTML = avatarImg(name, 80, photoUrl);
        if (nameEl) nameEl.textContent = name;
        if (orgEl) orgEl.textContent = org;
        if (photoInput) photoInput.value = photoUrl;

        // Live preview when typing
        if (photoInput) {
            photoInput.oninput = function () {
                var preview = photoInput.value.trim();
                if (avatarEl) avatarEl.innerHTML = avatarImg(name, 80, preview);
            };
        }

        // Save handler
        if (saveBtn) {
            saveBtn.onclick = function () {
                var newPhotoUrl = photoInput ? photoInput.value.trim() : '';
                saveBtn.textContent = 'Saving...';
                saveBtn.disabled = true;

                supabase.from('profiles')
                    .update({ photo_url: newPhotoUrl || null })
                    .eq('id', currentUser.id)
                    .then(function (result) {
                        saveBtn.textContent = 'Save Changes';
                        saveBtn.disabled = false;

                        if (result.error) {
                            showToast('Error saving profile: ' + result.error.message, true);
                            return;
                        }

                        currentProfile.photo_url = newPhotoUrl || null;
                        showToast('Profile updated!');

                        // Update sidebar avatar too
                        var sidebarAvatar = document.getElementById('portalUserAvatar');
                        if (sidebarAvatar) {
                            sidebarAvatar.innerHTML = avatarImg(name, 36, currentProfile.photo_url);
                        }
                    });
            };
        }
    }

    /* ===========================================
       ADMIN PANEL
       =========================================== */

    function renderAdmin() {
        var el = document.getElementById('adminContent');
        if (!el || typeof supabase === 'undefined') return;

        if (!currentProfile || (currentProfile.role !== 'admin' && currentProfile.role !== 'board')) {
            el.innerHTML = '<p class="empty-state">You do not have admin access.</p>';
            return;
        }

        // Load all sections
        renderAdminApplications();
        renderAdminMembers();
    }

    function renderAdminApplications() {
        var el = document.getElementById('adminApplications');
        if (!el) return;

        supabase.from('profiles').select('*').eq('status', 'pending').order('created_at', { ascending: false })
            .then(function (result) {
                var apps = result.data || [];
                var countEl = document.getElementById('pendingCount');
                if (countEl) countEl.textContent = apps.length;

                if (apps.length === 0) {
                    el.innerHTML = '<p class="empty-state">No pending applications.</p>';
                    return;
                }

                var html = '';
                apps.forEach(function (app) {
                    var tier = app.partnership_tier || 'community';
                    html += '<div class="admin-app-card" data-user-id="' + app.id + '">' +
                        '<div class="admin-app-header">' +
                        '<div style="display:flex;align-items:center;gap:12px">' +
                        avatarImg(app.org_name || app.full_name || 'U', 40, app.photo_url) +
                        '<div>' +
                        '<div class="admin-app-org">' + escHtml(app.org_name || 'Unnamed') + '</div>' +
                        '<div class="admin-app-meta">' + escHtml(app.full_name || '') + ' &middot; ' + escHtml(app.email || '') + '</div>' +
                        '</div></div>' +
                        '<div style="text-align:right">' +
                        '<span class="tier-badge tier-' + tier + '">' + capitalize(tier) + ' Partner</span>' +
                        '<div class="admin-app-meta" style="margin-top:4px">' + escHtml(app.org_type || '') + '</div>' +
                        '</div>' +
                        '</div>' +
                        (app.interest ? '<div class="admin-app-interest"><strong>Interest:</strong> ' + escHtml(app.interest) + '</div>' : '') +
                        (app.website ? '<div class="admin-app-interest"><strong>Website:</strong> <a href="' + escHtml(app.website) + '" target="_blank" rel="noopener">' + escHtml(app.website) + '</a></div>' : '') +
                        '<div class="admin-app-date">Applied: ' + new Date(app.created_at).toLocaleDateString() + '</div>' +
                        '<div class="admin-app-actions">' +
                        '<input type="text" class="admin-notes-input" placeholder="Reviewer notes (optional)">' +
                        '<button class="btn-approve" data-user-id="' + app.id + '"><i class="fas fa-check"></i> Approve</button>' +
                        '<button class="btn-reject" data-user-id="' + app.id + '"><i class="fas fa-times"></i> Reject</button>' +
                        '</div>' +
                        '</div>';
                });
                el.innerHTML = html;

                // Approve/reject handlers
                el.querySelectorAll('.btn-approve').forEach(function (btn) {
                    btn.addEventListener('click', function () { handleApplication(btn, 'approved'); });
                });
                el.querySelectorAll('.btn-reject').forEach(function (btn) {
                    btn.addEventListener('click', function () { handleApplication(btn, 'rejected'); });
                });
            });
    }

    function handleApplication(btn, newStatus) {
        var userId = btn.getAttribute('data-user-id');
        var card = btn.closest('.admin-app-card');
        var notesInput = card.querySelector('.admin-notes-input');
        var notes = notesInput ? notesInput.value : '';

        btn.disabled = true;
        btn.textContent = newStatus === 'approved' ? 'Approving...' : 'Rejecting...';

        supabase.from('profiles')
            .update({
                status: newStatus,
                reviewer_notes: notes,
                reviewed_by: currentUser.id,
                reviewed_at: new Date().toISOString()
            })
            .eq('id', userId)
            .then(function (result) {
                if (result.error) {
                    showToast('Error: ' + result.error.message, true);
                    btn.disabled = false;
                    btn.textContent = newStatus === 'approved' ? 'Approve' : 'Reject';
                    return;
                }

                card.style.opacity = '0.5';
                card.style.pointerEvents = 'none';
                showToast('Application ' + newStatus + '.');

                setTimeout(function () { renderAdminApplications(); }, 1000);
            });
    }

    function renderAdminMembers() {
        var el = document.getElementById('adminMembersList');
        if (!el) return;

        supabase.from('profiles').select('*').eq('status', 'approved').order('org_name')
            .then(function (result) {
                var members = result.data || [];

                if (members.length === 0) {
                    el.innerHTML = '<p class="empty-state">No approved members yet.</p>';
                    return;
                }

                var html = '<table class="equipment-table"><thead><tr>' +
                    '<th>Organisation</th><th>Contact</th><th>Type</th><th>Tier</th><th>Role</th>' +
                    '</tr></thead><tbody>';

                members.forEach(function (m) {
                    var tier = m.partnership_tier || 'community';
                    html += '<tr>' +
                        '<td data-label="Organisation"><span class="equipment-name">' + escHtml(m.org_name || '-') + '</span></td>' +
                        '<td data-label="Contact">' + escHtml(m.full_name || '-') + '<br><span class="equipment-location">' + escHtml(m.email || '') + '</span></td>' +
                        '<td data-label="Type">' + escHtml((m.org_type || '-').split('/')[0].trim()) + '</td>' +
                        '<td data-label="Tier"><span class="tier-badge tier-' + tier + '">' + capitalize(tier) + '</span></td>' +
                        '<td data-label="Role"><span class="status-badge status-' + (m.role === 'admin' || m.role === 'board' ? 'booked' : 'available') + '">' + capitalize(m.role || 'member') + '</span></td>' +
                        '</tr>';
                });

                html += '</tbody></table>';
                el.innerHTML = html;
            });
    }

    /* ===========================================
       UTILITIES
       =========================================== */

    function animateCounter(el, target) {
        var current = 0;
        var increment = Math.max(1, Math.floor(target / 30));
        var timer = setInterval(function () {
            current += increment;
            if (current >= target) { current = target; clearInterval(timer); }
            el.textContent = current;
        }, 40);
    }

    function showToast(message, isError) {
        var existing = document.querySelector('.portal-toast');
        if (existing) existing.remove();

        var toast = document.createElement('div');
        toast.className = 'portal-toast' + (isError ? ' error' : '');
        toast.innerHTML = '<i class="fas ' + (isError ? 'fa-exclamation-circle' : 'fa-check-circle') + '" style="color:' + (isError ? '#E74C6F' : 'var(--primary)') + '"></i>' + escHtml(message);

        document.body.appendChild(toast);
        requestAnimationFrame(function () { toast.classList.add('show'); });
        setTimeout(function () {
            toast.classList.remove('show');
            setTimeout(function () { toast.remove(); }, 400);
        }, 4000);
    }

    function capitalize(s) {
        return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
    }

    function escHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

})();
