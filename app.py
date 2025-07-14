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
# Define Bitcointalk rank thresholds
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
                return "Brand New", RANKS[i + 1]["name"], 0
            current = RANKS[i - 1]
            next_rank = RANKS[i]
            activity_progress = min(100, round((activity / next_rank["activity"]) * 100)) if next_rank["activity"] else 0
            merit_progress = min(100, round((merit / next_rank["merit"]) * 100)) if next_rank["merit"] else 0
            progress = min(activity_progress, merit_progress)
            return current["name"], next_rank["name"], progress
    return "Legendary", "Max Rank", 100

@app.route('/scrape', methods=['POST'])
def scrape():
    try:
        data = request.get_json()
        profile_url = (data.get("url") or "").strip()

        if not profile_url:
            return jsonify({"error": "No URL provided"}), 400

        print(f"🔗 Scraping URL: {profile_url}")
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(profile_url, headers=headers)

        if response.status_code != 200:
            return jsonify({"error": "Failed to fetch profile page"}), 500

        soup = BeautifulSoup(response.text, 'html.parser')
        title_tag = soup.find("title")
        username = title_tag.text.replace("View the profile of ", "").strip() if title_tag else "Unknown"

        page_text = soup.get_text(" ", strip=True)

        # Use regex to extract profile info
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

        current_rank, next_rank, progress = calculate_rank(activity_int, merit_int)

        print(f"✅ Scrape successful for {username}")
        return jsonify({
            "status": "✅ Scrape successful",
            "username": username,
            "posts": posts,
            "activity": activity,
            "merit": merit,
            "current_rank": current_rank,
            "next_rank": next_rank,
            "progress": progress
        })

    except Exception as e:
        print(f"❌ Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
