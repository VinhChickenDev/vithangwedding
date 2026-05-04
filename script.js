const LANGUAGE_PREFERENCE_KEY = "wedding_lang_pref";

function getSavedLanguagePreference() {
  try {
    return localStorage.getItem(LANGUAGE_PREFERENCE_KEY);
  } catch {
    return null;
  }
}

function saveLanguagePreference(lang) {
  try {
    localStorage.setItem(LANGUAGE_PREFERENCE_KEY, lang);
  } catch {
    // Ignore storage errors (private mode, blocked storage, etc.)
  }
}

function initLanguageSwitcherPreference() {
  const switcherLinks = document.querySelectorAll(".lang-btn[href]");
  if (!switcherLinks.length) return;

  switcherLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const href = (link.getAttribute("href") || "").toLowerCase();
      const targetLang = href.includes("/vi") ? "vi" : "en";
      saveLanguagePreference(targetLang);
    });
  });
}

function shouldUseVietnamesePage() {
  const languageHints = [navigator.language, ...(navigator.languages || [])]
    .filter(Boolean)
    .map((lang) => lang.toLowerCase());

  const hasVietnameseLanguage = languageHints.some(
    (lang) => lang === "vi" || lang.startsWith("vi-")
  );

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const isVietnamTimezone = timezone.toLowerCase().includes("ho_chi_minh");

  const locale = Intl.DateTimeFormat().resolvedOptions().locale || "";
  const isVietnamLocale = locale.toLowerCase().includes("-vn");

  return hasVietnameseLanguage || isVietnamTimezone || isVietnamLocale;
}

function autoRedirectToVietnamesePage() {
  const currentPath = window.location.pathname.toLowerCase();
  const isVietnamesePage = currentPath.endsWith("/vi") || currentPath.endsWith("/vi/");
  const isEnglishPage = currentPath.endsWith("/index.html") || currentPath.endsWith("/");
  const savedLang = getSavedLanguagePreference();

  if (!isEnglishPage || isVietnamesePage) return;
  if (savedLang === "en") return;
  if (savedLang === "vi") {
    const targetUrl = new URL("./vi", window.location.href);
    targetUrl.hash = window.location.hash;
    window.location.replace(targetUrl.toString());
    return;
  }
  if (!shouldUseVietnamesePage()) return;

  const targetUrl = new URL("./vi", window.location.href);
  targetUrl.hash = window.location.hash;
  window.location.replace(targetUrl.toString());
}

initLanguageSwitcherPreference();
autoRedirectToVietnamesePage();

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("show");
      observer.unobserve(entry.target);
    });
  },
  { threshold: 0.12, rootMargin: "0px 0px -10% 0px" }
);

document.querySelectorAll(".reveal, .pop-in").forEach((el) => observer.observe(el));

(function initQrGiftModal() {
  const modal = document.getElementById("qr-modal");
  if (!modal) return;

  const imgEl = modal.querySelector(".qr-modal__img");
  const titleEl = modal.querySelector("#qr-modal-title");
  const dialogEl = modal.querySelector(".qr-modal__dialog");
  const closeEls = modal.querySelectorAll("[data-qr-close]");
  const triggers = document.querySelectorAll(".gift-card--qr[data-qr-src]");

  let lastFocus = null;
  let closing = false;
  /** Hủy animation đóng nếu người dùng mở lại modal trước khi kết thúc */
  let modalGeneration = 0;
  const ANIM_MS = 340;

  function finishClose(gen) {
    if (gen !== modalGeneration) return;
    closing = false;
    modal.hidden = true;
    modal.classList.remove("qr-modal--open");
    modal.setAttribute("aria-hidden", "true");
    if (imgEl) {
      imgEl.removeAttribute("src");
      imgEl.alt = "";
    }
    document.body.style.overflow = "";
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  function openModal(src, alt, title) {
    if (!imgEl) return;
    modalGeneration += 1;
    closing = false;
    lastFocus = document.activeElement;
    imgEl.src = src;
    imgEl.alt = alt || "";
    if (titleEl && title) titleEl.textContent = title;
    modal.classList.remove("qr-modal--open");
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        modal.classList.add("qr-modal--open");
      });
    });
    modal.querySelector(".qr-modal__close")?.focus();
  }

  function closeModal() {
    if (modal.hidden || closing) return;
    closing = true;
    const gen = modalGeneration;
    modal.classList.remove("qr-modal--open");

    const onEnd = (e) => {
      if (e.target !== dialogEl || e.propertyName !== "opacity") return;
      dialogEl.removeEventListener("transitionend", onEnd);
      finishClose(gen);
    };

    if (dialogEl) dialogEl.addEventListener("transitionend", onEnd);
    window.setTimeout(() => {
      if (!closing) return;
      if (dialogEl) dialogEl.removeEventListener("transitionend", onEnd);
      finishClose(gen);
    }, ANIM_MS);
  }

  triggers.forEach((card) => {
    const open = () => {
      const src = card.getAttribute("data-qr-src");
      const alt = card.getAttribute("data-qr-alt") || "";
      const title =
        document.documentElement.lang === "vi"
          ? "Quét mã chuyển khoản"
          : "Scan to transfer";
      if (src) openModal(src, alt, title);
    };

    card.addEventListener("click", (e) => {
      e.preventDefault();
      open();
    });
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
  });

  closeEls.forEach((el) => el.addEventListener("click", closeModal));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeModal();
  });
})();

(function initAnnouncementAudio() {
  const audio = document.getElementById("announcement-audio");
  const playButton = document.getElementById("announcement-play");
  if (!audio || !playButton) return;

  const playerUi = playButton.closest(".player-ui");
  const playIconSrc = "./assets/music-icons/play.svg";
  const pauseIconSrc = "./assets/music-icons/pause.svg";
  const icon = playButton.querySelector("img");
  const documentLanguage = (document.documentElement.lang || "").toLowerCase();
  const useVietnameseLabels =
    documentLanguage === "vi" || documentLanguage.startsWith("vi-");

  function setPlaying(isPlaying) {
    playButton.setAttribute("aria-pressed", isPlaying ? "true" : "false");
    const pauseLabel = useVietnameseLabels ? "Tạm dừng nhạc" : "Pause music";
    const playLabel = useVietnameseLabels ? "Phát nhạc" : "Play music";
    playButton.setAttribute("aria-label", isPlaying ? pauseLabel : playLabel);
    if (icon) icon.src = isPlaying ? pauseIconSrc : playIconSrc;
    if (playerUi) playerUi.classList.toggle("is-playing", isPlaying);
  }

  function tryStartPlayback() {
    return audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }

  playButton.addEventListener("click", () => {
    if (audio.paused) {
      tryStartPlayback();
    } else {
      audio.pause();
    }
  });

  audio.addEventListener("play", () => setPlaying(true));
  audio.addEventListener("pause", () => {
    if (!audio.ended) setPlaying(false);
  });
  audio.addEventListener("ended", () => setPlaying(false));

  if (!audio.paused) setPlaying(true);
  tryStartPlayback();

  /** Nhiều trình duyệt chặn autoplay có tiếng; thử phát lại sau lần tương tác đầu tiên với trang. */
  function tryUnlockAfterFirstInteraction() {
    document.removeEventListener("pointerdown", tryUnlockAfterFirstInteraction);
    document.removeEventListener("keydown", tryUnlockAfterFirstInteraction);
    if (audio.paused) tryStartPlayback();
  }
  document.addEventListener("pointerdown", tryUnlockAfterFirstInteraction);
  document.addEventListener("keydown", tryUnlockAfterFirstInteraction);
})();
