document.addEventListener('DOMContentLoaded', () => {
  const scrapeForm = document.getElementById('scrapeForm');
  const profileUrlInput = document.getElementById('profileUrl');
  const progressBar = document.getElementById('progressBar');
  const resultBox = document.getElementById('resultBox');
  const previewCardBtn = document.getElementById('previewCardBtn');
  const cardModal = document.getElementById('cardModal');
  const cardContent = document.getElementById('cardContent');
  const closeCardBtn = document.getElementById('closeCardBtn');
  const downloadCardBtn = document.getElementById('downloadCardBtn');
  const downloadCardBtnModal = document.getElementById('downloadCardBtnModal');



  // ✅ Attach toggle listener ONCE at page load
  const toggleBtn = document.getElementById('showAllRanksBtn');
  const fullProgressBox = document.getElementById('fullProgressBox');

	if (toggleBtn && fullProgressBox) {
	toggleBtn.addEventListener('click', function () {
    const isVisible = fullProgressBox.style.display === 'block';
    fullProgressBox.style.display = isVisible ? 'none' : 'block';
    toggleBtn.classList.toggle('active', !isVisible);
    toggleBtn.textContent = isVisible ? 'Show progress across all ranks' : 'Hide progress across all ranks';
  });
}

  function getRankProgress(activity, merit) {
    const ranks = [
      { name: "Newbie", activity: 0, merit: 0 },
      { name: "Jr. Member", activity: 30, merit: 1 },
      { name: "Member", activity: 60, merit: 10 },
      { name: "Full Member", activity: 120, merit: 100 },
      { name: "Sr. Member", activity: 240, merit: 250 },
      { name: "Hero Member", activity: 480, merit: 500 },
      { name: "Legendary", activity: 775, merit: 1000 },
    ];

    activity = parseInt(activity) || 0;
    merit = parseInt(merit) || 0;

    let currentRank = ranks[0];
    let nextRank = null;

    for (let i = 0; i < ranks.length - 1; i++) {
      if (activity >= ranks[i].activity && merit >= ranks[i].merit) {
        currentRank = ranks[i];
        nextRank = ranks[i + 1];
      }
    }

    if (!nextRank) {
      return {
        rank: currentRank.name,
        progress: 100,
        next: "Max rank (Legendary)",
      };
    }

    const activityProgress = nextRank.activity > 0 ? Math.min(100, (activity / nextRank.activity) * 100) : 0;
    const meritProgress = nextRank.merit > 0 ? Math.min(100, (merit / nextRank.merit) * 100) : 0;
    const averageProgress = Math.round((activityProgress + meritProgress) / 2);

    return {
      rank: currentRank.name,
      progress: averageProgress,
      next: nextRank.name,
    };
  }

  function buildFullRankBreakdown(activity, merit) {
    const ranks = [
      { name: "Newbie", activity: 0, merit: 0 },
      { name: "Jr. Member", activity: 30, merit: 1 },
      { name: "Member", activity: 60, merit: 10 },
      { name: "Full Member", activity: 120, merit: 100 },
      { name: "Sr. Member", activity: 240, merit: 250 },
      { name: "Hero Member", activity: 480, merit: 500 },
      { name: "Legendary", activity: 775, merit: 1000 }
    ];

    const list = document.getElementById('rankProgressList');
    list.innerHTML = '';

    ranks.forEach(rank => {
      const activityPercent = rank.activity > 0 ? Math.min(100, Math.round((activity / rank.activity) * 100)): 0;
      const meritPercent = rank.merit > 0 ? Math.min(100, Math.round((merit / rank.merit) * 100)): 0;
      const overall = isNaN(activityPercent) || isNaN(meritPercent) ? 0 : Math.round((activityPercent + meritPercent) / 2);

      const li = document.createElement('li');
      li.className = 'list-group-item';

      li.innerHTML = `
        <strong>${rank.name}</strong>
        <div class="mt-1">
          <div class="progress mb-1">
            <div class="progress-bar bg-success" role="progressbar" style="width: ${overall}%;">
              ${overall}%
            </div>
          </div>
          <small>Activity: ${activity}/${rank.activity}, Merit: ${merit}/${rank.merit}</small>
        </div>
      `;

      list.appendChild(li);
    });
  }

  if (!scrapeForm || !profileUrlInput || !progressBar || !resultBox) {
    console.error("❌ Missing DOM elements. Check your HTML IDs.");
    return;
  }

  scrapeForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const url = profileUrlInput.value.trim();
    if (!url) {
      showResult('❌ Please enter a profile URL.', true);
      return;
    }

    showProgress(true);
    showResult('Scraping in progress...', false);

    try {
      const response = await fetch('/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      });

      const data = await response.json();
      console.log('✅ Response from Flask:', data);

      if (response.ok) {
        document.getElementById('progressDetails').style.display = 'block';

        const act = data.activity_progress || 0;
        const merit = data.merit_progress || 0;
        const overall = data.progress || 0;

        document.getElementById('activityProgressBar').style.width = `${act}%`;
        document.getElementById('activityProgressBar').textContent = `${act}%`;

        document.getElementById('meritProgressBar').style.width = `${merit}%`;
        document.getElementById('meritProgressBar').textContent = `${merit}%`;

        document.getElementById('overallProgressBar').style.width = `${overall}%`;
        document.getElementById('overallProgressBar').textContent = `${overall}%`;

        showResult(`
          ✅ Scrape successful<br>
          👤 <strong>Username:</strong> ${data.username || 'N/A'}<br>
          🗨️ <strong>Posts:</strong> ${data.posts || 'N/A'}<br>
          🕒 <strong>Activity:</strong> ${data.activity || 'N/A'}<br>
          ⭐️ <strong>Merit:</strong> ${data.merit || 'N/A'}<br>
          🏅 <strong>Current Rank:</strong> ${data.current_rank || 'N/A'}<br>
          ⏭️ <strong>Next Rank:</strong> ${data.next_rank || 'N/A'}<br>
          💡 <strong>To Rank Up:</strong> <strong>Activity needed:</strong> ${data.needed_activity} <strong>||</strong> <strong>Merit needed:</strong>  ${data.needed_merit}<br>
          📊 <strong>Progress:</strong> ${data.progress}%<br>
		  
		    <!-- Hidden fields for rank card generation -->
  <span id="scrapedUsername" style="display:none;">${data.username}</span>
  <span id="scrapedRank" style="display:none;">${data.current_rank}</span>
        `, false);

        buildFullRankBreakdown(data.activity, data.merit);
	document.getElementById('fullProgressBox').style.display = 'none';
      } else {
        showResult(`❌ ${data.error || 'Unknown error occurred.'}`, true);
      }
    } catch (err) {
      console.error('❌ Fetch error:', err);
      showResult('❌ Failed to fetch from backend. Make sure the Flask server is running.', true);
    }

    showProgress(false);
  });

  function showProgress(show) {
    progressBar.style.display = show ? 'block' : 'none';
  }

  function showResult(message, isError = false) {
    resultBox.innerHTML = message;
    resultBox.classList.remove('alert-success', 'alert-danger');
    resultBox.classList.add(isError ? 'alert-danger' : 'alert-success');
    resultBox.style.display = 'block';
  }
  
   
     // Helper: avatar path by rank
function getAvatarPath(rankName) {
  const map = {
    "Brand New": "brand_new",
    "Newbie": "newbie",
    "Jr. Member": "jr_member",
    "Member": "member",
    "Full Member": "full_member",
    "Sr. Member": "sr_member",
    "Hero Member": "hero_member",
    "Legendary": "legendary"
  };
  return `/static/avatars/${map[rankName] || "newbie"}.png`;
}

function getRankClass(rankName) {
  const classMap = {
    "Brand New": "brand_new",
    "Newbie": "newbie",
    "Jr. Member": "jr_member",
    "Member": "member",
    "Full Member": "full_member",
    "Sr. Member": "sr_member",
    "Hero Member": "hero_member",
    "Legendary": "legendary"
  };
  return classMap[rankName] || "newbie";
}

if (previewCardBtn) {
  previewCardBtn.addEventListener('click', () => {
    const username = document.querySelector('#resultBox strong:nth-of-type(1)')?.textContent || 'N/A';
    const activity = document.querySelector('#resultBox strong:nth-of-type(3)')?.textContent || '0';
    const merit = document.querySelector('#resultBox strong:nth-of-type(4)')?.textContent || '0';
    const rank = document.querySelector('#resultBox strong:nth-of-type(6)')?.textContent || 'Unknown';

    const avatarPath = getAvatarPath(rank);
    const rankClass = getRankClass(rank);

    cardContent.innerHTML = `
      <div class="card-preview ${rankClass}">
        <img src="${avatarPath}" alt="Avatar" class="avatar" />
        <h3>${username}</h3>
        <p><strong>Rank:</strong> ${rank}</p>
        <p><strong>Activity:</strong> ${activity}</p>
        <p><strong>Merit:</strong> ${merit}</p>
      </div>
    `;

    cardModal.style.display = 'flex';
  });
}
if (closeCardBtn) {
    closeCardBtn.addEventListener('click', () => {
      cardModal.style.display = 'none';
    });
  }

  


  // ✅ Handle Download Button Click (Both buttons)
  function handleCardDownload() {
    const cardElement = document.querySelector('.card-preview, #cardPreview');
    if (!cardElement) {
      alert("⚠️ No card to download!");
      return;
    }

    html2canvas(cardElement).then(canvas => {
      const link = document.createElement('a');
      link.download = 'rank_card.png';
      link.href = canvas.toDataURL();
      link.click();
    });
  }

 

  if (downloadCardBtn && typeof downloadCardBtn.addEventListener === 'function') {
    downloadCardBtn.addEventListener('click', handleCardDownload);
  }

  if (downloadCardBtnModal && typeof downloadCardBtnModal.addEventListener === 'function') {
    downloadCardBtnModal.addEventListener('click', handleCardDownload);
  }
  
  const generateCardBtn = document.getElementById('generateCardBtn');

  generateCardBtn.addEventListener('click', function () {
    const resultBox = document.getElementById('resultBox');
    if (!resultBox || resultBox.style.display === 'none') {
      alert("Please check a profile first before generating a card.");
      return;
    }

    // Extract latest data (you may replace with your scraped values)
    const username = document.getElementById('scrapedUsername')?.innerText || 'Anonymous';
    const rank = document.getElementById('scrapedRank')?.innerText || 'Newbie';
    const avatar = `/static/avatars/${rank.toLowerCase().replace(/\./g, '').replace(/\s+/g, '_')}.png`;
	
	const cardPreview = document.getElementById('cardPreview');
cardPreview.style.backgroundImage = `url('${avatar}')`;
cardPreview.style.backgroundSize = 'cover';
cardPreview.style.backgroundPosition = 'center';

    const activityPercent = parseInt(
      document.getElementById('activityProgressBar')?.style.width || '0'
    );
    const meritPercent = parseInt(
      document.getElementById('meritProgressBar')?.style.width || '0'
    );
	
	const resultBoxContent = document.getElementById('resultBox').innerHTML;

const activityMatch = resultBoxContent.match(/Activity:<\/strong>\s*([\d]+)/);
const meritMatch = resultBoxContent.match(/Merit:<\/strong>\s*([\d]+)/);
const nextRankMatch = resultBoxContent.match(/Next Rank:<\/strong>\s*([^<]+)</i);

const activity = activityMatch ? activityMatch[1] : '0';
const merit = meritMatch ? meritMatch[1] : '0';
const nextRank = nextRankMatch ? nextRankMatch[1].trim() : 'N/A';

document.getElementById("cardActivityValue").textContent = activity;
document.getElementById("cardMeritValue").textContent = merit;
document.getElementById("cardNextRankValue").textContent = nextRank;

    // Inject into modal
    document.getElementById('cardUsername').innerText = username;
    //document.getElementById("cardRank").innerText = rank;
	//document.getElementById("cardRankSlant").innerText = rank || "Unknown";
	const slantBadge = document.getElementById('cardRankSlant');
slantBadge.textContent = rank;

// Remove existing rank class (if any), then add the new one
slantBadge.className = 'rank-badge-slant rank-' + rank.replace(/\s+/g, '');

const card = document.getElementById('cardPreview');

// Clear old classes first
//card.className = 'rank-card';

// Remove old card background classes
card.className = 'p-4 text-white text-center rounded-4 rank-card';

// Map the rank to class-friendly string (remove spaces)
const cleanRank = rank.replace(/\s+/g, '');

// Add the class like 'card-Legendary', 'card-JrMember', etc.
card.classList.add(`card-${cleanRank}`);

	
    document.getElementById('cardAvatar').src = avatar;
   document.getElementById("cardActivityBar").style.width = activityPercent + "%";
document.getElementById("cardActivityPercent").innerText = activityPercent + "%";

document.getElementById("cardMeritBar").style.width = meritPercent + "%";
document.getElementById("cardMeritPercent").innerText = meritPercent + "%";
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('cardPreviewModal'));
    modal.show();
  });


}); // 👈 THIS closes the DOMContentLoaded block

