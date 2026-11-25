/**
 * FieroNews & Forum Archive - User History & State Management
 * 1. Tracks recent search queries in localStorage with interactive dropdowns.
 * 2. Tracks read topics / posts in localStorage with visual indicators.
 * 100% Client-Side, Safe, Non-breaking, and resilient.
 */
(function(window) {
    'use strict';

    var SEARCH_KEY = 'fieronews_recent_searches';
    var READ_KEY = 'fieronews_read_threads';
    var MAX_SEARCHES = 15;
    var MAX_READ_THREADS = 3000;

    var FieroHistory = {
        // --- SEARCH HISTORY ---
        getRecentSearches: function() {
            try {
                var raw = localStorage.getItem(SEARCH_KEY);
                return raw ? JSON.parse(raw) : [];
            } catch (e) {
                return [];
            }
        },

        saveSearch: function(term) {
            if (!term || typeof term !== 'string') return;
            term = term.trim();
            if (!term || term.length < 2) return;

            try {
                var searches = this.getRecentSearches();
                searches = searches.filter(function(s) {
                    return s.toLowerCase() !== term.toLowerCase();
                });
                searches.unshift(term);
                if (searches.length > MAX_SEARCHES) {
                    searches = searches.slice(0, MAX_SEARCHES);
                }
                localStorage.setItem(SEARCH_KEY, JSON.stringify(searches));
            } catch (e) {}
        },

        removeSearch: function(term) {
            try {
                var searches = this.getRecentSearches();
                searches = searches.filter(function(s) {
                    return s.toLowerCase() !== term.toLowerCase();
                });
                localStorage.setItem(SEARCH_KEY, JSON.stringify(searches));
            } catch (e) {}
        },

        clearSearches: function() {
            try {
                localStorage.removeItem(SEARCH_KEY);
            } catch (e) {}
        },

        // --- READ POSTS TRACKING ---
        getReadThreads: function() {
            try {
                var raw = localStorage.getItem(READ_KEY);
                return raw ? JSON.parse(raw) : [];
            } catch (e) {
                return [];
            }
        },

        isThreadRead: function(forumId, threadFile) {
            if (!threadFile) return false;
            var key = (forumId || '') + ':' + threadFile;
            try {
                var list = this.getReadThreads();
                return list.indexOf(key) !== -1;
            } catch (e) {
                return false;
            }
        },

        markThreadRead: function(forumId, threadFile) {
            if (!threadFile) return;
            var key = (forumId || '') + ':' + threadFile;
            try {
                var list = this.getReadThreads();
                var idx = list.indexOf(key);
                if (idx !== -1) {
                    list.splice(idx, 1);
                }
                list.unshift(key);
                if (list.length > MAX_READ_THREADS) {
                    list = list.slice(0, MAX_READ_THREADS);
                }
                localStorage.setItem(READ_KEY, JSON.stringify(list));
            } catch (e) {}
        },

        clearReadThreads: function() {
            try {
                localStorage.removeItem(READ_KEY);
            } catch (e) {}
        },

        getReadCount: function() {
            return this.getReadThreads().length;
        },

        // --- ATTACH AUTOCOMPLETE DROPDOWN TO ANY INPUT ---
        attachSearchAutocomplete: function(inputEl, onSelect) {
            if (!inputEl) return;

            var self = this;
            var dropdown = null;

            function ensureDropdown() {
                if (dropdown) return dropdown;
                dropdown = document.createElement('div');
                dropdown.className = 'fiero-search-dropdown';
                document.body.appendChild(dropdown);
                return dropdown;
            }

            function positionDropdown() {
                if (!dropdown) return;
                var rect = inputEl.getBoundingClientRect();
                dropdown.style.top = (rect.bottom + window.scrollY + 2) + 'px';
                dropdown.style.left = (rect.left + window.scrollX) + 'px';
                dropdown.style.width = Math.max(rect.width, 240) + 'px';
            }

            function renderDropdown() {
                var searches = self.getRecentSearches();
                if (!searches.length) {
                    hideDropdown();
                    return;
                }

                ensureDropdown();
                positionDropdown();

                var html = '<div class="fiero-search-header">' +
                    '<span>🕒 Recent Searches</span>' +
                    '<button type="button" class="fiero-search-clear-btn" id="fieroClearAllSearches">Clear</button>' +
                    '</div>';

                for (var i = 0; i < searches.length; i++) {
                    var term = searches[i];
                    html += '<div class="fiero-search-item" data-term="' + term.replace(/"/g, '&quot;') + '">' +
                        '<span class="fiero-search-term"><span style="color:#64748b; font-size:12px;">🔍</span> ' + escapeHtml(term) + '</span>' +
                        '<span class="fiero-search-remove" title="Remove from history" data-remove="' + term.replace(/"/g, '&quot;') + '">&times;</span>' +
                        '</div>';
                }

                dropdown.innerHTML = html;
                dropdown.style.display = 'block';

                var clearBtn = dropdown.querySelector('#fieroClearAllSearches');
                if (clearBtn) {
                    clearBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        e.preventDefault();
                        self.clearSearches();
                        hideDropdown();
                    });
                }

                var items = dropdown.querySelectorAll('.fiero-search-item');
                items.forEach(function(item) {
                    item.addEventListener('click', function(e) {
                        if (e.target.classList.contains('fiero-search-remove')) {
                            e.stopPropagation();
                            e.preventDefault();
                            var rmTerm = e.target.getAttribute('data-remove');
                            self.removeSearch(rmTerm);
                            renderDropdown();
                            return;
                        }
                        var selectedTerm = this.getAttribute('data-term');
                        inputEl.value = selectedTerm;
                        hideDropdown();
                        if (typeof onSelect === 'function') {
                            onSelect(selectedTerm);
                        } else if (inputEl.form) {
                            inputEl.form.dispatchEvent(new Event('submit', { cancelable: true }));
                        }
                    });
                });
            }

            function hideDropdown() {
                if (dropdown) {
                    dropdown.style.display = 'none';
                }
            }

            inputEl.addEventListener('focus', function() {
                renderDropdown();
            });

            inputEl.addEventListener('click', function(e) {
                e.stopPropagation();
                renderDropdown();
            });

            inputEl.addEventListener('input', function() {
                if (!inputEl.value.trim()) {
                    renderDropdown();
                } else {
                    hideDropdown();
                }
            });

            document.addEventListener('click', function(e) {
                if (e.target !== inputEl && (!dropdown || !dropdown.contains(e.target))) {
                    hideDropdown();
                }
            });

            window.addEventListener('resize', function() {
                if (dropdown && dropdown.style.display === 'block') {
                    positionDropdown();
                }
            });

            window.addEventListener('scroll', function() {
                if (dropdown && dropdown.style.display === 'block') {
                    positionDropdown();
                }
            }, true);
        }
    };

    function escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Auto-initialize search history on any existing inputs on page load
    function autoInit() {
        // Forum index quick search
        var quickSearch = document.getElementById('pffQuickSearch');
        if (quickSearch) {
            FieroHistory.attachSearchAutocomplete(quickSearch, function(term) {
                window.location.href = 'viewer.html#forum=all&q=' + encodeURIComponent(term);
            });
            if (quickSearch.form) {
                quickSearch.form.addEventListener('submit', function() {
                    var val = quickSearch.value.trim();
                    if (val) FieroHistory.saveSearch(val);
                });
            }
        }

        // FieroNews search page
        var stext = document.querySelector('input[name="stext"]');
        if (stext) {
            FieroHistory.attachSearchAutocomplete(stext, function(term) {
                if (stext.form) stext.form.submit();
            });
            if (stext.form) {
                stext.form.addEventListener('submit', function() {
                    var val = stext.value.trim();
                    if (val) FieroHistory.saveSearch(val);
                });
            }
        }

        // PFF Home Page Search (fierosearch.com)
        var pffHomeSearch = document.querySelector('input[name="MySearchQuery"]');
        if (pffHomeSearch) {
            FieroHistory.attachSearchAutocomplete(pffHomeSearch, function(term) {
                pffHomeSearch.value = term;
                if (pffHomeSearch.form) {
                    if (typeof window.TestData === 'function') {
                        if (window.TestData()) pffHomeSearch.form.submit();
                    } else {
                        pffHomeSearch.form.submit();
                    }
                }
            });
            if (pffHomeSearch.form) {
                pffHomeSearch.form.addEventListener('submit', function() {
                    var val = pffHomeSearch.value.trim();
                    if (val) FieroHistory.saveSearch(val);
                });
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        autoInit();
    }

    window.FieroHistory = FieroHistory;

})(window);
