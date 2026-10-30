import { test, expect } from "@playwright/test";

const cardiac = "/sections/section-body-00570/";
const searchName = "Search guidelines by condition, medicine, or keyword";

test("routes, bookmarks, history, and reader preferences survive reloads", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Guidelines, made accessible." }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: /START HERE.*Emergency conditions/ })
    .click();
  await expect(page).toHaveURL(/\/chapters\/chapter-one\/$/);
  await page
    .getByTestId("section-card")
    .filter({ hasText: "Cardiac Arrest" })
    .getByRole("link")
    .first()
    .click();
  await expect(page).toHaveURL(/\/sections\/section-body-00570\//);
  await expect(page.getByTestId("source-content")).toContainText(
    "Pharmacological Management",
  );
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copy link", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Link copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    cardiac,
  );
  await page.getByRole("button", { name: "Save section", exact: true }).click();
  await page.getByRole("button", { name: "Increase text size" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Saved", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Increase text size" }),
  ).toBeDisabled();
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await nav.getByRole("link", { name: /Saved sections/ }).click();
  await expect(page).toHaveURL(/\/saved\/$/);
  await expect(page.getByTestId("section-card")).toHaveCount(1);
  await page.getByRole("button", { name: /Unsave Cardiac/ }).click();
  await expect(
    page.getByRole("heading", { name: "A place for your go-to references" }),
  ).toBeVisible();
  await nav.getByRole("link", { name: "Recently viewed" }).click();
  await expect(page.getByTestId("section-card").first()).toContainText(
    "Cardiac Arrest",
  );
  await page.getByRole("button", { name: "Clear history" }).click();
  await expect(
    page.getByRole("heading", { name: "Your reading journey starts here" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("full-text search, URL filters, pagination, and search retry work", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("/");
  const input = page.getByRole("searchbox", { name: searchName });
  await expect(input).toBeFocused();
  await input.fill("artemether");
  await expect(page.getByRole("status")).toContainText("matching");
  await expect(
    page.getByTestId("section-card").first().locator("mark").first(),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Filter by content" })
    .selectOption("tables");
  await expect(page).toHaveURL(/content=tables/);
  await page
    .getByTestId("section-card")
    .first()
    .getByRole("link")
    .first()
    .click();
  await expect(page.getByTestId("source-content")).toContainText(/artemether/i);
  await page.getByRole("link", { name: "Back to search results" }).click();
  await expect(input).toHaveValue("artemether");
  await expect(
    page.getByRole("combobox", { name: "Filter by content" }),
  ).toHaveValue("tables");
  await page.reload();
  await expect(input).toHaveValue("artemether");
  await input.fill("zzzz-no-such-clinical-term");
  await expect(
    page.getByRole("heading", { name: "No matching sections" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset search & filters" }).click();
  await expect(input).toHaveValue("");
  await expect(
    page.getByRole("combobox", { name: "Filter by content" }),
  ).toHaveValue("all");
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(
    page.getByRole("navigation", { name: "Results pagination" }),
  ).toContainText("Page 2");
  await expect(page).toHaveURL(/page=2/);
  await page.reload();
  await expect(
    page.getByRole("navigation", { name: "Results pagination" }),
  ).toContainText("Page 2");
  await page.getByRole("button", { name: "List view" }).click();
  await expect(page.getByRole("button", { name: "List view" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.goto("/");
  await page.route("**/data/search-index.json", (route) => route.abort());
  await input.fill("artemether");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Full-text search could not load",
  );
  await page.unroute("**/data/search-index.json");
  await page.getByRole("button", { name: "Retry full-text search" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  await expect(page.getByTestId("section-card").first()).toBeVisible();
});

test("chapter directory, source details, tables, and legacy section links work", async ({
  page,
}) => {
  await page.goto("/chapters/");
  await expect(
    page.getByRole("heading", { name: "Find your specialty." }),
  ).toBeVisible();
  await page.getByRole("searchbox", { name: "Find a chapter" }).fill("malaria");
  await expect(page.getByRole("status")).toHaveText(
    "1 chapter matching “malaria”",
  );
  await page.getByRole("link", { name: /Chapter Five.*Malaria/ }).click();
  await expect(page).toHaveURL(/\/chapters\/chapter-five\/$/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Malaria", exact: true, level: 1 }),
  ).toBeVisible();
  await page.goto("/source/");
  await expect(
    page.getByRole("heading", { name: /One document/ }),
  ).toBeVisible();
  await expect(page.getByRole("main")).toContainText("341 sections");
  await page.goto("/sections/section-body-00415/");
  await expect(page.getByRole("table").first()).toBeVisible();
  await page.screenshot({
    path: "test-results/reader-desktop.png",
    fullPage: false,
  });
  await page.goto("/#section-body-00570");
  await expect(page).toHaveURL(new RegExp(cardiac));
  await expect(page.getByTestId("source-content")).toBeVisible();
  const labels = await page
    .getByTestId("source-content")
    .locator("p")
    .allTextContents();
  expect(
    labels.some((text) => /^(AND|OR)(\s*\/\s*(AND|OR))?$/i.test(text.trim())),
  ).toBe(false);
});

test("mobile navigation, anchors, dark theme, and print layout stay usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByTestId("section-card").first()).toBeVisible();
  await page.screenshot({
    path: "test-results/library-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Open navigation" }).click();
  const menu = page.getByRole("dialog", { name: "Navigation", exact: true });
  await expect(menu).toBeVisible();
  await menu.getByRole("link", { name: "Malaria", exact: true }).click();
  await expect(menu).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Malaria", exact: true, level: 1 }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto(cardiac);
  await page.locator("summary").filter({ hasText: "On this page" }).click();
  await page
    .getByRole("navigation", { name: "On this page" })
    .filter({ visible: true })
    .getByRole("link")
    .first()
    .click();
  await expect(page).toHaveURL(/#body-/);
  await page.reload();
  await expect(page.getByTestId("source-content")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Dark theme" }).click();
  const theme = await page.locator("html").getAttribute("data-theme");
  await page.goto("/sections/section-body-00415/");
  await expect(page.getByRole("table").first()).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const tableRegion = page
    .getByRole("region", { name: /^Source table/ })
    .first();
  expect(
    await tableRegion.evaluate(
      (element) => element.scrollWidth > element.clientWidth,
    ),
  ).toBe(true);
  await page.goto(cardiac);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  await page.emulateMedia({ media: "print" });
  await expect(
    page.getByRole("button", { name: "Print section" }),
  ).not.toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Cardiac Arrest and Cardiopulmonary Resuscitation",
      exact: true,
    }),
  ).toBeVisible();
});

test("every exported section, chapter, and source asset is reachable", async ({
  request,
}) => {
  const catalog = await (await request.get("/data/catalog.json")).json();
  expect(catalog.metadata.stats.chapters).toBe(27);
  expect((await request.head(catalog.metadata.sourceUrl)).ok()).toBe(true);
  const missing = await request.get("/a-page-that-does-not-exist/");
  expect(missing.status()).toBe(404);
  expect(await missing.text()).toContain("This page could not be found.");
  for (const chapter of catalog.chapters)
    expect((await request.get(`/chapters/${chapter.id}/`)).ok()).toBe(true);
  for (let i = 0; i < catalog.sections.length; i += 20) {
    const checks = await Promise.all(
      catalog.sections
        .slice(i, i + 20)
        .map((section) => request.get(`/sections/${section.id}/`)),
    );
    for (const response of checks) expect(response.ok()).toBe(true);
  }
});

test("desktop library and dark theme render without overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.getByTestId("section-card").first()).toBeVisible();
  await page.screenshot({
    path: "test-results/library-desktop.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Dark theme" }).click();
  await page.screenshot({
    path: "test-results/library-dark.png",
    fullPage: true,
  });
});
