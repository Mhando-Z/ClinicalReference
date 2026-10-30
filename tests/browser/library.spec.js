import { test, expect } from "@playwright/test";

test("browse chapters, read tables, save a section, and keep it after reload", async ({ page }) => {
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Guidelines, made accessible." })).toBeVisible();
  await page.getByRole("button", { name: /Emergency conditions.*Assessment/ }).click();
  await expect(page.locator(".results-header h2")).toHaveText("Sections in this chapter");
  await page.locator(".card-open").filter({ hasText: "Cardiac Arrest" }).click();
  await expect(page.locator(".source-content")).toBeVisible();
  await expect(page.locator(".source-content")).toContainText("Pharmacological Management");
  await page.getByRole("button", { name: "Save section", exact: true }).click();
  await expect(page.getByRole("button", { name: "Saved", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Saved", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Saved sections/ }).click();
  await expect(page.locator(".section-card")).toHaveCount(1);
  await expect(page.locator(".section-card")).toContainText("Cardiac Arrest");
  await page.getByRole("button", { name: /Unsave Cardiac/ }).click();
  await expect(page.getByRole("heading", { name: "A place for your go-to references" })).toBeVisible();

  await page.getByRole("button", { name: "Guideline library" }).click();
  await page.getByRole("button", { name: /Essential medicines list.*Explore/ }).click();
  await expect(page.locator(".source-table").first()).toBeVisible();
  await page.screenshot({ path: "test-results/reader-desktop.png", fullPage: false });
  expect(errors).toEqual([]);
});

test("search the full source, clear filters, handle no results, and show source details", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: "test-results/library-desktop.png", fullPage: true });
  const indexLoaded = page.waitForResponse(r => r.url().endsWith("/data/search-index.json") && r.ok());
  const input = page.getByRole("textbox", { name: "Search guidelines by condition, medicine, or keyword" });
  await input.fill("artemether");
  await indexLoaded;
  await expect(page.locator(".results-header [role=status]")).toContainText("matching");
  await expect(page.locator(".section-card").first()).toBeVisible();
  await page.locator(".card-open").first().click();
  await expect(page.locator(".source-content")).toContainText(/artemether/i);
  await page.getByRole("button", { name: "Back to library" }).click();
  await input.fill("zzzz-no-such-clinical-term");
  await expect(page.getByRole("heading", { name: "No matching sections" })).toBeVisible();
  await page.getByRole("button", { name: "Browse all guidelines" }).click();
  await expect(input).toHaveValue("");
  await page.getByRole("button", { name: "About the source", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("341 sections");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("mobile navigation, figures, and layout stay usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Guidelines, made accessible." })).toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.locator(".sidebar")).toHaveClass(/is-open/);
  await page.getByRole("navigation", { name: "Chapters", exact: true }).getByRole("button", { name: /Malaria/ }).click();
  await expect(page.locator(".sidebar")).not.toHaveClass(/is-open/);
  await expect(page.locator(".library-header h1")).toHaveText("Malaria");
  await expect(page.locator(".section-card").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/library-mobile.png", fullPage: true });
  await page.locator(".card-open").first().click();
  await expect(page.locator(".source-content")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("source assets and every section are reachable", async ({ request }) => {
  const response = await request.get("/data/catalog.json");
  expect(response.ok()).toBe(true);
  const catalog = await response.json();
  expect(catalog.metadata.stats.chapters).toBe(27);
  const source = await request.head(catalog.metadata.sourceUrl);
  expect(source.ok()).toBe(true);
  const { sections } = catalog;
  for (let i = 0; i < sections.length; i += 20) {
    const checks = await Promise.all(sections.slice(i, i + 20).map(s => request.get(`/data/sections/${s.id}.json`)));
    for (const section of checks) expect(section.ok()).toBe(true);
  }
});
