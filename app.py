from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import requests
from bs4 import BeautifulSoup
import re

app = Flask(__name__)
CORS(app)

@app.route('/')
def home():
    return render_template('index.html')

# Rank thresholds
RANKS = [
    {"name": "Brand New", "activity": 0, "merit": 0},
    {"name": "Newbie", "activity": 1, "merit": 0},
    {"name": "Jr. Member", "activity": 30, "merit": 1},
    {"name": "Member", "activity": 60, "merit": 10},
    {"name": "Full Member", "activity": 120, "merit": 100},
    {"name": "Sr. Member", "activity": 240, "merit": 250},
    {"name": "Hero Member", "activity": 480, "merit": 500},
    {"name": "Legendary", "activity": 775, "merit": 1000},
]

def calculate_rank(activity, merit):
    for i in range(len(RANKS)):
        rank = RANKS[i]
        if activity < rank["activity"] or merit < rank["merit"]:
            if i == 0:
                return "Brand New", RANKS[i + 1]["name"], 0, 0, 0, RANKS[i + 1]["activity"], RANKS[i + 1]["merit"]
            current = RANKS[i - 1]
            next_rank = RANKS[i]
            activity_progress = min(100, round((activity / next_rank["activity"]) * 100))
            merit_progress = min(100, round((merit / next_rank["merit"]) * 100))
            progress = round((activity_progress + merit_progress) / 2)
            needed_activity = max(0, next_rank["activity"] - activity)
            needed_merit = max(0, next_rank["merit"] - merit)
            return current["name"], next_rank["name"], progress, activity_progress, merit_progress, needed_activity, needed_merit
    return "Legendary", "Max Rank", 100, 100, 100, 0, 0

@app.route('/scrape', methods=['POST'])
def scrape():
    try:
        data = request.get_json()
        user_input = (data.get("url") or "").strip()
        headers = {'User-Agent': 'Mozilla/5.0'}

        if not user_input:
            return jsonify({"error": "No URL or username provided"}), 400

        # Debug: Print user input
        print("DEBUG: Searching for username:", user_input)

        # CASE 1 — Already a profile link with u=ID
        if re.search(r"u=\d+", user_input):
            profile_url = user_input
            if not profile_url.startswith("http"):
                profile_url = "https://" + profile_url
            return scrape_profile(profile_url)

        # CASE 2 — Search Bitcointalk memberlist for username
        search_url = f"https://bitcointalk.org/index.php?action=mlist;sa=search;search={user_input}"
        search_resp = requests.get(search_url, headers=headers, timeout=10)

        # Debug: print search response status and snippet
        print("DEBUG: Search page status:", search_resp.status_code)
        print("DEBUG: Search page content snippet:", search_resp.text[:500])

        if search_resp.status_code != 200:
            return jsonify({"error": "Failed to fetch member search results"}), 500

        search_soup = BeautifulSoup(search_resp.text, "html.parser")

        profile_links = search_soup.find_all("a", href=re.compile(r"action=profile;u=\d+"))

        # Debug: print number of profile links found
        print(f"DEBUG: Found {len(profile_links)} profile links")

        possible_profiles = []
        for link in profile_links:
            # Debug: print each profile link and username found
            print("DEBUG: Profile link:", link['href'], "Username:", link.text.strip())
            found_username = link.text.strip()
            profile_href = link['href']
            profile_url = "https://bitcointalk.org/" + profile_href.lstrip("/")
            possible_profiles.append((found_username, profile_url))

        # Try exact match (case insensitive)
        for uname, url in possible_profiles:
            if uname.lower() == user_input.lower():
                return scrape_profile(url)

        # If no exact match, fallback: return first profile if exists
        if possible_profiles:
            return scrape_profile(possible_profiles[0][1])

        # No profiles found at all
        return jsonify({"error": f"No profile found for username '{user_input}'"}), 404

    except Exception as e:
        print(f"❌ Error: {e}")
        return jsonify({"error": str(e)}), 500

def scrape_profile(profile_url):
    """Scrape Bitcointalk profile data."""
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(profile_url, headers=headers, timeout=10)

        if response.status_code != 200:
            return jsonify({"error": "Failed to fetch profile page"}), 500

        soup = BeautifulSoup(response.text, 'html.parser')
        title_tag = soup.find("title")
        username = title_tag.text.replace("View the profile of ", "").strip() if title_tag else "Unknown"

        page_text = soup.get_text(" ", strip=True)

        posts = activity = merit = "N/A"

        match = re.search(r"Posts:\s*([\d,]+)", page_text)
        if match:
            posts = match.group(1).replace(",", "")

        match = re.search(r"Activity:\s*([\d,]+)", page_text)
        if match:
            activity = match.group(1).replace(",", "")

        match = re.search(r"Merit[:\s]*([\d,]+)", page_text, re.IGNORECASE)
        if not match:
            match = re.search(r"Merit.*?(\d+)", page_text, re.IGNORECASE)
        if match:
            merit = match.group(1).replace(",", "")

        try:
            activity_int = int(activity)
        except:
            activity_int = 0
        try:
            merit_int = int(merit)
        except:
            merit_int = 0

        current_rank, next_rank, progress, act_prog, merit_prog, needed_activity, needed_merit = calculate_rank(activity_int, merit_int)

        return jsonify({
            "status": "✅ Scrape successful",
            "username": username,
            "profile_url": profile_url,
            "posts": posts,
            "activity": activity,
            "merit": merit,
            "current_rank": current_rank,
            "next_rank": next_rank,
            "progress": progress,
            "activity_progress": act_prog,
            "merit_progress": merit_prog,
            "needed_activity": needed_activity,
            "needed_merit": needed_merit
        })
    except Exception as e:
        print(f"❌ Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run()
