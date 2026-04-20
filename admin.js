const database = firebase.database();

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

/* ================= SECTION SWITCHING ================= */

function showSection(sectionId) {

  document.querySelectorAll(".admin-section").forEach(sec => {
    sec.classList.add("hidden");
  });

  document.getElementById(sectionId).classList.remove("hidden");

  // 🔥 LOAD BRACKET WHEN OPENED
  if (sectionId === "bracketSection") {
    loadBracketAdmin();
  }

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

/* ================= BRACKET LOCK MANAGEMENT ================= */

function listenBracketLockStatus() {

  database.ref("bracketResults/lock/bracket")
    .on("value", snapshot => {

      const val = snapshot.val();
      const isLocked = val === true;

      const statusText = document.getElementById("bracketLockStatus");
      const btn = document.getElementById("toggleBracketLockBtn");

      if (!statusText || !btn) return;

      if (isLocked) {
        statusText.innerText = "🔴 Locked";
        btn.innerText = "Unlock Bracket";
      } else {
        statusText.innerText = "🟢 Open";
        btn.innerText = "Lock Bracket";
      }
    });
}

function toggleBracketLock() {

  database.ref("bracketResults/lock/bracket")
    .once("value")
    .then(snapshot => {

      const current = snapshot.val() === true;

      database.ref("bracketResults/lock")
        .update({
          bracket: !current
        });

    });
}

function loadBracketAdmin() {

  const container = document.getElementById("bracketAdminContainer");

  let html = "";

  Object.keys(GROUPS).forEach(group => {

    html += `
      <div class="admin-box" style="margin-top:15px;">
        <h3>Group ${group}</h3>

        <label>1st Place</label>
        <select id="admin_${group}_1">
          <option value="">Select</option>
          ${GROUPS[group].map(t => `<option value="${t}">${t}</option>`).join("")}
        </select>

        <br><br>

        <label>2nd Place</label>
        <select id="admin_${group}_2">
          <option value="">Select</option>
          ${GROUPS[group].map(t => `<option value="${t}">${t}</option>`).join("")}
        </select>
      </div>
    `;
  });

  container.innerHTML = html;

listenGroupLocks();
renderBestThirdAdmin();
setupAdminGroupValidation();
}

function submitBracketResults() {

  let results = {};

  Object.keys(GROUPS).forEach(group => {

    const first = document.getElementById(`admin_${group}_1`).value;
    const second = document.getElementById(`admin_${group}_2`).value;

    if (!first || !second) {
      alert("Fill all groups first");
      return;
    }

    results[group] = {
      first,
      second
    };
  });

  database.ref("bracketResults/groups").set(results)
    .then(() => {
      alert("Bracket results saved!");
      calculateBracketPoints();
    });
}

function calculateBracketPoints() {

  database.ref("bracket/groups").once("value").then(resultSnap => {

    if (!resultSnap.exists()) return;

    const actual = resultSnap.val();

    database.ref("bracket/groups").once("value").then(() => {

      database.ref("bracket/groups").once("value").then(() => {

        database.ref("bracket/groups").once("value").then(() => {

          // USERS
          database.ref("bracket/groups").once("value"); // ignore

        });

      });

    });

    // GET ALL USERS
    database.ref("bracket/groups").once("value"); // placeholder

    database.ref("users").once("value").then(usersSnap => {

      usersSnap.forEach(userChild => {

        const uid = userChild.key;
        const user = userChild.val();

        database.ref("bracket/groups/" + uid).once("value").then(userBracketSnap => {

          if (!userBracketSnap.exists()) return;

          const userBracket = userBracketSnap.val();

          let points = 0;

          Object.keys(actual).forEach(group => {

            const actualGroup = actual[group];
            const userGroup = userBracket[group];

            if (!userGroup) return;

            if (userGroup.first === actualGroup.first) {
              points += 5;
            }

            if (userGroup.second === actualGroup.second) {
              points += 5;
            }

          });

          database.ref("users/" + uid + "/points/bracket").set(points)
            .then(() => {

              recalcTotal(uid);

            });

        });

      });

    });

  });
}

function recalcTotal(uid) {

  database.ref("users/" + uid).once("value").then(snap => {

    const user = snap.val();

    const match = user.points?.match || 0;
    const bracket = user.points?.bracket || 0;

    database.ref("users/" + uid + "/points/total").set(match + bracket);
  });
}

function listenGroupLocks() {

  Object.keys(GROUPS).forEach(group => {

    database.ref("bracketResults/lock/groups/" + group)
      .on("value", snap => {

        const locked = snap.val() === true;

        const status = document.getElementById("status_" + group);
        const btn = document.getElementById("lockBtn_" + group);

        if (!status || !btn) return;

        if (locked) {
          status.innerText = "🔴 Locked (Users)";
          btn.innerText = "Unlock";
        } else {
          status.innerText = "🟢 Open (Users)";
          btn.innerText = "Lock";
        }

      });

  });
}

function submitSingleGroup(group) {

  const first = document.getElementById(`admin_${group}_1`).value;
  const second = document.getElementById(`admin_${group}_2`).value;

  if (!first || !second) {
    alert("Select both teams");
    return;
  }

  if (first === second) {
    alert("1st and 2nd cannot be same team");
    return;
  }

  // SAVE ONLY RESULT (NO LOCK HERE)
  database.ref("bracketResults/groups/" + group).set({
    first,
    second
  }).then(() => {

    calculateGroupPoints(group);
    alert("Group " + group + " result submitted!");

  });
}

function toggleGroupLock(group) {

  const lockRef = database.ref("bracketResults/lock/groups/" + group);

  lockRef.once("value").then(snap => {

    const isLocked = snap.val() === true;

    lockRef.set(!isLocked);

  });
}

function calculateGroupPoints(group) {

  database.ref("bracketResults/groups/" + group).once("value")
    .then(actualSnap => {

      const actual = actualSnap.val();
      if (!actual) return;

      database.ref("users").once("value")
        .then(usersSnap => {

          usersSnap.forEach(userChild => {

            const uid = userChild.key;

            database.ref(`bracket/groups/${uid}/${group}`)
              .once("value")
              .then(userSnap => {

                const user = userSnap.val();
                if (!user) return;

                let points = 0;

                if (user.first === actual.first) points += 5;
                if (user.second === actual.second) points += 5;

                database.ref(`users/${uid}/bracketPoints/${group}`)
                  .set(points)
                  .then(() => recalcBracketTotal(uid));
              });
          });
        });
    });
}

function renderBestThirdAdmin() {

  const container = document.getElementById("bracketAdminContainer");

  let html = `
    <div class="admin-box" style="margin-top:30px;">
      <h3>Best 3rd Teams (Select 8)</h3>

      <div id="adminBestThirdContainer"
           style="display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:10px;">
  `;

  Object.keys(GROUPS).forEach(group => {
    GROUPS[group].forEach(team => {
      html += `
        <div>
          <input type="checkbox" value="${team}" class="adminThirdCheck">
          <span>${team}</span>
        </div>
      `;
    });
  });

  html += `
      </div>

      <p id="adminThirdCount">Selected: 0 / 8</p>

      <br>

      <button class="primary-btn"
        onclick="submitBestThirdActual()">
        Submit Best 3rd Result
      </button>

      <button class="secondary-btn"
        onclick="toggleBestThirdLock()"
        id="bestThirdLockBtn"
        style="margin-left:10px;">
        Lock
      </button>

      <p id="bestThirdStatus" style="margin-top:10px;"></p>
    </div>
  `;

  container.innerHTML += html;

  setupAdminThirdLimit();
  listenBestThirdLock();
}

function setupAdminThirdLimit() {

  document.querySelectorAll(".adminThirdCheck").forEach(cb => {

    cb.addEventListener("change", () => {

      const checked = document.querySelectorAll(".adminThirdCheck:checked");

      if (checked.length > 8) {
        cb.checked = false;
        alert("Only 8 teams allowed");
      }

      document.getElementById("adminThirdCount").innerText =
        `Selected: ${checked.length} / 8`;
    });

  });

}

function submitBestThirdActual() {

  const checked = document.querySelectorAll(".adminThirdCheck:checked");

  if (checked.length !== 8) {
    alert("Select exactly 8 teams");
    return;
  }

  let actualTeams = [];
  checked.forEach(cb => actualTeams.push(cb.value));

  database.ref("bracketResults/bestThird/actual")
    .set(actualTeams)
    .then(() => {

      calculateBestThirdPoints(actualTeams);
      alert("Best 3rd teams submitted!");

    });
}

function calculateBestThirdPoints(actualTeams) {

  database.ref("users").once("value").then(usersSnap => {

    usersSnap.forEach(userChild => {

      const uid = userChild.key;

      database.ref("bracket/bestThird/" + uid)
        .once("value")
        .then(userSnap => {

          if (!userSnap.exists()) return;

          const userSelected = userSnap.val().selected || [];

          let points = 0;

          userSelected.forEach(team => {
            if (actualTeams.includes(team)) {
              points += 5;
            }
          });

          database.ref(`users/${uid}/bracketPoints/bestThird`)
            .set(points)
            .then(() => recalcBracketTotal(uid));

        });

    });

  });
}

function toggleBestThirdLock() {

  const lockRef = database.ref("bracketResults/lock/bestThird");

  lockRef.once("value").then(snap => {

    const isLocked = snap.val() === true;

    lockRef.set(!isLocked);

  });
}

function listenBestThirdLock() {

  database.ref("bracketResults/lock/bestThird")
    .on("value", snap => {

      const locked = snap.val() === true;

      const status = document.getElementById("bestThirdStatus");
      const btn = document.getElementById("bestThirdLockBtn");

      if (!status || !btn) return;

      if (locked) {
        status.innerText = "🔴 Locked (Users)";
        btn.innerText = "Unlock";
      } else {
        status.innerText = "🟢 Open (Users)";
        btn.innerText = "Lock";
      }

    });
}

function recalcBracketTotal(uid) {

  database.ref(`users/${uid}/bracketPoints`)
    .once("value")
    .then(snap => {

      let total = 0;

      snap.forEach(child => {
        total += child.val();
      });

      database.ref(`users/${uid}/points/bracket`)
        .set(total)
        .then(() => recalcTotal(uid));
    });
}

window.onload = function () {
  loadUsers();
  loadMatches();
  loadBracketAdmin();
  listenBracketLockStatus();
};

function setupAdminGroupValidation() {

  Object.keys(GROUPS).forEach(group => {

    const firstSelect = document.getElementById(`admin_${group}_1`);
    const secondSelect = document.getElementById(`admin_${group}_2`);

    if (!firstSelect || !secondSelect) return;

    function validateGroup() {

      const first = firstSelect.value;
      const second = secondSelect.value;

      // Prevent same team
      if (first && second && first === second) {
        alert("1st and 2nd cannot be same team");
        secondSelect.value = "";
      }

      updateBestThirdAvailability();
    }

    firstSelect.addEventListener("change", validateGroup);
    secondSelect.addEventListener("change", validateGroup);

  });
}

function updateBestThirdAvailability() {

  let selectedTeams = [];

  // Collect all selected 1st & 2nd teams
  Object.keys(GROUPS).forEach(group => {

    const first = document.getElementById(`admin_${group}_1`)?.value;
    const second = document.getElementById(`admin_${group}_2`)?.value;

    if (first) selectedTeams.push(first);
    if (second) selectedTeams.push(second);
  });

  // Disable those in Best 3rd
  document.querySelectorAll(".adminThirdCheck").forEach(cb => {

    if (selectedTeams.includes(cb.value)) {
      cb.checked = false;
      cb.disabled = true;
    } else {
      cb.disabled = false;
    }

  });
}