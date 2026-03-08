/* =========================================
   bioERGOtech Foundation — Newsletter Signup
   =========================================
   Uses Supabase REST API via fetch() so it works
   on all pages without the full Supabase client.
   Uses event delegation for dynamically loaded footer.
   ========================================= */

(function () {
    'use strict';

    document.addEventListener('submit', function (e) {
        if (!e.target || e.target.id !== 'newsletterForm') return;
        e.preventDefault();

        var form = e.target;
        var emailInput = form.querySelector('#newsletterEmail');
        var msgEl = form.querySelector('#newsletterMsg');
        var btn = form.querySelector('button[type="submit"]');
        var email = emailInput ? emailInput.value.trim() : '';

        if (!email) return;

        var url = (typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '') + '/rest/v1/newsletter_subscribers';
        var key = typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '';

        if (!url || !key) {
            if (msgEl) { msgEl.textContent = 'Newsletter signup is not configured yet.'; msgEl.style.display = 'block'; }
            return;
        }

        btn.disabled = true;
        btn.textContent = '...';

        fetch(url, {
            method: 'POST',
            headers: {
                'apikey': key,
                'Authorization': 'Bearer ' + key,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ email: email, source: 'website_footer' })
        }).then(function (res) {
            btn.disabled = false;
            btn.textContent = 'Subscribe';

            if (res.ok || res.status === 201) {
                if (msgEl) {
                    msgEl.textContent = 'Thanks for subscribing!';
                    msgEl.style.display = 'block';
                    msgEl.style.color = 'var(--primary, #13d6b0)';
                }
                emailInput.value = '';
            } else if (res.status === 409) {
                if (msgEl) {
                    msgEl.textContent = 'You are already subscribed!';
                    msgEl.style.display = 'block';
                    msgEl.style.color = 'var(--medium-gray, #9e9e9e)';
                }
            } else {
                if (msgEl) {
                    msgEl.textContent = 'Something went wrong. Please try again.';
                    msgEl.style.display = 'block';
                    msgEl.style.color = '#E74C6F';
                }
            }
        }).catch(function () {
            btn.disabled = false;
            btn.textContent = 'Subscribe';
            if (msgEl) {
                msgEl.textContent = 'Network error. Please try again.';
                msgEl.style.display = 'block';
                msgEl.style.color = '#E74C6F';
            }
        });
    });
})();
