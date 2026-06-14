let dailyGoal = 2400;
let proteinGoal = 150;
let carbsGoal = 220;
let fatGoal = 75;
let waterGoalLiters = 2.5;
const meals = [];
let waterMl = 0;
let currentUser = null;
let authToken = localStorage.getItem("calorieCanvasToken") || "";

const authScreen = document.querySelector("#authScreen");
const authForm = document.querySelector("#authForm");
const logoutButton = document.querySelector("#logoutButton");
const onboardingDialog = document.querySelector("#onboardingDialog");
const onboardingForm = document.querySelector("#onboardingForm");
const mealDialog = document.querySelector("#mealDialog");
const mealForm = document.querySelector("#mealForm");
const mealDialogTitle = document.querySelector("#mealDialogTitle");
const mealIdInput = document.querySelector("#mealId");
const closeDialogButton = document.querySelector("#closeDialogButton");
const cancelMealButton = document.querySelector("#cancelMealButton");
const submitMealButton = document.querySelector("#submitMealButton");
const recipeDialog = document.querySelector("#recipeDialog");
const closeRecipeDialogButton = document.querySelector("#closeRecipeDialogButton");
const recipeTag = document.querySelector("#recipeTag");
const recipeTitle = document.querySelector("#recipeTitle");
const recipeStats = document.querySelector("#recipeStats");
const recipeDescription = document.querySelector("#recipeDescription");
const recipeIngredients = document.querySelector("#recipeIngredients");
const recipeInstructions = document.querySelector("#recipeInstructions");
const calorieRing = document.querySelector("#calorieRing");
const navItems = [...document.querySelectorAll("[data-tab-target]")];
const tabPanels = [...document.querySelectorAll("[data-tab-panel]")];
const mealLists = [...document.querySelectorAll("#dashboardMealList, #fullMealList")];
const addMealButtons = [...document.querySelectorAll("[data-open-meal-dialog]")];
const shortcutButtons = [...document.querySelectorAll("[data-tab-shortcut]")];

const consumedCaloriesNodes = [...document.querySelectorAll("[data-consumed-calories]")];
const remainingCaloriesNodes = [...document.querySelectorAll("[data-remaining-calories]")];
const dailyGoalNodes = [...document.querySelectorAll("[data-daily-goal]")];
const proteinSummaryNodes = [...document.querySelectorAll("[data-protein-summary]")];
const proteinInsightNodes = [...document.querySelectorAll("[data-protein-insight]")];
const proteinBarNodes = [...document.querySelectorAll("[data-protein-bar]")];
const carbsSummaryNodes = [...document.querySelectorAll("[data-carbs-summary]")];
const fatSummaryNodes = [...document.querySelectorAll("[data-fat-summary]")];
const waterSummaryNodes = [...document.querySelectorAll("[data-water-summary]")];
const carbsBarNodes = [...document.querySelectorAll("[data-carbs-bar]")];
const fatBarNodes = [...document.querySelectorAll("[data-fat-bar]")];
const waterBarNodes = [...document.querySelectorAll("[data-water-bar]")];
const calorieProgressBar = document.querySelector("[data-calorie-progress-bar]");
const calorieMessage = document.querySelector("[data-calorie-message]");
const progressMessage = document.querySelector("[data-progress-message]");
const proteinProgressMessage = document.querySelector("[data-protein-progress-message]");
const carbsProgressMessage = document.querySelector("[data-carbs-progress-message]");
const fatProgressMessage = document.querySelector("[data-fat-progress-message]");
const waterProgressMessage = document.querySelector("[data-water-progress-message]");
const mealCountNode = document.querySelector("[data-meal-count]");
const paceLabel = document.querySelector("[data-pace-label]");
const saveStatus = document.querySelector("#saveStatus");
const recommendationList = document.querySelector("#recommendationList");
const insightsRecommendationList = document.querySelector("#insightsRecommendationList");
const recommendationSummary = document.querySelector("#recommendationSummary");
const refreshRecommendationsButtons = [
  document.querySelector("#refreshRecommendationsButton"),
  document.querySelector("#refreshInsightsRecommendationsButton"),
].filter(Boolean);
const calorieInsightTitleNodes = [...document.querySelectorAll("[data-calorie-insight-title]")];
const calorieInsightBodyNodes = [...document.querySelectorAll("[data-calorie-insight-body]")];
const proteinInsightBodyNodes = [...document.querySelectorAll("[data-protein-insight-body]")];
const hydrationInsightTitleNodes = [...document.querySelectorAll("[data-hydration-insight-title]")];
const hydrationInsightBodyNodes = [...document.querySelectorAll("[data-hydration-insight-body]")];
const patternInsightTitleNodes = [...document.querySelectorAll("[data-pattern-insight-title]")];
const patternInsightBodyNodes = [...document.querySelectorAll("[data-pattern-insight-body]")];
const waterHeadlineNodes = [...document.querySelectorAll("[data-water-headline]")];
const addWaterButtons = [...document.querySelectorAll("[data-add-water]")];
const resetWaterButton = document.querySelector("[data-reset-water]");
let recommendationsCache = [];
let recommendationRefreshSeed = 0;
let recentRecommendationIds = [];

const formatNumber = (value) => value.toLocaleString();
document.body.classList.add(authToken ? "is-signed-in" : "is-signed-out");

function authHeaders(extra = {}) {
  return {
    ...extra,
    Authorization: `Bearer ${authToken}`,
  };
}

async function authedFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: authHeaders(options.headers || {}),
  });

  if (response.status === 401) {
    authToken = "";
    currentUser = null;
    localStorage.removeItem("calorieCanvasToken");
    document.body.classList.remove("is-signed-in");
    document.body.classList.add("is-signed-out");
  }

  return response;
}

function applyProfile(profile) {
  if (!profile || !profile.goals) {
    return;
  }

  dailyGoal = Number(profile.goals.calories || dailyGoal);
  proteinGoal = Number(profile.goals.protein || proteinGoal);
  carbsGoal = Number(profile.goals.carbs || carbsGoal);
  fatGoal = Number(profile.goals.fat || fatGoal);
  waterGoalLiters = Number(profile.goals.waterLiters || waterGoalLiters);
}

function syncUser(payload) {
  if (payload.user) {
    currentUser = payload.user;
    applyProfile(currentUser.profile);
  }
}

function estimateMacroBreakdown(meal) {
  const proteinCalories = meal.protein * 4;
  const remainingCalories = Math.max(meal.calories - proteinCalories, 0);
  const carbBias = meal.category === "Breakfast" ? 0.62 : meal.category === "Snack" ? 0.52 : 0.48;
  const carbs = Math.round((remainingCalories * carbBias) / 4);
  const fat = Math.max(Math.round((remainingCalories - carbs * 4) / 9), 0);

  return { carbs, fat };
}

function setText(nodes, value) {
  nodes.forEach((node) => {
    node.textContent = value;
  });
}

function setStatus(message, tone = "neutral") {
  saveStatus.textContent = message;
  saveStatus.dataset.tone = tone;
}

function resetMealForm() {
  mealForm.reset();
  mealIdInput.value = "";
  mealDialogTitle.textContent = "Log a new meal";
  submitMealButton.textContent = "Save meal";
}

function openCreateMealDialog() {
  resetMealForm();
  mealDialog.showModal();
}

function openEditMealDialog(mealId) {
  const meal = meals.find((entry) => entry.id === mealId);

  if (!meal) {
    return;
  }

  mealIdInput.value = meal.id;
  mealDialogTitle.textContent = "Update meal";
  submitMealButton.textContent = "Save changes";
  mealForm.elements.mealName.value = meal.name;
  mealForm.elements.mealCategory.value = meal.category;
  mealForm.elements.mealCalories.value = meal.calories;
  mealForm.elements.mealNotes.value = meal.notes;
  mealForm.elements.mealProtein.value = meal.protein;
  mealDialog.showModal();
}

function closeMealDialog() {
  mealDialog.close();
  resetMealForm();
}

function openRecipeDialog(recommendationId) {
  const recommendation = recommendationsCache.find((entry) => entry.id === recommendationId);

  if (!recommendation) {
    return;
  }

  recipeTag.textContent = recommendation.tag;
  recipeTitle.textContent = recommendation.name;
  recipeDescription.textContent = recommendation.description;
  recipeStats.innerHTML = `
    <span class="recipe-stat-pill">${recommendation.calories} kcal</span>
    <span class="recipe-stat-pill">${recommendation.protein}g protein</span>
  `;
  recipeIngredients.innerHTML = recommendation.ingredients
    .map((ingredient) => `<li>${ingredient}</li>`)
    .join("");
  recipeInstructions.innerHTML = recommendation.instructions
    .map((step) => `<li>${step}</li>`)
    .join("");
  recipeDialog.showModal();
}

function createMealCard(meal, detailed = false) {
  return `
    <article class="meal-card ${detailed ? "detailed" : ""}" data-meal-id="${meal.id}">
      <div class="meal-main">
        <p class="meal-tag">${meal.category}</p>
        <h4>${meal.name}</h4>
        <p>${meal.notes}</p>
      </div>
      <div class="meal-meta">
        <strong>${meal.calories} kcal</strong>
        <span>${meal.protein}g protein</span>
        <div class="meal-actions">
          <button class="meal-action" type="button" data-edit-meal="${meal.id}">Edit</button>
          <button class="meal-action danger" type="button" data-delete-meal="${meal.id}">Delete</button>
        </div>
      </div>
    </article>
  `;
}

function renderMeals() {
  const newestFirst = [...meals].reverse();

  mealLists.forEach((list) => {
    const detailed = list.id === "fullMealList";
    list.innerHTML = newestFirst.map((meal) => createMealCard(meal, detailed)).join("");
  });

  if (mealCountNode) {
    mealCountNode.textContent = String(meals.length);
  }
}

function renderMetrics() {
  const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
  const totalProtein = meals.reduce((sum, meal) => sum + meal.protein, 0);
  const macroTotals = meals.reduce(
    (sum, meal) => {
      const estimates = estimateMacroBreakdown(meal);
      return {
        carbs: sum.carbs + estimates.carbs,
        fat: sum.fat + estimates.fat,
      };
    },
    { carbs: 0, fat: 0 }
  );
  const totalCarbs = macroTotals.carbs;
  const totalFat = macroTotals.fat;
  const remainingCalories = Math.max(dailyGoal - totalCalories, 0);
  const remainingProtein = Math.max(proteinGoal - totalProtein, 0);
  const remainingCarbs = Math.max(carbsGoal - totalCarbs, 0);
  const remainingFat = Math.max(fatGoal - totalFat, 0);
  const totalWaterLiters = waterMl / 1000;
  const remainingWater = Math.max(waterGoalLiters - totalWaterLiters, 0);
  const calorieProgress = Math.min((totalCalories / dailyGoal) * 100, 100);
  const proteinProgress = Math.min((totalProtein / proteinGoal) * 100, 100);
  const carbsProgress = Math.min((totalCarbs / carbsGoal) * 100, 100);
  const fatProgress = Math.min((totalFat / fatGoal) * 100, 100);
  const waterProgress = Math.min((totalWaterLiters / waterGoalLiters) * 100, 100);
  const largestMeal = meals.reduce((largest, meal) => (meal.calories > largest.calories ? meal : largest), meals[0] || null);

  consumedCaloriesNodes.forEach((node) => {
    node.textContent = formatNumber(totalCalories);
  });

  remainingCaloriesNodes.forEach((node) => {
    node.textContent = formatNumber(remainingCalories);
  });

  dailyGoalNodes.forEach((node) => {
    node.textContent = formatNumber(dailyGoal);
  });

  proteinSummaryNodes.forEach((node) => {
    node.textContent = `${totalProtein} / ${proteinGoal}g`;
  });

  setText(proteinInsightNodes, remainingProtein > 0 ? `Only ${remainingProtein}g left to hit goal` : "Protein goal reached for today");
  setText(carbsSummaryNodes, `${totalCarbs} / ${carbsGoal}g`);
  setText(fatSummaryNodes, `${totalFat} / ${fatGoal}g`);
  setText(waterSummaryNodes, `${totalWaterLiters.toFixed(1)} / ${waterGoalLiters.toFixed(1)}L`);

  proteinBarNodes.forEach((node) => {
    node.style.setProperty("--fill", `${proteinProgress.toFixed(0)}%`);
  });
  carbsBarNodes.forEach((node) => {
    node.style.setProperty("--fill", `${carbsProgress.toFixed(0)}%`);
  });
  fatBarNodes.forEach((node) => {
    node.style.setProperty("--fill", `${fatProgress.toFixed(0)}%`);
  });
  waterBarNodes.forEach((node) => {
    node.style.setProperty("--fill", `${waterProgress.toFixed(0)}%`);
  });

  calorieRing.style.setProperty("--progress", calorieProgress.toFixed(0));

  if (calorieProgressBar) {
    calorieProgressBar.style.setProperty("--fill", `${calorieProgress.toFixed(0)}%`);
  }

  if (totalCalories <= dailyGoal) {
    calorieMessage.textContent = "You are on pace for a steady deficit and a high-protein finish.";
    progressMessage.textContent = `${formatNumber(remainingCalories)} calories remaining today.`;
    paceLabel.textContent = "On track";
  } else {
    const over = totalCalories - dailyGoal;
    calorieMessage.textContent = "You have passed today’s calorie target, so keep the rest of the day lighter.";
    progressMessage.textContent = `${formatNumber(over)} calories over goal today.`;
    paceLabel.textContent = "Over target";
  }

  if (remainingProtein > 0) {
    proteinProgressMessage.textContent = `${remainingProtein}g of protein left to hit your goal.`;
    setText(proteinInsightBodyNodes, "A protein-forward snack or dinner would close the gap quickly.");
  } else {
    proteinProgressMessage.textContent = "You have already cleared your protein target today.";
    setText(proteinInsightBodyNodes, "You have already covered your protein target, so the rest of the day can stay lighter.");
  }

  if (carbsProgressMessage) {
    carbsProgressMessage.textContent =
      remainingCarbs > 0
        ? `${remainingCarbs}g of carbs remain in your estimated daily balance.`
        : "You have already met your estimated carb target for today.";
  }

  if (fatProgressMessage) {
    fatProgressMessage.textContent =
      remainingFat > 0
        ? `${remainingFat}g of fat remain in your estimated daily balance.`
        : "You have already met your estimated fat target for today.";
  }

  if (waterProgressMessage) {
    waterProgressMessage.textContent =
      remainingWater > 0
        ? `${Math.round(remainingWater * 1000)}ml left to hit your hydration goal.`
        : "You have already hit your hydration goal today.";
  }

  if (largestMeal) {
    setText(calorieInsightTitleNodes, `${largestMeal.name} is your heaviest meal so far`);
    setText(
      calorieInsightBodyNodes,
      remainingCalories > 500
        ? "You still have useful room left, so dinner can stay balanced instead of overly light."
        : "Most of your calories are already spoken for, so a lighter finish will keep you on target."
    );
  } else {
    setText(calorieInsightTitleNodes, "No meals logged yet");
    setText(calorieInsightBodyNodes, "Once you log meals, your pacing insight will update automatically.");
  }

  setText(
    hydrationInsightTitleNodes,
    remainingWater > 0 ? `${Math.round(remainingWater * 1000)}ml left to target` : "Hydration goal covered"
  );
  setText(
    hydrationInsightBodyNodes,
    remainingWater > 0
      ? "Spacing water around the rest of your meals is enough to finish the day strong."
      : "You are on top of hydration today, so just maintain your current pace."
  );
  setText(
    waterHeadlineNodes,
    remainingWater > 0 ? `Add ${Math.round(Math.min(remainingWater * 1000, 750))}ml next` : "Hydration goal reached"
  );

  if (meals.length === 0) {
    setText(patternInsightTitleNodes, "Your day is still open");
    setText(patternInsightBodyNodes, "Log a few meals and we will spot pacing patterns for you automatically.");
  } else if (meals.length <= 2) {
    setText(patternInsightTitleNodes, "You still have plenty of flexibility");
    setText(patternInsightBodyNodes, "With only a few meals logged, you can still steer the day toward protein or lower calories.");
  } else if (largestMeal && largestMeal.category === "Lunch") {
    setText(patternInsightTitleNodes, "Front-loading around lunch worked well");
    setText(patternInsightBodyNodes, "A bigger lunch leaves you enough room to finish the day with a moderate dinner.");
  } else if (largestMeal && largestMeal.category === "Dinner") {
    setText(patternInsightTitleNodes, "Dinner is carrying most of the day");
    setText(patternInsightBodyNodes, "A lighter snack later will help you avoid overshooting while still feeling satisfied.");
  } else {
    setText(patternInsightTitleNodes, "Your calories are fairly evenly spread");
    setText(patternInsightBodyNodes, "That balance usually makes it easier to stay consistent and avoid late hunger.");
  }
}

function getTotals() {
  const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
  const totalProtein = meals.reduce((sum, meal) => sum + meal.protein, 0);

  return {
    totalCalories,
    totalProtein,
    remainingCalories: Math.max(dailyGoal - totalCalories, 0),
    remainingProtein: Math.max(proteinGoal - totalProtein, 0),
  };
}

function createRecommendationCard(recommendation) {
  return `
    <article class="planner-card recommendation-card" data-recommendation-id="${recommendation.id}" tabindex="0">
      <div>
        <span class="planner-label">${recommendation.tag}</span>
        <h4>${recommendation.name}</h4>
        <p>${recommendation.description}</p>
        <p class="recommendation-reason">${recommendation.reason}</p>
        <div class="recommendation-actions">
          <span class="recommendation-cta">View full recipe</span>
          <button class="recommendation-add" type="button" data-add-recommendation="${recommendation.id}">
            Add to today
          </button>
        </div>
      </div>
      <div class="planner-stats">
        <strong>${recommendation.calories} kcal</strong>
        <span>${recommendation.protein}g protein</span>
      </div>
    </article>
  `;
}

function renderRecommendations(recommendations, summary) {
  recommendationsCache = recommendations;
  recommendationSummary.textContent = summary;
  const markup = recommendations.map((recommendation) => createRecommendationCard(recommendation)).join("");
  recommendationList.innerHTML = markup;
  insightsRecommendationList.innerHTML = markup;
}

async function loadRecommendations() {
  const { remainingCalories, remainingProtein } = getTotals();
  recommendationRefreshSeed += 1;
  recommendationSummary.textContent = "Refreshing ideas for your remaining calories...";
  const exclude = recentRecommendationIds.join(",");

  try {
    const response = await authedFetch(
      `/api/recommendations?remainingCalories=${remainingCalories}&remainingProtein=${remainingProtein}&seed=${recommendationRefreshSeed}&exclude=${encodeURIComponent(exclude)}`
    );

    if (!response.ok) {
      throw new Error(`Failed to load recommendations: ${response.status}`);
    }

    const payload = await response.json();
    recentRecommendationIds = [...recentRecommendationIds, ...payload.recommendations.map((item) => item.id)].slice(-12);
    renderRecommendations(payload.recommendations, payload.summary);
  } catch (error) {
    console.error(error);
    recommendationSummary.textContent = "We could not load recommendations right now.";
    recommendationList.innerHTML = "";
    insightsRecommendationList.innerHTML = "";
  }
}

async function syncMeals(response) {
  const payload = await response.json();
  syncUser(payload);
  meals.splice(0, meals.length, ...payload.meals);
  waterMl = Number(payload.waterMl || 0);
  renderMeals();
  renderMetrics();
  await loadRecommendations();
}

async function loadMeals() {
  try {
    if (!authToken) {
      return;
    }

    setStatus("Loading your account data...", "neutral");
    const response = await authedFetch("/api/me");

    if (!response.ok) {
      throw new Error(`Failed to load account: ${response.status}`);
    }

    await syncMeals(response);
    document.body.classList.remove("is-signed-out");
    document.body.classList.add("is-signed-in");

    if (currentUser && !currentUser.profile.onboardingComplete) {
      onboardingDialog.showModal();
    }

    setStatus("Account data loaded.", "success");
  } catch (error) {
    console.error(error);
    setStatus("Could not load your account data.", "error");
  }
}

function setActiveTab(tabName) {
  navItems.forEach((item) => {
    const isActive = item.dataset.tabTarget === tabName;
    item.classList.toggle("active", isActive);
    item.setAttribute("aria-selected", String(isActive));
  });

  tabPanels.forEach((panel) => {
    const isActive = panel.dataset.tabPanel === tabName;
    panel.hidden = !isActive;
    panel.classList.toggle("is-active", isActive);
  });
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  const mode = event.submitter?.dataset.authMode || "login";
  const formData = new FormData(authForm);
  const payload = {
    name: formData.get("name")?.toString().trim(),
    email: formData.get("email")?.toString().trim(),
    password: formData.get("password")?.toString(),
  };

  try {
    const response = await fetch(mode === "signup" ? "/api/signup" : "/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorPayload = await response.json();
      throw new Error(errorPayload.error || "Authentication failed.");
    }

    const data = await response.json();
    authToken = data.token;
    localStorage.setItem("calorieCanvasToken", authToken);
    syncUser(data);
    meals.splice(0, meals.length, ...data.meals);
    waterMl = Number(data.waterMl || 0);
    renderMeals();
    renderMetrics();
    await loadRecommendations();
    document.body.classList.remove("is-signed-out");
    document.body.classList.add("is-signed-in");
    setStatus(mode === "signup" ? "Account created." : "Logged in.", "success");

    if (currentUser && !currentUser.profile.onboardingComplete) {
      onboardingDialog.showModal();
    }
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Could not authenticate.", "error");
  }
}

async function handleOnboardingSubmit(event) {
  event.preventDefault();
  const formData = new FormData(onboardingForm);
  const payload = {
    age: Number(formData.get("age")),
    sex: formData.get("sex"),
    heightCm: Number(formData.get("heightCm")),
    weightKg: Number(formData.get("weightKg")),
    activityLevel: formData.get("activityLevel"),
    goal: formData.get("goal"),
    dietaryRestrictions: formData.getAll("dietaryRestrictions"),
    allergies: formData.get("allergies")?.toString() || "",
    preferredMeals: formData.get("preferredMeals")?.toString() || "",
  };

  try {
    const response = await authedFetch("/api/onboarding", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to save onboarding: ${response.status}`);
    }

    await syncMeals(response);
    onboardingDialog.close();
    setStatus("Your calorie and macro targets are set.", "success");
  } catch (error) {
    console.error(error);
    setStatus("Could not save your setup.", "error");
  }
}

async function logout() {
  try {
    if (authToken) {
      await authedFetch("/api/logout", { method: "POST" });
    }
  } catch (error) {
    console.error(error);
  }

  authToken = "";
  currentUser = null;
  localStorage.removeItem("calorieCanvasToken");
  meals.splice(0, meals.length);
  waterMl = 0;
  document.body.classList.remove("is-signed-in");
  document.body.classList.add("is-signed-out");
}

async function deleteMeal(mealId) {
  try {
    setStatus("Deleting meal locally...", "neutral");
    const response = await authedFetch(`/api/meals/${mealId}`, { method: "DELETE" });

    if (!response.ok) {
      throw new Error(`Failed to delete meal: ${response.status}`);
    }

    await syncMeals(response);
    setStatus("Meal deleted locally.", "success");
  } catch (error) {
    console.error(error);
    setStatus("Could not delete that meal.", "error");
  }
}

async function addWater(amountMl) {
  try {
    setStatus(`Adding ${amountMl}ml of water...`, "neutral");
    const response = await authedFetch("/api/water", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amountMl }),
    });

    if (!response.ok) {
      throw new Error(`Failed to add water: ${response.status}`);
    }

    await syncMeals(response);
    setStatus(`Logged ${amountMl}ml of water.`, "success");
  } catch (error) {
    console.error(error);
    setStatus("Could not log water.", "error");
  }
}

async function resetWater() {
  try {
    setStatus("Resetting water tracker...", "neutral");
    const response = await authedFetch("/api/water/reset", {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Failed to reset water: ${response.status}`);
    }

    await syncMeals(response);
    setStatus("Water tracker reset for today.", "success");
  } catch (error) {
    console.error(error);
    setStatus("Could not reset water tracker.", "error");
  }
}

async function addRecommendationToToday(recommendationId) {
  const recommendation = recommendationsCache.find((entry) => entry.id === recommendationId);

  if (!recommendation) {
    return;
  }

  const nextMeal = {
    category: recommendation.calories >= 500 ? "Dinner" : recommendation.calories >= 350 ? "Lunch" : "Snack",
    name: recommendation.name,
    notes: recommendation.description,
    calories: recommendation.calories,
    protein: recommendation.protein,
  };

  try {
    setStatus("Adding AI meal to today...", "neutral");
    const response = await authedFetch("/api/meals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(nextMeal),
    });

    if (!response.ok) {
      throw new Error(`Failed to add AI meal: ${response.status}`);
    }

    await syncMeals(response);
    setActiveTab("meals");
    setStatus(`Added "${recommendation.name}" to today’s meals.`, "success");
  } catch (error) {
    console.error(error);
    setStatus("Could not add that AI meal to today.", "error");
  }
}

authForm.addEventListener("submit", handleAuthSubmit);
onboardingForm.addEventListener("submit", handleOnboardingSubmit);
logoutButton.addEventListener("click", logout);

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    setActiveTab(item.dataset.tabTarget);
  });
});

shortcutButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveTab(button.dataset.tabShortcut);
  });
});

addMealButtons.forEach((button) => {
  button.addEventListener("click", openCreateMealDialog);
});

addWaterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    addWater(Number(button.dataset.addWater));
  });
});

if (resetWaterButton) {
  resetWaterButton.addEventListener("click", () => {
    resetWater();
  });
}

refreshRecommendationsButtons.forEach((button) => {
  button.addEventListener("click", () => {
    loadRecommendations();
  });
});

[recommendationList, insightsRecommendationList].forEach((list) => {
  list.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-add-recommendation]");
    const card = event.target.closest("[data-recommendation-id]");

    if (addButton) {
      event.stopPropagation();
      addRecommendationToToday(addButton.dataset.addRecommendation);
      return;
    }

    if (card) {
      openRecipeDialog(card.dataset.recommendationId);
    }
  });

  list.addEventListener("keydown", (event) => {
    const card = event.target.closest("[data-recommendation-id]");

    if (card && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      openRecipeDialog(card.dataset.recommendationId);
    }
  });
});

mealLists.forEach((list) => {
  list.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit-meal]");
    const deleteButton = event.target.closest("[data-delete-meal]");

    if (editButton) {
      openEditMealDialog(editButton.dataset.editMeal);
    }

    if (deleteButton) {
      deleteMeal(deleteButton.dataset.deleteMeal);
    }
  });
});

closeDialogButton.addEventListener("click", closeMealDialog);
cancelMealButton.addEventListener("click", closeMealDialog);
closeRecipeDialogButton.addEventListener("click", () => {
  recipeDialog.close();
});

mealDialog.addEventListener("click", (event) => {
  const bounds = mealDialog.getBoundingClientRect();
  const clickedOutside =
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom;

  if (clickedOutside) {
    closeMealDialog();
  }
});

recipeDialog.addEventListener("click", (event) => {
  const bounds = recipeDialog.getBoundingClientRect();
  const clickedOutside =
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom;

  if (clickedOutside) {
    recipeDialog.close();
  }
});

mealForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const mealId = mealIdInput.value.trim();
  const nextMeal = {
    category: mealForm.elements.mealCategory.value,
    name: mealForm.elements.mealName.value.trim(),
    notes: mealForm.elements.mealNotes.value.trim() || "Custom meal",
    calories: Number(mealForm.elements.mealCalories.value),
    protein: Number(mealForm.elements.mealProtein.value),
  };

  try {
    const isEditing = Boolean(mealId);
    setStatus(isEditing ? "Saving meal changes locally..." : "Saving meal locally...", "neutral");

    const response = await authedFetch(isEditing ? `/api/meals/${mealId}` : "/api/meals", {
      method: isEditing ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(nextMeal),
    });

    if (!response.ok) {
      throw new Error(`Failed to save meal: ${response.status}`);
    }

    await syncMeals(response);
    closeMealDialog();
    setActiveTab("meals");
    setStatus(isEditing ? "Meal updated locally on this device." : "Meal saved locally on this device.", "success");
  } catch (error) {
    console.error(error);
    setStatus("Could not save that meal locally.", "error");
  }
});

loadMeals();
