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
}

/* ================= LOGOUT ================= */

function logout() {

  localStorage.removeItem("uid");
  localStorage.removeItem("username");

  document.getElementById("guestView").classList.remove("hidden");
  document.getElementById("userView").classList.add("hidden");

  navigate("leaderboard");
}

/* ================= AUTO LOAD ================= */

window.onload = function () {

  const username = localStorage.getItem("username");

  if (username) {
    showUser(username);
  }

  navigate("leaderboard");
  loadLeaderboard(); // 🔥 LIVE DATA STARTS HERE
};

/* ================= NAVIGATION (FIXED - SINGLE SYSTEM) ================= */

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

function loadLeaderboard() {

  const ref = database.ref("users");

  ref.on("value", (snapshot) => {

    let users = [];

    snapshot.forEach(child => {
      users.push(child.val());
    });

    // sort by total points (highest first)
    users.sort((a, b) => {
      return (b.totalPoints || 0) - (a.totalPoints || 0);
    });

    const body = document.getElementById("leaderboardBody");
    body.innerHTML = "";

    users.forEach((user, index) => {

      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${user.username}</td>
        <td>${user.matchPoints || 0}</td>
        <td>${user.bracketPoints || 0}</td>
        <td>${user.totalPoints || 0}</td>
      `;

      body.appendChild(row);
    });

  });

}