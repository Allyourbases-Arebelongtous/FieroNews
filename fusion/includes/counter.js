/**
 * FieroNews Historical Archive - Retro Visitor Page Counter
 * Starts at 0 and increments on EVERY page visit / load across the site.
 */
(function() {
    const STORAGE_KEY = 'fieronews_page_visits';
    const OLD_STORAGE_KEY = 'fieronews_visitor_hits';

    // Clear legacy high baseline counter from previous sessions
    try {
        if (localStorage.getItem(OLD_STORAGE_KEY)) {
            localStorage.removeItem(OLD_STORAGE_KEY);
        }
        if (sessionStorage.getItem('fieronews_session_active')) {
            sessionStorage.removeItem('fieronews_session_active');
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

    function recordPageVisit() {
        var current = getCount();
        var nextCount = current + 1; // Increments on EVERY page visit
        try {
            localStorage.setItem(STORAGE_KEY, nextCount);
        } catch (e) {}
        return nextCount;
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
        var count = recordPageVisit();
        renderCounter(count);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
