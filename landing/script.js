const parallaxItems = Array.from(document.querySelectorAll("[data-depth]"));
const API_BASE =
  window.PARAKOT_API_BASE ||
  (window.location.protocol === "file:" ? "http://admin.parakot.ru/api" : "/api");
const ADMIN_BASE_CANDIDATES = getAdminBaseCandidates();
let adminBase = ADMIN_BASE_CANDIDATES[0];
const adminBaseReady = resolveAdminBase();
const TOKEN_STORAGE_KEY = "parakot_admin_token";
const EDITOR_MODE_STORAGE_KEY = "parakot_editor_mode";
let formStatusTimer = null;
let hashScrollRequest = 0;

consumeEditorTokenFromUrl();

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const siteHeader = document.querySelector(".site-header");

const updateHeaderState = () => {
  if (!siteHeader) {
    return;
  }

  siteHeader.classList.toggle("is-scrolled", window.scrollY > 80);
};

if (siteHeader) {
  window.addEventListener("scroll", updateHeaderState, { passive: true });
  window.addEventListener("resize", updateHeaderState);
  updateHeaderState();
}

if (parallaxItems.length > 0 && !prefersReducedMotion.matches) {
  let ticking = false;

  const updateParallax = () => {
    const viewportHeight = window.innerHeight;

    parallaxItems.forEach((item) => {
      const scope = item.closest(".parallax-scope");

      if (!scope) {
        return;
      }

      const rect = scope.getBoundingClientRect();
      const depth = Number.parseFloat(item.dataset.depth || "0");
      const progress =
        (viewportHeight * 0.5 - rect.top) / (viewportHeight + rect.height);
      const shift = (progress - 0.22) * depth * 320;

      item.style.setProperty("--parallax-shift", `${shift.toFixed(1)}px`);
    });

    ticking = false;
  };

  const requestTick = () => {
    if (ticking) {
      return;
    }

    ticking = true;
    window.requestAnimationFrame(updateParallax);
  };

  window.addEventListener("scroll", requestTick, { passive: true });
  window.addEventListener("resize", requestTick);
  requestTick();
}

const sectionClassByType = {
  cards_grid: "feature-card",
  cards_two_columns: "info-card",
  services: "service-card",
  locations_grid: "location-card",
  timeline: "step-card",
  stats: "feature-card",
  faq: "info-card",
  gallery: "mood-card",
  rich_text: "info-card",
  highlight: "feature-card",
};

const heroOverlayPresets = {
  air: [
    "linear-gradient(180deg, rgba(235, 247, 255, 0.12), rgba(245, 249, 252, 0.58))",
    "radial-gradient(circle at 16% 18%, rgba(255, 255, 255, 0.62), transparent 28%)",
    "linear-gradient(180deg, rgba(107, 176, 255, 0.08), rgba(255, 255, 255, 0.24))",
  ],
  clear: [
    "linear-gradient(180deg, rgba(245, 252, 255, 0.04), rgba(250, 253, 255, 0.22))",
    "radial-gradient(circle at 18% 16%, rgba(255, 255, 255, 0.38), transparent 30%)",
  ],
  contrast: [
    "linear-gradient(90deg, rgba(239, 248, 255, 0.78), rgba(239, 248, 255, 0.22) 58%, rgba(13, 39, 61, 0.18))",
    "linear-gradient(180deg, rgba(9, 32, 50, 0.12), rgba(9, 32, 50, 0.26))",
  ],
  blue: [
    "linear-gradient(180deg, rgba(149, 213, 247, 0.18), rgba(22, 77, 115, 0.34))",
    "radial-gradient(circle at 12% 16%, rgba(255, 255, 255, 0.48), transparent 32%)",
  ],
  sunset: [
    "linear-gradient(180deg, rgba(255, 221, 166, 0.2), rgba(78, 116, 143, 0.28))",
    "radial-gradient(circle at 72% 22%, rgba(255, 184, 92, 0.32), transparent 30%)",
  ],
};

const sectionTypeMeta = {
  hero: {
    label: "Hero",
    hint: "Первый экран: заголовок, вводный текст и фон.",
  },
  rich_text: {
    label: "Текст",
    hint: "Основной текст берется из описания секции.",
  },
  stats: {
    label: "Карточки",
    hint: "Архивный вариант числовых карточек.",
  },
  cards_grid: {
    label: "Карточки",
    hint: "Универсальная сетка карточек.",
  },
  cards_two_columns: {
    label: "Карточки",
    hint: "Архивный вариант карточек. Новые секции используют обычный стиль карточек.",
  },
  services: {
    label: "Услуги и цены",
    hint: "Цена выводится отдельным бейджем.",
  },
  locations_grid: {
    label: "Локации",
    hint: "Места полетов: хорошо работают фото.",
  },
  timeline: {
    label: "Таймлайн",
    hint: "Карточки идут как последовательные шаги.",
  },
  highlight: {
    label: "Карточки",
    hint: "Архивный вариант карточек в одну колонку.",
  },
  gallery: {
    label: "Галерея",
    hint: "Изображение главное, текст вторичен.",
  },
  faq: {
    label: "FAQ",
    hint: "Заголовок карточки = вопрос, описание = ответ.",
  },
  contacts: {
    label: "Контакты",
    hint: "Контакты берутся из отдельного раздела админки.",
  },
};

loadDynamicContent();
wireLeadForm();
wireInterestSelect();
scheduleHashScroll();

window.addEventListener("load", () => scheduleHashScroll());
window.addEventListener("hashchange", () => scheduleHashScroll({ behavior: "smooth" }));

async function loadDynamicContent() {
  try {
    const response = await fetch(`${API_BASE}/content`);

    if (!response.ok) {
      return;
    }

    const payload = await response.json();

    if (!payload.ok || !payload.data) {
      return;
    }

    applySettings(payload.data.settings);
    applyContacts(payload.data.contacts);
    applySections(payload.data.sections);
    scheduleHashScroll();
  } catch {
    // Hero and contacts remain visible if the API is temporarily unavailable.
    scheduleHashScroll();
  }
}

function scheduleHashScroll(options = {}) {
  const hash = window.location.hash;

  if (!hash || hash === "#top") {
    return;
  }

  const currentRequest = ++hashScrollRequest;
  const behavior = options.behavior || "auto";

  [0, 80, 220, 500].forEach((delay) => {
    window.setTimeout(() => {
      if (currentRequest !== hashScrollRequest || window.location.hash !== hash) {
        return;
      }

      const target = document.getElementById(decodeURIComponent(hash.slice(1)));

      if (!target) {
        return;
      }

      target.scrollIntoView({ block: "start", behavior });
      updateHeaderState();
    }, delay);
  });
}

function applySettings(settings) {
  if (!settings) {
    return;
  }

  if (settings.seo_title) {
    document.title = settings.seo_title;
  }

  const description = document.querySelector('meta[name="description"]');

  if (description && settings.seo_description) {
    description.setAttribute("content", settings.seo_description);
  }

  const brandText = document.querySelector("[data-brand-text]");
  const brandLogo = document.querySelector("[data-brand-logo]");

  if (brandText && settings.site_title) {
    brandText.textContent = settings.site_title;
  }

  if (brandLogo) {
    if (settings.logo_url) {
      brandLogo.hidden = false;
      brandLogo.src = settings.logo_url;
      brandLogo.alt = settings.site_title || "Паракот";
    } else {
      brandLogo.hidden = true;
    }
  }

  const hero = document.querySelector(".hero");

  if (hero && settings.hero_background) {
    setHeroBackgroundImage(hero, settings.hero_background);
  }
}

function applyContacts(contacts) {
  if (!Array.isArray(contacts) || contacts.length === 0) {
    return;
  }

  const container = document.querySelector("[data-dynamic-contacts]");

  if (!container) {
    return;
  }

  container.replaceChildren();

  contacts.forEach((contact) => {
    const link = document.createElement("a");
    const contactType = contact.type || "other";
    link.className = `contact-link contact-link-${contactType}`;
    link.href = contact.url || hrefFromContact(contact);
    link.dataset.contactType = contactType;

    if (/^https?:\/\//.test(link.href)) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }

    const label = document.createElement("span");
    label.textContent = contact.label || contactType || "Контакт";

    const value = document.createElement("strong");
    value.textContent = contact.value || contact.url || contact.label;

    link.append(label, value);
    container.appendChild(link);
  });
}

function applySections(sections) {
  if (!Array.isArray(sections) || sections.length === 0) {
    return;
  }

  const heroSection = sections.find((section) => section.type === "hero");

  if (heroSection) {
    applyHeroSection(heroSection);
  } else {
    hideHeroSection();
  }

  const dynamicSections = document.createDocumentFragment();

  sections.forEach((section) => {
    if (section.type === "contacts" || section.type === "hero") {
      return;
    }

    dynamicSections.appendChild(renderSection(section));
  });

  if (dynamicSections.childNodes.length > 0) {
    const wrapper = document.querySelector("[data-api-sections]");

    if (!wrapper) {
      return;
    }

    wrapper.replaceChildren(dynamicSections);
  }

  updateNavigation(sections);
  setupEditorMode(sections);
}

function applyHeroSection(section) {
  const hero = document.querySelector(".hero");

  if (!hero) {
    return;
  }

  hero.hidden = false;
  hero.dataset.editorSectionId = section.id;
  hero.dataset.editorType = section.type;

  const eyebrow = hero.querySelector(".hero-content .eyebrow");
  const title = hero.querySelector(".hero-content h1");
  const text = hero.querySelector(".hero-text");

  if (eyebrow && section.label) {
    eyebrow.textContent = section.label;
  }

  if (title && section.title) {
    renderHeroTitle(title, section.title);
  }

  if (text && section.description) {
    text.textContent = section.description;
  }

  applyHeroBackground(hero, section);
  applyHeroBadge(hero, section);
}

function applyHeroBackground(hero, section) {
  const media = hero.querySelector("[data-hero-media]");
  const overlay = hero.querySelector(".hero-overlay");
  const videoUrl = readMetaValue(section.meta_json, "heroVideoUrl");
  const backgroundType =
    readMetaValue(section.meta_json, "heroBackgroundType") || (videoUrl ? "video" : "image");
  const posterUrl = readMetaValue(section.meta_json, "heroVideoPoster") || section.image_path;

  if (posterUrl) {
    setHeroBackgroundImage(hero, posterUrl);
  }

  if (media) {
    media.style.setProperty("--hero-media-blur", "0px");
    media.style.setProperty("--hero-media-scale", "1");

    if (backgroundType === "video" && videoUrl && !prefersReducedMotion.matches) {
      renderHeroVideo(media, videoUrl, posterUrl);
      hero.classList.add("hero-has-video");
    } else {
      media.replaceChildren();
      hero.classList.remove("hero-has-video");
    }
  }

  if (overlay) {
    overlay.style.background = "";
  }
}

function renderHeroVideo(container, videoUrl, posterUrl) {
  const embedUrl = heroVideoEmbedUrl(videoUrl);

  if (embedUrl) {
    const currentFrame = container.querySelector("iframe");

    if (currentFrame && currentFrame.getAttribute("src") === embedUrl) {
      return;
    }

    const frame = document.createElement("iframe");
    frame.className = "hero-video hero-video-embed";
    frame.src = embedUrl;
    frame.allow = "autoplay; encrypted-media; fullscreen; picture-in-picture";
    frame.setAttribute("allowfullscreen", "");
    frame.setAttribute("loading", "eager");
    frame.setAttribute("title", "Видео первого экрана");

    container.replaceChildren(frame);
    return;
  }

  const currentVideo = container.querySelector("video");

  if (currentVideo && currentVideo.getAttribute("src") === videoUrl) {
    return;
  }

  const video = document.createElement("video");
  video.className = "hero-video";
  video.src = videoUrl;
  video.autoplay = true;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");

  if (posterUrl) {
    video.poster = posterUrl;
  }

  container.replaceChildren(video);
  video.play().catch(() => {
    // Poster stays visible through the hero background when autoplay is blocked.
  });
}

function heroVideoEmbedUrl(videoUrl) {
  if (!videoUrl.includes("vk.com/video")) {
    return "";
  }

  const match = videoUrl.match(/video(-?\d+)_(\d+)/);

  if (!match) {
    return "";
  }

  const [, oid, id] = match;
  const params = new URLSearchParams({
    oid,
    id,
    hd: "2",
    autoplay: "1",
    muted: "1",
  });

  return `https://vk.com/video_ext.php?${params.toString()}`;
}

function setHeroBackgroundImage(hero, imageUrl) {
  hero.style.backgroundImage = `url("${imageUrl}")`;
}

function buildHeroOverlay(preset, strength) {
  const darkness = strength / 100;
  const presetLayers = heroOverlayPresets[preset] || heroOverlayPresets.air;
  const darknessLayer = `linear-gradient(180deg, rgba(5, 28, 45, ${(
    darkness * 0.28
  ).toFixed(3)}), rgba(5, 28, 45, ${(darkness * 0.48).toFixed(3)}))`;

  return [darknessLayer, ...presetLayers].join(", ");
}

function applyHeroBadge(hero, section) {
  const badge = hero.querySelector("[data-hero-flight-note]");

  if (!badge) {
    return;
  }

  const label = readMetaValue(section.meta_json, "heroBadgeLabel") || "Летные места";
  const text = readMetaValue(section.meta_json, "heroBadgeText") || "Юца • Чегем • Даргавс • Джилы-Су";
  const labelElement = badge.querySelector("[data-hero-badge-label]");
  const textElement = badge.querySelector("[data-hero-badge-text]");

  if (!text.trim()) {
    badge.hidden = true;
    return;
  }

  badge.hidden = false;
  badge.setAttribute("aria-label", `${label}: ${text}`);

  if (labelElement) {
    labelElement.textContent = label;
  }

  if (textElement) {
    textElement.textContent = text;
  }
}

function clampNumber(value, min, max) {
  const number = Number.parseFloat(value);

  if (!Number.isFinite(number)) {
    return min;
  }

  return Math.min(Math.max(number, min), max);
}

function hideHeroSection() {
  const hero = document.querySelector(".hero");

  if (hero) {
    hero.hidden = true;
  }
}

function renderHeroTitle(container, value) {
  const title = value.trim();

  if (!title) {
    return;
  }

  const explicitParts = title.split("|").map((part) => part.trim()).filter(Boolean);
  const parts = explicitParts.length > 1 ? explicitParts : splitHeroTitle(title);

  container.replaceChildren();
  container.append(document.createTextNode(parts[0] || title));

  if (parts[1]) {
    const accent = document.createElement("span");
    accent.textContent = protectShortHeroPreposition(parts.slice(1).join(" "));
    container.appendChild(document.createTextNode(" "));
    container.appendChild(accent);
  }
}

function splitHeroTitle(title) {
  const markers = [" С Константином", " Со школой", " С инструктором"];
  const markerIndex = markers
    .map((marker) => title.indexOf(marker))
    .filter((index) => index > 0)
    .sort((left, right) => left - right)[0];

  if (Number.isInteger(markerIndex)) {
    return [title.slice(0, markerIndex).trim(), title.slice(markerIndex + 1).trim()];
  }

  return [title];
}

function protectShortHeroPreposition(text) {
  return text
    .replace(/^(С|Со)\s+/i, "$1\u00a0")
    .replace(/\s([викосу])\s+/gi, " $1\u00a0");
}

function updateNavigation(sections) {
  const nav = document.querySelector(".nav");

  if (!nav) {
    return;
  }

  const menuSections = sections.filter(
    (section) => Number(section.show_in_menu) === 1 && section.menu_title,
  );

  if (menuSections.length === 0) {
    return;
  }

  nav.replaceChildren();

  menuSections.forEach((section) => {
    const link = document.createElement("a");
    link.href = `#section-${section.id}`;
    link.textContent = section.menu_title;
    nav.appendChild(link);
  });

  const contactsLink = document.createElement("a");
  contactsLink.href = "#contacts";
  contactsLink.textContent = "Контакты";
  nav.appendChild(contactsLink);
}

function renderSection(section) {
  const element = document.createElement("section");
  element.className = sectionClassName(section.type);
  element.id = `section-${section.id}`;
  element.dataset.editorSectionId = section.id;
  element.dataset.editorType = section.type;

  if (section.image_path) {
    const backgroundMask = readMetaValue(section.meta_json, "backgroundMask") || "veil";
    const backgroundTint = readMetaValue(section.meta_json, "backgroundTint") || "default";
    const backgroundSpotSize = clampNumber(
      readMetaValue(section.meta_json, "backgroundSpotSize"),
      10,
      115,
      50,
    );
    const backgroundSpotBlur = clampNumber(
      readMetaValue(section.meta_json, "backgroundSpotBlur"),
      0,
      12,
      2,
    );
    const backgroundOverlay = clampNumber(
      readMetaValue(section.meta_json, "backgroundOverlay"),
      0,
      100,
      100,
    );
    const backgroundEdgeSoftness = clampNumber(
      readMetaValue(section.meta_json, "backgroundEdgeSoftness"),
      0,
      36,
      17,
    );
    const backgroundEdgeFade = readMetaValue(section.meta_json, "backgroundEdgeFade") || "off";
    const backgroundEdgeMode =
      readMetaValue(section.meta_json, "backgroundEdgeMode") ||
      (backgroundEdgeFade === "on" ? "all" : "off");
    const backgroundDecor = readMetaValue(section.meta_json, "backgroundDecor") || "on";

    element.classList.add("section-has-background");
    element.classList.add(`section-background-mask-${backgroundMask}`);
    element.classList.add(`section-background-tint-${backgroundTint}`);
    element.style.setProperty("--section-spot-width", `${backgroundSpotSize}%`);
    element.style.setProperty("--section-spot-height", `${Math.round(backgroundSpotSize * 0.82)}%`);
    element.style.setProperty("--section-spot-blur", `${backgroundSpotBlur}px`);
    element.style.setProperty("--section-veil-start", `${Math.round(80 - backgroundSpotSize * 0.5)}%`);
    element.style.setProperty("--section-overlay-opacity", `${backgroundOverlay / 100}`);
    element.style.setProperty("--section-edge-softness", `${backgroundEdgeSoftness}%`);
    element.style.setProperty("--section-edge-inner", `${Math.round(backgroundEdgeSoftness * 0.3)}%`);

    if (backgroundDecor === "off") {
      element.classList.add("section-background-decor-off");
    }

    if (backgroundEdgeFade === "on" && backgroundEdgeMode !== "off") {
      element.classList.add("section-background-edge-fade");
      element.classList.add(`section-background-edge-${backgroundEdgeMode}`);
    }

    const backgroundMedia = document.createElement("span");
    backgroundMedia.className = "section-background-media";
    backgroundMedia.setAttribute("aria-hidden", "true");
    backgroundMedia.style.setProperty(
      "--section-background-image",
      `url("${section.image_path}")`,
    );
    element.appendChild(backgroundMedia);
  }

  const heading = document.createElement("div");
  heading.className = "section-heading";

  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.dataset.editorField = "label";
  eyebrow.textContent = section.label;

  const title = document.createElement("h2");
  title.dataset.editorField = "title";
  title.textContent = section.title;

  heading.append(eyebrow, title);

  if (section.description && section.type !== "rich_text") {
    const description = document.createElement("p");
    description.className = "section-description";
    description.dataset.editorField = "description";
    description.textContent = section.description;
    heading.appendChild(description);
  }

  element.appendChild(heading);

  if (section.type === "rich_text" && section.description) {
    element.appendChild(renderRichText(section.description));
  }

  if (Array.isArray(section.items) && section.items.length > 0) {
    element.appendChild(renderItems(section));
  }

  return element;
}

function renderRichText(text) {
  const grid = document.createElement("div");
  grid.className = "about-grid about-grid-single";

  const card = document.createElement("div");
  card.className = "about-card";

  text.split(/\n{2,}/).forEach((paragraph) => {
    const value = paragraph.trim();

    if (!value) {
      return;
    }

    const element = document.createElement("p");
    element.textContent = value;
    card.appendChild(element);
  });

  grid.appendChild(card);

  return grid;
}

function renderItems(section) {
  const isTimeline = section.type === "timeline";
  const container = document.createElement(isTimeline ? "ol" : "div");
  container.className = containerClassName(section.type);
  const cardColumns =
    readMetaValue(section.meta_json, "columns") ||
    (section.type === "cards_two_columns"
      ? "2"
      : section.type === "highlight"
        ? "1"
        : section.type === "stats"
          ? "4"
          : "");
  const cardStyle = readMetaValue(section.meta_json, "cardStyle") ||
    (section.type === "stats" ? "number" : "");

  if (container.classList.contains("cards") && cardColumns) {
    container.dataset.columns = cardColumns;
  }

  if (container.classList.contains("cards") && cardStyle) {
    container.dataset.cardStyle = cardStyle;
  }

  section.items.forEach((item, index) => {
    const card = document.createElement(isTimeline ? "li" : "article");
    card.className = cardClassName(section, cardStyle);
    card.dataset.editorSectionId = section.id;
    card.dataset.editorItemId = item.id;
    card.style.setProperty("--item-index", index + 1);
    const placement = readMetaValue(item.meta_json, "placement");

    if (placement) {
      card.classList.add(`placement-${placement}`);
    }

    const title = document.createElement(isTimeline ? "strong" : "h3");
    title.textContent = item.title;
    card.appendChild(title);

    if (item.description) {
      const description = document.createElement(isTimeline ? "span" : "p");
      description.textContent = item.description;
      card.appendChild(description);
    }

    if (item.image_path) {
      card.style.backgroundImage = `linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(242, 248, 253, 0.88)), url("${item.image_path}")`;
    }

    container.appendChild(card);
  });

  return container;
}

function readMetaValue(metaJson, key) {
  if (!metaJson) {
    return "";
  }

  try {
    const parsed = JSON.parse(metaJson);
    return typeof parsed[key] === "string" ? parsed[key] : "";
  } catch {
    return "";
  }
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

function sectionClassName(type) {
  if (type === "timeline") {
    return "section section-soft timeline";
  }

  if (type === "rich_text") {
    return "section section-soft about";
  }

  if (type === "gallery") {
    return "section section-sky mood flight-journal-section";
  }

  if (type === "services") {
    return "section services-section";
  }

  return "section";
}

function containerClassName(type) {
  if (type === "timeline") {
    return "steps";
  }

  if (type === "locations_grid") {
    return "cards location-grid";
  }

  if (type === "gallery") {
    return "flight-journal";
  }

  if (type === "stats") {
    return "cards";
  }

  if (type === "cards_two_columns") {
    return "cards two-columns";
  }

  if (type === "services") {
    return "cards service-grid";
  }

  if (type === "faq") {
    return "faq-list";
  }

  if (type === "highlight") {
    return "cards";
  }

  return "cards three-columns";
}

function cardClassName(section, cardStyle) {
  if (cardStyle === "number") {
    return "stat";
  }

  if (cardStyle === "photo") {
    return "feature-card card-style-photo";
  }

  return sectionClassByType[section.type] || "info-card";
}

async function setupEditorMode(sections) {
  const params = new URLSearchParams(window.location.search);

  if (params.get("editor") === "0") {
    window.localStorage.removeItem(EDITOR_MODE_STORAGE_KEY);
  }

  if (params.get("editor") === "1") {
    window.localStorage.setItem(EDITOR_MODE_STORAGE_KEY, "1");
  }

  const isEnabled = window.localStorage.getItem(EDITOR_MODE_STORAGE_KEY) === "1";
  const hadTokenCandidate = hasEditorTokenCandidate();
  const [isAuthenticated, resolvedAdminBase] = await Promise.all([
    checkEditorAuth(),
    adminBaseReady,
  ]);

  if (!isEnabled && isAuthenticated) {
    renderEditorEntryButton(sections, resolvedAdminBase);
    return;
  }

  if (!isEnabled && hadTokenCandidate) {
    renderEditorLoginButton(resolvedAdminBase);
    return;
  }

  if (!isEnabled) {
    return;
  }

  document.body.classList.add("editor-mode");
  renderEditorToolbar(isAuthenticated, resolvedAdminBase);
  annotateEditableSections(sections, resolvedAdminBase);
}

function getAdminBaseCandidates() {
  if (window.PARAKOT_ADMIN_BASE) {
    return [normalizeBaseUrl(window.PARAKOT_ADMIN_BASE)];
  }

  if (window.location.hostname.includes("konekon")) {
    return ["http://admin.konekon.ru"];
  }

  return ["https://admin.parakot.ru", "http://admin.parakot.ru"];
}

async function resolveAdminBase() {
  for (const candidate of ADMIN_BASE_CANDIDATES) {
    if (await canUseAdminBase(candidate)) {
      adminBase = candidate;
      return candidate;
    }
  }

  adminBase = ADMIN_BASE_CANDIDATES[ADMIN_BASE_CANDIDATES.length - 1];
  return adminBase;
}

async function canUseAdminBase(candidate) {
  if (!candidate.startsWith("https://")) {
    return true;
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 2200);

  try {
    await fetch(candidate, {
      method: "HEAD",
      mode: "no-cors",
      cache: "no-store",
      signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
}

function normalizeBaseUrl(url) {
  return url.replace(/\/+$/, "");
}

function consumeEditorTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const editorToken = params.get("editor_token");

  if (!editorToken) {
    return;
  }

  window.localStorage.setItem(TOKEN_STORAGE_KEY, editorToken);
  writeSharedTokenCookie(editorToken);
  window.localStorage.setItem(EDITOR_MODE_STORAGE_KEY, "1");
  params.delete("editor_token");

  const search = params.toString();
  const cleanUrl = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
  window.history.replaceState(null, "", cleanUrl);
}

async function checkEditorAuth() {
  const tokens = getEditorTokenCandidates();

  if (tokens.length === 0) {
    return false;
  }

  for (const token of tokens) {
    try {
      const response = await fetch(`${API_BASE}/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = await response.json();

      if (response.ok && payload.ok) {
        window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
        writeSharedTokenCookie(token);
        return true;
      }
    } catch {
      // Try the next token source: localStorage and shared cookie can drift apart.
    }
  }

  clearEditorToken();
  return false;
}

function hasEditorTokenCandidate() {
  return getEditorTokenCandidates().length > 0;
}

function getEditorTokenCandidates() {
  return [
    readCookie(TOKEN_STORAGE_KEY),
    window.localStorage.getItem(TOKEN_STORAGE_KEY),
  ].filter((token, index, tokens) => token && tokens.indexOf(token) === index);
}

function readCookie(name) {
  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${name}=`));

  if (!cookie) {
    return "";
  }

  return decodeURIComponent(cookie.slice(name.length + 1));
}

function writeSharedTokenCookie(token) {
  const domain = getSharedCookieDomain();
  const secure = window.location.protocol === "https:" ? "; Secure" : "";

  document.cookie =
    [
      `${TOKEN_STORAGE_KEY}=${encodeURIComponent(token)}`,
      "Max-Age=604800",
      "Path=/",
      "SameSite=Lax",
      domain ? `Domain=${domain}` : "",
    ]
      .filter(Boolean)
      .join("; ") + secure;
}

function clearEditorToken() {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  clearSharedTokenCookie();
}

function clearSharedTokenCookie() {
  const domain = getSharedCookieDomain();
  const secure = window.location.protocol === "https:" ? "; Secure" : "";

  document.cookie =
    [
      `${TOKEN_STORAGE_KEY}=`,
      "Max-Age=0",
      "Path=/",
      "SameSite=Lax",
      domain ? `Domain=${domain}` : "",
    ]
      .filter(Boolean)
      .join("; ") + secure;
}

function getSharedCookieDomain() {
  const host = window.location.hostname;

  if (host.endsWith("konekon.ru")) {
    return ".konekon.ru";
  }

  if (host.endsWith("parakot.ru")) {
    return ".parakot.ru";
  }

  return "";
}

function renderEditorEntryButton(sections, resolvedAdminBase) {
  if (
    document.querySelector("[data-editor-entry]") ||
    document.querySelector("[data-editor-toolbar]")
  ) {
    return;
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "editor-entry-button";
  button.dataset.editorEntry = "true";
  button.textContent = "Включить редактор";

  button.addEventListener("click", () => {
    window.localStorage.setItem(EDITOR_MODE_STORAGE_KEY, "1");
    button.remove();
    document.body.classList.add("editor-mode");
    renderEditorToolbar(true, resolvedAdminBase);
    annotateEditableSections(sections, resolvedAdminBase);
  });

  document.body.appendChild(button);
}

function renderEditorLoginButton(resolvedAdminBase) {
  if (
    document.querySelector("[data-editor-entry]") ||
    document.querySelector("[data-editor-toolbar]")
  ) {
    return;
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "editor-entry-button editor-entry-button-muted";
  button.dataset.editorEntry = "true";
  button.textContent = "Войти в админку";

  button.addEventListener("click", () => {
    window.location.href = resolvedAdminBase;
  });

  document.body.appendChild(button);
}

function renderEditorToolbar(isAuthenticated, resolvedAdminBase) {
  if (document.querySelector("[data-editor-toolbar]")) {
    return;
  }

  const toolbar = document.createElement("aside");
  toolbar.className = "editor-toolbar";
  toolbar.dataset.editorToolbar = "true";

  const header = document.createElement("div");
  header.className = "editor-toolbar-head";

  const title = document.createElement("strong");
  title.textContent = "Режим редактора";

  const status = document.createElement("span");
  status.className = `editor-status ${
    isAuthenticated ? "editor-status-online" : "editor-status-preview"
  }`;
  status.title = isAuthenticated
    ? "Админ-сессия активна"
    : "Предпросмотр: правки через админку";
  status.setAttribute("aria-label", status.title);

  header.append(title, status);

  const adminLink = document.createElement("a");
  adminLink.href = `${resolvedAdminBase}/#sections`;
  adminLink.textContent = "Открыть админку";

  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "Выключить";
  close.addEventListener("click", () => {
    window.localStorage.removeItem(EDITOR_MODE_STORAGE_KEY);
    window.location.href = window.location.pathname + window.location.hash;
  });

  toolbar.append(header, adminLink, close);
  document.body.appendChild(toolbar);
}

function annotateEditableSections(sections, resolvedAdminBase) {
  sections.forEach((section) => {
    const element = document.querySelector(`[data-editor-section-id="${section.id}"]`);

    if (!element || element.querySelector(":scope > .editor-section-tools")) {
      return;
    }

    const meta = sectionTypeMeta[section.type] || {
      label: section.type,
      hint: "Универсальная секция.",
    };
    const tools = document.createElement("div");
    tools.className = "editor-section-tools";

    const badge = document.createElement("span");
    badge.className = "editor-type-badge";
    badge.textContent = meta.label;
    badge.title = meta.hint;

    const editLink = document.createElement("a");
    editLink.href = `${resolvedAdminBase}/#cms-section-${section.id}`;
    editLink.textContent = "Редактировать секцию";

    tools.append(badge, editLink);
    element.prepend(tools);
  });

  document.querySelectorAll("[data-editor-item-id]").forEach((card) => {
    if (card.querySelector(":scope > .editor-card-tools")) {
      return;
    }

    const sectionId = card.dataset.editorSectionId;
    const tools = document.createElement("a");
    tools.className = "editor-card-tools";
    tools.href = `${resolvedAdminBase}/#cms-section-${sectionId}`;
    tools.textContent = "Карточка";
    card.appendChild(tools);
  });
}

function hrefFromContact(contact) {
  const value = contact.value || "";

  if (contact.type === "phone") {
    return `tel:${value.replace(/[^\d+]/g, "")}`;
  }

  if (contact.type === "email") {
    return `mailto:${value}`;
  }

  if (contact.type === "telegram") {
    if (/^https?:\/\//.test(value)) {
      return value;
    }

    return value.startsWith("@")
      ? `https://t.me/${value.slice(1)}`
      : `https://t.me/${value}`;
  }

  if (contact.type === "instagram") {
    if (/^https?:\/\//.test(value)) {
      return value;
    }

    return value.startsWith("@")
      ? `https://www.instagram.com/${value.slice(1)}/`
      : `https://www.instagram.com/${value}/`;
  }

  if (contact.type === "vk") {
    if (/^https?:\/\//.test(value)) {
      return value;
    }

    const vkId = value.replace(/^@/, "").replace(/^vk\.com\//, "");

    return vkId ? `https://vk.com/${vkId}` : "#contacts";
  }

  return value || "#contacts";
}

function wireLeadForm() {
  const form = document.querySelector("[data-lead-form]");
  const status = document.querySelector("[data-form-status]");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const button = form.querySelector("button[type='submit']");

    if (button) {
      button.disabled = true;
    }

    setFormStatus(status, "Отправляем заявку...", "info");

    try {
      const response = await fetch(`${API_BASE}/leads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.get("name"),
          contact: formData.get("contact"),
          topic: formData.get("topic"),
          message: formData.get("message"),
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Не удалось отправить заявку");
      }

      form.reset();
      setFormStatus(
        status,
        "Заявка отправлена. Скоро с вами свяжутся.",
        "success",
        true,
      );
    } catch (error) {
      setFormStatus(
        status,
        error instanceof Error ? error.message : "Не удалось отправить заявку",
        "error",
      );
    } finally {
      if (button) {
        button.disabled = false;
      }
    }
  });
}

function wireInterestSelect() {
  const root = document.querySelector("[data-interest-select]");
  const trigger = document.querySelector("[data-interest-trigger]");
  const hidden = document.querySelector("[data-interest-value]");
  const placeholder = document.querySelector("[data-interest-placeholder]");
  const clouds = document.querySelector("[data-interest-clouds]");

  if (!root || !trigger || !hidden || !placeholder || !clouds) {
    return;
  }

  const options = Array.from(root.querySelectorAll("input[type='checkbox']")).map(
    (checkbox) => ({
      checkbox,
      label: checkbox.closest("label"),
    }),
  );
  const checkboxes = options.map((option) => option.checkbox);

  const updateValue = () => {
    const selected = options
      .filter((option) => option.checkbox.checked)
      .map((option) => option.checkbox.value);

    hidden.value = selected.join(", ");
    placeholder.hidden = selected.length > 0;
    clouds.replaceChildren();

    options.forEach((option) => {
      option.label?.classList.toggle("is-selected", option.checkbox.checked);
    });

    selected.forEach((value) => {
      const cloud = document.createElement("span");
      cloud.className = "interest-cloud";
      cloud.textContent = value;

      const remove = document.createElement("span");
      remove.className = "interest-cloud-remove";
      remove.textContent = "×";
      cloud.appendChild(remove);

      cloud.addEventListener("click", (event) => {
        event.stopPropagation();
        const checkbox = checkboxes.find((item) => item.value === value);

        if (checkbox) {
          checkbox.checked = false;
          updateValue();
        }
      });

      clouds.appendChild(cloud);
    });

    root.classList.toggle("has-value", selected.length > 0);
  };

  trigger.addEventListener("click", () => {
    root.classList.toggle("is-open");
  });

  options.forEach((option) => {
    option.label?.addEventListener("click", () => {
      window.setTimeout(updateValue, 0);
    });
    option.checkbox.addEventListener("change", updateValue);
  });

  root.closest("form")?.addEventListener("reset", () => {
    window.setTimeout(updateValue, 0);
  });

  document.addEventListener("click", (event) => {
    if (!root.contains(event.target)) {
      root.classList.remove("is-open");
    }
  });

  updateValue();
}

function setFormStatus(status, message, type = "info", autoHide = false) {
  if (!status) {
    return;
  }

  if (formStatusTimer) {
    window.clearTimeout(formStatusTimer);
    formStatusTimer = null;
  }

  status.textContent = message;
  status.classList.remove("form-status-info", "form-status-success", "form-status-error");

  if (message) {
    status.classList.add(`form-status-${type}`, "is-visible");
  } else {
    status.classList.remove("is-visible");
  }

  if (autoHide) {
    formStatusTimer = window.setTimeout(() => {
      status.textContent = "";
      status.classList.remove(
        "is-visible",
        "form-status-info",
        "form-status-success",
        "form-status-error",
      );
      formStatusTimer = null;
    }, 6000);
  }
}
