const database = firebase.database();
const ADMIN_PASSWORD = "club2026";

/* ================= MODALS ================= */

function openLogin() {
  document.getElementById("loginPhone").value = "";
  document.getElementById("loginPassword").value = "";
  document.getElementById("loginModal").style.display = "block";
}

function closeModal() {
  document.getElementById("loginModal").style.display = "none";
}

function closeAdminModal() {
  document.getElementById("adminModal").style.display = "none";
  document.getElementById("adminPassword").value = "";
}

/* ================= DATE FORMAT ================= */

function formatDate(inputDate) {
  const d = new Date(inputDate);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

/* ================= LOGIN ================= */

function login() {

  const phone = document.getElementById("loginPhone").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!phone || !password) {
    alert("Fill all fields");
    return;
  }

  database.ref("users")
    .orderByChild("phone")
    .equalTo(phone)
    .once("value")
    .then((snapshot) => {

      if (!snapshot.exists()) {
        alert("Invalid phone or password");
        return;
      }

      let userFound = null;

      snapshot.forEach((child) => {
        const user = child.val();
        if (user.password === password) {
          userFound = {
            uid: child.key,
            username: user.username
          };
        }
      });

      if (userFound) {
        localStorage.setItem("uid", userFound.uid);
        localStorage.setItem("username", userFound.username);
        showUser(userFound.username);
      } else {
        alert("Invalid phone or password");
      }

    });
}

/* ================= SHOW USER ================= */

function showUser(username) {

  document.getElementById("guestView").classList.add("hidden");
  document.getElementById("userView").classList.remove("hidden");

  document.getElementById("welcomeText").innerText = "Welcome, " + username;

  closeModal();
  loadMatchesForUsers();
}

/* ================= LOGOUT ================= */

function logout() {

  localStorage.removeItem("uid");
  localStorage.removeItem("username");

  document.getElementById("guestView").classList.remove("hidden");
  document.getElementById("userView").classList.add("hidden");

  navigate("leaderboard");
  loadMatchesForUsers();
}

/* ================= AUTO LOAD ================= */

window.onload = function () {

  const username = localStorage.getItem("username");

  if (username) {
    showUser(username);
  }

  navigate("leaderboard");
  loadLeaderboard();
  loadMatchesForUsers();
};

/* ================= NAVIGATION ================= */

function navigate(pageId) {

  document.querySelectorAll(".page-section").forEach(section => {
    section.classList.add("hidden");
  });

  document.getElementById(pageId).classList.remove("hidden");
}

/* ================= ADMIN ACCESS ================= */

let clickCount = 0;
let clickTimer = null;

document.getElementById("logoTrigger").addEventListener("click", () => {

  clickCount++;

  if (clickCount === 1) {
    clickTimer = setTimeout(() => {
      clickCount = 0;
    }, 2000);
  }

  if (clickCount === 5) {
    clearTimeout(clickTimer);
    clickCount = 0;
    document.getElementById("adminModal").style.display = "block";
  }

});

/* ================= VERIFY ADMIN ================= */

function verifyAdmin() {

  const pass = document.getElementById("adminPassword").value.trim();

  if (pass === ADMIN_PASSWORD) {
    sessionStorage.setItem("isAdmin", "true");
    window.location.href = "admin.html";
  } else {
    alert("Access denied");
  }
}

/* ================= LEADERBOARD ================= */

function loadLeaderboard() {

  database.ref("users").on("value", (snapshot) => {

    let users = [];

    snapshot.forEach(child => {
      users.push(child.val());
    });

    users.sort((a, b) => {
      return (b.points?.total || 0) - (a.points?.total || 0);
    });

    const body = document.getElementById("leaderboardBody");
    body.innerHTML = "";

    users.forEach((user, index) => {

      const matchPoints = user.points?.match || 0;
      const bracketPoints = user.points?.bracket || 0;
      const totalPoints = user.points?.total || 0;

      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${user.username}</td>
        <td>${matchPoints}</td>
        <td>${bracketPoints}</td>
        <td>${totalPoints}</td>
      `;

      body.appendChild(row);
    });

  });
}

/* ================= LOAD MATCHES ================= */

function loadMatchesForUsers() {

  const uid = localStorage.getItem("uid");

  database.ref("matches").on("value", (snapshot) => {

    const container = document.getElementById("matchesContainer");
    container.innerHTML = "";

    if (!snapshot.exists()) {
      container.innerHTML = "<p>No matches available.</p>";
      return;
    }

    // 🔥 Convert snapshot to array
    let matchesArray = [];

    snapshot.forEach(child => {
      matchesArray.push({
        id: child.key,
        data: child.val()
      });
    });

    // 🔥 Sort DESCENDING (latest matchNo on top)
    matchesArray.sort((a, b) => {
      return Number(b.data.matchNo) - Number(a.data.matchNo);
    });

    // 🔥 Render sorted matches
    matchesArray.forEach(item => {

      const match = item.data;
      const matchId = item.id;

      const card = document.createElement("div");
      card.className = "match-card";

      if (uid) {

        database.ref("predictions/" + matchId + "/" + uid)
          .once("value")
          .then((snap) => {

            const prediction = snap.val();
            const savedA = prediction ? prediction.scoreA : "";
            const savedB = prediction ? prediction.scoreB : "";

            renderMatchCard(match, matchId, card, savedA, savedB, uid);

          });

      } else {

        renderMatchCard(match, matchId, card, "", "", uid);

      }

      container.appendChild(card);

    });

  });

}

/* ================= RENDER MATCH CARD ================= */

function renderMatchCard(match, matchId, card, savedA, savedB, uid) {

  let predictionHTML = "";

  if (!match.locked) {

    if (uid) {

      predictionHTML = `
        <div class="prediction-row">
          <input type="number" id="scoreA_${matchId}" value="${savedA}" min="0">
          <span>-</span>
          <input type="number" id="scoreB_${matchId}" value="${savedB}" min="0">
          <button class="primary-btn" onclick="savePrediction('${matchId}')">
            Save
          </button>
        </div>
      `;

    } else {

      predictionHTML = `<p><i>Login to predict</i></p>`;
    }

  } else {

    predictionHTML = `
      <p><b>Prediction Closed</b></p>
    `;
  }

  card.innerHTML = `
    <div class="match-header">
      <b>MATCH NO: ${match.matchNo}</b>
    </div>

    <div class="match-info">
      <p><b>DATE:</b> ${formatDate(match.date)}</p>
      <p><b>GROUP:</b> ${match.group}</p>
      <p><b>${match.teamA} vs ${match.teamB}</b></p>
    </div>

    ${predictionHTML}

    ${match.locked ? `
      <button class="secondary-btn" onclick="viewPredictions('${matchId}')">
        View Predictions
      </button>
    ` : ""}
  `;
}

/* ================= SAVE PREDICTION ================= */

function savePrediction(matchId) {

  const uid = localStorage.getItem("uid");

  if (!uid) {
    alert("Login required");
    return;
  }

  const scoreA = document.getElementById("scoreA_" + matchId).value;
  const scoreB = document.getElementById("scoreB_" + matchId).value;

  if (scoreA === "" || scoreB === "") {
    alert("Enter both scores");
    return;
  }

  database.ref("predictions/" + matchId + "/" + uid).set({
    scoreA: parseInt(scoreA),
    scoreB: parseInt(scoreB),
    updatedAt: Date.now()
  }).then(() => {
    alert("Prediction saved");
  });

}

/* ================= CLOSE MODAL ================= */

function closePredictionModal() {
  document.getElementById("predictionModal").style.display = "none";
}

/* ================= VIEW PREDICTIONS ================= */

function viewPredictions(matchId) {

  const tableDiv = document.getElementById("predictionTable");
  const title = document.getElementById("modalTitle");

  tableDiv.innerHTML = "Loading...";

  database.ref("matches/" + matchId).once("value", (matchSnap) => {

    const matchData = matchSnap.val();

    const teamA = matchData.teamA;
    const teamB = matchData.teamB;

    // ✅ FIXED TITLE
    title.innerText = `Match ${matchData.matchNo} Predictions`;

    database.ref("predictions/" + matchId).once("value", (snap) => {

      if (!snap.exists()) {
        tableDiv.innerHTML = "<p>No predictions yet</p>";
        return;
      }

      const promises = [];

      let rows = [];

      snap.forEach(child => {

        const userId = child.key;
        const data = child.val();

        const p = database.ref("users/" + userId).once("value")
          .then(userSnap => {

            const user = userSnap.val();
            const name = user ? user.username : "Unknown";

            rows.push(`
              <tr>
                <td>${name}</td>
                <td>${teamA}</td>
                <td>${data.scoreA}</td>
                <td>${data.scoreB}</td>
                <td>${teamB}</td>
              </tr>
            `);
          });

        promises.push(p);
      });

      Promise.all(promises).then(() => {

        tableDiv.innerHTML = `
          <table class="pred-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Team A</th>
                <th>Score A</th>
                <th>Score B</th>
                <th>Team B</th>
              </tr>
            </thead>
            <tbody>
              ${rows.join("")}
            </tbody>
          </table>
        `;

        document.getElementById("predictionModal").style.display = "block";
      });

    });

  });
}