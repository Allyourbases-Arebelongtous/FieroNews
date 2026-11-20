#!/usr/bin/env python3
"""
sync_events.py - Automatically sync Pontiac Fiero events from FieroHub.com
Fetches active worldwide events from https://fierohub.com/authapi/events/list
Updates fusion/events.json and injects the live events feed into fusion/news.php.html
"""

import urllib.request
import json
import re
import os
from datetime import datetime, timezone

FIEROHUB_API_URL = "https://fierohub.com/authapi/events/list"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) FieroNews-Sync/1.0 (+https://fieronews.net)"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
EVENTS_JSON_PATH = os.path.join(PROJECT_ROOT, "fusion", "events.json")
NEWS_HTML_PATH = os.path.join(PROJECT_ROOT, "fusion", "news.php.html")

TYPE_MAP = {
    "meetup": {"label": "Car Show / Meet", "icon": "🚘"},
    "cruise": {"label": "Cruise / Road Trip", "icon": "🛣️"},
    "swap": {"label": "Swap Meet", "icon": "🔩"},
    "track": {"label": "Track Day / Race", "icon": "🏁"},
    "club": {"label": "Club Event", "icon": "👥"},
    "online": {"label": "Online Event", "icon": "🌐"},
    "otherevent": {"label": "Fiero Event", "icon": "🗓️"},
}

def format_date_range(start_str, end_str):
    try:
        start_dt = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
    except Exception:
        return start_str[:10] if start_str else "Date TBA"
    
    start_fmt = start_dt.strftime("%b %d, %Y")
    if not end_str or end_str == start_str:
        return start_fmt
    
    try:
        end_dt = datetime.fromisoformat(end_str.replace("Z", "+00:00"))
        if start_dt.year == end_dt.year and start_dt.month == end_dt.month:
            if start_dt.day == end_dt.day:
                return start_fmt
            return f"{start_dt.strftime('%b %d')}–{end_dt.strftime('%d, %Y')}"
        return f"{start_fmt} – {end_dt.strftime('%b %d, %Y')}"
    except Exception:
        return start_fmt

def fetch_events():
    print(f"Fetching events from {FIEROHUB_API_URL}...")
    req = urllib.request.Request(
        FIEROHUB_API_URL,
        headers={"User-Agent": USER_AGENT}
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        if resp.status != 200:
            raise RuntimeError(f"HTTP {resp.status} fetching events")
        raw_data = resp.read().decode("utf-8")
        return json.loads(raw_data)

def normalize_events(raw_events):
    normalized = []
    for ev in raw_events:
        if not ev.get("active", 1):
            continue
        
        ev_id = ev.get("id")
        name = (ev.get("name") or "Unnamed Event").strip()
        ev_type = ev.get("type", "otherevent").lower()
        type_info = TYPE_MAP.get(ev_type, {"label": "Fiero Event", "icon": "🗓️"})
        
        start_date = ev.get("datestart") or ""
        end_date = ev.get("dateend") or ""
        date_display = format_date_range(start_date, end_date)
        
        city = (ev.get("city") or "").strip()
        state = (ev.get("state") or "").strip()
        country = (ev.get("country") or "").strip()
        
        location_parts = [p for p in [city, state, country] if p]
        location_str = ", ".join(location_parts) if location_parts else "Location TBA"
        
        info = (ev.get("otherinfo") or "").strip()
        pic = (ev.get("eventpictures") or "").strip()
        pic_url = f"https://fierohub.com/event/pictures/{pic}" if pic else ""
        
        fierohub_url = f"https://fierohub.com/events/?id={ev_id}"
        event_url = (ev.get("url") or "").strip()
        
        normalized.append({
            "id": ev_id,
            "name": name,
            "type": ev_type,
            "type_label": type_info["label"],
            "type_icon": type_info["icon"],
            "datestart": start_date,
            "dateend": end_date,
            "date_display": date_display,
            "location": location_str,
            "city": city,
            "state": state,
            "country": country,
            "description": info,
            "picture_url": pic_url,
            "fierohub_url": fierohub_url,
            "official_url": event_url
        })
    
    # Sort by datestart descending (most recent/future first)
    normalized.sort(key=lambda x: x.get("datestart", ""), reverse=True)
    return normalized

def generate_events_html(events, sync_timestamp):
    cards_html = []
    for ev in events:
        pic_block = ""
        if ev["picture_url"]:
            pic_block = f"""
            <div class='event-card-media'>
                <img src='{ev["picture_url"]}' alt='{ev["name"]}' loading='lazy' onerror="this.parentElement.style.display='none';">
            </div>"""
        
        official_link = ""
        if ev["official_url"]:
            official_link = f"<a href='{ev['official_url']}' target='_blank' rel='noopener' class='event-btn-sub'>Official Site ↗</a>"
        
        # Clean description preview
        clean_desc = re.sub(r'\s+', ' ', ev['description']).strip()
        if len(clean_desc) > 180:
            clean_desc = clean_desc[:177] + "..."
        desc_html = f"<p class='event-card-desc'>{clean_desc}</p>" if clean_desc else ""

        card = f"""
        <div class='event-card' data-type='{ev["type"]}' data-start='{ev["datestart"]}' data-end='{ev["dateend"]}'>
            {pic_block}
            <div class='event-card-body'>
                <div class='event-card-meta'>
                    <span class='event-type-pill'>{ev["type_icon"]} {ev["type_label"]}</span>
                    <span class='event-date-pill'>📅 {ev["date_display"]}</span>
                </div>
                <h4 class='event-card-title'>
                    <a href='{ev["fierohub_url"]}' target='_blank' rel='noopener'>{ev["name"]}</a>
                </h4>
                <div class='event-card-loc'>📍 {ev["location"]}</div>
                {desc_html}
                <div class='event-card-actions'>
                    <a href='{ev["fierohub_url"]}' target='_blank' rel='noopener' class='event-btn-primary'>View Details on FieroHub ↗</a>
                    {official_link}
                </div>
            </div>
        </div>"""
        cards_html.append(card)

    cards_joined = "\n".join(cards_html)

    return f"""<!--BEGIN_FIERO_EVENTS-->
<a name='news_events' id='news_events'></a><br>
<div class='news-item floatfix fiero-events-post'>
<div class='content'>
<div class='image'><a href='https://fierohub.com/events/' target='_blank' rel='noopener'><img src='images/news_cats/news.gif' alt='Events' class='news-category'></a></div>
<div>
<span class='title'><a href='https://fierohub.com/events/' target='_blank' rel='noopener'>Worldwide Fiero Car Events & Gatherings</a><br></span>
<span class='poster'><!--news_poster--><img src='themes/sk_bluemarble2/images/bullet.png' alt='' style='vertical-align:middle; border: 0px;'> <span><a href='https://fierohub.com/events/' target='_blank' class='profile-link'>FieroHub Global Feed</a></span> &bull; Synced {sync_timestamp}
</span>
</div>
<div class='subject'>
<p class='events-lead-text'>
Upcoming Pontiac Fiero car shows, meets, road trips, and anniversary celebrations happening around the world. Synchronized directly with the global Fiero registry at <a href='https://fierohub.com/events/' target='_blank' rel='noopener'><strong>FieroHub.com/events</strong></a>.
</p>

<div class='events-controls-container'>
    <!-- Row 1: Status Filters & View Mode Toggle -->
    <div class='events-controls-row'>
        <div class='events-btn-group' id='eventStatusButtons'>
            <button class='filter-pill active' onclick='filterEventStatus("all", this)'>📋 All Events (<span id="eventCountTotal">{len(events)}</span>)</button>
            <button class='filter-pill' onclick='filterEventStatus("upcoming", this)'>🌟 Upcoming (<span id="eventCountUpcoming">0</span>)</button>
            <button class='filter-pill' onclick='filterEventStatus("expired", this)'>⏱️ Expired / Past (<span id="eventCountExpired">{len(events)}</span>)</button>
        </div>
        <div class='events-view-toggle'>
            <button class='view-toggle-btn active' id='viewGridBtn' onclick='toggleEventView("grid", this)' title='Card Grid View'>⊞ Cards</button>
            <button class='view-toggle-btn' id='viewListBtn' onclick='toggleEventView("list", this)' title='Compact List View'>☰ Compact List</button>
        </div>
    </div>

    <!-- Row 2: Category Filters & Portal Link -->
    <div class='events-controls-row secondary'>
        <div class='events-btn-group' id='eventTypeButtons'>
            <span class='filter-label'>Category:</span>
            <button class='filter-chip active' onclick='filterEventType("all", this)'>All Types</button>
            <button class='filter-chip' onclick='filterEventType("meetup", this)'>🚘 Shows & Meets</button>
            <button class='filter-chip' onclick='filterEventType("cruise", this)'>🛣️ Cruises</button>
            <button class='filter-chip' onclick='filterEventType("club", this)'>👥 Clubs</button>
        </div>
        <div class='events-portal-actions'>
            <a href='https://fierohub.com/events/' target='_blank' rel='noopener' class='event-portal-btn'>🌐 Open FieroHub Map ↗</a>
        </div>
    </div>
</div>

<div class='events-empty-notice' id='eventsEmptyNotice' style='display:none;'></div>

<div class='events-grid' id='fieroEventsGrid'>
{cards_joined}
</div>

<div class='events-pagination' id='eventsPagination'></div>

<div class='events-footer-note'>
    <span>Hosting a Fiero event or meet? <a href='https://fierohub.com/events/' target='_blank' rel='noopener'><strong>Submit your event on FieroHub</strong></a> to have it broadcast to the global Fiero community.</span>
</div>
</div>
<div class='footer'>
<span class='category'><!--news_cat-->In <a href='news_cats.php-2.html?cat_id=11'>News & Events</a>  -  </span>
<span class='read-more'><a href='https://fierohub.com/events/' target='_blank' rel='noopener' title='View on FieroHub'><img src='images/printer.png' alt='Link' style='vertical-align:middle;border:0;'></a></span>
</div>
</div>
<div class='clear'></div><br><hr>
</div>
<!--END_FIERO_EVENTS-->"""

def update_news_html(events_html):
    if not os.path.exists(NEWS_HTML_PATH):
        print(f"Error: {NEWS_HTML_PATH} does not exist")
        return False
    
    with open(NEWS_HTML_PATH, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    
    # Check if markers already exist
    if "<!--BEGIN_FIERO_EVENTS-->" in content and "<!--END_FIERO_EVENTS-->" in content:
        pattern = re.compile(r"<!--BEGIN_FIERO_EVENTS-->.*?<!--END_FIERO_EVENTS-->", re.DOTALL)
        new_content = pattern.sub(events_html, content)
        print("Updated existing <!--BEGIN_FIERO_EVENTS--> section in news.php.html")
    elif "<!--news_prepost_1-->" in content:
        # Replace obsolete registration closed post (news_21) or prepend before news_prepost_1
        # Let's inspect if news_21 is there
        if "news_21" in content:
            pattern = re.compile(r"<!--news_prepost_1-->.*?<!--news_prepost_2-->", re.DOTALL)
            replacement = f"<!--news_prepost_1-->\n{events_html}\n<!--news_prepost_2-->"
            new_content = pattern.sub(replacement, content)
            print("Replaced obsolete news_21 with <!--BEGIN_FIERO_EVENTS--> in news.php.html")
        else:
            new_content = content.replace("<!--news_prepost_1-->", f"<!--news_prepost_1-->\n{events_html}")
            print("Prepended events feed before news_prepost_1 in news.php.html")
    else:
        print("Warning: Could not find insertion marker in news.php.html")
        return False
    
    with open(NEWS_HTML_PATH, "w", encoding="utf-8") as f:
        f.write(new_content)
    
    return True

def main():
    raw_events = fetch_events()
    normalized = normalize_events(raw_events)
    print(f"Fetched and normalized {len(normalized)} events.")
    
    # Write fusion/events.json
    with open(EVENTS_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump({
            "last_synced": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%SZ"),
            "count": len(normalized),
            "events": normalized
        }, f, indent=2)
    print(f"Saved {EVENTS_JSON_PATH}")
    
    # Update news.php.html
    sync_time_str = datetime.now(timezone.utc).strftime("%B %d, %Y")
    events_html = generate_events_html(normalized, sync_time_str)
    update_news_html(events_html)
    print("Events sync complete!")

if __name__ == "__main__":
    main()
