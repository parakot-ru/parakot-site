import { expect, test } from "@playwright/test";
import { apiUrl, requireAdminCredentials } from "./helpers/env";

test("public content endpoint returns landing data", async ({ request }) => {
  const response = await request.get(`${apiUrl}/content`);
  expect(response.ok()).toBeTruthy();

  const payload = await response.json();

  expect(payload.ok).toBe(true);
  expect(payload.data.settings.site_title).toBeTruthy();
  expect(Array.isArray(payload.data.contacts)).toBe(true);
  expect(Array.isArray(payload.data.sections)).toBe(true);
  expect(payload.data.sections.length).toBeGreaterThan(0);
  expect(
    payload.data.sections.every((section: { is_published: number }) => Number(section.is_published) === 1),
  ).toBe(true);
});

test("admin API authenticates and exposes read-only dashboard data", async ({ request }) => {
  const credentials = requireAdminCredentials();
  const loginResponse = await request.post(`${apiUrl}/login`, {
    data: credentials,
  });
  expect(loginResponse.ok()).toBeTruthy();

  const loginPayload = await loginResponse.json();
  expect(loginPayload.ok).toBe(true);
  expect(loginPayload.data.token).toBeTruthy();

  const authHeaders = {
    Authorization: `Bearer ${loginPayload.data.token}`,
  };

  const [meResponse, contactsResponse, sectionsResponse, leadsResponse] = await Promise.all([
    request.get(`${apiUrl}/me`, { headers: authHeaders }),
    request.get(`${apiUrl}/contacts`, { headers: authHeaders }),
    request.get(`${apiUrl}/sections`, { headers: authHeaders }),
    request.get(`${apiUrl}/leads`, { headers: authHeaders }),
  ]);

  for (const response of [meResponse, contactsResponse, sectionsResponse, leadsResponse]) {
    expect(response.ok()).toBeTruthy();
  }

  const mePayload = await meResponse.json();
  const contactsPayload = await contactsResponse.json();
  const sectionsPayload = await sectionsResponse.json();
  const leadsPayload = await leadsResponse.json();

  expect(mePayload.ok).toBe(true);
  expect(mePayload.data.email).toBe(credentials.email);
  expect(Array.isArray(contactsPayload.data)).toBe(true);
  expect(Array.isArray(sectionsPayload.data)).toBe(true);
  expect(Array.isArray(leadsPayload.data)).toBe(true);
});
