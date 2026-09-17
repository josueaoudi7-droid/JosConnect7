import { auth, db } from "./firebase/app.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  ref, push, set, onValue, update, increment
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

const DAY_MS = 24 * 60 * 60 * 1000;
let currentUser = null;
let unsubscribeStories = null;
let stories = [];
let viewerIndex = 0;

const $ = id => document.getElementById(id);

function toast(message) {
  if (typeof window.showToast === "function") window.showToast(message);
  else alert(message);
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[c]));
}

function initials(name = "J") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.slice(0,2).map(p => p[0]).join("") || "J").toUpperCase();
}

function openCreator() {
  $("storyCreatorModal").classList.remove("hidden");
  $("storyUploadStatus").textContent = "";
  $("storyText").focus();
}

function closeCreator() {
  $("storyCreatorModal").classList.add("hidden");
  $("storyText").value = "";
  $("storyUploadStatus").textContent = "";
}

async function publishStory() {
  const text = $("storyText").value.trim();
  if (!text) {
    $("storyUploadStatus").textContent = "Écris quelque chose avant de publier.";
    return;
  }
  if (!currentUser) return;

  const button = $("publishStory");
  button.disabled = true;
  $("storyUploadStatus").textContent = "Publication en cours…";

  try {
    const storyRef = push(ref(db, "stories"));
    const now = Date.now();
    await set(storyRef, {
      authorUid: currentUser.uid,
      authorName: currentUser.displayName || "Utilisateur JosConnect",
      authorEmail: currentUser.email || "",
      authorPhoto: currentUser.photoURL || "",
      text,
      mediaUrl: "",
      mediaType: "text",
      createdAt: now,
      expiresAt: now + DAY_MS,
      viewsCount: 0
    });

    closeCreator();
    toast("Story publiée !");
  } catch (error) {
    console.error(error);
    $("storyUploadStatus").textContent =
      error?.message || "Impossible de publier la story.";
  } finally {
    button.disabled = false;
  }
}

function timeAgo(timestamp) {
  if (!timestamp) return "À l'instant";
  const diff = Math.max(0, Date.now() - Number(timestamp));
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  return "Hier";
}

function renderStories() {
  const list = $("storiesList");
  const empty = $("storiesEmpty");
  list.innerHTML = "";

  const grouped = new Map();
  for (const story of stories) {
    if (!grouped.has(story.authorUid)) grouped.set(story.authorUid, []);
    grouped.get(story.authorUid).push(story);
  }

  const groups = [...grouped.values()].sort((a,b) =>
    (b[0].createdAt || 0) - (a[0].createdAt || 0)
  );

  empty.style.display = groups.length ? "none" : "block";

  groups.forEach(group => {
    const first = group[0];
    const button = document.createElement("button");
    button.className = "story-item";
    button.type = "button";
    button.innerHTML = `
      <div class="story-ring">
        <div class="story-avatar">
          <span>${escapeHtml(initials(first.authorName))}</span>
        </div>
      </div>
      <strong>${escapeHtml(first.authorUid === currentUser.uid ? "Ma story" : first.authorName)}</strong>
    `;
    button.addEventListener("click", () => {
      viewerIndex = stories.indexOf(first);
      openViewer(viewerIndex);
    });
    list.appendChild(button);
  });
}

function openViewer(index) {
  if (!stories.length) return;
  viewerIndex = Math.max(0, Math.min(index, stories.length - 1));
  const story = stories[viewerIndex];

  $("storyViewer").classList.remove("hidden");
  $("viewerName").textContent = story.authorName || "Utilisateur";
  $("viewerTime").textContent = timeAgo(story.createdAt);
  $("viewerAvatar").textContent = initials(story.authorName);
  $("viewerProgress").textContent = `${viewerIndex + 1} / ${stories.length}`;

  const media = $("viewerMedia");
  media.innerHTML = "";
  const text = document.createElement("div");
  text.className = "text-only-story";
  text.textContent = story.text || "";
  media.appendChild(text);

  $("viewerCaption").style.display = "none";

  if (story.id && story.authorUid !== currentUser.uid) {
    const viewRef = ref(db, `stories/${story.id}`);
    update(viewRef, { viewsCount: increment(1) }).catch(() => {});
  }
}

function closeViewer() {
  $("storyViewer").classList.add("hidden");
  $("viewerMedia").innerHTML = "";
}

function nextStory() {
  if (!stories.length) return;
  viewerIndex = (viewerIndex + 1) % stories.length;
  openViewer(viewerIndex);
}

function prevStory() {
  if (!stories.length) return;
  viewerIndex = (viewerIndex - 1 + stories.length) % stories.length;
  openViewer(viewerIndex);
}

function subscribeStories() {
  if (unsubscribeStories) unsubscribeStories();

  unsubscribeStories = onValue(ref(db, "stories"), snapshot => {
    const data = snapshot.val() || {};
    const now = Date.now();
    stories = Object.entries(data)
      .map(([id, story]) => ({ id, ...story }))
      .filter(story => Number(story.expiresAt || 0) > now)
      .sort((a,b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));

    renderStories();
  }, error => {
    console.error("Stories:", error);
    $("storiesEmpty").textContent =
      "Impossible de charger les stories. Vérifie les règles de la Realtime Database.";
    $("storiesEmpty").style.display = "block";
  });
}

onAuthStateChanged(auth, user => {
  if (!user) return;
  currentUser = user;

  $("storyAddAvatar").textContent = initials(user.displayName || user.email || "J");

  $("openStoryCreator")?.addEventListener("click", openCreator);
  $("storyAddButton")?.addEventListener("click", openCreator);
  $("closeStoryCreator")?.addEventListener("click", closeCreator);
  $("cancelStory")?.addEventListener("click", closeCreator);
  $("publishStory")?.addEventListener("click", publishStory);
  $("closeStoryViewer")?.addEventListener("click", closeViewer);
  $("storyNext")?.addEventListener("click", nextStory);
  $("storyPrev")?.addEventListener("click", prevStory);

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      closeCreator();
      closeViewer();
    }
    if (!$('storyViewer').classList.contains("hidden")) {
      if (e.key === "ArrowRight") nextStory();
      if (e.key === "ArrowLeft") prevStory();
    }
  });

  subscribeStories();
});
