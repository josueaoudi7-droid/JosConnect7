// JosConnect — première étape
// Cette version rend l'inscription et la navigation fonctionnelles.
// L'enregistrement réel dans Firebase sera branché à l'étape suivante.

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".eye").forEach(btn => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      const visible = input.type === "text";
      input.type = visible ? "password" : "text";
      btn.textContent = visible ? "Afficher" : "Masquer";
    });
  });

  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const firstName = document.getElementById("firstName").value.trim();
      const lastName = document.getElementById("lastName").value.trim();
      const email = document.getElementById("registerEmail").value.trim();
      const password = document.getElementById("registerPassword").value;
      const confirm = document.getElementById("confirmPassword").value;
      const terms = document.getElementById("terms").checked;
      const msg = document.getElementById("registerMessage");

      if (password !== confirm) {
        showMessage(msg, "Les deux mots de passe ne correspondent pas.", "error");
        return;
      }

      if (password.length < 6) {
        showMessage(msg, "Le mot de passe doit contenir au moins 6 caractères.", "error");
        return;
      }

      if (!terms) {
        showMessage(msg, "Tu dois accepter les conditions d'utilisation.", "error");
        return;
      }

      // Stockage local temporaire uniquement pour permettre le test du parcours.
      localStorage.setItem("josconnect_pending_user", JSON.stringify({
        firstName, lastName, email
      }));

      showMessage(msg, "Compte préparé avec succès. Redirection vers la connexion…", "success");

      setTimeout(() => {
        window.location.href = "index.html?inscription=ok";
      }, 900);
    });
  }

  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    const params = new URLSearchParams(window.location.search);
    if (params.get("inscription") === "ok") {
      showMessage(document.getElementById("loginMessage"),
        "Inscription réussie. Tu peux maintenant te connecter.",
        "success");
    }

    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      showMessage(
        document.getElementById("loginMessage"),
        "La connexion réelle sera activée avec Firebase à l'étape suivante.",
        "info"
      );
    });
  }

  const forgot = document.getElementById("forgotPassword");
  if (forgot) {
    forgot.addEventListener("click", (e) => {
      e.preventDefault();
      showMessage(document.getElementById("loginMessage"),
        "La récupération du mot de passe sera activée avec Firebase.",
        "info");
    });
  }

  const google = document.getElementById("googleBtn");
  if (google) {
    google.addEventListener("click", () => {
      showMessage(document.getElementById("loginMessage"),
        "La connexion Google sera activée avec Firebase.",
        "info");
    });
  }
});

function showMessage(element, text, type) {
  if (!element) return;
  element.textContent = text;
  element.className = "message " + type;
}
