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

  // 🔎 Check if phone already exists
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

        // ✅ NEW STRUCTURE (IMPORTANT)
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

/* ================= INIT ================= */

loadUsers();