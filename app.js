const database = firebase.database();
const ADMIN_PASSWORD = "club2026";

const GROUPS = {
  A: ["Mexico", "South Africa", "South Korea", "Czech Republic"],
  B: ["Canada", "Bosnia & Herzegovina", "Qatar", "Switzerland"],
  C: ["Brazil", "Morocco", "Haiti", "Scotland"],
  D: ["United States", "Paraguay", "Australia", "Turkey"],
  E: ["Germany", "Curaçao", "Ivory Coast", "Ecuador"],
  F: ["Netherlands", "Japan", "Sweden", "Tunisia"],
  G: ["Belgium", "Egypt", "Iran", "New Zealand"],
  H: ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"],
  I: ["France", "Senegal", "Iraq", "Norway"],
  J: ["Argentina", "Algeria", "Austria", "Jordan"],
  K: ["Portugal", "DR Congo", "Uzbekistan", "Colombia"],
  L: ["England", "Croatia", "Ghana", "Panama"]
};

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

  if (pageId === "bracket") {
    loadBracketUI();
  }
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

  database.ref("matches/" + matchId).once("value").then(matchSnap => {

    if (!matchSnap.exists()) {
      tableDiv.innerHTML = "Match not found";
      return;
    }

    const matchData = matchSnap.val();

    const teamA = matchData.teamA;
    const teamB = matchData.teamB;

    const isFinished = matchData.finished === true;
    const actualA = matchData.scoreA;
    const actualB = matchData.scoreB;

    // ✅ Modal Title
    let headerText = `Match ${matchData.matchNo} Predictions`;

    if (isFinished) {
      headerText += ` | Final Score: ${teamA} ${actualA} - ${actualB} ${teamB}`;
    }

    title.innerText = headerText;

    database.ref("predictions/" + matchId).once("value").then(predSnap => {

      if (!predSnap.exists()) {
        tableDiv.innerHTML = "<p>No predictions yet</p>";
        return;
      }

      const promises = [];
      const rows = [];

      predSnap.forEach(child => {

        const userId = child.key;
        const prediction = child.val();

        const p = Promise.all([
          database.ref("users/" + userId).once("value"),
          database.ref("users/" + userId + "/matchPoints/" + matchId).once("value")
        ]).then(([userSnap, pointsSnap]) => {

          const userData = userSnap.val();
          const username = userData ? userData.username : "Unknown";

          const points = isFinished
            ? (pointsSnap.exists() ? pointsSnap.val() : 0)
            : "-";

          rows.push(`
            <tr>
              <td>${username}</td>
              <td>${prediction.scoreA}</td>
              <td>${prediction.scoreB}</td>
              <td>${points}</td>
            </tr>
          `);
        });

        promises.push(p);
      });

      Promise.all(promises).then(() => {

        tableDiv.innerHTML = `
          ${isFinished ? `
            <div class="final-score-box">
              <strong>Final Score:</strong> 
              ${teamA} ${actualA} - ${actualB} ${teamB}
            </div>
          ` : ""}

          <table class="pred-table">
            <thead>
              <tr>
                <th>User</th>
                <th>${teamA}</th>
                <th>${teamB}</th>
                <th>Points</th>
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

function loadBracketUI() {

  const container = document.getElementById("bracketContainer");
  const uid = localStorage.getItem("uid");

  let html = "";

  // GROUP STAGE SELECTION
  Object.keys(GROUPS).forEach(group => {

    html += `
      <div style="margin-top:20px; padding:15px; background:#111827; color:white; border-radius:10px;">
        <h3>Group ${group}</h3>

        <label>1st Place</label>
        <select id="g_${group}_1">
          <option value="">Select</option>
          ${GROUPS[group].map(t => `<option value="${t}">${t}</option>`).join("")}
        </select>

        <br><br>

        <label>2nd Place</label>
        <select id="g_${group}_2">
          <option value="">Select</option>
          ${GROUPS[group].map(t => `<option value="${t}">${t}</option>`).join("")}
        </select>

      </div>
    `;
  });

  // BEST 3RD PLACE
html += `
  <div style="margin-top:30px;">
    <h3>Select Best 3rd Teams (Max 8)</h3>
    <div id="thirdContainer" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:10px;">
`;

Object.keys(GROUPS).forEach(group => {
  GROUPS[group].forEach(team => {
    html += `
      <div class="third-team">
        <input type="checkbox" value="${team}" class="thirdCheck">
        <span>${team}</span>
      </div>
    `;
  });
});

html += `
    </div>
    <p id="thirdCount">Selected: 0 / 8</p>
  </div>
`;

  container.innerHTML = html;

  // LOAD SAVED DATA IF EXISTS
if (uid) {

  database.ref("bracket/groups/" + uid).once("value").then(snapshot => {

    if (snapshot.exists()) {
      const saved = snapshot.val();

      Object.keys(saved).forEach(group => {
        if (saved[group].first) {
          document.getElementById(`g_${group}_1`).value = saved[group].first;
        }
        if (saved[group].second) {
          document.getElementById(`g_${group}_2`).value = saved[group].second;
        }
      });
    }

  });

  database.ref("bracket/bestThird/" + uid).once("value").then(snapshot => {

    if (snapshot.exists()) {
      const savedThird = snapshot.val().selected || [];

      savedThird.forEach(team => {
        const checkbox = document.querySelector(
          `.thirdCheck[value="${team}"]`
        );
        if (checkbox) checkbox.checked = true;
      });

      document.getElementById("thirdCount").innerText =
        `Selected: ${savedThird.length} / 8`;
    }

  });

}

  // LIMIT BEST 3RD TO 8
  document.querySelectorAll(".thirdCheck").forEach(cb => {
    cb.addEventListener("change", () => {
      const checked = document.querySelectorAll(".thirdCheck:checked");
      if (checked.length > 8) {
        cb.checked = false;
        alert("Only 8 teams allowed");
      }
      document.getElementById("thirdCount").innerText =
        `Selected: ${checked.length} / 8`;
    });
  });
}

function saveBracketPrediction() {

  const uid = localStorage.getItem("uid");
  if (!uid) {
    alert("Login required");
    return;
  }

  let groupData = {};
  let allGroupsFilled = true;

  Object.keys(GROUPS).forEach(group => {

    const first = document.getElementById(`g_${group}_1`).value;
    const second = document.getElementById(`g_${group}_2`).value;

    if (!first || !second) {
      allGroupsFilled = false;
    }

    groupData[group] = {
      first: first,
      second: second
    };

  });

  // Collect best 3rd
  let bestThird = [];
  document.querySelectorAll(".thirdCheck:checked").forEach(cb => {
    bestThird.push(cb.value);
  });

  // 🔴 VALIDATION CHECK
  if (!allGroupsFilled) {
    alert("Please select 1st and 2nd place for ALL groups.");
    return;
  }

  if (bestThird.length !== 8) {
    alert("Please select exactly 8 Best 3rd teams.");
    return;
  }

  // ✅ If all good → Save
  database.ref("bracket/groups/" + uid).set(groupData);
  database.ref("bracket/bestThird/" + uid).set({
    selected: bestThird
  }).then(() => {
    alert("Bracket saved successfully!");
  });

}