/**
 * FieroNews Historical Archive - Retro Visitor Page Counter
 * Accurately tracks visitors across sessions and displays a classic mechanical/LED odometer.
 */
(function() {
    const BASE_COUNT = 48290; // Historical baseline visitor count
    const STORAGE_KEY = 'fieronews_visitor_hits';
    const SESSION_KEY = 'fieronews_session_active';

    function getLocalCount() {
        var stored = localStorage.getItem(STORAGE_KEY);
        if (!stored || isNaN(parseInt(stored, 10))) {
            stored = BASE_COUNT;
            localStorage.setItem(STORAGE_KEY, stored);
        } else {
            stored = parseInt(stored, 10);
        }
        return stored;
    }

    function incrementCount() {
        var count = getLocalCount();
        // If this is a new browsing session / visitor, increment
        if (!sessionStorage.getItem(SESSION_KEY)) {
            sessionStorage.setItem(SESSION_KEY, 'true');
            count += 1;
            localStorage.setItem(STORAGE_KEY, count);
        }
        return count;
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

    function initCounter() {
        var count = incrementCount();
        renderCounter(count);

        // Attempt async cloud counter sync for live multi-user tracking
        try {
            var controller = new AbortController();
            var timeoutId = setTimeout(function() { controller.abort(); }, 2500);

            fetch('https://api.counterapi.dev/v1/fieronews-archive/hits/up', {
                signal: controller.signal
            })
            .then(function(res) { return res.json(); })
            .then(function(data) {
                clearTimeout(timeoutId);
                if (data && typeof data.count === 'number') {
                    var combined = BASE_COUNT + data.count;
                    if (combined > count) {
                        localStorage.setItem(STORAGE_KEY, combined);
                        renderCounter(combined);
                    }
                }
            })
            .catch(function() {
                // Silently fallback to persistent local counter
            });
        } catch (e) {
            // Offline / sandboxed fallback
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCounter);
    } else {
        initCounter();
    }
})();
