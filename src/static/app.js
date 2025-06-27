document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const userIcon = document.getElementById("user-icon");
  const userDropdown = document.getElementById("user-dropdown");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const closeModal = document.querySelector(".close");
  const loginSection = document.getElementById("login-section");
  const userSection = document.getElementById("user-section");
  const userName = document.getElementById("user-name");
  const adminOnlySection = document.getElementById("admin-only-section");
  const loginRequiredSection = document.getElementById("login-required-section");
  const loginMessage = document.getElementById("login-message");

  let authToken = localStorage.getItem("authToken");
  let currentUser = null;

  // Initialize authentication state
  checkAuthStatus();

  // Toggle user dropdown
  userIcon.addEventListener("click", (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle("hidden");
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", () => {
    userDropdown.classList.add("hidden");
  });

  // Prevent dropdown from closing when clicking inside it
  userDropdown.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  // Login button click
  loginBtn.addEventListener("click", () => {
    loginModal.classList.remove("hidden");
    userDropdown.classList.add("hidden");
  });

  // Close modal
  closeModal.addEventListener("click", () => {
    loginModal.classList.add("hidden");
  });

  // Close modal when clicking outside
  loginModal.addEventListener("click", (e) => {
    if (e.target === loginModal) {
      loginModal.classList.add("hidden");
    }
  });

  // Logout button click
  logoutBtn.addEventListener("click", () => {
    logout();
  });

  // Login form submission
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          email: email,
          password: password,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        authToken = result.token;
        currentUser = result.user;
        localStorage.setItem("authToken", authToken);
        loginModal.classList.add("hidden");
        loginForm.reset();
        updateAuthUI();
        showMessage("Login successful!", "success");
      } else {
        loginMessage.textContent = result.detail || "Login failed";
        loginMessage.className = "error";
        loginMessage.classList.remove("hidden");
      }
    } catch (error) {
      loginMessage.textContent = "Login failed. Please try again.";
      loginMessage.className = "error";
      loginMessage.classList.remove("hidden");
      console.error("Login error:", error);
    }
  });

  // Check authentication status
  async function checkAuthStatus() {
    if (!authToken) {
      updateAuthUI();
      return;
    }

    try {
      const response = await fetch("/verify-token", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        currentUser = result.user;
        updateAuthUI();
      } else {
        logout();
      }
    } catch (error) {
      logout();
    }
  }

  // Update UI based on authentication status
  function updateAuthUI() {
    if (currentUser) {
      loginSection.classList.add("hidden");
      userSection.classList.remove("hidden");
      adminOnlySection.classList.remove("hidden");
      loginRequiredSection.classList.add("hidden");
      userName.textContent = currentUser.name;
    } else {
      loginSection.classList.remove("hidden");
      userSection.classList.add("hidden");
      adminOnlySection.classList.add("hidden");
      loginRequiredSection.classList.remove("hidden");
    }
  }

  // Logout function
  function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem("authToken");
    updateAuthUI();
    userDropdown.classList.add("hidden");
    showMessage("Logged out successfully", "success");
  }

  // Show message function
  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons only for admins
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        currentUser
                          ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons (only if admin)
      if (currentUser) {
        document.querySelectorAll(".delete-btn").forEach((button) => {
          button.addEventListener("click", handleUnregister);
        });
      }
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality (admin only)
  async function handleUnregister(event) {
    if (!currentUser) {
      showMessage("Admin login required", "error");
      return;
    }

    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        // Refresh activities list to show updated participants
        activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission (admin only)
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser) {
      showMessage("Admin login required", "error");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();

        // Refresh activities list to show updated participants
        activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to register student. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
