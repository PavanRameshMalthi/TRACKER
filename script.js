// Theme Management
function detectTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function applyTheme(theme) {
  document.body.classList.remove("dark", "light");
  document.body.classList.add(theme);
  localStorage.setItem("theme", theme);
}
applyTheme(localStorage.getItem("theme") || detectTheme());
document.getElementById("themeToggle").addEventListener("click", () => {
  const newTheme = document.body.classList.contains("dark") ? "light" : "dark";
  applyTheme(newTheme);
});

let trackerList = JSON.parse(localStorage.getItem("trackerList")) || [];
let goal = parseInt(localStorage.getItem("monthlyGoal")) || 0;

function addAnime() {
  const name = document.getElementById("animeName").value.trim();
  const total = parseInt(document.getElementById("totalEpisodes").value);
  const genre = document.getElementById("genre").value.trim();
  if (!name || !total || total <= 0 || !genre) return alert("Please fill out all fields properly (Episodes must be > 0)");
  trackerList.push({ name, total, watched: 0, genre, updatedDates: [], lastUpdated: new Date().toISOString() });
  saveData();
  renderList();
  document.getElementById("animeName").value = "";
  document.getElementById("totalEpisodes").value = "";
  document.getElementById("genre").value = "";
}

function setGoal() {
  goal = parseInt(document.getElementById("monthlyGoal").value);
  localStorage.setItem("monthlyGoal", goal);
  renderGoal();
}

function changeWatched(index, delta) {
  let item = trackerList[index];
  let newWatched = item.watched + delta;
  if (newWatched < 0) return alert("Watched episodes cannot be negative!");
  item.watched = Math.min(item.total, newWatched);
  item.lastUpdated = new Date().toISOString();
  item.updatedDates.push(new Date().toISOString());
  saveData();
  renderList();
}

function markComplete(index) {
  let item = trackerList[index];
  item.watched = item.total;
  item.lastUpdated = new Date().toISOString();
  item.updatedDates.push(new Date().toISOString());
  saveData();
  renderList();
}

function deleteItem(index) {
  trackerList.splice(index, 1);
  saveData();
  renderList();
}

function renameAnime(index) {
  let newName = prompt("Rename:", trackerList[index].name);
  if (newName) {
    trackerList[index].name = newName;
    saveData();
    renderList();
  }
}

function saveData() {
  localStorage.setItem("trackerList", JSON.stringify(trackerList));
}

function renderGoal() {
  let thisMonth = new Date().getMonth();
  let count = 0;
  trackerList.forEach(item => {
    item.updatedDates.forEach(d => {
      let date = new Date(d);
      if (date.getMonth() === thisMonth) count++;
    });
  });
  let percent = goal ? Math.min(100, Math.floor((count / goal) * 100)) : 0;
  document.getElementById("goalProgress").innerHTML =
    goal ? `📅 Progress: ${count}/${goal} episodes this month (${percent}%)` : "";
}

function renderCalendar() {
  let dates = new Set();
  trackerList.forEach(item => item.updatedDates.forEach(date => dates.add(new Date(date).toDateString())));
  let html = "<strong>📅 Days You Watched Anime This Month:</strong><br>";
  dates.forEach(d => {
    html += `✔️ ${d}<br>`;
  });
  document.getElementById("calendarView").innerHTML = html;
}

function checkReminder() {
  if (trackerList.length === 0) return;
  let latestDate = new Date(Math.max(...trackerList.map(i => new Date(i.lastUpdated))));
  let daysDiff = Math.floor((new Date() - latestDate) / (1000 * 60 * 60 * 24));
  document.getElementById("reminder").textContent = daysDiff >= 3 ?
    "🔔 You haven't updated any anime in 3+ days!" : "";
}

function renderAnalytics() {
  const genreCount = {};
  trackerList.forEach(item => {
    if (!genreCount[item.genre]) genreCount[item.genre] = 0;
    genreCount[item.genre] += item.watched;
  });

  const barCtx = document.getElementById("genreChart").getContext("2d");
  if (window.genreChart) window.genreChart.destroy();
  window.genreChart = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: Object.keys(genreCount),
      datasets: [{
        label: 'Watched Episodes per Genre',
        data: Object.values(genreCount),
        backgroundColor: 'rgba(102, 217, 239, 0.7)'
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });

  const pieCtx = document.getElementById("genrePie").getContext("2d");
  if (window.genrePie) window.genrePie.destroy();
  window.genrePie = new Chart(pieCtx, {
    type: 'pie',
    data: {
      labels: Object.keys(genreCount),
      datasets: [{
        label: 'Watched Genre Share',
        data: Object.values(genreCount),
        backgroundColor: Object.keys(genreCount).map(() => `hsl(${Math.random() * 360}, 70%, 60%)`)
      }]
    },
    options: {
      responsive: true
    }
  });
}

function renderList() {
  const search = document.getElementById("searchInput").value.toLowerCase();
  const sortOption = document.getElementById("sortOption").value;
  const genreFilter = document.getElementById("genreFilter").value;
  const list = document.getElementById("animeList");

  list.innerHTML = "";

  let filtered = trackerList.filter(item =>
    item.name.toLowerCase().includes(search) &&
    (genreFilter === "" || item.genre === genreFilter)
  );

  if (sortOption === "name") filtered.sort((a, b) => a.name.localeCompare(b.name));
  if (sortOption === "watched") filtered.sort((a, b) => b.watched - a.watched);
  if (sortOption === "updated") filtered.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));

  const genreSet = new Set();
  trackerList.forEach(item => genreSet.add(item.genre));
  const genreSelect = document.getElementById("genreFilter");
  genreSelect.innerHTML = '<option value="">All Genres</option>' +
    Array.from(genreSet).map(g => `<option value="${g}">${g}</option>`).join("");

  filtered.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "anime-item";
    let percent = Math.floor((item.watched / item.total) * 100);
    div.innerHTML = `
      <div class="renameable" onclick="renameAnime(${index})">
        ${item.name} ${item.watched === item.total ? '<span class="badge">🏅 Completed</span>' : ''}
      </div>
      Episodes: ${item.watched}/${item.total}
      <div class="progress-bar"><div class="progress-bar-inner" style="width: ${percent}%"></div></div>
      <div class="date">Last updated: ${new Date(item.lastUpdated).toDateString()}</div>
      <div class="controls">
        <div>
          <button onclick="changeWatched(${index}, 1)">➕</button>
          <button onclick="changeWatched(${index}, -1)">➖</button>
        </div>
        <div>
          <button onclick="markComplete(${index})">✅</button>
          <button onclick="deleteItem(${index})">🗑️</button>
        </div>
      </div>
    `;
    list.appendChild(div);
  });

  renderGoal();
  renderCalendar();
  renderAnalytics();
  checkReminder();
}

renderList();