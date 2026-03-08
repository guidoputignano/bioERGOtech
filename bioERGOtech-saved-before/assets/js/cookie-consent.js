/* =========================================
   bioERGOtech — Cookie Consent Manager
   =========================================
   GDPR & ePrivacy compliant. Blocks analytics
   cookies until the user gives explicit consent.
   ========================================= */

(function () {
    'use strict';

    var CONSENT_KEY = 'bioergotech_cookie_consent';
    var GA_ID = 'G-GWKKXQ2S7M';

    /* --- Read stored consent --- */
    function getConsent() {
        try {
            var raw = localStorage.getItem(CONSENT_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    /* --- Save consent --- */
    function saveConsent(preferences) {
        preferences.timestamp = new Date().toISOString();
        preferences.version = '1.0';
        localStorage.setItem(CONSENT_KEY, JSON.stringify(preferences));
    }

    /* --- Load Google Analytics dynamically --- */
    function loadGoogleAnalytics() {
        if (document.getElementById('gtag-script')) return; // already loaded

        var script = document.createElement('script');
        script.id = 'gtag-script';
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
        document.head.appendChild(script);

        window.dataLayer = window.dataLayer || [];
        function gtag() { window.dataLayer.push(arguments); }
        window.gtag = gtag;
        gtag('js', new Date());
        gtag('config', GA_ID, { anonymize_ip: true });
    }

    /* --- Remove GA cookies --- */
    function removeGACookies() {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var name = cookies[i].split('=')[0].trim();
            if (name.indexOf('_ga') === 0 || name.indexOf('_gid') === 0 || name.indexOf('_gat') === 0) {
                document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.' + window.location.hostname;
                document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            }
        }
    }

    /* --- Apply consent decisions --- */
    function applyConsent(preferences) {
        if (preferences.analytics) {
            loadGoogleAnalytics();
        } else {
            removeGACookies();
        }
    }

    /* --- Show/hide banner --- */
    function showBanner() {
        var banner = document.getElementById('cookieBanner');
        if (banner) {
            requestAnimationFrame(function () {
                banner.classList.add('visible');
            });
        }
    }

    function hideBanner() {
        var banner = document.getElementById('cookieBanner');
        if (banner) banner.classList.remove('visible');

        // Show the small settings trigger
        var trigger = document.getElementById('cookieSettingsTrigger');
        if (trigger) trigger.classList.add('visible');
    }

    /* --- Accept all --- */
    function acceptAll() {
        var prefs = { necessary: true, analytics: true };
        saveConsent(prefs);
        applyConsent(prefs);
        hideBanner();
    }

    /* --- Reject non-essential --- */
    function rejectAll() {
        var prefs = { necessary: true, analytics: false };
        saveConsent(prefs);
        applyConsent(prefs);
        hideBanner();
    }

    /* --- Save custom settings --- */
    function saveSettings() {
        var analyticsToggle = document.getElementById('cookieAnalyticsToggle');
        var prefs = {
            necessary: true,
            analytics: analyticsToggle ? analyticsToggle.checked : false
        };
        saveConsent(prefs);
        applyConsent(prefs);
        hideBanner();
    }

    /* --- Toggle settings panel --- */
    function toggleSettings() {
        var panel = document.getElementById('cookieSettingsPanel');
        if (panel) panel.classList.toggle('open');
    }

    /* --- Reopen banner --- */
    function reopenBanner() {
        var trigger = document.getElementById('cookieSettingsTrigger');
        if (trigger) trigger.classList.remove('visible');

        var consent = getConsent();
        var analyticsToggle = document.getElementById('cookieAnalyticsToggle');
        if (analyticsToggle && consent) {
            analyticsToggle.checked = consent.analytics;
        }

        showBanner();
    }

    /* --- Inject banner HTML --- */
    function injectBanner() {
        // Check if banner already exists (e.g. in footer.html)
        if (document.getElementById('cookieBanner')) return;

        var html =
            '<div id="cookieBanner" class="cookie-banner">' +
                '<div class="cookie-banner-inner">' +
                    '<div class="cookie-banner-text">' +
                        '<h3>We value your privacy</h3>' +
                        '<p>We use cookies to analyse site traffic and improve your experience. ' +
                        'Essential cookies for authentication are always active. ' +
                        'Analytics cookies are only set with your consent. ' +
                        '<a href="/cookie-policy.html">Cookie Policy</a></p>' +
                    '</div>' +
                    '<div class="cookie-banner-actions">' +
                        '<button class="cookie-btn-accept" id="cookieAcceptAll">Accept All</button>' +
                        '<button class="cookie-btn-reject" id="cookieRejectAll">Reject</button>' +
                        '<button class="cookie-btn-settings" id="cookieSettingsBtn">Settings</button>' +
                    '</div>' +
                '</div>' +
                '<div id="cookieSettingsPanel" class="cookie-settings-panel">' +
                    '<div class="cookie-category">' +
                        '<div class="cookie-category-info">' +
                            '<h4>Strictly Necessary</h4>' +
                            '<p>Required for authentication and core functionality. Cannot be disabled.</p>' +
                        '</div>' +
                        '<label class="cookie-toggle">' +
                            '<input type="checkbox" checked disabled>' +
                            '<span class="cookie-toggle-slider"></span>' +
                        '</label>' +
                    '</div>' +
                    '<div class="cookie-category">' +
                        '<div class="cookie-category-info">' +
                            '<h4>Analytics</h4>' +
                            '<p>Help us understand how visitors use the site via Google Analytics.</p>' +
                        '</div>' +
                        '<label class="cookie-toggle">' +
                            '<input type="checkbox" id="cookieAnalyticsToggle">' +
                            '<span class="cookie-toggle-slider"></span>' +
                        '</label>' +
                    '</div>' +
                    '<div class="cookie-settings-save">' +
                        '<button class="cookie-btn-accept" id="cookieSaveSettings">Save Preferences</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<button id="cookieSettingsTrigger" class="cookie-settings-trigger" title="Cookie settings">' +
                '<i class="fas fa-cookie-bite"></i>' +
            '</button>';

        var container = document.createElement('div');
        container.innerHTML = html;
        while (container.firstChild) {
            document.body.appendChild(container.firstChild);
        }
    }

    /* --- Bind events --- */
    function bindEvents() {
        var acceptBtn = document.getElementById('cookieAcceptAll');
        var rejectBtn = document.getElementById('cookieRejectAll');
        var settingsBtn = document.getElementById('cookieSettingsBtn');
        var saveBtn = document.getElementById('cookieSaveSettings');
        var trigger = document.getElementById('cookieSettingsTrigger');

        if (acceptBtn) acceptBtn.addEventListener('click', acceptAll);
        if (rejectBtn) rejectBtn.addEventListener('click', rejectAll);
        if (settingsBtn) settingsBtn.addEventListener('click', toggleSettings);
        if (saveBtn) saveBtn.addEventListener('click', saveSettings);
        if (trigger) trigger.addEventListener('click', reopenBanner);
    }

    /* --- Initialise on DOM ready --- */
    function init() {
        injectBanner();
        bindEvents();

        var consent = getConsent();

        if (consent) {
            // User has already given consent — apply it
            applyConsent(consent);

            // Show the small settings trigger so they can change later
            var trigger = document.getElementById('cookieSettingsTrigger');
            if (trigger) trigger.classList.add('visible');
        } else {
            // No consent yet — show the banner (GA stays blocked)
            setTimeout(showBanner, 800);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
