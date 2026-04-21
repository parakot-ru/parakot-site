import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Check,
  CircleAlert,
  Eye,
  Loader2,
  LogOut,
  Mail,
  MessageCircle,
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
  sections: unknown[];
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
  const [leads, setLeads] = useState<Lead[]>([]);
  const [draftContact, setDraftContact] = useState(emptyContact);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

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
    headers.set("Content-Type", "application/json");

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
    setLeads([]);
  }

  async function loadDashboard() {
    setIsLoading(true);

    try {
      const [content, leadsList] = await Promise.all([
        request<ContentPayload>("/content"),
        request<Lead[]>("/leads"),
      ]);

      setSettings(content.settings);
      setContacts(content.contacts);
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

  async function createContact() {
    if (!draftContact.label.trim()) {
      showToast("error", "У контакта должно быть название");
      return;
    }

    try {
      const created = await request<Contact>("/contacts", {
        method: "POST",
        body: JSON.stringify(draftContact),
      });

      setContacts((current) => [...current, created]);
      setDraftContact(emptyContact);
      showToast("success", "Контакт добавлен");
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
          <Metric label="Всего заявок" value={String(leads.length)} />
          <Metric
            label="Новых заявок"
            value={String(leads.filter((lead) => lead.status === "new").length)}
          />
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
              <Field label="SEO title">
                <input
                  value={settings.seo_title ?? ""}
                  onChange={(event) =>
                    setSettings({ ...settings, seo_title: event.target.value })
                  }
                />
              </Field>
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
          )}
        </section>

        <section className="panel" id="contacts">
          <PanelHeader icon={<MessageCircle size={19} />} title="Контакты" />
          <div className="contact-list">
            {contacts.map((contact) => (
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
