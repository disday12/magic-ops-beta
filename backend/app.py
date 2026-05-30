from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from datetime import datetime, timedelta
import sqlite3, json, os, io
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
import requests

app = Flask(__name__)
CORS(app)

DB_PATH = "/data/trips.db"
os.makedirs("/data", exist_ok=True)

# Disney World approximate coordinates
WDW_LAT = 28.3772
WDW_LON = -81.5707

REST_DAY = {
    "vibe": "pool, recovery, travel buffer, Disney Springs, resort dining, event prep",
    "fatigue": 2,
    "rides": {
        "toddlers": ["Pool time", "Resort playground", "Boat/Skyliner/monorail ride if available"],
        "thrills": [],
        "low_stress": ["Pool", "Nap", "Resort walk", "Disney Springs", "Arcade", "Early bedtime"],
        "characters": []
    },
    "quick": [
        {"name": "Resort food court", "tags": ["easy", "kid friendly", "quick"], "price": 18, "why": "Lowest-stress meal option when the family is tired."},
        {"name": "Disney Springs quick service", "tags": ["variety", "big portions", "easy"], "price": 22, "why": "Good non-park option with more variety."},
        {"name": "Pool bar / resort quick bites", "tags": ["pool", "casual", "easy"], "price": 17, "why": "Best option when you want to stay near the pool."}
    ],
    "table": [
        {"name": "Resort table service", "tags": ["easy", "relaxed", "family"], "price": 38, "why": "Best table-service fallback because you avoid another park commute."},
        {"name": "Disney Springs table service", "tags": ["variety", "high value", "dinner"], "price": 45, "why": "Best non-park cluster of dinner options."},
        {"name": "Nearby resort character/buffet meal", "tags": ["character", "buffet", "family"], "price": 55, "why": "Good Disney meal experience without entering a park."}
    ],
    "snacks": [{"name":"resort cupcakes","price":7.49},{"name":"ice cream sundaes","price":8.49},{"name":"bakery items","price":6.99},{"name":"Disney Springs desserts","price":9.99}]
}

PARKS = {
    "Magic Kingdom": {
        "vibe": "classic Disney, princesses, parades, fireworks, toddlers",
        "fatigue": 8,
        "rides": {
            "toddlers": ["Dumbo", "Winnie the Pooh", "Little Mermaid", "Small World", "Carousel"],
            "thrills": ["Seven Dwarfs Mine Train", "TRON", "Big Thunder Mountain", "Space Mountain"],
            "low_stress": ["PeopleMover", "PhilharMagic", "Carousel of Progress", "Country Bear Musical Jamboree"],
            "characters": ["Princess Fairytale Hall", "Mickey at Town Square", "Pooh friends at Crystal Palace"]
        },
        "quick": [
            {"name": "Columbia Harbour House", "tags": ["seafood", "chicken", "quiet", "high value"], "price": 22, "why": "Best all-around Magic Kingdom quick service and calmer than burger spots."},
            {"name": "Pecos Bill", "tags": ["mexican", "big portions", "kid friendly"], "price": 21, "why": "Large portions and easy family food."},
            {"name": "Cosmic Ray's", "tags": ["burgers", "chicken", "kid friendly"], "price": 19, "why": "Reliable kid food and lots of seating."}
        ],
        "table": [
            {"name": "Crystal Palace", "tags": ["character", "buffet", "kid friendly"], "price": 62, "why": "Pooh character meal; excellent for kids and dining-plan value."},
            {"name": "Liberty Tree Tavern", "tags": ["family style", "all you care to enjoy", "comfort food"], "price": 44, "why": "High-value table-service meal with large portions."},
            {"name": "Skipper Canteen", "tags": ["adventurous", "asian", "calmer"], "price": 36, "why": "Better adult food and calmer sit-down option."}
        ],
        "snacks": [{"name":"Gaston’s cinnamon roll","price":7.99},{"name":"Dole Whip float","price":7.49},{"name":"Sleepy Hollow waffle","price":8.49},{"name":"specialty cupcakes","price":6.99}]
    },
    "Hollywood Studios": {
        "vibe": "Toy Story, Star Wars, Disney Junior, shows",
        "fatigue": 7,
        "rides": {
            "toddlers": ["Toy Story Mania", "Alien Swirling Saucers", "Disney Junior Play & Dance", "Mickey & Minnie's Runaway Railway"],
            "thrills": ["Rise of the Resistance", "Slinky Dog Dash", "Tower of Terror", "Rock 'n' Roller Coaster"],
            "low_stress": ["Frozen Sing-Along", "MuppetVision", "Beauty and the Beast show"],
            "characters": ["Disney Junior characters", "Toy Story characters", "Star Wars characters"]
        },
        "quick": [
            {"name": "Docking Bay 7", "tags": ["bowls", "star wars", "protein", "high value"], "price": 24, "why": "High-value quick service with real meals instead of basic burgers."},
            {"name": "Ronto Roasters", "tags": ["wraps", "star wars", "fast"], "price": 18, "why": "Fast, filling wraps and good value."},
            {"name": "Woody's Lunch Box", "tags": ["kid friendly", "totchos", "snacks"], "price": 17, "why": "Fun themed food for kids and good snack options."}
        ],
        "table": [
            {"name": "Roundup Rodeo BBQ", "tags": ["character feel", "bbq", "family style", "kid friendly"], "price": 49, "why": "Excellent kids’ atmosphere and all-you-care-to-enjoy dining-plan value."},
            {"name": "50's Prime Time Cafe", "tags": ["comfort food", "fun", "large portions"], "price": 35, "why": "Fun family atmosphere and large comfort-food portions."},
            {"name": "Sci-Fi Dine-In Theater", "tags": ["atmosphere", "burgers", "kids"], "price": 31, "why": "Cool car seating and atmosphere."}
        ],
        "snacks": [{"name":"Jack-Jack Num Num Cookie","price":6.79},{"name":"Wookiee Cookie","price":6.99},{"name":"Lunch Box Tart","price":5.49},{"name":"specialty cupcakes","price":6.99}]
    },
    "Animal Kingdom": {
        "vibe": "animals, trails, shows, lower-pressure touring",
        "fatigue": 5,
        "rides": {
            "toddlers": ["Kilimanjaro Safaris", "TriceraTop Spin", "Navi River Journey", "animal trails"],
            "thrills": ["Flight of Passage", "Expedition Everest", "DINOSAUR if available"],
            "low_stress": ["Festival of the Lion King", "Finding Nemo show", "Gorilla Falls", "Maharajah Jungle Trek"],
            "characters": ["Donald/Daisy safari characters", "Adventurers Outpost Mickey and Minnie"]
        },
        "quick": [
            {"name": "Satu'li Canteen", "tags": ["bowls", "protein", "healthy", "high value"], "price": 23, "why": "One of the best quick-service values in Disney World."},
            {"name": "Flame Tree Barbecue", "tags": ["bbq", "big portions", "outdoor"], "price": 24, "why": "Large BBQ portions and good credit value."},
            {"name": "Yak & Yeti Local Foods", "tags": ["asian", "quick", "big portions"], "price": 20, "why": "Good portions and variety."}
        ],
        "table": [
            {"name": "Tusker House", "tags": ["character", "buffet", "kid friendly"], "price": 62, "why": "Mickey friends character meal and strong dining-plan value."},
            {"name": "Yak & Yeti Restaurant", "tags": ["asian", "big portions", "adult food"], "price": 38, "why": "Good adult food and large portions."},
            {"name": "Tiffins", "tags": ["premium", "adventurous"], "price": 55, "why": "Best food quality, but less toddler-focused."}
        ],
        "snacks": [{"name":"Pongu Lumpia","price":5.99},{"name":"Colossal cinnamon roll","price":7.49},{"name":"ice cream cookie sandwich","price":7.29},{"name":"specialty desserts","price":6.99}]
    },
    "EPCOT": {
        "vibe": "Frozen, Remy, snacks, festival food, slower exploration",
        "fatigue": 7,
        "rides": {
            "toddlers": ["Frozen Ever After", "Remy's Ratatouille Adventure", "The Seas with Nemo", "Journey of Water"],
            "thrills": ["Guardians of the Galaxy", "Test Track if available", "Mission: SPACE"],
            "low_stress": ["Living with the Land", "Spaceship Earth", "The Seas", "Turtle Talk with Crush"],
            "characters": ["Anna and Elsa", "Mickey and friends", "princesses around World Showcase"]
        },
        "quick": [
            {"name": "Regal Eagle Smokehouse", "tags": ["bbq", "big portions", "high value"], "price": 24, "why": "Strong quick-service credit value with BBQ platters."},
            {"name": "Connections Eatery", "tags": ["easy", "kid friendly", "pizza", "burgers"], "price": 20, "why": "Easy seating and simple family food."},
            {"name": "Les Halles Boulangerie", "tags": ["bakery", "pastries", "snacks"], "price": 18, "why": "Great pastries and snack-credit potential."}
        ],
        "table": [
            {"name": "Garden Grill", "tags": ["character", "family style", "kid friendly"], "price": 62, "why": "Best young-kid EPCOT meal; characters come to your table."},
            {"name": "Via Napoli", "tags": ["pizza", "italian", "family"], "price": 34, "why": "Easy family food if your group likes pizza."},
            {"name": "Biergarten", "tags": ["buffet", "entertainment", "large portions"], "price": 49, "why": "Buffet and live entertainment."}
        ],
        "snacks": [{"name":"Karamell-Küche caramel treats","price":7.99},{"name":"France bakery pastries","price":8.49},{"name":"festival booth snack items","price":8.99},{"name":"large desserts","price":7.49}]
    },
    "Resort / Rest Day": REST_DAY
}

RESORTS = {
    "Port Orleans Riverside": ["Boatwright's Dining Hall", "Riverside Mill Food Court", "River Roost Lounge", "Sassagoula Floatworks at French Quarter", "Disney Springs by boat"],
    "Port Orleans French Quarter": ["Sassagoula Floatworks", "Boatwright's at Riverside", "Disney Springs by boat"],
    "Pop Century": ["Everything POP", "Skyliner to Riviera", "Skyliner to Caribbean Beach", "Skyliner to EPCOT area"],
    "Art of Animation": ["Landscape of Flavors", "Skyliner to Riviera", "Skyliner to Caribbean Beach"],
    "Caribbean Beach": ["Sebastian's Bistro", "Centertown Market", "Spyglass Grill", "Skyliner dining access"],
    "Animal Kingdom Lodge": ["Boma", "Sanaa", "The Mara"],
    "Contemporary": ["Chef Mickey's", "Steakhouse 71", "Contempo Cafe", "walk/monorail to Magic Kingdom"],
    "Polynesian": ["Ohana", "Kona Cafe", "Capt. Cook's", "monorail to Magic Kingdom"],
    "Grand Floridian": ["1900 Park Fare", "Grand Floridian Cafe", "Gasparilla Island Grill", "monorail to Magic Kingdom"],
    "Wilderness Lodge": ["Whispering Canyon Cafe", "Roaring Fork", "Geyser Point", "boat to Magic Kingdom"],
    "BoardWalk": ["Trattoria al Forno", "BoardWalk Deli", "walk/boat to EPCOT and Hollywood Studios"],
    "Beach Club": ["Cape May Cafe", "Beaches & Cream", "walk/boat to EPCOT and Hollywood Studios"],
    "Yacht Club": ["Ale & Compass", "Crew's Cup", "walk/boat to EPCOT and Hollywood Studios"],
    "Other": ["Resort quick service", "nearest Disney Springs option", "nearest park-area resort dining"]
}

def init_db():
    with sqlite3.connect(DB_PATH) as con:
        con.execute("""CREATE TABLE IF NOT EXISTS trips (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            created_at TEXT NOT NULL,
            input_json TEXT NOT NULL,
            plan_json TEXT NOT NULL
        )""")
init_db()

def parse_date(s):
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%b %d %Y", "%B %d %Y"):
        try:
            return datetime.strptime(s.strip(), fmt).date()
        except Exception:
            pass
    return None

def split_text(v):
    if isinstance(v, list):
        return v
    if not v:
        return []
    return [x.strip() for x in str(v).split(",") if x.strip()]

def fetch_weather(start, end):
    """Uses Open-Meteo. No API key required. For future dates beyond forecast availability,
    it returns climate-normal fallback estimates by month."""
    dates = []
    d = start
    while d <= end:
        dates.append(d)
        d += timedelta(days=1)

    weather_by_date = {}
    try:
        url = (
            "https://api.open-meteo.com/v1/forecast"
            f"?latitude={WDW_LAT}&longitude={WDW_LON}"
            "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code"
            "&temperature_unit=fahrenheit&timezone=America%2FNew_York"
            f"&start_date={start.isoformat()}&end_date={end.isoformat()}"
        )
        r = requests.get(url, timeout=8)
        r.raise_for_status()
        daily = r.json().get("daily", {})
        for i, ds in enumerate(daily.get("time", [])):
            weather_by_date[ds] = {
                "source": "Open-Meteo forecast",
                "high": daily.get("temperature_2m_max", [None])[i],
                "low": daily.get("temperature_2m_min", [None])[i],
                "rainProbability": daily.get("precipitation_probability_max", [None])[i],
                "weatherCode": daily.get("weather_code", [None])[i]
            }
    except Exception:
        pass

    for day in dates:
        ds = day.isoformat()
        if ds not in weather_by_date:
            # Orlando rough seasonal fallback. Not a forecast.
            month = day.month
            if month in [6,7,8,9]:
                high, low, rain = 92, 74, 55
            elif month in [10]:
                high, low, rain = 84, 68, 30
            elif month in [11,12,1,2]:
                high, low, rain = 74, 56, 20
            elif month in [3,4,5]:
                high, low, rain = 84, 65, 25
            else:
                high, low, rain = 84, 65, 25
            weather_by_date[ds] = {
                "source": "Seasonal fallback estimate - not a live forecast",
                "high": high,
                "low": low,
                "rainProbability": rain,
                "weatherCode": None
            }
    return weather_by_date

def weather_fatigue_adjustment(w):
    high = w.get("high") or 80
    rain = w.get("rainProbability") or 0
    adj = 0
    notes = []
    if high >= 95:
        adj += 3
        notes.append("Extreme heat risk: treat this like a high-meltdown day. Plan AC breaks every 60-90 minutes.")
    elif high >= 90:
        adj += 2
        notes.append("Very hot day: add extra water, stroller shade, and a longer midday break.")
    elif high >= 85:
        adj += 1
        notes.append("Warm day: heat will build fatigue, especially after lunch.")
    if rain >= 70:
        adj += 2
        notes.append("High rain risk: pack ponchos, protect stroller, and prioritize indoor shows.")
    elif rain >= 45:
        adj += 1
        notes.append("Moderate rain risk: build a flexible indoor backup block.")
    if high <= 70 and rain < 40:
        adj -= 1
        notes.append("Comfortable weather: fatigue risk is lower than normal.")
    return adj, notes

def meltdown_prediction(score, weather, is_arrival, is_departure, pool_pref):
    high = weather.get("high")
    rain = weather.get("rainProbability")
    if score >= 9:
        level = "High"
        time = "1:30 PM - 3:30 PM"
        action = "Leave for resort pool/nap before the meltdown. Do not try to force another major ride."
    elif score >= 7:
        level = "Moderate"
        time = "2:30 PM - 4:00 PM"
        action = "Schedule an indoor show, AC meal, or pool break before the kids crash."
    else:
        level = "Low"
        time = "Late afternoon"
        action = "Normal pacing should work, but still protect snack/water breaks."
    if is_arrival:
        action += " Arrival-day travel makes kids more fragile than the park plan looks on paper."
    if is_departure:
        action += " Departure pressure adds parent stress, so keep the final block simple."
    if high and high >= 90:
        time = "12:30 PM - 2:30 PM"
    return {"risk": level, "likelyCrashWindow": time, "recommendedAction": action}

def score_park(park, priorities):
    p = " ".join(priorities).lower()
    score = 0
    vibe = PARKS[park]["vibe"].lower()
    rules = [
        ("princess", ["Magic Kingdom", "EPCOT"], 3),
        ("toy", ["Hollywood Studios"], 3),
        ("star wars", ["Hollywood Studios"], 4),
        ("animal", ["Animal Kingdom"], 4),
        ("snack", ["EPCOT"], 3),
        ("food", ["EPCOT"], 2),
        ("little kids", ["Magic Kingdom", "Animal Kingdom"], 2),
        ("characters", ["Magic Kingdom", "EPCOT", "Animal Kingdom"], 2),
        ("classic", ["Magic Kingdom"], 3),
        ("pool", ["Animal Kingdom"], 1)
    ]
    for needle, parks, pts in rules:
        if needle in p and park in parks:
            score += pts
    for word in p.split():
        if word in vibe:
            score += 1
    return score

def choose_parks(ticket_days, priorities, must_events, manual_order):
    all_parks = ["Magic Kingdom", "Animal Kingdom", "EPCOT", "Hollywood Studios"]
    manual = [p for p in manual_order if p in all_parks or p == "Resort / Rest Day"]
    parks = list(manual)
    event_text = " ".join(must_events).lower()
    if ("halloween" in event_text or "christmas" in event_text or "party" in event_text) and "Magic Kingdom" not in parks:
        parks.append("Magic Kingdom")
    ranked = sorted(all_parks, key=lambda x: score_park(x, priorities), reverse=True)
    for p in ranked:
        if p not in parks:
            parks.append(p)
    while len([p for p in parks if p != "Resort / Rest Day"]) < ticket_days:
        parks += all_parks
    return parks

def filter_food(options, likes, dislikes):
    likes_l = " ".join(likes).lower()
    dislikes_l = " ".join(dislikes).lower()
    scored = []
    for item in options:
        text = (item["name"] + " " + " ".join(item["tags"]) + " " + item["why"]).lower()
        score = int(item.get("price",0))
        for w in likes_l.replace(",", " ").split():
            if w and w in text:
                score += 10
        for w in dislikes_l.replace(",", " ").split():
            if w and w in text:
                score -= 40
        scored.append((score, item))
    return [x[1] for x in sorted(scored, key=lambda x: x[0], reverse=True)]

def value_label(price, credit_type, dining_plan):
    if not dining_plan or dining_plan.lower() == "none":
        return "Cash decision"
    if credit_type == "snack":
        if price >= 8: return "Excellent snack-credit value"
        if price >= 7: return "Good snack-credit value"
        return "Low snack-credit value"
    if credit_type == "quick":
        if price >= 23: return "Excellent quick-service credit value"
        if price >= 20: return "Good quick-service credit value"
        return "Average quick-service credit value"
    if credit_type == "table":
        if price >= 55: return "Excellent table-service credit value"
        if price >= 42: return "Good table-service credit value"
        return "Consider paying cash if credits are tight"
    return ""

def estimate_budget(data):
    adults = int(data.get("adults") or 2)
    kids = int(data.get("kidsCount") or 3)
    nights = int(data.get("nights") or 4)
    ticket_days = int(data.get("ticketDays") or 4)
    hotel_per_night = float(data.get("hotelPerNight") or 325)
    ticket_per_person_day = float(data.get("ticketPerPersonDay") or 165)
    dining_plan_per_person_day = float(data.get("diningPlanPerPersonDay") or 98)
    has_plan = data.get("diningPlan","Disney Dining Plan").lower() != "none"
    souvenir = float(data.get("souvenirBudget") or 400)
    flights = float(data.get("flightBudget") or 0)
    stroller = float(data.get("strollerBudget") or 0)
    people = adults + kids
    hotel = hotel_per_night * nights
    tickets = ticket_per_person_day * ticket_days * people
    dining = dining_plan_per_person_day * nights * people if has_plan else 0
    total = hotel + tickets + dining + souvenir + flights + stroller
    return {"hotel": round(hotel,2), "tickets": round(tickets,2), "diningPlan": round(dining,2), "souvenirs": round(souvenir,2), "flights": round(flights,2), "stroller": round(stroller,2), "estimatedTotal": round(total,2)}


def fatigue_reducer_options(day, data):
    """Return practical changes that lower fatigue for this specific day."""
    park = day.get("park", "")
    score = day.get("fatigueScore", 5)
    weather = day.get("weather", {}) or {}
    high = weather.get("high") or 80
    rain = weather.get("rainProbability") or 0
    is_party = "Party" in day.get("type", "")
    is_arrival = day.get("isArrival", False)
    is_departure = day.get("isDeparture", False)

    options = []

    def add(title, reduction, why, tradeoff, category):
        options.append({
            "title": title,
            "reduction": reduction,
            "why": why,
            "tradeoff": tradeoff,
            "category": category
        })

    # Universal reducers
    add(
        "Add a real 90-minute resort rest block",
        2,
        "A true room break resets kids better than sitting on a bench in the park.",
        "You will lose some park time, but the evening is much more likely to work.",
        "Rest"
    )
    add(
        "Schedule an air-conditioned table-service lunch",
        1,
        "A sit-down AC lunch lowers heat load, gives kids a reset, and protects parent patience.",
        "Costs more time and may require a reservation.",
        "Dining"
    )
    add(
        "Use or rent a stroller even for older small kids",
        1,
        "A stroller reduces walking fatigue and gives the 5/6-year-old a backup when they crash.",
        "You have to park and retrieve it around attractions.",
        "Logistics"
    )
    add(
        "Cut one ride cluster and replace it with an indoor show",
        1,
        "Shows reduce walking, heat, and line stress while still feeling like you did something.",
        "You may skip a lower-priority ride.",
        "Touring"
    )
    add(
        "Move dinner to your resort or nearby resort",
        1,
        "Resort dinner removes late transportation stress and prevents the end-of-day spiral.",
        "Less park atmosphere at night.",
        "Dining"
    )

    # Park-specific reducers
    if park == "Magic Kingdom":
        add(
            "Skip fireworks or watch from outside the hub",
            2,
            "The hub/fireworks crush is one of the highest stress moments for young kids.",
            "You may miss the classic castle fireworks view.",
            "Evening"
        )
        add(
            "Do Fantasyland early, then stop chasing rides after lunch",
            1,
            "Magic Kingdom gets harder after lunch because crowds, heat, and stroller traffic stack up.",
            "You accept fewer total rides for a calmer day.",
            "Touring"
        )
    elif park == "EPCOT":
        add(
            "Avoid a full late World Showcase loop",
            1,
            "EPCOT walking distance can sneak up on families, especially with kids.",
            "You may skip some countries or snacks.",
            "Walking"
        )
        add(
            "Use The Seas/Land pavilion as a midday reset zone",
            1,
            "These areas give AC, slower pace, and kid-friendly downtime.",
            "Less time in World Showcase.",
            "Heat"
        )
    elif park == "Hollywood Studios":
        add(
            "Limit high-stimulation ride chasing",
            1,
            "Hollywood Studios gets stressful when you chase every headliner and showtime.",
            "You may need to choose between Star Wars and Toy Story priorities.",
            "Touring"
        )
        add(
            "Use shows as anchor breaks",
            1,
            "Frozen Sing-Along, MuppetVision, and stage shows create forced rest.",
            "Your schedule becomes less ride-heavy.",
            "Rest"
        )
    elif park == "Animal Kingdom":
        add(
            "Leave Animal Kingdom by mid-afternoon",
            1,
            "Animal Kingdom is easiest when treated as an early-start, early-exit park.",
            "You may miss evening Pandora lighting.",
            "Timing"
        )

    # Weather-specific reducers
    if high >= 90:
        add(
            "Move outdoor attractions before 11 AM",
            1,
            "Heat fatigue spikes after late morning in Florida.",
            "Requires earlier start.",
            "Weather"
        )
        add(
            "Add mandatory AC break from 12:30-2:30",
            2,
            "This directly targets the hottest and most common meltdown window.",
            "You must stop touring during prime park time.",
            "Weather"
        )
    elif high >= 85:
        add(
            "Add an extra drink/snack reset before lunch",
            1,
            "Warm weather fatigue shows up as whining before it looks like a meltdown.",
            "Small time cost.",
            "Weather"
        )

    if rain >= 45:
        add(
            "Build a rain-safe indoor backup block",
            1,
            "Rain causes stroller chaos, wet shoes, and parent stress.",
            "You may miss some outdoor plans.",
            "Weather"
        )

    # Trip-context reducers
    if is_arrival:
        add(
            "Make arrival day a half park day",
            2,
            "Travel fatigue counts even if you feel excited. Kids are already off schedule.",
            "You get fewer first-day rides.",
            "Travel"
        )
    if is_departure:
        add(
            "Keep departure day simple with no hard dinner reservation",
            1,
            "Packing, checkout, and airport timing add hidden stress.",
            "Less of a big final meal.",
            "Travel"
        )
    if is_party:
        add(
            "Protect a real nap before the party",
            2,
            "Late parties only work with small kids if the afternoon is quiet.",
            "You sacrifice daytime activity.",
            "Party"
        )
        add(
            "Schedule the next morning as slow or resort-based",
            2,
            "Late party nights create next-day fatigue debt.",
            "You may need to avoid rope drop the next day.",
            "Recovery"
        )

    # Deduplicate by title
    seen = set()
    cleaned = []
    for opt in options:
        if opt["title"] not in seen:
            seen.add(opt["title"])
            cleaned.append(opt)

    # Sort strongest reducers first, then category
    cleaned.sort(key=lambda x: (-x["reduction"], x["category"]))
    return cleaned


def choose_reduction_plan(day, target_score):
    current = day.get("fatigueScore", 5)
    needed = max(0, current - target_score)
    options = fatigue_reducer_options(day, {})
    chosen = []
    total = 0

    for opt in options:
        if total >= needed:
            break
        # Avoid suggesting too many huge lifestyle changes when not needed
        chosen.append(opt)
        total += int(opt.get("reduction", 0))

    projected = max(1, current - total)
    if current <= target_score:
        status = "Already at or under target"
        summary = "This day is already manageable. Keep the current plan and do not add more complexity."
    elif projected <= target_score:
        status = "Target achievable"
        summary = f"Apply the recommended changes to bring this day from {current}/10 down to about {projected}/10."
    else:
        status = "Still high risk"
        summary = f"Even after the easy reductions, this day may stay around {projected}/10. Consider changing park order or adding a resort/rest day."

    return {
        "targetScore": target_score,
        "currentScore": current,
        "neededReduction": needed,
        "recommendedReduction": total,
        "projectedScore": projected,
        "status": status,
        "summary": summary,
        "recommendedChanges": chosen[:5],
        "allOptions": options[:10]
    }


def build_plan(data):
    resort = data.get("resort", "Port Orleans Riverside")
    start = parse_date(data.get("startDate")) or datetime.now().date()
    end = parse_date(data.get("endDate")) or (start + timedelta(days=4))
    if end < start:
        end = start

    weather_enabled = bool(data.get("weatherEnabled", True))
    weather_by_date = fetch_weather(start, end) if weather_enabled else {}

    ticket_days = max(1, min(int(data.get("ticketDays") or 4), 14))
    dining_plan = data.get("diningPlan", "Disney Dining Plan")
    family = data.get("family", "")
    priorities = split_text(data.get("priorities", []))
    likes = split_text(data.get("foodLikes", []))
    dislikes = split_text(data.get("foodDislikes", []))
    must_events = split_text(data.get("mustEvents", []))
    manual_order = split_text(data.get("manualParkOrder", []))
    pool = data.get("poolPreference", "Some pool time")
    exercise = data.get("exercisePreference", "Light walking")
    target_fatigue = int(data.get("targetFatigue") or 6)
    arrival = data.get("arrivalTime", "")
    departure = data.get("departureTime", "")

    trip_days = []
    d = start
    while d <= end:
        trip_days.append(d)
        d += timedelta(days=1)

    selected_parks = choose_parks(ticket_days, priorities, must_events, manual_order)
    park_index = 0
    output_days = []
    event_text = " ".join(must_events).lower()
    has_party = "halloween" in event_text or "christmas" in event_text or "party" in event_text
    used_ticket_days = 0

    for idx, day in enumerate(trip_days):
        is_arrival = idx == 0
        is_departure = idx == len(trip_days) - 1
        ds = day.isoformat()
        weather = weather_by_date.get(ds, {"source":"Weather disabled", "high":None, "low":None, "rainProbability":None})

        if has_party and len(trip_days) > ticket_days and idx == len(trip_days) - 2:
            park = "Magic Kingdom"
            day_type = "Party / Resort Day"
            morning = ["Sleep in", "Pool time", "Nap/rest before event", "Do not waste a full park ticket if party entry is separate"]
            afternoon = ["Enter party park at earliest allowed party-entry time", "Do rides before official party starts", "Eat quick service before peak party time"]
            fatigue_mod = -2
        elif park_index < len(selected_parks) and used_ticket_days < ticket_days:
            park = selected_parks[park_index]
            park_index += 1
            if park == "Resort / Rest Day":
                day_type = "Resort / Recovery Day"
                morning = ["Sleep in", "Pool", "Resort breakfast", "Laundry/restock if needed"]
                afternoon = ["Disney Springs or resort activities", "Early dinner", "Early bedtime"]
                fatigue_mod = -3
            else:
                used_ticket_days += 1
                day_type = "Park Day"
                if is_arrival:
                    morning = [f"Arrival travel window: {arrival or 'not entered'}", "Drop bags at resort", f"Go to {park} at a realistic pace"]
                else:
                    morning = PARKS[park]["rides"]["toddlers"][:3] + PARKS[park]["rides"]["low_stress"][:1]
                if "pool" in pool.lower() or "yes" in pool.lower() or "rest" in pool.lower():
                    afternoon = ["Leave park for pool/rest when kids fade", "Return only if dinner or a must-see event is worth the energy"]
                    fatigue_mod = -1
                else:
                    afternoon = ["Stay in park with indoor shows and slow attractions as breaks"]
                    fatigue_mod = 1
        else:
            park = "Resort / Rest Day"
            day_type = "Resort / Recovery Day"
            morning = ["Sleep in", "Pool", "Resort breakfast", "Laundry/restock if needed"]
            afternoon = ["Disney Springs or resort activities", "Early dinner", "Early bedtime"]
            fatigue_mod = -3

        pdata = PARKS.get(park) or REST_DAY
        weather_adj, weather_notes = weather_fatigue_adjustment(weather)
        quick = filter_food(pdata["quick"], likes, dislikes)
        table = filter_food(pdata["table"], likes, dislikes)
        snacks = sorted(pdata["snacks"], key=lambda x: x["price"], reverse=True)

        raw_fatigue = int(pdata.get("fatigue", 3)) + fatigue_mod + weather_adj + (2 if is_arrival or is_departure else 0)
        fatigue_score = max(1, min(10, raw_fatigue))
        fatigue_label = "Easy" if fatigue_score <= 4 else "Moderate" if fatigue_score <= 7 else "Brutal"
        meltdown = meltdown_prediction(fatigue_score, weather, is_arrival, is_departure, pool)

        for q in quick:
            q["valueLabel"] = value_label(q.get("price",0), "quick", dining_plan)
        for t in table:
            t["valueLabel"] = value_label(t.get("price",0), "table", dining_plan)
        for s in snacks:
            s["valueLabel"] = value_label(s.get("price",0), "snack", dining_plan)

        strategy = []
        if dining_plan and dining_plan.lower() != "none":
            strategy += [
                "Use table-service credits on character meals, buffets, family-style, or all-you-care-to-enjoy meals.",
                "Use quick-service credits on platters, bowls, BBQ, and large adult meals.",
                "Use snack credits on $7+ pastries, specialty desserts, festival items, floats, or large bakery items."
            ]
        else:
            strategy += [
                "Without a dining plan, split big quick-service meals when practical.",
                "Use table service selectively for experiences, not every night.",
                "Snack around EPCOT/Disney Springs instead of forcing full meals."
            ]

        if exercise and exercise.lower() not in ["none", "no"]:
            if (weather.get("high") or 75) >= 88:
                strategy.append(f"Exercise: {exercise}. Because of heat, do it early morning only or skip it.")
            else:
                strategy.append(f"Exercise: {exercise}. Best fit is early resort walk/jog before park start or light hotel gym time on rest days.")

        output_days.append({
            "date": day.strftime("%b %d, %Y"),
            "isoDate": ds,
            "type": day_type,
            "park": park,
            "isArrival": is_arrival,
            "isDeparture": is_departure,
            "theme": pdata["vibe"],
            "weather": weather,
            "weatherFatigueAdjustment": weather_adj,
            "weatherNotes": weather_notes,
            "fatigueScore": fatigue_score,
            "fatigueLabel": fatigue_label,
            "meltdownPrediction": meltdown,
            "morningPlan": morning,
            "afternoonPlan": afternoon,
            "departureNote": f"Departure window: {departure}" if is_departure and departure else "",
            "bestQuickService": quick[:3],
            "bestTableService": table[:3],
            "bestSnacks": snacks[:4],
            "lowStressOptions": pdata["rides"].get("low_stress", []),
            "resortFallbacks": RESORTS.get(resort, RESORTS["Other"]),
            "strategy": strategy
        })

        output_days[-1]["fatigueReducer"] = choose_reduction_plan(output_days[-1], target_fatigue)

    rewrite = make_rewrite(output_days, data)
    return {
        "version": "v25-live-escape-finder",
        "inputSummary": {
            "resort": resort,
            "dates": f"{start.strftime('%b %d, %Y')} to {end.strftime('%b %d, %Y')}",
            "ticketDays": ticket_days,
            "parkHopper": bool(data.get("parkHopper", False)),
            "diningPlan": dining_plan,
            "family": family,
            "priorities": priorities,
            "foodLikes": likes,
            "foodDislikes": dislikes,
            "mustEvents": must_events,
            "poolPreference": pool,
            "exercisePreference": exercise,
            "manualParkOrder": manual_order,
            "weatherEnabled": weather_enabled,
            "targetFatigue": target_fatigue
        },
        "budget": estimate_budget({**data, "nights": max(1,(end-start).days)}),
        "rewrite": rewrite,
        "days": output_days
    }

def make_rewrite(days, data):
    lines = []
    lines.append(f"Trip plan for {data.get('family','your group')} staying at {data.get('resort','your resort')}.")
    lines.append("The strategy is to front-load the highest-priority rides, protect rest/pool time, and use weather-adjusted fatigue scoring.")
    for d in days:
        w = d.get("weather", {})
        weather_line = f"High {w.get('high')}°F, rain risk {w.get('rainProbability')}%" if w.get("high") is not None else "Weather unavailable"
        lines.append(f"{d['date']}: {d['park']} ({d['fatigueLabel']} day, {weather_line}). Expected crash window: {d['meltdownPrediction']['likelyCrashWindow']}. Best action: {d['meltdownPrediction']['recommendedAction']}")
    return "\n".join(lines)


@app.route("/api/fatigue/reduce", methods=["POST"])
def reduce_fatigue():
    data = request.json or {}
    day = data.get("day") or {}
    target = int(data.get("targetScore") or 6)
    return jsonify(choose_reduction_plan(day, target))


@app.route("/")
def root():
    return jsonify({"app": "Disney Ops Planner", "status": "backend running", "version": "v25-live-escape-finder"})

@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "version": "v25-live-escape-finder"})

@app.route("/api/parks")
def parks():
    return jsonify({"parks": list(PARKS.keys()), "resorts": list(RESORTS.keys())})

@app.route("/api/weather")
def weather():
    start = parse_date(request.args.get("start")) or datetime.now().date()
    end = parse_date(request.args.get("end")) or start
    return jsonify(fetch_weather(start, end))

@app.route("/api/plan", methods=["POST"])
def plan():
    try:
        data = request.json or {}
        return jsonify(build_plan(data))
    except Exception as e:
        return jsonify({"error": str(e), "version": "v25-live-escape-finder"}), 500

@app.route("/api/trips", methods=["GET"])
def list_trips():
    with sqlite3.connect(DB_PATH) as con:
        rows = con.execute("SELECT id, name, created_at FROM trips ORDER BY id DESC").fetchall()
    return jsonify({"trips": [{"id": r[0], "name": r[1], "created_at": r[2]} for r in rows]})

@app.route("/api/trips", methods=["POST"])
def save_trip():
    data = request.json or {}
    name = data.get("name") or "Untitled Disney Trip"
    input_json = data.get("input") or {}
    plan_json = data.get("plan") or build_plan(input_json)
    with sqlite3.connect(DB_PATH) as con:
        cur = con.execute(
            "INSERT INTO trips (name, created_at, input_json, plan_json) VALUES (?, ?, ?, ?)",
            (name, datetime.now().isoformat(timespec="seconds"), json.dumps(input_json), json.dumps(plan_json))
        )
        trip_id = cur.lastrowid
    return jsonify({"saved": True, "id": trip_id})

@app.route("/api/trips/<int:trip_id>", methods=["GET"])
def get_trip(trip_id):
    with sqlite3.connect(DB_PATH) as con:
        row = con.execute("SELECT id, name, created_at, input_json, plan_json FROM trips WHERE id=?", (trip_id,)).fetchone()
    if not row:
        return jsonify({"error": "Trip not found"}), 404
    return jsonify({"id": row[0], "name": row[1], "created_at": row[2], "input": json.loads(row[3]), "plan": json.loads(row[4])})


def disney_wait_time_recommendation(wait, status):
    if status and str(status).upper() != "OPERATING":
        return "Closed / unavailable"
    if wait is None:
        return "No posted wait"
    try:
        wait = int(wait)
    except Exception:
        return "No posted wait"
    if wait <= 20:
        return "Go now"
    if wait <= 45:
        return "Reasonable"
    if wait <= 75:
        return "Only if high priority"
    return "Skip for now"


def normalize_live_entities(live_json):
    entities = []
    raw = live_json.get("liveData", [])
    for item in raw:
        name = item.get("name") or item.get("entityName") or "Unknown attraction"
        status = item.get("status")
        queue = item.get("queue") or {}
        standby = queue.get("STANDBY") or queue.get("standby") or {}
        wait = standby.get("waitTime")
        if wait is None and isinstance(queue, dict):
            for qv in queue.values():
                if isinstance(qv, dict) and "waitTime" in qv:
                    wait = qv.get("waitTime")
                    break
        if name and (wait is not None or status):
            entities.append({
                "name": name,
                "status": status or "UNKNOWN",
                "waitTime": wait,
                "recommendation": disney_wait_time_recommendation(wait, status)
            })
    entities.sort(key=lambda x: (999 if x["waitTime"] is None else x["waitTime"], x["name"]))
    return entities


@app.route("/api/wait-times")
def wait_times():
    """Disney-specific wait-time dashboard using ThemeParks.wiki.

    The app dynamically finds Walt Disney World from destinations, then pulls live data
    for the four main parks. If the public API changes or is unavailable, the UI gets a
    clean fallback instead of raw JSON.
    """
    try:
        dest_resp = requests.get("https://api.themeparks.wiki/v1/destinations", timeout=8)
        dest_resp.raise_for_status()
        destinations = dest_resp.json().get("destinations", [])

        wdw = None
        for d in destinations:
            slug = (d.get("slug") or "").lower()
            name = (d.get("name") or "").lower()
            ext = (d.get("externalId") or "").lower()
            if "waltdisneyworld" in slug or "walt disney world" in name or "waltdisneyworld" in ext:
                wdw = d
                break

        if not wdw:
            return jsonify({
                "source": "ThemeParks.wiki",
                "status": "not_found",
                "message": "Could not locate Walt Disney World in ThemeParks.wiki destinations.",
                "parks": []
            })

        wanted = ["Magic Kingdom", "EPCOT", "Disney's Hollywood Studios", "Disney's Animal Kingdom"]
        parks_out = []

        for p in wdw.get("parks", []):
            pname = p.get("name", "")
            if not any(w.lower() in pname.lower() for w in wanted):
                continue

            live_url = f"https://api.themeparks.wiki/v1/entity/{p.get('id')}/live"
            live_resp = requests.get(live_url, timeout=8)
            live_resp.raise_for_status()
            attractions = normalize_live_entities(live_resp.json())

            operating = [a for a in attractions if str(a.get("status","")).upper() == "OPERATING"]
            waits = [a["waitTime"] for a in operating if isinstance(a.get("waitTime"), int)]
            avg_wait = round(sum(waits) / len(waits), 1) if waits else None
            best_now = [a for a in operating if isinstance(a.get("waitTime"), int) and a["waitTime"] <= 30][:8]
            high_waits = sorted(
                [a for a in operating if isinstance(a.get("waitTime"), int)],
                key=lambda x: x["waitTime"],
                reverse=True
            )[:8]

            parks_out.append({
                "parkName": pname,
                "parkId": p.get("id"),
                "avgWait": avg_wait,
                "attractionCount": len(attractions),
                "operatingCount": len(operating),
                "bestNow": best_now,
                "highestWaits": high_waits,
                "attractions": attractions[:60]
            })

        return jsonify({
            "source": "ThemeParks.wiki",
            "status": "connected",
            "destination": wdw.get("name"),
            "generatedAt": datetime.now().isoformat(timespec="seconds"),
            "parks": parks_out
        })

    except Exception as e:
        return jsonify({
            "source": "ThemeParks.wiki",
            "status": "offline_or_blocked",
            "message": str(e),
            "parks": [],
            "fallback": "Planner still works using built-in rules. Try again later for live wait data."
        })

@app.route("/api/export/pdf", methods=["POST"])
def export_pdf():
    data = request.json or {}
    plan = data.get("plan") or build_plan(data.get("input") or {})
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()
    story = []
    story.append(Paragraph("Disney Ops Planner - Weather Fatigue Itinerary", styles["Title"]))
    story.append(Spacer(1, 10))
    story.append(Paragraph(f"Version: {plan.get('version','')}", styles["Normal"]))
    story.append(Paragraph(f"Dates: {plan['inputSummary'].get('dates','')}", styles["Normal"]))
    story.append(Paragraph(f"Resort: {plan['inputSummary'].get('resort','')}", styles["Normal"]))
    story.append(Spacer(1, 14))

    budget = plan.get("budget", {})
    budget_rows = [["Category", "Estimated Cost"]] + [[k, f"${v:,.2f}"] for k,v in budget.items()]
    t = Table(budget_rows, hAlign="LEFT")
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),colors.lightgrey),("GRID",(0,0),(-1,-1),0.5,colors.grey)]))
    story.append(t)
    story.append(Spacer(1, 14))

    for day in plan.get("days", []):
        w = day.get("weather", {})
        story.append(Paragraph(f"{day['date']} - {day['park']} ({day['fatigueLabel']} {day['fatigueScore']}/10)", styles["Heading2"]))
        story.append(Paragraph(f"Weather: High {w.get('high')}°F / Low {w.get('low')}°F / Rain {w.get('rainProbability')}% / Source: {w.get('source')}", styles["Normal"]))
        story.append(Paragraph(f"Meltdown Risk: {day['meltdownPrediction']['risk']} | Crash Window: {day['meltdownPrediction']['likelyCrashWindow']}", styles["Normal"]))
        story.append(Paragraph(f"Recommended Action: {day['meltdownPrediction']['recommendedAction']}", styles["Normal"]))
        story.append(Paragraph("<b>Morning:</b> " + "; ".join(day.get("morningPlan", [])), styles["Normal"]))
        story.append(Paragraph("<b>Afternoon:</b> " + "; ".join(day.get("afternoonPlan", [])), styles["Normal"]))
        if day.get("weatherNotes"):
            story.append(Paragraph("<b>Weather Notes:</b> " + "; ".join(day.get("weatherNotes", [])), styles["Normal"]))
        story.append(Paragraph("<b>Best Quick Service:</b> " + ", ".join([x["name"] for x in day.get("bestQuickService", [])]), styles["Normal"]))
        story.append(Paragraph("<b>Best Table Service:</b> " + ", ".join([x["name"] for x in day.get("bestTableService", [])]), styles["Normal"]))
        story.append(Spacer(1, 10))

    story.append(PageBreak())
    story.append(Paragraph("Plain-English Itinerary", styles["Heading1"]))
    for line in plan.get("rewrite","").split("\n"):
        story.append(Paragraph(line, styles["Normal"]))
        story.append(Spacer(1, 6))

    doc.build(story)
    buffer.seek(0)
    return send_file(buffer, mimetype="application/pdf", as_attachment=True, download_name="disney_ops_weather_plan.pdf")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)