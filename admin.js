const database = firebase.database();

/* ================= SECTION SWITCHING ================= */

function showSection(sectionId) {
  const sections = document.querySelectorAll(".admin-section");
  sections.forEach(section => {
    section.classList.add("hidden");
  });
  document.getElementById(sectionId).classList.remove("hidden");
}

/* ================= CREATE USER ================= */

function createUser() {

  const username = document.getElementById("newUsername").value.trim();
  const phone = document.getElementById("newPhone").value.trim();
  const password = document.getElementById("newPassword").value.trim();

  if (!username || !phone || !password) {
    alert("Fill all fields");
    return;
  }

  database.ref("users")
    .orderByChild("phone")
    .equalTo(phone)
    .once("value")
    .then((snapshot) => {

      if (snapshot.exists()) {
        alert("Phone number already exists!");
        return;
      }

      const uid = "u_" + Date.now();

      database.ref("users/" + uid).set({
        uid: uid,
        username: username,
        phone: phone,
        password: password,
        createdAt: Date.now(),
        points: {
          match: 0,
          bracket: 0,
          total: 0
        }
      }).then(() => {

        alert("User created successfully");

        document.getElementById("newUsername").value = "";
        document.getElementById("newPhone").value = "";
        document.getElementById("newPassword").value = "";

      });

    });
}

/* ================= LOAD USERS ================= */

function loadUsers() {

  database.ref("users").on("value", (snapshot) => {

    const container = document.getElementById("usersList");
    container.innerHTML = "";

    if (!snapshot.exists()) {
      container.innerHTML = "<p>No users found.</p>";
      return;
    }

    snapshot.forEach((child) => {

      const uid = child.key;
      const user = child.val();

      const matchPoints = user.points?.match || 0;
      const bracketPoints = user.points?.bracket || 0;
      const totalPoints = user.points?.total || 0;

      const userCard = document.createElement("div");
      userCard.className = "user-card";

      userCard.innerHTML = `
        <div>
          <strong>${user.username}</strong><br>
          Phone: ${user.phone}<br>
          Password: ${user.password}<br><br>
          <b>Match Points:</b> ${matchPoints}<br>
          <b>Bracket Points:</b> ${bracketPoints}<br>
          <b>Total Points:</b> ${totalPoints}
        </div>

        <button class="secondary-btn" onclick="deleteUser('${uid}')">
          Delete
        </button>
      `;

      container.appendChild(userCard);
    });
  });
}

/* ================= DELETE USER ================= */

function deleteUser(uid) {
  if (confirm("Delete this user?")) {
    database.ref("users/" + uid).remove();
  }
}

/* ================= LOGOUT ================= */

function logoutAdmin() {
  sessionStorage.removeItem("isAdmin");
  window.location.href = "index.html";
}

/* ================= INIT USERS ================= */

loadUsers();

/* ================= CREATE MATCH ================= */

function createMatch() {

  const matchNo = document.getElementById("matchNo").value.trim();
  const matchDate = document.getElementById("matchDate").value;
  const matchGroup = document.getElementById("matchGroup").value.trim();
  const teamA = document.getElementById("teamA").value.trim();
  const teamB = document.getElementById("teamB").value.trim();

  if (!matchNo || !matchDate || !matchGroup || !teamA || !teamB) {
    alert("Fill all match fields");
    return;
  }

  const matchId = "m_" + Date.now();

  database.ref("matches/" + matchId).set({
    matchId: matchId,
    matchNo: matchNo,
    date: matchDate,
    group: matchGroup,
    teamA: teamA,
    teamB: teamB,
    locked: false,
    createdAt: Date.now()
  }).then(() => {

    alert("Match created successfully");

    document.getElementById("matchNo").value = "";
    document.getElementById("matchDate").value = "";
    document.getElementById("matchGroup").value = "";
    document.getElementById("teamA").value = "";
    document.getElementById("teamB").value = "";
  });
}

/* ================= LOAD MATCHES ================= */

function loadMatches() {

  database.ref("matches").on("value", (snapshot) => {

    const container = document.getElementById("matchesList");
    container.innerHTML = "";

    if (!snapshot.exists()) {
      container.innerHTML = "<p>No matches created.</p>";
      return;
    }

    snapshot.forEach((child) => {

      const match = child.val();
      const matchId = child.key;

      const statusText = match.locked ? "🔴 Locked" : "🟢 Open";
      const buttonText = match.locked ? "Unlock" : "Lock";

      const matchCard = document.createElement("div");
      matchCard.className = "match-card";

      matchCard.innerHTML = `
        <div>
          <strong>Match ${match.matchNo}</strong><br>
          ${match.teamA} vs ${match.teamB}<br>
          Date: ${match.date}<br>
          Group: ${match.group}<br><br>
          <b>Status:</b> ${statusText}
        </div>

        <div style="margin-top:15px;">
          <input type="number" id="actualA_${matchId}" placeholder="Score A" min="0" style="width:70px;">
          <span> - </span>
          <input type="number" id="actualB_${matchId}" placeholder="Score B" min="0" style="width:70px;">
          <button class="primary-btn"
            onclick="submitResult('${matchId}')">
            Submit Result
          </button>
        </div>

        <div style="margin-top:10px;">
          <button class="secondary-btn"
            onclick="toggleMatchLock('${matchId}', ${match.locked})">
            ${buttonText}
          </button>
        </div>
      `;

      container.appendChild(matchCard);
    });
  });
}

/* ================= TOGGLE LOCK ================= */

function toggleMatchLock(matchId, currentStatus) {
  database.ref("matches/" + matchId).update({
    locked: !currentStatus
  });
}

/* ================= SCORING SYSTEM ================= */

function calculatePoints(userA, userB, actualA, actualB) {

  if (userA === actualA && userB === actualB) {
    return 5;
  }

  if (
    (userA === actualA && userB !== actualB) ||
    (userA !== actualA && userB === actualB)
  ) {
    return 2;
  }

  return 0;
}

function submitResult(matchId) {

  const scoreA = document.getElementById("actualA_" + matchId).value;
  const scoreB = document.getElementById("actualB_" + matchId).value;

  if (scoreA === "" || scoreB === "") {
    alert("Enter both actual scores");
    return;
  }

  const actualA = parseInt(scoreA);
  const actualB = parseInt(scoreB);

  database.ref("matches/" + matchId).update({
    scoreA: actualA,
    scoreB: actualB,
    finished: true
  }).then(() => {

    processMatchPoints(matchId, actualA, actualB);

  });
}

function processMatchPoints(matchId, actualA, actualB) {

  database.ref("predictions/" + matchId).once("value")
    .then(snapshot => {

      if (!snapshot.exists()) {
        alert("No predictions found for this match.");
        return;
      }

      snapshot.forEach(child => {

        const userId = child.key;
        const prediction = child.val();

        const userA = prediction.scoreA;
        const userB = prediction.scoreB;

        const earnedPoints = calculatePoints(userA, userB, actualA, actualB);

        saveUserMatchPoints(userId, matchId, earnedPoints);
      });

      alert("Match result processed and points updated!");
    });
}

function saveUserMatchPoints(userId, matchId, earnedPoints) {

  const userRef = database.ref("users/" + userId);

  userRef.once("value").then(snapshot => {

    // 🔒 If user does not exist, skip
    if (!snapshot.exists()) {
      console.log("User not found, skipping:", userId);
      return;
    }

    // Overwrite matchPoints safely
    database.ref("users/" + userId + "/matchPoints/" + matchId)
      .set(earnedPoints)
      .then(() => {
        recalculateUserTotals(userId);
      });

  });

}

function recalculateUserTotals(userId) {

  database.ref("users/" + userId).once("value")
    .then(snapshot => {

      const user = snapshot.val();
      const matchPointsObj = user.matchPoints || {};
      const bracketPoints = user.points?.bracket || 0;

      let totalMatchPoints = 0;

      for (let key in matchPointsObj) {
        totalMatchPoints += matchPointsObj[key];
      }

      const newTotal = totalMatchPoints + bracketPoints;

      database.ref("users/" + userId + "/points").update({
        match: totalMatchPoints,
        total: newTotal
      });
    });
}

/* ================= INIT MATCHES ================= */

loadMatches();