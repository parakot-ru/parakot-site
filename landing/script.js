const parallaxItems = Array.from(document.querySelectorAll("[data-depth]"));
const API_BASE =
  window.PARAKOT_API_BASE || "http://admin.konekon.ru/api";
let formStatusTimer = null;

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

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
      const shift = (progress - 0.2) * depth * 180;

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
  stats: "stat",
  faq: "info-card",
  gallery: "mood-card",
  rich_text: "info-card",
  highlight: "highlight-box",
};

loadDynamicContent();
wireLeadForm();
wireInterestSelect();

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
  } catch {
    // Hero and contacts remain visible if the API is temporarily unavailable.
  }
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

  if (brandLogo && settings.logo_url) {
    brandLogo.src = settings.logo_url;
    brandLogo.alt = settings.site_title || "Паракот";
  }

  const hero = document.querySelector(".hero");

  if (hero && settings.hero_background) {
    hero.style.backgroundImage = `linear-gradient(180deg, rgba(250, 253, 255, 0.02), rgba(236, 244, 250, 0.2)), url("${settings.hero_background}")`;
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
    link.className = "contact-link";
    link.href = contact.url || hrefFromContact(contact);

    const label = document.createElement("span");
    label.textContent = contact.label || contact.type || "Контакт";

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

  const heading = document.createElement("div");
  heading.className = "section-heading";

  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = section.label;

  const title = document.createElement("h2");
  title.textContent = section.title;

  heading.append(eyebrow, title);

  if (section.description && section.type !== "rich_text") {
    const description = document.createElement("p");
    description.className = "section-description";
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

  section.items.forEach((item) => {
    const card = document.createElement(isTimeline ? "li" : "article");
    card.className = sectionClassByType[section.type] || "info-card";
    const placement = readMetaValue(item.meta_json, "placement");
    const price = readMetaValue(item.meta_json, "price");

    if (placement) {
      card.classList.add(`placement-${placement}`);
    }

    const title = document.createElement(isTimeline ? "strong" : "h3");
    title.textContent = item.title;
    card.appendChild(title);

    if (price) {
      const priceTag = document.createElement("strong");
      priceTag.className = "service-price";
      priceTag.textContent = price;
      card.appendChild(priceTag);
    }

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

function sectionClassName(type) {
  if (type === "timeline") {
    return "section section-soft timeline";
  }

  if (type === "rich_text") {
    return "section section-soft about";
  }

  if (type === "gallery") {
    return "section section-sky mood";
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
    return "mood-grid";
  }

  if (type === "stats") {
    return "stats";
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
    return "highlight-list";
  }

  return "cards three-columns";
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
    return value.startsWith("@")
      ? `https://t.me/${value.slice(1)}`
      : `https://t.me/${value}`;
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

  const checkboxes = Array.from(root.querySelectorAll("input[type='checkbox']"));

  const updateValue = () => {
    const selected = checkboxes
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => checkbox.value);

    hidden.value = selected.join(", ");
    placeholder.hidden = selected.length > 0;
    clouds.replaceChildren();

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

  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", updateValue);
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
