document.addEventListener('DOMContentLoaded', () => {
  const scrapeForm = document.getElementById('scrapeForm');
  const profileUrlInput = document.getElementById('profileUrl');
  const progressBar = document.getElementById('progressBar');
  const resultBox = document.getElementById('resultBox');

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
    if (
      activity >= ranks[i].activity &&
      merit >= ranks[i].merit
    ) {
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

  const activityProgress = Math.min(
    100,
    (activity / nextRank.activity) * 100
  );
  const meritProgress = Math.min(
    100,
    (merit / nextRank.merit) * 100
  );

  const averageProgress = Math.round((activityProgress + meritProgress) / 2);

  return {
    rank: currentRank.name,
    progress: averageProgress,
    next: nextRank.name,
  };
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
	  const rankInfo = getRankProgress(data.activity, data.merit);

      if (response.ok) {
        showResult(`
  ✅ Scrape successful<br>
  👤 <strong>Username:</strong> ${data.username || 'N/A'}<br>
  🗨️ <strong>Posts:</strong> ${data.posts || 'N/A'}<br>
  🕒 <strong>Activity:</strong> ${data.activity || 'N/A'}<br>
  ⭐️ <strong>Merit:</strong> ${data.merit || 'N/A'}<br>
  🏅 <strong>Current Rank:</strong> ${data.current_rank || 'N/A'}<br>
  ⏭️ <strong>Next Rank:</strong> ${data.next_rank || 'N/A'}<br>
  📊 <strong>Progress:</strong> ${data.progress}%<br>
`, false);
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
  
});
