/**
 * events-feed.js - Interactive client-side filtering & search for FieroHub events
 */

function filterEvents(type, btn) {
    var buttons = document.querySelectorAll('#eventFilterButtons .filter-pill');
    buttons.forEach(function(b) {
        b.classList.remove('active');
    });
    if (btn) {
        btn.classList.add('active');
    }

    var cards = document.querySelectorAll('#fieroEventsGrid .event-card');
    var visibleCount = 0;
    cards.forEach(function(card) {
        var cardType = card.getAttribute('data-type');
        if (type === 'all' || cardType === type) {
            card.style.display = '';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    var emptyNotice = document.getElementById('eventsEmptyNotice');
    if (emptyNotice) {
        emptyNotice.style.display = (visibleCount === 0) ? 'block' : 'none';
    }
}

function searchEvents(query) {
    var q = query.toLowerCase().trim();
    var cards = document.querySelectorAll('#fieroEventsGrid .event-card');
    var visibleCount = 0;

    cards.forEach(function(card) {
        var text = card.textContent.toLowerCase();
        if (!q || text.indexOf(q) !== -1) {
            card.style.display = '';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    var emptyNotice = document.getElementById('eventsEmptyNotice');
    if (emptyNotice) {
        emptyNotice.style.display = (visibleCount === 0) ? 'block' : 'none';
    }
}
