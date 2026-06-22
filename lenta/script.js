const API_URL = "./api/posts";
const PAGE_SIZE = 10;

const feedElement = document.querySelector("[data-feed]");
const statusElement = document.querySelector("[data-status]");
const loadMoreButton = document.querySelector("[data-load-more]");

let nextOffset = 0;
let isLoading = false;
let hasMore = true;

loadPosts();

loadMoreButton?.addEventListener("click", () => {
  loadPosts();
});

async function loadPosts() {
  if (isLoading || !hasMore) {
    return;
  }

  setLoading(true);

  try {
    const url = new URL(API_URL, window.location.href);
    url.searchParams.set("count", String(PAGE_SIZE));
    url.searchParams.set("offset", String(nextOffset));

    const response = await fetch(url);
    const payload = await response.json();

    if (!payload.ok) {
      showStatus("Лента пока не подключена", payload.error || "Нужен VK-токен на сервере.");
      return;
    }

    if (payload.configured === false) {
      showStatus(
        "Ждем ключ от VK",
        payload.message || "Как только появится токен сообщества, здесь появятся свежие посты.",
      );
    } else {
      hideStatus();
    }

    const posts = Array.isArray(payload.data?.posts) ? payload.data.posts : [];
    posts.forEach((post) => feedElement.appendChild(renderPost(post)));

    nextOffset = Number(payload.data?.next_offset || nextOffset + posts.length);
    hasMore = Boolean(payload.data?.has_more);
    loadMoreButton.hidden = !hasMore;

    if (posts.length === 0 && payload.configured !== false) {
      showStatus("Постов пока нет", "VK вернул пустую ленту. Можно проверить owner_id и права токена.");
    }
  } catch {
    showStatus("Не удалось загрузить ленту", "Проверьте подключение или серверный API ленты.");
  } finally {
    setLoading(false);
  }
}

function renderPost(post) {
  const card = document.createElement("article");
  card.className = "post-card";

  const media = Array.isArray(post.media) ? post.media.slice(0, 6) : [];

  if (media.length > 0) {
    const mediaGrid = document.createElement("div");
    mediaGrid.className = "post-media";
    mediaGrid.style.setProperty("--media-columns", String(media.length === 1 ? 1 : 2));

    media.forEach((item) => {
      const link = document.createElement("a");
      link.href = item.url || post.url || "#";
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      if (item.preview) {
        const image = document.createElement("img");
        image.src = item.preview;
        image.alt = item.alt || "";
        image.loading = "lazy";
        link.appendChild(image);
      }

      if (item.type === "video") {
        const badge = document.createElement("span");
        badge.className = "video-badge";
        badge.textContent = "Видео во VK";
        link.appendChild(badge);
      }

      mediaGrid.appendChild(link);
    });

    card.appendChild(mediaGrid);
  }

  const body = document.createElement("div");
  body.className = "post-body";

  const date = document.createElement("p");
  date.className = "post-date";
  date.textContent = formatDate(post.date);
  body.appendChild(date);

  if (post.text) {
    const text = document.createElement("p");
    text.className = "post-text";
    text.textContent = post.text;
    body.appendChild(text);
  }

  const footer = document.createElement("div");
  footer.className = "post-footer";

  if (post.url) {
    const link = document.createElement("a");
    link.className = "post-link";
    link.href = post.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Открыть во VK";
    footer.appendChild(link);
  }

  body.appendChild(footer);
  card.appendChild(body);

  return card;
}

function formatDate(value) {
  const timestamp = Number(value);

  if (!Number.isFinite(timestamp)) {
    return "Пост VK";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(timestamp * 1000));
}

function showStatus(title, message) {
  statusElement.hidden = false;
  statusElement.innerHTML = `<strong>${escapeHtml(title)}</strong>${escapeHtml(message)}`;
}

function hideStatus() {
  statusElement.hidden = true;
  statusElement.textContent = "";
}

function setLoading(value) {
  isLoading = value;

  if (loadMoreButton) {
    loadMoreButton.disabled = value;
    loadMoreButton.textContent = value ? "Загружаем..." : "Показать еще";
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
