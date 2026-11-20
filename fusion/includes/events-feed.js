/**
 * events-feed.js - Interactive filtering, Upcoming vs Expired toggles,
 * Compact List view, and Pagination for FieroHub worldwide events.
 */

var eventFeedState = {
    status: 'all',     // 'all' | 'upcoming' | 'expired'
    type: 'all',       // 'all' | 'meetup' | 'cruise' | 'club'
    view: 'grid',      // 'grid' | 'list'
    page: 1,
    pageSize: 4        // 4 cards per page in grid view, 6 in list view
};

function getCardStatus(card) {
    var dateStr = card.getAttribute('data-end') || card.getAttribute('data-start');
    if (!dateStr) return 'past';
    
    var eventDate = new Date(dateStr);
    var now = new Date();
    // Compare date to start of today in local time
    var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return (eventDate >= todayStart) ? 'upcoming' : 'expired';
}

function updateEventCounts() {
    var cards = document.querySelectorAll('#fieroEventsGrid .event-card');
    var total = cards.length;
    var upcomingCount = 0;
    var expiredCount = 0;

    cards.forEach(function(card) {
        var status = getCardStatus(card);
        card.setAttribute('data-status', status);
        if (status === 'upcoming') {
            upcomingCount++;
        } else {
            expiredCount++;
        }
    });

    var elTotal = document.getElementById('eventCountTotal');
    var elUp = document.getElementById('eventCountUpcoming');
    var elExp = document.getElementById('eventCountExpired');

    if (elTotal) elTotal.innerText = total;
    if (elUp) elUp.innerText = upcomingCount;
    if (elExp) elExp.innerText = expiredCount;
}

function filterEventStatus(status, btn) {
    eventFeedState.status = status;
    eventFeedState.page = 1;

    var btns = document.querySelectorAll('#eventStatusButtons .filter-pill');
    btns.forEach(function(b) { b.classList.remove('active'); });
    if (btn) btn.classList.add('active');

    renderEventFeed();
}

function filterEventType(type, btn) {
    eventFeedState.type = type;
    eventFeedState.page = 1;

    var btns = document.querySelectorAll('#eventTypeButtons .filter-chip');
    btns.forEach(function(b) { b.classList.remove('active'); });
    if (btn) btn.classList.add('active');

    renderEventFeed();
}

function toggleEventView(view, btn) {
    eventFeedState.view = view;
    eventFeedState.pageSize = (view === 'list') ? 6 : 4;
    eventFeedState.page = 1;

    var grid = document.getElementById('fieroEventsGrid');
    if (grid) {
        if (view === 'list') {
            grid.classList.add('list-view');
        } else {
            grid.classList.remove('list-view');
        }
    }

    var btns = document.querySelectorAll('.events-view-toggle .view-toggle-btn');
    btns.forEach(function(b) { b.classList.remove('active'); });
    if (btn) btn.classList.add('active');

    renderEventFeed();
}

function changeEventPage(delta) {
    var newPage = eventFeedState.page + delta;
    if (newPage >= 1 && newPage <= eventFeedState.maxPage) {
        eventFeedState.page = newPage;
        renderEventFeed();
    }
}

function goToEventPage(p) {
    if (p >= 1 && p <= eventFeedState.maxPage) {
        eventFeedState.page = p;
        renderEventFeed();
    }
}

function renderEventFeed() {
    var cards = Array.from(document.querySelectorAll('#fieroEventsGrid .event-card'));
    var filtered = [];

    cards.forEach(function(card) {
        var cardStatus = card.getAttribute('data-status') || getCardStatus(card);
        var cardType = card.getAttribute('data-type');

        var matchStatus = (eventFeedState.status === 'all') || (cardStatus === eventFeedState.status);
        var matchType = (eventFeedState.type === 'all') || (cardType === eventFeedState.type);

        if (matchStatus && matchType) {
            filtered.push(card);
        } else {
            card.style.display = 'none';
        }
    });

    var totalMatches = filtered.length;
    var pageSize = eventFeedState.pageSize;
    var totalPages = Math.ceil(totalMatches / pageSize) || 1;
    eventFeedState.maxPage = totalPages;

    if (eventFeedState.page > totalPages) {
        eventFeedState.page = totalPages;
    }

    var startIndex = (eventFeedState.page - 1) * pageSize;
    var endIndex = startIndex + pageSize;

    filtered.forEach(function(card, idx) {
        if (idx >= startIndex && idx < endIndex) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });

    // Empty notice handling
    var emptyNotice = document.getElementById('eventsEmptyNotice');
    if (emptyNotice) {
        if (totalMatches === 0) {
            emptyNotice.style.display = 'block';
            if (eventFeedState.status === 'upcoming') {
                emptyNotice.innerHTML = "<strong>No upcoming events currently scheduled in the registry.</strong><br><span style='font-size:12px;color:#94a3b8;'>Check back soon, or view past events using the 'Expired / Past' filter above.</span>";
            } else {
                emptyNotice.innerHTML = "<strong>No events match the selected filters.</strong><br><button class='filter-pill' style='margin-top:8px;' onclick='filterEventStatus(\"all\", document.querySelector(\"#eventStatusButtons .filter-pill\"))'>Reset Filters</button>";
            }
        } else {
            emptyNotice.style.display = 'none';
        }
    }

    // Render pagination controls
    var paginationBox = document.getElementById('eventsPagination');
    if (paginationBox) {
        if (totalPages <= 1) {
            paginationBox.innerHTML = "<span class='pagination-info'>Showing " + totalMatches + " of " + cards.length + " events</span>";
        } else {
            var prevDisabled = (eventFeedState.page <= 1) ? "disabled" : "";
            var nextDisabled = (eventFeedState.page >= totalPages) ? "disabled" : "";
            
            var pagesHtml = "";
            for (var p = 1; p <= totalPages; p++) {
                var activeClass = (p === eventFeedState.page) ? "active" : "";
                pagesHtml += "<button class='page-num " + activeClass + "' onclick='goToEventPage(" + p + ")'>" + p + "</button>";
            }

            paginationBox.innerHTML = 
                "<button class='page-nav-btn' " + prevDisabled + " onclick='changeEventPage(-1)'>◀ Prev</button>" +
                "<div class='page-numbers'>" + pagesHtml + "</div>" +
                "<button class='page-nav-btn' " + nextDisabled + " onclick='changeEventPage(1)'>Next ▶</button>" +
                "<span class='pagination-info'>Page " + eventFeedState.page + " of " + totalPages + " (" + totalMatches + " events)</span>";
        }
    }
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", function() {
    updateEventCounts();
    renderEventFeed();
});

// Fallback in case DOMContentLoaded already fired
if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(function() {
        updateEventCounts();
        renderEventFeed();
    }, 100);
}
