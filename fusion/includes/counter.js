/**
 * FieroNews Historical Archive - Unique Visitor Session Counter
 * Increments ONCE per visitor session (Option 1).
 * Navigating between categories, articles, and pages preserves the count without inflating it.
 */
(function() {
    'use strict';

    const STORAGE_KEY = 'fieronews_page_visits';
    const SESSION_KEY = 'fieronews_session_active';
    const LAST_ACTIVE_KEY = 'fieronews_last_active_ts';
    const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity = new visit

    // Clean legacy high-baseline keys if any
    try {
        if (localStorage.getItem('fieronews_visitor_hits')) {
            localStorage.removeItem('fieronews_visitor_hits');
        }
    } catch (e) {}

    function getCount() {
        try {
            var val = localStorage.getItem(STORAGE_KEY);
            if (val === null || isNaN(parseInt(val, 10))) {
                return 0;
            }
            return parseInt(val, 10);
        } catch (e) {
            return 0;
        }
    }

    function recordVisitorSession() {
        var current = getCount();
        var now = Date.now();
        var isSessionActive = false;

        try {
            // Check 1: tab/window session flag
            if (sessionStorage.getItem(SESSION_KEY) === 'active') {
                isSessionActive = true;
            }
            // Check 2: inactivity window
            var lastActive = localStorage.getItem(LAST_ACTIVE_KEY);
            if (lastActive && (now - parseInt(lastActive, 10) < SESSION_TIMEOUT_MS)) {
                isSessionActive = true;
            }
        } catch (e) {}

        if (!isSessionActive) {
            // Brand new visit: increment counter once
            current = current + 1;
            try {
                localStorage.setItem(STORAGE_KEY, current);
                sessionStorage.setItem(SESSION_KEY, 'active');
            } catch (e) {}
        }

        // Refresh activity timestamp
        try {
            localStorage.setItem(LAST_ACTIVE_KEY, String(now));
        } catch (e) {}

        return current;
    }

    function renderCounter(count) {
        var containers = document.querySelectorAll('.retro-counter-display');
        if (!containers.length) return;

        var countStr = String(count).padStart(6, '0');

        containers.forEach(function(container) {
            container.innerHTML = '';
            for (var i = 0; i < countStr.length; i++) {
                var digitSpan = document.createElement('span');
                digitSpan.className = 'odometer-digit';
                digitSpan.textContent = countStr[i];
                container.appendChild(digitSpan);
            }
        });
    }

    function init() {
        var count = recordVisitorSession();
        renderCounter(count);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
