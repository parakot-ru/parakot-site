import { StrictMode, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BookOpen,
  Check,
  CircleAlert,
  Eye,
  Loader2,
  LogOut,
  Mail,
  MessageCircle,
  PanelsTopLeft,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import "./styles.css";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? "http://admin.konekon.ru/api";
const TOKEN_STORAGE_KEY = "parakot_admin_token";

type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

type Settings = {
  site_title: string;
  logo_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  hero_background: string | null;
  recipient_email: string | null;
  recipient_email_cc: string | null;
};

type Contact = {
  id: number;
  type: string;
  label: string;
  value: string | null;
  url: string | null;
  sort_order: number;
  is_visible: number;
};

type SectionItem = {
  id: number;
  section_id: number;
  title: string;
  description: string | null;
  image_path: string | null;
  link_url: string | null;
  meta_json: string | null;
  sort_order: number;
  is_visible: number;
};

type Section = {
  id: number;
  type: string;
  label: string;
  menu_title: string | null;
  show_in_menu: number;
  title: string;
  description: string | null;
  image_path: string | null;
  sort_order: number;
  is_published: number;
  items: SectionItem[];
};

type Lead = {
  id: number;
  name: string;
  contact: string;
  topic: string | null;
  message: string | null;
  status: string;
  created_at: string;
};

type ContentPayload = {
  settings: Settings;
  contacts: Contact[];
  sections: Section[];
};

type Toast = {
  kind: "success" | "error";
  text: string;
};

type AdminUser = {
  id: number;
  email: string;
  name: string;
};

type LoginPayload = {
  token: string;
  user: AdminUser;
};

const emptyContact: Omit<Contact, "id"> = {
  type: "telegram",
  label: "",
  value: "",
  url: "",
  sort_order: 0,
  is_visible: 1,
};

const emptySection: Omit<Section, "id" | "items"> = {
  type: "cards_grid",
  label: "",
  menu_title: "",
  show_in_menu: 0,
  title: "",
  description: "",
  image_path: "",
  sort_order: 0,
  is_published: 1,
};

const emptySectionItem: Omit<SectionItem, "id" | "section_id"> = {
  title: "",
  description: "",
  image_path: "",
  link_url: "",
  meta_json: "",
  sort_order: 0,
  is_visible: 1,
};

const placementOptions = [
  { value: "", label: "Авто" },
  { value: "top-left", label: "Сверху слева" },
  { value: "top-right", label: "Сверху справа" },
  { value: "center-left", label: "По центру слева" },
  { value: "center-right", label: "По центру справа" },
  { value: "bottom-left", label: "Снизу слева" },
  { value: "bottom-right", label: "Снизу справа" },
];

const sectionTypeDocs = [
  {
    type: "hero",
    label: "Hero",
    description: "Первый экран: крупный заголовок, вводный текст, фон и основные кнопки.",
  },
  {
    type: "rich_text",
    label: "Текст",
    description: "Обычный текстовый блок для рассказа о человеке, подходе или программе.",
  },
  {
    type: "stats",
    label: "Статистика",
    description: "Короткие факты и цифры. В карточках важны заголовок и описание.",
  },
  {
    type: "cards_grid",
    label: "Карточки",
    description: "Универсальная сетка для преимуществ, направлений, услуг или тезисов.",
  },
  {
    type: "cards_two_columns",
    label: "Карточки 2 колонки",
    description: "Более крупные карточки в две колонки, когда текста или смысла больше.",
  },
  {
    type: "services",
    label: "Услуги и цены",
    description: "Карточки программ с описанием и ценой. Поле “Цена” выводится заметно.",
  },
  {
    type: "locations_grid",
    label: "Локации",
    description: "Места полетов и туров. Хорошо работают карточки с изображениями.",
  },
  {
    type: "timeline",
    label: "Таймлайн",
    description: "Последовательность шагов: как проходит курс, выезд или подготовка.",
  },
  {
    type: "highlight",
    label: "Акцент",
    description: "Один выделенный смысловой блок: важная мысль, обещание или предупреждение.",
  },
  {
    type: "gallery",
    label: "Галерея",
    description: "Атмосферные фотографии. В карточках особенно важны изображения.",
  },
  {
    type: "faq",
    label: "FAQ",
    description: "Вопросы и ответы. Заголовок карточки — вопрос, описание — ответ.",
  },
  {
    type: "contacts",
    label: "Контакты",
    description: "Финальный блок связи. Контакты берутся из отдельного раздела админки.",
  },
];

function App() {
  const [token, setToken] = useState<string | null>(() =>
    window.localStorage.getItem(TOKEN_STORAGE_KEY),
  );
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [draftContact, setDraftContact] = useState(emptyContact);
  const [draftSection, setDraftSection] = useState(emptySection);
  const [draftItems, setDraftItems] = useState<Record<number, Omit<SectionItem, "id" | "section_id">>>({});
  const [draftItemImages, setDraftItemImages] = useState<Record<number, File | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [imageBusyKey, setImageBusyKey] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const visibleContactsCount = useMemo(
    () => contacts.filter((contact) => Number(contact.is_visible) === 1).length,
    [contacts],
  );

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    void bootstrapSession(token);
  }, [token]);

  async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const headers = new Headers(options?.headers);
    const isFormData = options?.body instanceof FormData;

    if (!isFormData) {
      headers.set("Content-Type", "application/json");
    }

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const payload = (await response.json()) as ApiResponse<T>;

    if (response.status === 401) {
      resetSession();
      throw new Error("Нужно войти заново");
    }

    if (!response.ok || !payload.ok) {
      throw new Error(payload.error ?? "API error");
    }

    return payload.data as T;
  }

  async function bootstrapSession(currentToken: string) {
    setIsLoading(true);

    try {
      const headers = new Headers();
      headers.set("Content-Type", "application/json");
      headers.set("Authorization", `Bearer ${currentToken}`);

      const response = await fetch(`${API_BASE}/me`, { headers });
      const payload = (await response.json()) as ApiResponse<AdminUser>;

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error ?? "Session expired");
      }

      setUser(payload.data);
      await loadDashboard();
    } catch {
      resetSession();
      setIsLoading(false);
    }
  }

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoggingIn(true);

    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });
      const payload = (await response.json()) as ApiResponse<LoginPayload>;

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error ?? "Не удалось войти");
      }

      window.localStorage.setItem(TOKEN_STORAGE_KEY, payload.data.token);
      setToken(payload.data.token);
      setUser(payload.data.user);
      setLoginPassword("");
      showToast("success", "Вход выполнен");
    } catch (error) {
      showToast("error", getErrorMessage(error));
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function logout() {
    try {
      await request<void>("/logout", { method: "POST" });
    } catch {
      // Session is cleared locally even if the token was already invalid server-side.
    } finally {
      resetSession();
    }
  }

  function resetSession() {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setSettings(null);
    setContacts([]);
    setSections([]);
    setLeads([]);
  }

  async function loadDashboard() {
    setIsLoading(true);

    try {
      const [content, contactsList, sectionsList, leadsList] = await Promise.all([
        request<ContentPayload>("/content"),
        request<Contact[]>("/contacts"),
        request<Section[]>("/sections"),
        request<Lead[]>("/leads"),
      ]);

      setSettings(content.settings);
      setContacts(contactsList);
      setSections(sectionsList);
      setLeads(leadsList);
    } catch (error) {
      showToast("error", getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function saveSettings() {
    if (!settings) {
      return;
    }

    setIsSavingSettings(true);

    try {
      const saved = await request<Settings>("/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });

      setSettings(saved);
      showToast("success", "Настройки сохранены");
    } catch (error) {
      showToast("error", getErrorMessage(error));
    } finally {
      setIsSavingSettings(false);
    }
  }

  async function uploadLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast("error", "Логотип должен быть не тяжелее 2 МБ");
      event.target.value = "";
      return;
    }

    setIsUploadingLogo(true);

    try {
      const formData = new FormData();
      formData.append("logo", file);

      const saved = await request<Settings>("/uploads/logo", {
        method: "POST",
        body: formData,
      });

      setSettings(saved);
      showToast("success", "Логотип загружен");
    } catch (error) {
      showToast("error", getErrorMessage(error));
    } finally {
      setIsUploadingLogo(false);
      event.target.value = "";
    }
  }

  async function deleteLogo() {
    if (!settings) {
      return;
    }

    try {
      const saved = await request<Settings>("/settings", {
        method: "PUT",
        body: JSON.stringify({ ...settings, logo_url: null }),
      });

      setSettings(saved);
      showToast("success", "Логотип удален из настроек");
    } catch (error) {
      showToast("error", getErrorMessage(error));
    }
  }

  async function createContact() {
    if (!draftContact.label.trim()) {
      showToast("error", "У контакта должно быть название");
      return;
    }

    try {
      const sortOrder = nextSortOrder(contacts);
      const created = await request<Contact>("/contacts", {
        method: "POST",
        body: JSON.stringify({ ...draftContact, sort_order: sortOrder }),
      });

      setContacts((current) => [...current, created]);
      setDraftContact(emptyContact);
      showToast("success", "Контакт добавлен");
    } catch (error) {
      showToast("error", getErrorMessage(error));
    }
  }

  async function createSection() {
    if (!draftSection.label.trim() || !draftSection.title.trim()) {
      showToast("error", "У секции должны быть метка и заголовок");
      return;
    }

    try {
      const sortOrder = nextSortOrder(sections);
      const created = await request<Section>("/sections", {
        method: "POST",
        body: JSON.stringify({ ...draftSection, sort_order: sortOrder }),
      });

      setSections((current) => [...current, created]);
      setDraftSection(emptySection);
      showToast("success", "Секция добавлена");
    } catch (error) {
      showToast("error", getErrorMessage(error));
    }
  }

  async function saveSection(section: Section) {
    try {
      const saved = await request<Section>(`/sections/${section.id}`, {
        method: "PUT",
        body: JSON.stringify(section),
      });

      setSections((current) =>
        current.map((item) => (item.id === saved.id ? saved : item)),
      );
      showToast("success", "Секция обновлена");
    } catch (error) {
      showToast("error", getErrorMessage(error));
    }
  }

  async function deleteSection(sectionId: number) {
    try {
      await request<void>(`/sections/${sectionId}`, {
        method: "DELETE",
      });

      setSections((current) => current.filter((item) => item.id !== sectionId));
      showToast("success", "Секция удалена");
    } catch (error) {
      showToast("error", getErrorMessage(error));
    }
  }

  async function uploadSectionImage(
    sectionId: number,
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    const busyKey = `section-${sectionId}`;

    if (!file) {
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      showToast("error", "Изображение должно быть не тяжелее 8 МБ");
      event.target.value = "";
      return;
    }

    setImageBusyKey(busyKey);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const saved = await request<Section>(`/sections/${sectionId}/image`, {
        method: "POST",
        body: formData,
      });

      setSections((current) =>
        current.map((section) => (section.id === saved.id ? saved : section)),
      );
      showToast("success", "Изображение секции обновлено");
    } catch (error) {
      showToast("error", getErrorMessage(error));
    } finally {
      setImageBusyKey(null);
      event.target.value = "";
    }
  }

  async function deleteSectionImage(sectionId: number) {
    const busyKey = `section-${sectionId}`;
    setImageBusyKey(busyKey);

    try {
      const saved = await request<Section>(`/sections/${sectionId}/image`, {
        method: "DELETE",
      });

      setSections((current) =>
        current.map((section) => (section.id === saved.id ? saved : section)),
      );
      showToast("success", "Изображение секции удалено");
    } catch (error) {
      showToast("error", getErrorMessage(error));
    } finally {
      setImageBusyKey(null);
    }
  }

  async function createSectionItem(sectionId: number) {
    const draft = draftItems[sectionId] ?? emptySectionItem;
    const draftImage = draftItemImages[sectionId] ?? null;

    if (!draft.title.trim()) {
      showToast("error", "У карточки должен быть заголовок");
      return;
    }

    if (draftImage) {
      setImageBusyKey(`draft-${sectionId}`);
    }

    try {
      const section = sections.find((currentSection) => currentSection.id === sectionId);
      const sortOrder = section ? nextSortOrder(section.items) : 10;
      const created = await request<SectionItem>(`/sections/${sectionId}/items`, {
        method: "POST",
        body: JSON.stringify({
          ...draft,
          image_path: draftImage ? "" : draft.image_path,
          sort_order: sortOrder,
        }),
      });
      let savedItem = created;
      let imageUploadFailed = false;

      if (draftImage) {
        try {
          savedItem = await uploadSectionItemImageFile(created.id, draftImage);
        } catch (error) {
          imageUploadFailed = true;
          showToast(
            "error",
            `Карточка добавлена, но изображение не загрузилось: ${getErrorMessage(error)}`,
          );
        }
      }

      setSections((current) =>
        current.map((section) =>
          section.id === sectionId
            ? { ...section, items: [...section.items, savedItem] }
            : section,
        ),
      );
      setDraftItems((current) => ({ ...current, [sectionId]: emptySectionItem }));
      setDraftItemImages((current) => ({ ...current, [sectionId]: null }));

      if (!imageUploadFailed) {
        showToast(
          "success",
          draftImage ? "Карточка добавлена с изображением" : "Карточка добавлена",
        );
      }
    } catch (error) {
      showToast("error", getErrorMessage(error));
    } finally {
      setImageBusyKey(null);
    }
  }

  async function saveSectionItem(sectionId: number, item: SectionItem) {
    try {
      const saved = await request<SectionItem>(`/section-items/${item.id}`, {
        method: "PUT",
        body: JSON.stringify(item),
      });

      setSections((current) =>
        current.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                items: section.items.map((sectionItem) =>
                  sectionItem.id === saved.id ? saved : sectionItem,
                ),
              }
            : section,
        ),
      );
      showToast("success", "Карточка обновлена");
    } catch (error) {
      showToast("error", getErrorMessage(error));
    }
  }

  async function uploadSectionItemImage(
    sectionId: number,
    itemId: number,
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    const busyKey = `item-${itemId}`;

    if (!file) {
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      showToast("error", "Изображение должно быть не тяжелее 8 МБ");
      event.target.value = "";
      return;
    }

    setImageBusyKey(busyKey);

    try {
      const saved = await uploadSectionItemImageFile(itemId, file);

      setSections((current) =>
        current.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                items: section.items.map((item) =>
                  item.id === saved.id ? saved : item,
                ),
              }
            : section,
        ),
      );
      showToast("success", "Изображение карточки обновлено");
    } catch (error) {
      showToast("error", getErrorMessage(error));
    } finally {
      setImageBusyKey(null);
      event.target.value = "";
    }
  }

  async function uploadSectionItemImageFile(itemId: number, file: File) {
    const formData = new FormData();
    formData.append("image", file);

    return request<SectionItem>(`/section-items/${itemId}/image`, {
      method: "POST",
      body: formData,
    });
  }

  async function deleteSectionItemImage(sectionId: number, itemId: number) {
    const busyKey = `item-${itemId}`;
    setImageBusyKey(busyKey);

    try {
      const saved = await request<SectionItem>(`/section-items/${itemId}/image`, {
        method: "DELETE",
      });

      setSections((current) =>
        current.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                items: section.items.map((item) =>
                  item.id === saved.id ? saved : item,
                ),
              }
            : section,
        ),
      );
      showToast("success", "Изображение карточки удалено");
    } catch (error) {
      showToast("error", getErrorMessage(error));
    } finally {
      setImageBusyKey(null);
    }
  }

  async function moveSectionItem(sectionId: number, itemId: number, direction: -1 | 1) {
    const section = sections.find((currentSection) => currentSection.id === sectionId);

    if (!section) {
      return;
    }

    const orderedItems = [...section.items].sort(sortByOrder);
    const currentIndex = orderedItems.findIndex((item) => item.id === itemId);
    const targetIndex = currentIndex + direction;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedItems.length) {
      return;
    }

    const nextItems = reorderWithStep(orderedItems, currentIndex, targetIndex);
    const changedItems = nextItems.filter((item) => {
      const previous = section.items.find((currentItem) => currentItem.id === item.id);
      return previous && previous.sort_order !== item.sort_order;
    });

    setSections((current) =>
      current.map((currentSection) =>
        currentSection.id === sectionId
          ? { ...currentSection, items: nextItems }
          : currentSection,
      ),
    );

    try {
      await Promise.all(
        changedItems.map((item) =>
          request<SectionItem>(`/section-items/${item.id}`, {
            method: "PUT",
            body: JSON.stringify(item),
          }),
        ),
      );
      showToast("success", "Порядок карточек обновлен");
    } catch (error) {
      showToast("error", getErrorMessage(error));
      await loadDashboard();
    }
  }

  async function deleteSectionItem(sectionId: number, itemId: number) {
    try {
      await request<void>(`/section-items/${itemId}`, {
        method: "DELETE",
      });

      setSections((current) =>
        current.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                items: section.items.filter((item) => item.id !== itemId),
              }
            : section,
        ),
      );
      showToast("success", "Карточка удалена");
    } catch (error) {
      showToast("error", getErrorMessage(error));
    }
  }

  async function saveContact(contact: Contact) {
    try {
      const saved = await request<Contact>(`/contacts/${contact.id}`, {
        method: "PUT",
        body: JSON.stringify(contact),
      });

      setContacts((current) =>
        current.map((item) => (item.id === saved.id ? saved : item)),
      );
      showToast("success", "Контакт обновлен");
    } catch (error) {
      showToast("error", getErrorMessage(error));
    }
  }

  async function moveContact(contactId: number, direction: -1 | 1) {
    const orderedContacts = [...contacts].sort(sortByOrder);
    const currentIndex = orderedContacts.findIndex((contact) => contact.id === contactId);
    const targetIndex = currentIndex + direction;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedContacts.length) {
      return;
    }

    const nextContacts = reorderWithStep(orderedContacts, currentIndex, targetIndex);
    const changedContacts = nextContacts.filter((contact) => {
      const previous = contacts.find((currentContact) => currentContact.id === contact.id);
      return previous && previous.sort_order !== contact.sort_order;
    });

    setContacts(nextContacts);

    try {
      await Promise.all(
        changedContacts.map((contact) =>
          request<Contact>(`/contacts/${contact.id}`, {
            method: "PUT",
            body: JSON.stringify(contact),
          }),
        ),
      );
      showToast("success", "Порядок контактов обновлен");
    } catch (error) {
      showToast("error", getErrorMessage(error));
      await loadDashboard();
    }
  }

  async function deleteContact(contactId: number) {
    try {
      await request<void>(`/contacts/${contactId}`, {
        method: "DELETE",
      });

      setContacts((current) => current.filter((item) => item.id !== contactId));
      showToast("success", "Контакт удален");
    } catch (error) {
      showToast("error", getErrorMessage(error));
    }
  }

  async function updateLeadStatus(leadId: number, status: string) {
    try {
      const saved = await request<Lead>(`/leads/${leadId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      setLeads((current) =>
        current.map((lead) => (lead.id === saved.id ? saved : lead)),
      );
    } catch (error) {
      showToast("error", getErrorMessage(error));
    }
  }

  function updateContact(contactId: number, patch: Partial<Contact>) {
    setContacts((current) =>
      current.map((contact) =>
        contact.id === contactId ? { ...contact, ...patch } : contact,
      ),
    );
  }

  function updateSection(sectionId: number, patch: Partial<Section>) {
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId ? { ...section, ...patch } : section,
      ),
    );
  }

  function updateSectionItem(
    sectionId: number,
    itemId: number,
    patch: Partial<SectionItem>,
  ) {
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map((item) =>
                item.id === itemId ? { ...item, ...patch } : item,
              ),
            }
          : section,
      ),
    );
  }

  function updateSectionItemPlacement(
    sectionId: number,
    itemId: number,
    placement: string,
  ) {
    updateSectionItemMeta(sectionId, itemId, { placement });
  }

  function updateSectionItemPrice(sectionId: number, itemId: number, price: string) {
    updateSectionItemMeta(sectionId, itemId, { price });
  }

  function updateSectionItemMeta(
    sectionId: number,
    itemId: number,
    patch: Record<string, string>,
  ) {
    const section = sections.find((currentSection) => currentSection.id === sectionId);
    const item = section?.items.find((currentItem) => currentItem.id === itemId);

    if (!item) {
      return;
    }

    updateSectionItem(sectionId, itemId, {
      meta_json: updateMetaJson(item.meta_json, patch),
    });
  }

  function updateDraftItemMeta(sectionId: number, patch: Record<string, string>) {
    setDraftItems((current) => {
      const draft = current[sectionId] ?? emptySectionItem;

      return {
        ...current,
        [sectionId]: {
          ...draft,
          meta_json: updateMetaJson(draft.meta_json, patch),
        },
      };
    });
  }

  function showToast(kind: Toast["kind"], text: string) {
    setToast({ kind, text });
    window.setTimeout(() => setToast(null), 2800);
  }

  if (!token || !user) {
    return (
      <main className="login-shell">
        {toast && (
          <div className={`toast toast-${toast.kind}`}>
            {toast.kind === "success" ? <Check size={18} /> : <CircleAlert size={18} />}
            {toast.text}
          </div>
        )}
        <form className="login-panel" onSubmit={login}>
          <div>
            <p className="eyebrow">Parakot CMS</p>
            <h1>Вход в админку</h1>
          </div>
          <Field label="Email">
            <input
              type="email"
              value={loginEmail}
              onChange={(event) => setLoginEmail(event.target.value)}
              autoComplete="username"
              required
            />
          </Field>
          <Field label="Пароль">
            <input
              type="password"
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>
          <button className="primary-button login-button" type="submit" disabled={isLoggingIn}>
            {isLoggingIn ? <Loader2 size={18} className="spin" /> : <Check size={18} />}
            Войти
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Parakot CMS</p>
          <h1>Админка</h1>
        </div>
        <nav>
          <a href="#settings">Настройки</a>
          <a href="#sections">Секции</a>
          <a href="#help">Справка</a>
          <a href="#contacts">Контакты</a>
          <a href="#leads">Заявки</a>
        </nav>
        <button className="ghost-button" type="button" onClick={loadDashboard}>
          <RefreshCw size={18} />
          Обновить
        </button>
        <button className="ghost-button" type="button" onClick={logout}>
          <LogOut size={18} />
          Выйти
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">API</p>
            <strong>{API_BASE}</strong>
          </div>
          <div className="user-block">
            <span>{user.name}</span>
            <small>{user.email}</small>
          </div>
          <div className="status-pill">
            {isLoading ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
            {isLoading ? "Загрузка" : "Подключено"}
          </div>
        </header>

        {toast && (
          <div className={`toast toast-${toast.kind}`}>
            {toast.kind === "success" ? <Check size={18} /> : <CircleAlert size={18} />}
            {toast.text}
          </div>
        )}

        <section className="metric-strip">
          <Metric label="Контактов на сайте" value={String(visibleContactsCount)} />
          <Metric label="Секций" value={String(sections.length)} />
          <Metric label="Всего заявок" value={String(leads.length)} />
        </section>

        <section className="panel" id="settings">
          <PanelHeader
            icon={<Save size={19} />}
            title="Настройки сайта"
            action={
              <button
                className="primary-button"
                type="button"
                onClick={saveSettings}
                disabled={!settings || isSavingSettings}
              >
                {isSavingSettings ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
                Сохранить
              </button>
            }
          />
          {settings && (
            <div className="form-grid">
              <Field label="Название сайта">
                <input
                  value={settings.site_title}
                  onChange={(event) =>
                    setSettings({ ...settings, site_title: event.target.value })
                  }
                />
              </Field>
              <div className="logo-settings field-wide">
                <div className="logo-preview">
                  {settings.logo_url ? (
                    <img src={settings.logo_url} alt="Текущий логотип" />
                  ) : (
                    <span>Лого не задан</span>
                  )}
                </div>
                <div className="logo-controls">
                  <Field label="Адрес логотипа">
                    <input
                      className="readonly-input"
                      value={settings.logo_url ?? ""}
                      placeholder="Логотип не выбран"
                      readOnly
                    />
                  </Field>
                  <p className="field-help">
                    PNG, JPG или WEBP до 2 МБ. Лучше использовать
                    горизонтальный логотип на прозрачном фоне, примерно 400×200 px.
                  </p>
                  <div className="row-actions">
                    <input
                      ref={logoInputRef}
                      className="visually-hidden"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={uploadLogo}
                    />
                    <button
                      className="primary-button"
                      type="button"
                      disabled={isUploadingLogo}
                      onClick={() => logoInputRef.current?.click()}
                    >
                      {isUploadingLogo ? (
                        <Loader2 size={18} className="spin" />
                      ) : (
                        <Plus size={18} />
                      )}
                      {settings.logo_url ? "Заменить логотип" : "Загрузить логотип"}
                    </button>
                    <button
                      className="danger-text-button"
                      type="button"
                      disabled={!settings.logo_url}
                      onClick={deleteLogo}
                    >
                      <Trash2 size={17} />
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
              <Field label="Email для заявок">
                <input
                  value={settings.recipient_email ?? ""}
                  onChange={(event) =>
                    setSettings({ ...settings, recipient_email: event.target.value })
                  }
                  placeholder="name@example.com"
                />
              </Field>
              <Field label="Email копии">
                <input
                  value={settings.recipient_email_cc ?? ""}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      recipient_email_cc: event.target.value,
                    })
                  }
                />
              </Field>
              <div className="settings-subpanel field-wide">
                <div className="subpanel-heading">
                  <div>
                    <strong>SEO для поисковиков</strong>
                    <small>
                      Эти поля видны во вкладке браузера и в сниппете поисковой выдачи.
                    </small>
                  </div>
                </div>
                <div className="seo-grid">
                  <Field label="SEO title">
                    <input
                      value={settings.seo_title ?? ""}
                      onChange={(event) =>
                        setSettings({ ...settings, seo_title: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="SEO description" wide>
                    <textarea
                      rows={4}
                      value={settings.seo_description ?? ""}
                      onChange={(event) =>
                        setSettings({
                          ...settings,
                          seo_description: event.target.value,
                        })
                      }
                    />
                  </Field>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="panel" id="sections">
          <PanelHeader icon={<PanelsTopLeft size={19} />} title="Секции лендинга" />
          <div className="section-list">
            {sections.length === 0 && (
              <p className="empty-state">Секции пока не добавлены.</p>
            )}
            {[...sections].sort(sortByOrder).map((section, sectionIndex) => (
              <article className="section-editor" key={section.id}>
                <div className="section-editor-title">
                  <span>{String(sectionIndex + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{section.label || "Без метки"}</strong>
                    <small>{sectionTypeLabel(section.type)}</small>
                  </div>
                  <label className="publish-toggle">
                    <input
                      type="checkbox"
                      checked={Number(section.is_published) === 1}
                      onChange={(event) =>
                        updateSection(section.id, {
                          is_published: event.target.checked ? 1 : 0,
                        })
                      }
                    />
                    {Number(section.is_published) === 1 ? "На сайте" : "Черновик"}
                  </label>
                </div>
                <div className="section-editor-head">
                  <select
                    value={section.type}
                    onChange={(event) =>
                      updateSection(section.id, { type: event.target.value })
                    }
                  >
                    <option value="hero">Hero</option>
                    <option value="rich_text">Текст</option>
                    <option value="stats">Статистика</option>
                    <option value="cards_grid">Карточки</option>
                    <option value="cards_two_columns">Карточки 2 колонки</option>
                    <option value="services">Услуги и цены</option>
                    <option value="locations_grid">Локации</option>
                    <option value="timeline">Таймлайн</option>
                    <option value="highlight">Акцент</option>
                    <option value="gallery">Галерея</option>
                    <option value="faq">FAQ</option>
                    <option value="contacts">Контакты</option>
                  </select>
                  <input
                    value={section.label}
                    onChange={(event) =>
                      updateSection(section.id, { label: event.target.value })
                    }
                    placeholder="Метка в админке"
                  />
                  <input
                    type="number"
                    value={section.sort_order}
                    onChange={(event) =>
                      updateSection(section.id, {
                        sort_order: Number(event.target.value),
                      })
                    }
                    placeholder="Порядок"
                  />
                </div>
                <div className="form-grid">
                  <Field label="Заголовок">
                    <input
                      value={section.title}
                      onChange={(event) =>
                        updateSection(section.id, { title: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Пункт меню">
                    <div className="menu-field">
                      <input
                        value={section.menu_title ?? ""}
                        onChange={(event) =>
                          updateSection(section.id, {
                            menu_title: event.target.value,
                          })
                        }
                        placeholder="Например: Цены"
                      />
                      <label className="menu-toggle">
                        <input
                          type="checkbox"
                          checked={Number(section.show_in_menu) === 1}
                          onChange={(event) =>
                            updateSection(section.id, {
                              show_in_menu: event.target.checked ? 1 : 0,
                            })
                          }
                        />
                        {Number(section.show_in_menu) === 1 ? "В меню" : "Не в меню"}
                      </label>
                    </div>
                  </Field>
                  <Field label="Изображение">
                    <ManagedImageField
                      value={section.image_path ?? ""}
                      placeholder="/uploads/image.jpg"
                      isBusy={imageBusyKey === `section-${section.id}`}
                      onTextChange={(value) =>
                        updateSection(section.id, {
                          image_path: value,
                        })
                      }
                      onFileSelect={(event) => uploadSectionImage(section.id, event)}
                      onDelete={() => deleteSectionImage(section.id)}
                    />
                  </Field>
                  <Field label="Описание" wide>
                    <textarea
                      rows={3}
                      value={section.description ?? ""}
                      onChange={(event) =>
                        updateSection(section.id, {
                          description: event.target.value,
                        })
                      }
                    />
                  </Field>
                </div>
                <div className="row-actions">
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => saveSection(section)}
                  >
                    <Save size={18} />
                    Сохранить секцию
                  </button>
                  <button
                    className="danger-text-button"
                    type="button"
                    onClick={() => deleteSection(section.id)}
                  >
                    <Trash2 size={17} />
                    Удалить секцию
                  </button>
                </div>
                <div className="items-block">
                  <h3>Карточки секции</h3>
                  <div className="section-item-list">
                    {[...section.items].sort(sortByOrder).map((item, itemIndex, orderedItems) => (
                      <article className="section-item-row" key={item.id}>
                        <input
                          value={item.title}
                          onChange={(event) =>
                            updateSectionItem(section.id, item.id, {
                              title: event.target.value,
                            })
                          }
                          placeholder="Заголовок"
                        />
                        <input
                          value={item.description ?? ""}
                          onChange={(event) =>
                            updateSectionItem(section.id, item.id, {
                              description: event.target.value,
                            })
                          }
                          placeholder="Описание"
                        />
                        <ManagedImageField
                          compact
                          value={item.image_path ?? ""}
                          placeholder="Изображение"
                          isBusy={imageBusyKey === `item-${item.id}`}
                          onTextChange={(value) =>
                            updateSectionItem(section.id, item.id, {
                              image_path: value,
                            })
                          }
                          onFileSelect={(event) =>
                            uploadSectionItemImage(section.id, item.id, event)
                          }
                          onDelete={() => deleteSectionItemImage(section.id, item.id)}
                        />
                        <input
                          value={readMetaValue(item.meta_json, "price")}
                          onChange={(event) =>
                            updateSectionItemPrice(
                              section.id,
                              item.id,
                              event.target.value,
                            )
                          }
                          placeholder="Цена"
                        />
                        <select
                          value={readMetaValue(item.meta_json, "placement")}
                          onChange={(event) =>
                            updateSectionItemPlacement(
                              section.id,
                              item.id,
                              event.target.value,
                            )
                          }
                          title="Расположение карточки"
                        >
                          {placementOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <div className="order-buttons">
                          <button
                            className="icon-button"
                            type="button"
                            title="Поднять выше"
                            disabled={itemIndex === 0}
                            onClick={() => moveSectionItem(section.id, item.id, -1)}
                          >
                            ↑
                          </button>
                          <button
                            className="icon-button"
                            type="button"
                            title="Опустить ниже"
                            disabled={itemIndex === orderedItems.length - 1}
                            onClick={() => moveSectionItem(section.id, item.id, 1)}
                          >
                            ↓
                          </button>
                        </div>
                        <button
                          className="icon-button"
                          type="button"
                          title="Сохранить карточку"
                          onClick={() => saveSectionItem(section.id, item)}
                        >
                          <Save size={17} />
                        </button>
                        <button
                          className="danger-button"
                          type="button"
                          title="Удалить карточку"
                          onClick={() => deleteSectionItem(section.id, item.id)}
                        >
                          <Trash2 size={17} />
                        </button>
                      </article>
                    ))}
                  </div>
                  <div className="section-item-row new-section-item">
                    <input
                      value={(draftItems[section.id] ?? emptySectionItem).title}
                      onChange={(event) =>
                        setDraftItems((current) => ({
                          ...current,
                          [section.id]: {
                            ...(current[section.id] ?? emptySectionItem),
                            title: event.target.value,
                          },
                        }))
                      }
                      placeholder="Новая карточка"
                    />
                    <input
                      value={(draftItems[section.id] ?? emptySectionItem).description ?? ""}
                      onChange={(event) =>
                        setDraftItems((current) => ({
                          ...current,
                          [section.id]: {
                            ...(current[section.id] ?? emptySectionItem),
                            description: event.target.value,
                          },
                        }))
                      }
                      placeholder="Описание"
                    />
                    <ManagedImageField
                      compact
                      value={(draftItems[section.id] ?? emptySectionItem).image_path ?? ""}
                      placeholder="Изображение"
                      selectedFileName={draftItemImages[section.id]?.name ?? null}
                      isBusy={imageBusyKey === `draft-${section.id}`}
                      onTextChange={(value) => {
                        setDraftItems((current) => ({
                          ...current,
                          [section.id]: {
                            ...(current[section.id] ?? emptySectionItem),
                            image_path: value,
                          },
                        }));
                        setDraftItemImages((current) => ({
                          ...current,
                          [section.id]: null,
                        }));
                      }}
                      onFileSelect={(event) => {
                        const file = event.target.files?.[0] ?? null;

                        if (!file) {
                          return;
                        }

                        if (file.size > 8 * 1024 * 1024) {
                          showToast("error", "Изображение должно быть не тяжелее 8 МБ");
                          event.target.value = "";
                          return;
                        }

                        setDraftItemImages((current) => ({
                          ...current,
                          [section.id]: file,
                        }));
                        setDraftItems((current) => ({
                          ...current,
                          [section.id]: {
                            ...(current[section.id] ?? emptySectionItem),
                            image_path: "",
                          },
                        }));
                        event.target.value = "";
                      }}
                      onDelete={() => {
                        setDraftItemImages((current) => ({
                          ...current,
                          [section.id]: null,
                        }));
                        setDraftItems((current) => ({
                          ...current,
                          [section.id]: {
                            ...(current[section.id] ?? emptySectionItem),
                            image_path: "",
                          },
                        }));
                      }}
                    />
                    <input
                      value={readMetaValue(
                        (draftItems[section.id] ?? emptySectionItem).meta_json,
                        "price",
                      )}
                      onChange={(event) =>
                        updateDraftItemMeta(section.id, {
                          price: event.target.value,
                        })
                      }
                      placeholder="Цена"
                    />
                    <select
                      value={readMetaValue(
                        (draftItems[section.id] ?? emptySectionItem).meta_json,
                        "placement",
                      )}
                      onChange={(event) =>
                        updateDraftItemMeta(section.id, {
                          placement: event.target.value,
                        })
                      }
                    >
                      {placementOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <button
                      className="primary-button"
                      type="button"
                      onClick={() => createSectionItem(section.id)}
                    >
                      <Plus size={18} />
                      Добавить
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="new-section">
            <select
              value={draftSection.type}
              onChange={(event) =>
                setDraftSection({ ...draftSection, type: event.target.value })
              }
            >
              <option value="hero">Hero</option>
              <option value="rich_text">Текст</option>
              <option value="stats">Статистика</option>
              <option value="cards_grid">Карточки</option>
              <option value="cards_two_columns">Карточки 2 колонки</option>
              <option value="services">Услуги и цены</option>
              <option value="locations_grid">Локации</option>
              <option value="timeline">Таймлайн</option>
              <option value="highlight">Акцент</option>
              <option value="gallery">Галерея</option>
              <option value="faq">FAQ</option>
              <option value="contacts">Контакты</option>
            </select>
            <input
              value={draftSection.label}
              onChange={(event) =>
                setDraftSection({ ...draftSection, label: event.target.value })
              }
              placeholder="Метка"
            />
            <input
              value={draftSection.title}
              onChange={(event) =>
                setDraftSection({ ...draftSection, title: event.target.value })
              }
              placeholder="Заголовок"
            />
            <button className="primary-button" type="button" onClick={createSection}>
              <Plus size={18} />
              Добавить секцию
            </button>
          </div>
        </section>

        <section className="panel" id="help">
          <PanelHeader icon={<BookOpen size={19} />} title="Справка по типам секций" />
          <div className="help-intro">
            <p>
              Поля у секций похожи специально: так проще управлять контентом.
              Отличается не админка, а то, как лендинг рисует эти данные на сайте.
            </p>
          </div>
          <div className="type-help-grid">
            {sectionTypeDocs.map((item) => (
              <article className="type-help-card" key={item.type}>
                <span>{item.type}</span>
                <strong>{item.label}</strong>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel" id="contacts">
          <PanelHeader icon={<MessageCircle size={19} />} title="Контакты" />
          <div className="contact-list">
            {[...contacts].sort(sortByOrder).map((contact, contactIndex, orderedContacts) => (
              <article className="contact-row" key={contact.id}>
                <select
                  value={contact.type}
                  onChange={(event) =>
                    updateContact(contact.id, { type: event.target.value })
                  }
                >
                  <option value="phone">Телефон</option>
                  <option value="telegram">Telegram</option>
                  <option value="vk">VK</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                  <option value="other">Другое</option>
                </select>
                <input
                  value={contact.label}
                  onChange={(event) =>
                    updateContact(contact.id, { label: event.target.value })
                  }
                  placeholder="Название"
                />
                <input
                  value={contact.value ?? ""}
                  onChange={(event) =>
                    updateContact(contact.id, { value: event.target.value })
                  }
                  placeholder="Значение"
                />
                <input
                  value={contact.url ?? ""}
                  onChange={(event) =>
                    updateContact(contact.id, { url: event.target.value })
                  }
                  placeholder="Ссылка"
                />
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={Number(contact.is_visible) === 1}
                    onChange={(event) =>
                      updateContact(contact.id, {
                        is_visible: event.target.checked ? 1 : 0,
                      })
                    }
                  />
                  <Eye size={16} />
                </label>
                <div className="order-buttons">
                  <button
                    className="icon-button"
                    type="button"
                    title="Поднять выше"
                    disabled={contactIndex === 0}
                    onClick={() => moveContact(contact.id, -1)}
                  >
                    ↑
                  </button>
                  <button
                    className="icon-button"
                    type="button"
                    title="Опустить ниже"
                    disabled={contactIndex === orderedContacts.length - 1}
                    onClick={() => moveContact(contact.id, 1)}
                  >
                    ↓
                  </button>
                </div>
                <button
                  className="icon-button"
                  type="button"
                  title="Сохранить контакт"
                  onClick={() => saveContact(contact)}
                >
                  <Save size={17} />
                </button>
                <button
                  className="danger-button"
                  type="button"
                  title="Удалить контакт"
                  onClick={() => deleteContact(contact.id)}
                >
                  <Trash2 size={17} />
                </button>
              </article>
            ))}
          </div>
          <div className="new-contact">
            <select
              value={draftContact.type}
              onChange={(event) =>
                setDraftContact({ ...draftContact, type: event.target.value })
              }
            >
              <option value="phone">Телефон</option>
              <option value="telegram">Telegram</option>
              <option value="vk">VK</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
              <option value="other">Другое</option>
            </select>
            <input
              value={draftContact.label}
              onChange={(event) =>
                setDraftContact({ ...draftContact, label: event.target.value })
              }
              placeholder="Название"
            />
            <input
              value={draftContact.value ?? ""}
              onChange={(event) =>
                setDraftContact({ ...draftContact, value: event.target.value })
              }
              placeholder="Значение"
            />
            <input
              value={draftContact.url ?? ""}
              onChange={(event) =>
                setDraftContact({ ...draftContact, url: event.target.value })
              }
              placeholder="Ссылка"
            />
            <button className="primary-button" type="button" onClick={createContact}>
              <Plus size={18} />
              Добавить
            </button>
          </div>
        </section>

        <section className="panel" id="leads">
          <PanelHeader icon={<Mail size={19} />} title="Заявки" />
          <div className="lead-list">
            {leads.length === 0 && <p className="empty-state">Заявок пока нет.</p>}
            {leads.map((lead) => (
              <article className="lead-row" key={lead.id}>
                <div>
                  <strong>{lead.name}</strong>
                  <span>{lead.contact}</span>
                </div>
                <p>{lead.topic || "Без темы"}</p>
                <p>{lead.message || "Комментарий не указан"}</p>
                <select
                  value={lead.status}
                  onChange={(event) => updateLeadStatus(lead.id, event.target.value)}
                >
                  <option value="new">Новая</option>
                  <option value="in_progress">В работе</option>
                  <option value="done">Закрыта</option>
                </select>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function ManagedImageField({
  value,
  placeholder,
  selectedFileName,
  isBusy,
  compact = false,
  onTextChange,
  onFileSelect,
  onDelete,
}: {
  value: string;
  placeholder: string;
  selectedFileName?: string | null;
  isBusy: boolean;
  compact?: boolean;
  onTextChange: (value: string) => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDelete: () => void;
}) {
  return (
    <div className={`image-field${compact ? " image-field-compact" : ""}`}>
      <input
        value={value}
        onChange={(event) => onTextChange(event.target.value)}
        placeholder={selectedFileName ? "Файл выбран" : placeholder}
      />
      <div className="image-actions">
        <label className={`media-upload-button${isBusy ? " is-disabled" : ""}`}>
          {isBusy ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
          {value || selectedFileName ? "Заменить" : "Загрузить"}
          <input
            className="visually-hidden"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={isBusy}
            onChange={onFileSelect}
          />
        </label>
        <button
          className="danger-text-button image-delete-button"
          type="button"
          disabled={(!value && !selectedFileName) || isBusy}
          onClick={onDelete}
        >
          <Trash2 size={16} />
          Удалить
        </button>
      </div>
      {selectedFileName && <small>Будет загружено: {selectedFileName}</small>}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function PanelHeader({
  icon,
  title,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="panel-header">
      <div>
        {icon}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

function sortByOrder<T extends { id: number; sort_order: number }>(a: T, b: T) {
  return a.sort_order - b.sort_order || a.id - b.id;
}

function reorderWithStep<T extends { sort_order: number }>(
  items: T[],
  currentIndex: number,
  targetIndex: number,
) {
  const nextItems = [...items];
  const [movedItem] = nextItems.splice(currentIndex, 1);
  nextItems.splice(targetIndex, 0, movedItem);

  return nextItems.map((item, index) => ({
    ...item,
    sort_order: (index + 1) * 10,
  }));
}

function nextSortOrder(items: Array<{ sort_order: number }>) {
  if (items.length === 0) {
    return 10;
  }

  return Math.max(...items.map((item) => item.sort_order)) + 10;
}

function readMetaValue(metaJson: string | null, key: string) {
  if (!metaJson) {
    return "";
  }

  try {
    const parsed = JSON.parse(metaJson) as Record<string, unknown>;
    const value = parsed[key];
    return typeof value === "string" ? value : "";
  } catch {
    return "";
  }
}

function updateMetaJson(metaJson: string | null, patch: Record<string, string>) {
  let parsed: Record<string, string> = {};

  if (metaJson) {
    try {
      const value = JSON.parse(metaJson) as Record<string, unknown>;
      parsed = Object.entries(value).reduce<Record<string, string>>(
        (result, [key, entryValue]) => {
          if (typeof entryValue === "string" && entryValue.trim() !== "") {
            result[key] = entryValue;
          }

          return result;
        },
        {},
      );
    } catch {
      parsed = {};
    }
  }

  Object.entries(patch).forEach(([key, value]) => {
    const trimmedValue = value.trim();

    if (trimmedValue === "") {
      delete parsed[key];
      return;
    }

    parsed[key] = trimmedValue;
  });

  return Object.keys(parsed).length > 0 ? JSON.stringify(parsed) : "";
}

function sectionTypeLabel(type: string) {
  const labels: Record<string, string> = {
    hero: "Hero",
    rich_text: "Текст",
    stats: "Статистика",
    cards_grid: "Карточки",
    cards_two_columns: "Карточки 2 колонки",
    services: "Услуги и цены",
    locations_grid: "Локации",
    timeline: "Таймлайн",
    highlight: "Акцент",
    gallery: "Галерея",
    faq: "FAQ",
    contacts: "Контакты",
  };

  return labels[type] ?? type;
}

function Field({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={wide ? "field field-wide" : "field"}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Неизвестная ошибка";
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
