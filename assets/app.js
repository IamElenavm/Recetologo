"use strict";

const DATA_INDEX_URL = "data/index.json";

const MEAL_CONFIG = {
  desayuno: { label: "Desayuno", emoji: "🌅" },
  "media-manana": { label: "Media mañana", emoji: "🍎" },
  comida: { label: "Comida", emoji: "🥗" },
  merienda: { label: "Merienda", emoji: "🍊" },
  cena: { label: "Cena", emoji: "🌙" },
};

const CATEGORY_ICONS = {
  "Carnes y pescados": "🥩",
  "Huevos y lácteos": "🥛",
  "Frutas y Verduras": "🥦",
  "Legumbres, Cereales y Conservas": "🌾",
  Despensa: "🫙",
  Congelados: "❄️",
  Otros: "🛒",
};

const state = {
  index: null,
  profile: null,
  plan: null,
  catalog: [],
  activeTab: "recipes",
  quantityScope: "base",
  selectedProfileId: null,
  openCategories: new Set(),
};

const elements = {
  loadingState: document.getElementById("loading-state"),
  loadingText: document.getElementById("loading-text"),
  appContent: document.getElementById("app-content"),
  errorState: document.getElementById("error-state"),
  errorMessage: document.getElementById("error-message"),
  retryButton: document.getElementById("retry-button"),

  homeButton: document.getElementById("home-button"),
  homePage: document.getElementById("home-page"),
  homeProfilesGrid: document.getElementById("home-profiles-grid"),
  profilePlansPage: document.getElementById("profile-plans-page"),
  profilePlansTitle: document.getElementById("profile-plans-title"),
  profilePlansDescription: document.getElementById("profile-plans-description"),
  profilePlansList: document.getElementById("profile-plans-list"),
  backToHomeButton: document.getElementById("back-to-home-button"),
  backToProfilePlansButton: document.getElementById(
    "back-to-profile-plans-button",
  ),

  planTitle: document.getElementById("plan-title"),
  planDaysCount: document.getElementById("plan-days-count"),

  menuSummary: document.getElementById("menu-summary"),
  recipesContainer: document.getElementById("recipes-container"),
  quantityScope: document.getElementById("quantity-scope"),
  planPeopleOption: document.getElementById("plan-people-option"),
  menuContainer: document.getElementById("menu-container"),
  shoppingContainer: document.getElementById("shopping-container"),
  shoppingProgressText: document.getElementById("shopping-progress-text"),
  shoppingProgressPercent: document.getElementById("shopping-progress-percent"),
  shoppingProgressBar: document.getElementById("shopping-progress-bar"),
  resetShoppingButton: document.getElementById("reset-shopping-button"),

  openSelectorButton: document.getElementById("open-selector-button"),
  closeSelectorButton: document.getElementById("close-selector-button"),
  selectorOverlay: document.getElementById("selector-overlay"),
  selectorModal: document.getElementById("plan-selector-modal"),
  profilesList: document.getElementById("profiles-list"),
  plansList: document.getElementById("plans-list"),
  
  printMenuButton: document.getElementById("print-menu-button"),
  printShoppingButton: document.getElementById("print-shopping-button"),
  printMenuArea: document.getElementById("print-menu-area"),
  printShoppingArea: document.getElementById("print-shopping-area"),
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindEvents();
  await loadApplication();
}

function bindEvents() {
  document.querySelectorAll("[data-tab-target]").forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.tabTarget));
  });

  document.querySelectorAll("[data-quantity-scope]").forEach((button) => {
    button.addEventListener("click", () => {
      const openGroup = elements.recipesContainer
        .querySelector(".recipe-group[open]")?.dataset.recipeGroup;

      const openRecipe = elements.recipesContainer
        .querySelector(".catalog-recipe[open]")?.dataset.recipeDetails;

      state.quantityScope = button.dataset.quantityScope;
      updateQuantityScope();
      renderRecipes();

      if (openGroup) {
        const group = [...elements.recipesContainer
          .querySelectorAll("[data-recipe-group]")]
          .find((item) => item.dataset.recipeGroup === openGroup);
        if (group) group.open = true;
      }

      if (openRecipe) {
        const recipe = [...elements.recipesContainer
          .querySelectorAll("[data-recipe-details]")]
          .find((item) => item.dataset.recipeDetails === openRecipe);
        if (recipe) recipe.open = true;
      }
    });
  });

  elements.openSelectorButton.addEventListener("click", openSelector);

  elements.closeSelectorButton.addEventListener("click", closeSelector);
  elements.selectorOverlay.addEventListener("click", closeSelector);

  elements.retryButton.addEventListener("click", loadApplication);
  elements.homeButton.addEventListener("click", showHomePage);
  elements.backToHomeButton.addEventListener("click", showHomePage);

  elements.backToProfilePlansButton.addEventListener("click", () => {
    if (state.profile) {
      showProfilePlansPage(state.profile.id);
    } else {
      showHomePage();
    }
  });

  elements.resetShoppingButton.addEventListener("click", resetShoppingChecks);
  elements.printMenuButton.addEventListener("click", printMenu);
  elements.printShoppingButton.addEventListener("click", printShopping);

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    if (elements.selectorModal.classList.contains("is-open")) {
      closeSelector();
    }
  });
  elements.recipesContainer.addEventListener("toggle", (event) => {
  const opened = event.target;

  if (
    !opened.matches?.("[data-recipe-details]") ||
    !opened.open
  ) return;

  elements.recipesContainer
    .querySelectorAll("[data-recipe-details]")
    .forEach((details) => {
      if (details !== opened) details.open = false;
    });
}, true);
}

async function loadApplication() {
  try {
    showLoading("Cargando tu plan nutricional…");

    const index = await fetchJson(DATA_INDEX_URL);
    validateIndex(index);

    state.index = index;
    renderHomePage();

    elements.loadingState.classList.add("is-hidden");
    elements.errorState.classList.add("is-hidden");
    showHomePage();
  } catch (error) {
    console.error("Error al cargar la aplicación:", error);
    showError(
      "No se ha podido cargar el plan. Comprueba que el repositorio contiene data/index.json y los archivos JSON del plan.",
    );
  }
}

function showHomePage() {
  closeSelector();

  elements.homePage.classList.remove("is-hidden");
  elements.profilePlansPage.classList.add("is-hidden");
  elements.appContent.classList.add("is-hidden");
}

function renderHomePage() {
  if (!state.index) return;

  elements.homeProfilesGrid.innerHTML = state.index.profiles
    .map((profile) => {
      const peopleCount = profile.id === "elena-ruben" ? 2 : 1;
      const icon = peopleCount > 1 ? "👥" : "🌿";
      const plansCount = profile.plans.length;

      return `
        <button
          class="profile-app-card"
          type="button"
          data-home-profile-id="${escapeAttribute(profile.id)}"
          aria-label="Abrir perfil ${escapeAttribute(profile.name)}"
        >
          <span class="profile-app-card__icon" aria-hidden="true">${icon}</span>
          <span class="profile-app-card__name">${escapeHtml(profile.name)}</span>
          <span class="profile-app-card__meta">
            ${pluralize(plansCount, "plan disponible", "planes disponibles")}
          </span>
        </button>
      `;
    })
    .join("");

  elements.homeProfilesGrid
    .querySelectorAll("[data-home-profile-id]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        showProfilePlansPage(button.dataset.homeProfileId);
      });
    });
}

function showProfilePlansPage(profileId) {
  const profile = state.index?.profiles.find((item) => item.id === profileId);

  if (!profile) {
    showHomePage();
    return;
  }

  closeSelector();

  state.selectedProfileId = profile.id;

  elements.profilePlansTitle.textContent = profile.name;
  elements.profilePlansDescription.textContent =
    profile.description || "Selecciona un plan para consultarlo.";

  elements.profilePlansList.innerHTML = [...profile.plans]
    .sort((a, b) => Number(b.order) - Number(a.order))
    .map(
      (plan) => `
        <button
          class="profile-plan-card"
          type="button"
          data-home-plan-id="${escapeAttribute(plan.id)}"
          data-home-plan-profile-id="${escapeAttribute(profile.id)}"
        >
          <span class="profile-plan-card__icon" aria-hidden="true">📅</span>
          <span class="profile-plan-card__content">
            <span class="profile-plan-card__title">${escapeHtml(plan.title)}</span>
            ${
              plan.periodLabel
                ? `<span class="profile-plan-card__meta">${escapeHtml(
                    plan.periodLabel,
                  )}</span>`
                : ""
            }
          </span>
          <span class="profile-plan-card__arrow" aria-hidden="true">›</span>
        </button>
      `,
    )
    .join("");

  elements.profilePlansList
    .querySelectorAll("[data-home-plan-id]")
    .forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          await selectPlan(
            button.dataset.homePlanProfileId,
            button.dataset.homePlanId,
            false,
          );
        } catch (error) {
          console.error(error);
          showError("No se ha podido abrir el plan seleccionado.");
        }
      });
    });

  elements.homePage.classList.add("is-hidden");
  elements.profilePlansPage.classList.remove("is-hidden");
  elements.appContent.classList.add("is-hidden");
}

async function selectPlan(profileId, planId, shouldCloseSelector = true) {
  const profile = state.index.profiles.find((item) => item.id === profileId);

  if (!profile) {
    throw new Error(`No existe el perfil "${profileId}".`);
  }

  const planReference = profile.plans.find((item) => item.id === planId);

  if (!planReference) {
    throw new Error(
      `No existe el plan "${planId}" en el perfil "${profileId}".`,
    );
  }

  showLoading("Cargando el plan seleccionado…");

  const plan = await fetchJson(planReference.file);
  validatePlan(plan);

  state.profile = profile;
  state.plan = plan;
  state.catalog = buildRecipeCatalog(plan);
  state.activeTab = "recipes";
  state.quantityScope = "base";
  state.selectedProfileId = profile.id;
  state.openCategories = new Set(
    getShoppingCategories(plan).map((category) => category.category),
  );

  saveSelection(profile.id, planReference.id);

  renderPlan();
  renderSelector();

  elements.homePage.classList.add("is-hidden");
  elements.profilePlansPage.classList.add("is-hidden");
  elements.appContent.classList.remove("is-hidden");

  if (shouldCloseSelector) {
    closeSelector();
  }

  elements.loadingState.classList.add("is-hidden");
  elements.errorState.classList.add("is-hidden");
}

function renderPlan() {
  renderPlanHeader();
  elements.planPeopleOption.textContent =
    `${state.plan.people.length} P`;
  updateQuantityScope();
  renderRecipes();
  renderMenu();
  renderShopping();
  switchTab(state.activeTab, false);
}

function updateQuantityScope() {
  document.querySelectorAll("[data-quantity-scope]").forEach((button) => {
    const selected = button.dataset.quantityScope === state.quantityScope;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function renderPlanHeader() {
  elements.planTitle.textContent = state.plan.title;
  elements.planDaysCount.textContent =
    `Plan de ${pluralize(state.plan.days.length, "día", "días")}`;
}

function renderRecipes() {
  const slots = [
    ["desayuno", "Desayunos"],
    ["media-manana", "Medias mañanas"],
    ["comida", "Comidas"],
    ["merienda", "Meriendas"],
    ["cena", "Cenas"]
  ];

  const mealPrep = state.catalog.filter((entry) =>
    entry.recipe.steps?.some((step) => Number(step.order) === 0)
  );

  const groups = [];

  if (mealPrep.length) {
    groups.push(`
      <details class="recipe-group" data-recipe-group="meal-prep">
        <summary>🧺 Meal Prep <small>${mealPrep.length}</small></summary>
        <div class="recipe-group__body">
          ${mealPrep.map((entry) => {
            const step = entry.recipe.steps.find(
              (item) => Number(item.order) === 0
            );

            return `
              <article class="meal-prep-card">
                <strong>${escapeHtml(entry.recipe.name)}</strong>
                <div class="meal-prep-card__step">
                  ${renderStep(step, entry)}
                </div>
                <button type="button" data-open-recipe="${escapeAttribute(entry.recipe.id)}">
                  Ver receta →
                </button>
              </article>
            `;
          }).join("")}
        </div>
      </details>
    `);
  }

  for (const [slot, label] of slots) {
    const entries = state.catalog.filter((entry) => entry.slot === slot);
    if (!entries.length) continue;

    groups.push(`
      <details class="recipe-group" data-recipe-group="${slot}">
        <summary>${escapeHtml(label)} <small>${entries.length}</small></summary>
        <div class="recipe-group__body">
          ${entries.map(renderCatalogRecipe).join("")}
        </div>
      </details>
    `);
  }

  elements.recipesContainer.innerHTML = groups.join("");

  elements.recipesContainer
    .querySelectorAll("[data-open-recipe]")
    .forEach((button) => {
      button.addEventListener("click", () =>
        openCatalogRecipe(button.dataset.openRecipe)
      );
    });

  elements.recipesContainer
    .querySelectorAll("[data-go-day]")
    .forEach((button) => {
      button.addEventListener("click", () =>
        goToMenuDay(button.dataset.goDay)
      );
    });
}

function renderCatalogRecipe(entry) {
  return `
    <details class="catalog-recipe"
      data-recipe-details="${escapeAttribute(entry.recipe.id)}">
      <summary>
        <span>${escapeHtml(entry.recipe.emoji || "🍽️")}</span>
        <strong>${escapeHtml(entry.recipe.name)}</strong>
        <span aria-hidden="true">⌄</span>
      </summary>
      <div class="catalog-recipe__body">
        ${renderCatalogRecipeBody(entry)}
      </div>
    </details>
  `;
}

function renderCatalogRecipeBody(entry, printable = false) {
  const recipe = entry.recipe;
  const basePerson = getBasePerson(state.plan);
  const scope = printable ? "total" : state.quantityScope;
  const displayedTotals = calculateRecipeTotals(entry, state.plan, scope);
  const quantityLabel = scope === "base"
    ? `Cantidad · 1 P (${basePerson.name})`
    : scope === "people"
      ? `Cantidad · ${state.plan.people.length} P`
      : "Cantidad · Total";
  const macros = recipe.macrosByPerson?.[basePerson.id];
  const macroLabels = [];

  if (macros?.kcal !== undefined) {
    macroLabels.push(`${formatNumber(macros.kcal)} kcal`);
  }
  if (macros?.proteinG !== undefined) {
    macroLabels.push(`${formatNumber(macros.proteinG)} g proteína`);
  }
  if (macros?.carbsG !== undefined) {
    macroLabels.push(`${formatNumber(macros.carbsG)} g hidratos`);
  }
  if (macros?.fatG !== undefined) {
    macroLabels.push(`${formatNumber(macros.fatG)} g grasas`);
  }
  if (macros?.fiberG !== undefined) {
    macroLabels.push(`${formatNumber(macros.fiberG)} g fibra`);
  }

  const rows = [...displayedTotals.values()]
    .filter((item) => item.quantity > 0 || item.nonQuantifiable)
    .sort((a, b) => a.name.localeCompare(b.name, "es"))
    .map((item) => `
      <tr>
        <td>${escapeHtml(item.name)}
          ${item.forPerson ? `<small> · ${escapeHtml(item.forPerson)}</small>` : ""}
        </td>
        <td>${escapeHtml(item.nonQuantifiable
          ? "al gusto"
          : formatIngredientQuantity(item.quantity, item.unit))}
        </td>
      </tr>
    `).join("");

  const steps = [...(recipe.steps || [])]
    .sort((a, b) => Number(a.order) - Number(b.order))
    .map((step) => renderStep(step, entry, scope, displayedTotals))
    .join("");

  const days = [...entry.dayIds].map((dayId) => {
    const dayIndex = state.plan.days.findIndex((day) => day.id === dayId);
    const label = state.plan.days[dayIndex]?.label || `Día ${dayIndex + 1}`;

    return printable
      ? `<span>${escapeHtml(label)}</span>`
      : `<button type="button" data-go-day="${escapeAttribute(dayId)}">
          ${escapeHtml(label)} →
        </button>`;
  }).join("");

  return `
    ${Number.isFinite(recipe.timeMinutes)
      ? `<p class="catalog-recipe__meta">⏱ ${recipe.timeMinutes} min</p>`
      : ""}
    ${macroLabels.length
      ? `<p class="catalog-recipe__meta">
          Valores por ración de ${escapeHtml(basePerson.name)} (base):
          ${escapeHtml(macroLabels.join(" · "))}
        </p>`
      : ""}
    <section class="recipe-section">
      <h3 class="recipe-section-title">🧂 Ingredientes · preparación completa</h3>
      <div class="ingredients-table-wrapper">
        <table class="ingredients-table">
          <thead>
            <tr>
              <th>Ingrediente</th>
              <th>${escapeHtml(quantityLabel)}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>
    ${steps ? `
      <section class="recipe-section">
        <h3 class="recipe-section-title">👩‍🍳 Preparación</h3>
        <div class="recipe-steps">${steps}</div>
      </section>
    ` : ""}
    ${(recipe.notes || []).length ? `
      <section class="recipe-section">
        <h3 class="recipe-section-title">💡 Notas</h3>
        <ul class="notes-list">
          ${recipe.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}
        </ul>
      </section>
    ` : ""}
    <div class="recipe-days">
      <strong>Se utiliza en:</strong> ${days}
    </div>
  `;
}

function renderStep(
  step,
  entry,
  scope = state.quantityScope,
  displayedTotals = calculateRecipeTotals(entry, state.plan, scope)
) {
  const variants = scope === "base"
    ? []
    : state.plan.people.flatMap((person) => {
        const variant = (entry.recipe.variantsByPerson?.[person.id] || [])
          .find((item) => Number(item.order) === Number(step.order));

        return variant ? [{ person, variant }] : [];
      });

  const number = Number(step.order);
  const generalLabel = variants.length
    ? `${number}a · General`
    : number === 0 ? "Paso 0 · Meal prep" : `Paso ${number}`;

  const generalText = replaceIngredientTokens(
    step.text,
    displayedTotals
  );

  return `
    <div class="recipe-step">
      <strong>${generalLabel}</strong>
      <div>${formatStepText(generalText)}</div>
      ${variants.map(({ person, variant }, index) => {
        const letter = String.fromCharCode(98 + index);
        const text = replaceIngredientTokens(
          variant.text,
          displayedTotals,
          person.id
        );

        return `
          <div class="recipe-step__variant">
            <strong>${number}${letter} · ${escapeHtml(person.name)}</strong>
            <div>${formatStepText(text)}</div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderMenu() {
  const slots = [
    ["desayuno", "Desayuno"],
    ["media-manana", "Media mañana"],
    ["comida", "Comida"],
    ["merienda", "Merienda"],
    ["cena", "Cena"]
  ];

  const days = state.plan.days;
  const mealCount = getMealCount(state.plan);

  elements.menuSummary.textContent =
    `${pluralize(days.length, "día", "días")} · ` +
    `${pluralize(mealCount, "comida", "comidas")}`;

  const desktop = `
    <div class="menu-matrix-scroll">
      <div class="menu-matrix"
        style="--menu-days:${days.length}">
        <div class="menu-matrix__heading">Comida</div>
        ${days.map((day, index) => `
          <div class="menu-matrix__heading"
            id="menu-day-grid-${escapeAttribute(day.id)}">
            ${escapeHtml(day.label || `Día ${index + 1}`)}
          </div>
        `).join("")}
        ${slots.map(([slot, label]) => `
          <div class="menu-matrix__slot">${escapeHtml(label)}</div>
          ${days.map((day) => `
            <div class="menu-matrix__cell">
              ${renderMenuMeals(day, slot)}
            </div>
          `).join("")}
        `).join("")}
      </div>
    </div>
  `;

  const mobile = `
    <div class="menu-mobile">
      ${days.map((day, index) => `
        <section class="menu-mobile__day"
          id="menu-day-mobile-${escapeAttribute(day.id)}">
          <h3>${escapeHtml(day.label || `Día ${index + 1}`)}</h3>
          ${slots
            .filter(([slot]) =>
              (day.meals || []).some((meal) => meal.slot === slot)
            )
            .map(([slot, label]) => `
              <div class="menu-mobile__row">
                <strong>${escapeHtml(label)}</strong>
                ${renderMenuMeals(day, slot)}
              </div>
            `).join("")}
        </section>
      `).join("")}
    </div>
  `;

  elements.menuContainer.innerHTML = desktop + mobile;

  elements.menuContainer
    .querySelectorAll("[data-menu-recipe]")
    .forEach((button) => {
      button.addEventListener("click", () =>
        openCatalogRecipe(button.dataset.menuRecipe)
      );
    });
}

function renderMenuMeals(day, slot) {
  const meals = (day.meals || []).filter((meal) => meal.slot === slot);

  if (!meals.length) return `<span class="menu-empty">—</span>`;

  return meals.map((meal) => {
    if (!meal.recipe?.id) return "";

    return `
      <button class="menu-recipe-link" type="button"
        data-menu-recipe="${escapeAttribute(meal.recipe.id)}">
        ${escapeHtml(meal.recipe.emoji || "🍽️")}
        ${escapeHtml(meal.recipe.name)}
      </button>
    `;
  }).join("");
}

function openCatalogRecipe(recipeId) {
  const entry = state.catalog.find((item) => item.recipe.id === recipeId);
  if (!entry) return;

  switchTab("recipes");

  const group = [...elements.recipesContainer
    .querySelectorAll("[data-recipe-group]")]
    .find((item) => item.dataset.recipeGroup === entry.slot);

  const recipeDetails = [...elements.recipesContainer
    .querySelectorAll("[data-recipe-details]")]
    .find((item) => item.dataset.recipeDetails === recipeId);

  if (!group || !recipeDetails) return;

  elements.recipesContainer
    .querySelectorAll("[data-recipe-details]")
    .forEach((details) => { details.open = false; });

  group.open = true;
  recipeDetails.open = true;

  requestAnimationFrame(() => {
    recipeDetails.scrollIntoView({ behavior: "smooth", block: "start" });
    recipeDetails.querySelector("summary")?.focus();
  });
}

function goToMenuDay(dayId) {
  switchTab("menu");

  const prefix = window.matchMedia("(min-width: 740px)").matches
    ? "menu-day-grid-"
    : "menu-day-mobile-";

  requestAnimationFrame(() => {
    document.getElementById(prefix + dayId)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function renderShopping() {
  const categories = getShoppingCategories(state.plan);
  const checkState = getShoppingCheckState();

  const allItems = categories.flatMap((category) => category.items);
  const checkedCount = allItems.filter((item) =>
    Boolean(checkState[item.key]),
  ).length;
  const totalCount = allItems.length;
  const percentage = totalCount
    ? Math.round((checkedCount / totalCount) * 100)
    : 0;

  elements.shoppingProgressText.textContent = `${checkedCount} de ${totalCount} productos marcados`;
  elements.shoppingProgressPercent.textContent = `${percentage}%`;
  elements.shoppingProgressBar.style.width = `${percentage}%`;
  elements.shoppingProgressBar.parentElement.setAttribute(
    "aria-valuenow",
    String(percentage),
  );

  elements.shoppingContainer.innerHTML = categories
    .map((category) => renderShoppingCategory(category, checkState))
    .join("");

  elements.shoppingContainer
    .querySelectorAll("[data-category-toggle]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const categoryName = button.dataset.categoryToggle;

        if (state.openCategories.has(categoryName)) {
          state.openCategories.delete(categoryName);
        } else {
          state.openCategories.add(categoryName);
        }

        renderShopping();
      });
    });

  elements.shoppingContainer
    .querySelectorAll("[data-shopping-key]")
    .forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        setShoppingItemChecked(checkbox.dataset.shoppingKey, checkbox.checked);
        renderShopping();
      });
    });
}

function renderShoppingCategory(category, checkState) {
  const isOpen = state.openCategories.has(category.category);
  const checkedCount = category.items.filter((item) =>
    Boolean(checkState[item.key]),
  ).length;

  return `
    <section class="shopping-category ${isOpen ? "is-open" : ""}">
      <button
        class="shopping-category__header"
        type="button"
        data-category-toggle="${escapeAttribute(category.category)}"
        aria-expanded="${isOpen}"
      >
        <span class="category-title">
          <span aria-hidden="true">${CATEGORY_ICONS[category.category] || "🛒"}</span>
          <span>${escapeHtml(category.category)}</span>
          <span class="category-count">${checkedCount}/${category.items.length}</span>
        </span>
        <span class="category-chevron" aria-hidden="true">⌄</span>
      </button>

      <div class="shopping-category__body">
        ${category.items
          .map((item) => renderShoppingItem(item, checkState[item.key]))
          .join("")}
      </div>
    </section>
  `;
}

function renderShoppingItem(item, isChecked) {
  return `
    <label class="shopping-item ${isChecked ? "is-checked" : ""}">
      <input
        class="shopping-checkbox"
        type="checkbox"
        data-shopping-key="${escapeAttribute(item.key)}"
        ${isChecked ? "checked" : ""}
      >

      <span class="shopping-item__info">
        <span class="shopping-item__name">${escapeHtml(item.name)}</span>
        <span class="shopping-item__quantity">${escapeHtml(item.quantityLabel)}</span>
      </span>
    </label>
  `;
}

function buildRecipeCatalog(plan) {
  const byId = new Map();

  plan.days.forEach((day) => {
    (day.meals || []).forEach((meal) => {
      if (!meal.recipe?.id) return;

      const id = meal.recipe.id;

      if (!byId.has(id)) {
        byId.set(id, {
          slot: meal.slot,
          recipe: meal.recipe,
          appearances: [],
          dayIds: new Set()
        });
      }

      const entry = byId.get(id);

      if (entry.slot !== meal.slot) {
        throw new Error(
          `La receta "${id}" aparece en comidas distintas. Usa IDs diferentes.`
        );
      }

      entry.appearances.push(meal.recipe);
      entry.dayIds.add(day.id);
    });
  });

  return [...byId.values()].map((entry) => {
    entry.totals = calculateRecipeTotals(entry, plan);
    return entry;
  });
}

function calculateRecipeTotals(entry, plan, scope = "total") {
  const totals = new Map();
  const appearances = scope === "total"
    ? entry.appearances
    : entry.appearances.slice(0, 1);

  const people = scope === "base"
    ? [getBasePerson(plan)]
    : plan.people;

  function addIngredient(ingredient, amount, person = null) {
    const key = [
      person?.id || "general",
      ingredient.id,
      ingredient.unit || "",
      ingredient.category || "Otros"
    ].join("|");

    if (!totals.has(key)) {
      totals.set(key, {
        id: ingredient.id,
        name: ingredient.name,
        category: ingredient.category || "Otros",
        unit: ingredient.unit || "",
        quantity: 0,
        forPerson: person?.name || null,
        forPersonId: person?.id || null,
        nonQuantifiable: isNonQuantifiable(ingredient)
      });
    }

    const item = totals.get(key);
    if (!item.nonQuantifiable) item.quantity += amount;
  }

  appearances.forEach((recipe) => {
    const removedByPerson = new Map();

    people.forEach((person) => {
      const variants = recipe.variantsByPerson?.[person.id] || [];

      removedByPerson.set(
        person.id,
        new Set(variants.flatMap(
          (variant) => variant.removeIngredientIds || []
        ))
      );

      variants.forEach((variant) => {
        (variant.ingredients || []).forEach((ingredient) => {
          addIngredient(
            ingredient,
            Number(ingredient.baseQuantity) || 0,
            person
          );
        });
      });
    });

    (recipe.ingredients || []).forEach((ingredient) => {
      const consumers = people.filter((person) =>
        !removedByPerson.get(person.id)?.has(ingredient.id)
      ).length;

      if (consumers > 0) {
        addIngredient(
          ingredient,
          (Number(ingredient.baseQuantity) || 0) * consumers
        );
      }
    });
  });

  return totals;
}

function getShoppingCategories(plan) {
  const shoppingItems = new Map();

  state.catalog.forEach((entry) => {
    entry.totals.forEach((ingredient) => {
      if (!ingredient.nonQuantifiable && ingredient.quantity <= 0) return;
      const key = [
        slugify(ingredient.name),
        ingredient.unit,
        ingredient.category
      ].join("|");

      if (!shoppingItems.has(key)) {
        shoppingItems.set(key, {
          key,
          name: ingredient.name,
          category: ingredient.category,
          unit: ingredient.unit,
          quantity: 0,
          nonQuantifiable: ingredient.nonQuantifiable
        });
      }

      shoppingItems.get(key).quantity += ingredient.quantity;
    });
  });

  const grouped = new Map();

  [...shoppingItems.values()]
    .sort((a, b) => a.name.localeCompare(b.name, "es"))
    .forEach((item) => {
      if (!grouped.has(item.category)) grouped.set(item.category, []);

      grouped.get(item.category).push({
        ...item,
        quantityLabel: item.nonQuantifiable
          ? "al gusto"
          : formatIngredientQuantity(item.quantity, item.unit)
      });
    });

  return [...grouped.entries()]
    .sort(([a], [b]) => sortCategories(a, b))
    .map(([category, items]) => ({ category, items }));
}

function isNonQuantifiable(ingredient) {
  return (
    ingredient.unit === "al gusto" ||
    ingredient.baseQuantity === null ||
    ingredient.baseQuantity === undefined
  );
}

function replaceIngredientTokens(text, totals, personId = null) {
  if (typeof text !== "string") return "";

  return text.replace(
    /\{\{([a-z0-9-]+)\.total\}\}/gi,
    (match, ingredientId) => {
      const items = [...totals.values()];

      const ingredient = (
        personId
          ? items.find((item) =>
              item.id === ingredientId &&
              item.forPersonId === personId
            )
          : null
      ) || items.find((item) =>
        item.id === ingredientId && !item.forPersonId
      );

      if (!ingredient) return match;

      return ingredient.nonQuantifiable
        ? "al gusto"
        : formatIngredientQuantity(
            ingredient.quantity,
            ingredient.unit
          );
    }
  );
}

function formatStepText(text) {
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
}

function switchTab(tabName, shouldRender = true) {
  state.activeTab = tabName;
  elements.quantityScope.hidden = tabName === "shopping";

  document.querySelectorAll("[data-tab-target]").forEach((button) => {
    const isActive = button.dataset.tabTarget === tabName;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  document.querySelectorAll("[data-tab-panel]").forEach((panel) => {
    const isActive = panel.dataset.tabPanel === tabName;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  });

  if (shouldRender && tabName === "shopping") {
    renderShopping();
  }
}

function openSelector() {
  renderSelector();

  elements.selectorOverlay.classList.add("is-open");
  elements.selectorOverlay.setAttribute("aria-hidden", "false");

  elements.selectorModal.classList.add("is-open");
  elements.selectorModal.setAttribute("aria-hidden", "false");

  elements.profilesList.querySelector(".is-selected")?.focus();
}

function closeSelector() {
  elements.selectorOverlay.classList.remove("is-open");
  elements.selectorOverlay.setAttribute("aria-hidden", "true");

  elements.selectorModal.classList.remove("is-open");
  elements.selectorModal.setAttribute("aria-hidden", "true");
}

function renderSelector() {
  if (!state.index) return;

  const selectedProfile =
    state.index.profiles.find(
      (profile) => profile.id === state.selectedProfileId,
    ) || state.index.profiles[0];

  elements.profilesList.innerHTML = `
    <p class="selector-section-label">Perfiles</p>
    ${state.index.profiles
      .map((profile) => {
        const isSelected = selectedProfile.id === profile.id;

        return `
          <button
            class="profile-option ${isSelected ? "is-selected" : ""}"
            type="button"
            data-profile-id="${escapeAttribute(profile.id)}"
          >
            <span class="profile-option__name">${escapeHtml(profile.name)}</span>
            ${
              profile.description
                ? `<span class="profile-option__description">${escapeHtml(
                    profile.description,
                  )}</span>`
                : ""
            }
          </button>
        `;
      })
      .join("")}
  `;

  elements.plansList.innerHTML = `
    <p class="selector-section-label">Planes disponibles</p>
    ${[...selectedProfile.plans]
      .sort((a, b) => Number(b.order) - Number(a.order))
      .map((plan) => {
        const isCurrent =
          state.profile?.id === selectedProfile.id &&
          state.plan?.id === plan.id;

        return `
          <button
            class="plan-option ${isCurrent ? "is-selected" : ""}"
            type="button"
            data-plan-id="${escapeAttribute(plan.id)}"
            data-plan-profile-id="${escapeAttribute(selectedProfile.id)}"
          >
            <span class="plan-option__name">${escapeHtml(plan.title)}</span>
            ${
              plan.periodLabel
                ? `<span class="plan-option__description">${escapeHtml(
                    plan.periodLabel,
                  )}</span>`
                : ""
            }
          </button>
        `;
      })
      .join("")}
  `;

  elements.profilesList
    .querySelectorAll("[data-profile-id]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedProfileId = button.dataset.profileId;
        renderSelector();
      });
    });

  elements.plansList.querySelectorAll("[data-plan-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await selectPlan(
          button.dataset.planProfileId,
          button.dataset.planId,
          true,
        );
      } catch (error) {
        console.error(error);
        showError("No se ha podido abrir el plan seleccionado.");
      }
    });
  });
}

function resetShoppingChecks() {
  if (!state.profile || !state.plan) return;

  const confirmed = window.confirm(
    "¿Quieres desmarcar todos los productos de esta lista de compra?",
  );

  if (!confirmed) return;

  localStorage.removeItem(getShoppingStorageKey());
  renderShopping();
}

function getShoppingCheckState() {
  try {
    return JSON.parse(localStorage.getItem(getShoppingStorageKey()) || "{}");
  } catch {
    return {};
  }
}

function setShoppingItemChecked(key, checked) {
  const checkState = getShoppingCheckState();

  if (checked) {
    checkState[key] = true;
  } else {
    delete checkState[key];
  }

  localStorage.setItem(getShoppingStorageKey(), JSON.stringify(checkState));
}

function getShoppingStorageKey() {
  return `nutrition-shopping:${state.profile?.id || "unknown"}:${
    state.plan?.id || "unknown"
  }`;
}

function printMenu() {
  if (!state.plan || !state.profile) return;

  const slots = [
    ["desayuno", "Desayuno"],
    ["media-manana", "Media mañana"],
    ["comida", "Comida"],
    ["merienda", "Merienda"],
    ["cena", "Cena"]
  ];

  const groups = [
    ["meal-prep", "Meal Prep",
      state.catalog.filter((entry) =>
        entry.recipe.steps?.some((step) => Number(step.order) === 0)
      )],
    ...slots.map(([slot, label]) => [
      slot,
      label,
      state.catalog.filter((entry) => entry.slot === slot)
    ])
  ].filter(([, , entries]) => entries.length);

  elements.printShoppingArea.innerHTML = "";
  elements.printMenuArea.innerHTML = `
    <article class="print-document">
      ${renderPrintHeader("Menú y recetas", state.plan.title)}

      <section class="print-menu-grid">
        <h2>Menú</h2>
        <table>
          <thead>
            <tr>
              <th>Día</th>
              ${slots.map(([, label]) =>
                `<th>${escapeHtml(label)}</th>`
              ).join("")}
            </tr>
          </thead>
          <tbody>
            ${state.plan.days.map((day, index) => `
              <tr>
                <th>${escapeHtml(day.label || `Día ${index + 1}`)}</th>
                ${slots.map(([slot]) => `
                  <td>${(day.meals || [])
                    .filter((meal) => meal.slot === slot)
                    .map((meal) =>
                      escapeHtml(meal.recipe?.name || "")
                    ).join("<br>")}</td>
                `).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </section>

      ${groups.map(([slot, label, entries]) => `
        <section class="print-recipe-group">
          <h2>${escapeHtml(label)}</h2>
          ${entries.map((entry) => {
            if (slot === "meal-prep") {
              const step = entry.recipe.steps.find(
                (item) => Number(item.order) === 0
              );

              return `
                <article class="print-recipe">
                  <h3>${escapeHtml(entry.recipe.name)}</h3>
                  ${renderStep(step, entry, "total")}
                </article>
              `;
            }

            return `
              <article class="print-recipe">
                <h3>${escapeHtml(entry.recipe.name)}</h3>
                ${renderCatalogRecipeBody(entry, true)}
              </article>
            `;
          }).join("")}
        </section>
      `).join("")}
    </article>
  `;

  window.print();
}

function printShopping() {
  if (!state.plan || !state.profile) return;

  const categories = getShoppingCategories(state.plan);

  elements.printMenuArea.innerHTML = "";
  elements.printShoppingArea.innerHTML = `
    <article class="print-document">
      ${renderPrintHeader("Lista consolidada", state.plan.title)}
      ${categories.map((category) => {
        const half = Math.ceil(category.items.length / 2);
        const columns = [
          category.items.slice(0, half),
          category.items.slice(half)
        ];

        return `
          <section class="print-category">
            <h2>${escapeHtml(category.category)}</h2>
            <div class="print-shopping-cols">
              ${columns.map((items) => `
                <table class="print-shopping-list">
                  <tbody>
                    ${items.map((item) => `
                      <tr>
                        <td>${escapeHtml(item.name)}</td>
                        <td>${escapeHtml(item.quantityLabel)}</td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              `).join("")}
            </div>
          </section>
        `;
      }).join("")}
    </article>
  `;

  window.print();
}

function renderPrintHeader(sectionName, planTitle) {
  return `
    <header class="print-document__header">
      <p class="print-document__eyebrow">${escapeHtml(sectionName)}</p>
      <h1>${escapeHtml(planTitle)}</h1>
      <p class="print-document__subtitle">
        ${escapeHtml(state.profile.name)} ·
        Plan de ${pluralize(state.plan.days.length, "día", "días")}
      </p>
    </header>
  `;
}

function saveSelection(profileId, planId) {
  localStorage.setItem(
    "nutrition-last-selection",
    JSON.stringify({ profileId, planId }),
  );
}

function getBasePerson(plan) {
  return plan.people.find((person) => person.isBase);
}

function getMealCount(plan) {
  return plan.days.reduce((total, day) => total + (day.meals?.length || 0), 0);
}

function pluralize(number, singular, plural) {
  return `${number} ${number === 1 ? singular : plural}`;
}

function formatIngredientQuantity(quantity, unit) {
  if (unit === "al gusto") return "al gusto";

  const normalizedQuantity = Number(quantity);

  if (!Number.isFinite(normalizedQuantity)) {
    return unit || "";
  }

  const displayNumber = new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 2,
  }).format(normalizedQuantity);

  return `${displayNumber}${unit ? ` ${unit}` : ""}`;
}

function formatNumber(value) {
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 1,
  }).format(Number(value));
}

function sortCategories(first, second) {
  const orderedCategories = [
    "Carnes y pescados",
    "Huevos y lácteos",
    "Frutas y Verduras",
    "Legumbres, Cereales y Conservas",
    "Congelados",
    "Despensa",
    "Otros",
  ];

  const firstPosition = orderedCategories.indexOf(first);
  const secondPosition = orderedCategories.indexOf(second);

  if (firstPosition === -1 && secondPosition === -1) {
    return first.localeCompare(second, "es");
  }

  if (firstPosition === -1) return 1;
  if (secondPosition === -1) return -1;

  return firstPosition - secondPosition;
}

function slugify(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`No se ha podido cargar ${url} (${response.status}).`);
  }

  return response.json();
}

function validateIndex(index) {
  if (!index || !Array.isArray(index.profiles) || index.profiles.length === 0) {
    throw new Error("El archivo data/index.json no contiene perfiles válidos.");
  }

  index.profiles.forEach((profile) => {
    if (
      !profile.id ||
      !Array.isArray(profile.plans) ||
      profile.plans.length === 0
    ) {
      throw new Error("Hay un perfil sin planes válidos en data/index.json.");
    }
      profile.plans.forEach((plan) => {
      if (
        plan.order === undefined ||
        plan.order === null ||
        plan.order === "" ||
        !Number.isFinite(Number(plan.order))
      ) {
        throw new Error(
          `Falta un "order" numérico en el plan "${plan.id}".`
        );
      }
    });
  });

}

function validatePlan(plan) {
  if (!plan || !Array.isArray(plan.people) || !Array.isArray(plan.days)) {
    throw new Error("El archivo del plan no tiene una estructura válida.");
  }

  if (plan.people.length < 1 || plan.people.length > 5) {
    throw new Error("Cada plan debe tener entre 1 y 5 personas.");
  }

  const basePeople = plan.people.filter((person) => person.isBase);

  if (basePeople.length !== 1) {
    throw new Error("Cada plan debe tener exactamente una persona base.");
  }
  const baseId = plan.people.find((person) => person.isBase).id;
const validPeople = new Set(plan.people.map((person) => person.id));
const signatures = new Map();

plan.days.forEach((day) => {
  (day.meals || []).forEach((meal) => {
    const recipe = meal.recipe;
    if (!recipe?.id) return;

    if ((recipe.variantsByPerson?.[baseId] || []).length) {
      throw new Error(
        `La persona base tiene una variante en "${recipe.id}".`
      );
    }

    const originalIds = new Set(
      (recipe.ingredients || []).map((ingredient) => ingredient.id)
    );
    const orders = new Set(
      (recipe.steps || []).map((step) => Number(step.order))
    );

    for (const [personId, variants] of
      Object.entries(recipe.variantsByPerson || {})) {
      if (!validPeople.has(personId)) {
        throw new Error(
          `Persona desconocida "${personId}" en "${recipe.id}".`
        );
      }

      variants.forEach((variant) => {
        if (!orders.has(Number(variant.order))) {
          throw new Error(
            `No existe el paso ${variant.order} en "${recipe.id}".`
          );
        }

        (variant.removeIngredientIds || []).forEach((id) => {
          if (!originalIds.has(id)) {
            throw new Error(
              `No existe el ingrediente "${id}" en "${recipe.id}".`
            );
          }
        });
      });
    }

    // Las cantidades pueden variar entre días; la estructura, no.
    const signature = JSON.stringify({
      slot: meal.slot,
      steps: (recipe.steps || []).map(({ order, text }) =>
        [Number(order), text]
      ),
      ingredients: (recipe.ingredients || []).map(({ id, unit }) =>
        [id, unit]
      ),
      variants: Object.entries(recipe.variantsByPerson || {})
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([personId, variants]) => [
          personId,
          variants.map((variant) => [
            Number(variant.order),
            variant.text,
            variant.removeIngredientIds || [],
            (variant.ingredients || []).map(({ id, unit }) => [id, unit])
          ])
        ])
    });

    if (signatures.has(recipe.id) &&
        signatures.get(recipe.id) !== signature) {
      throw new Error(
        `La receta "${recipe.id}" cambia de estructura entre días. ` +
        `Usa otro recipe.id para la versión diferente.`
      );
    }

    signatures.set(recipe.id, signature);
  });
});
}

function showLoading(message) {
  elements.loadingText.textContent = message;
  elements.loadingState.classList.remove("is-hidden");
  elements.errorState.classList.add("is-hidden");
}

function showError(message) {
  elements.loadingState.classList.add("is-hidden");
  elements.homePage.classList.add("is-hidden");
  elements.profilePlansPage.classList.add("is-hidden");
  elements.appContent.classList.add("is-hidden");
  elements.errorMessage.textContent = message;
  elements.errorState.classList.remove("is-hidden");
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value = "") {
  return escapeHtml(value).replace(/`/g, "&#096;");
}
