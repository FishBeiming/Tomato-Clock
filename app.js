const STORAGE_KEY = "tomato-clock-state-v1";
const CLOUD_TABLE = "tomato_clock_profiles";
const RING_CIRCUMFERENCE = 2 * Math.PI * 160;

const backgroundPresets = [
  {
    id: "sakura",
    name: "樱花天空",
    url: "https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=2400&q=85",
  },
  {
    id: "water",
    name: "湖畔",
    url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=2400&q=85",
  },
  {
    id: "forest",
    name: "林间",
    url: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=2400&q=85",
  },
  {
    id: "desk",
    name: "书桌",
    url: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=2400&q=85",
  },
];

const quotes = [
  "神为爱祂的人所预备的\n是眼睛未曾看见\n耳朵未曾听见\n人心也未曾想到的。",
  "主耶和华是我的力量\n他使我的脚快如母鹿的蹄,又使我稳行在高处。",
  "你不要害怕，因为我与你同在\n不要惊惶,因为我是你的 神\n我必坚固你,我必帮助你\n我必用我公义的右手扶持你。",
  "雅比斯求告以色列的 神说\n甚愿你赐福与我\n扩张我的境界\n常与我同在\n保佑我不遭患难\n不受艰苦\n神就应允他所求的。",
  "在你一切所行的事上\n都要认定祂\n祂必指引你的路。",
];

const modeMeta = {
  focus: {
    label: "专注",
    ready: "准备专注",
    running: "专注中",
    paused: "暂停中",
  },
  short: {
    label: "短休息",
    ready: "准备休息",
    running: "休息中",
    paused: "暂停中",
  },
  long: {
    label: "长休息",
    ready: "准备长休息",
    running: "休息中",
    paused: "暂停中",
  },
};

const defaultState = {
  settings: {
    durations: {
      focus: 25,
      short: 5,
      long: 15,
    },
    longEvery: 4,
    dailyGoal: 400,
    autoBreak: false,
    autoFocus: false,
    sound: true,
    display: "digital",
    backgroundId: "sakura",
    customBackground: "",
    shade: 38,
    ringWidth: 7,
    ringGap: 22,
    title: "考研",
    hideHeatmapLabels: false,
  },
  stats: {
    date: getTodayKey(),
    focusSeconds: 0,
    completedFocus: 0,
    history: {},
  },
  timer: {
    mode: "focus",
    remaining: 25 * 60,
  },
};

const elements = {
  appShell: document.querySelector("#appShell"),
  backgroundLayer: document.querySelector("#backgroundLayer"),
  quoteText: document.querySelector("#quoteText"),
  backgroundButton: document.querySelector("#backgroundButton"),
  displayButton: document.querySelector("#displayButton"),
  settingsButton: document.querySelector("#settingsButton"),
  accountButton: document.querySelector("#accountButton"),
  heatmapButton: document.querySelector("#heatmapButton"),
  modeTabs: [...document.querySelectorAll(".mode-tab")],
  progressValue: document.querySelector("#progressValue"),
  sessionTitle: document.querySelector("#sessionTitle"),
  digitalDisplay: document.querySelector("#digitalDisplay"),
  flipDisplay: document.querySelector("#flipDisplay"),
  flipMinutes: document.querySelector("#flipMinutes"),
  flipSeconds: document.querySelector("#flipSeconds"),
  sessionState: document.querySelector("#sessionState"),
  habitLine: document.querySelector("#habitLine"),
  resetButton: document.querySelector("#resetButton"),
  startPauseButton: document.querySelector("#startPauseButton"),
  skipButton: document.querySelector("#skipButton"),
  sidePanel: document.querySelector("#sidePanel"),
  panelKicker: document.querySelector("#panelKicker"),
  panelTitle: document.querySelector("#panelTitle"),
  closePanelButton: document.querySelector("#closePanelButton"),
  panelPages: [...document.querySelectorAll(".panel-page")],
  backgroundGrid: document.querySelector("#backgroundGrid"),
  backgroundUrlInput: document.querySelector("#backgroundUrlInput"),
  backgroundFileInput: document.querySelector("#backgroundFileInput"),
  shadeRange: document.querySelector("#shadeRange"),
  ringWidthRange: document.querySelector("#ringWidthRange"),
  ringGapRange: document.querySelector("#ringGapRange"),
  displaySegments: [...document.querySelectorAll(".segment")],
  focusMinutesInput: document.querySelector("#focusMinutesInput"),
  shortMinutesInput: document.querySelector("#shortMinutesInput"),
  longMinutesInput: document.querySelector("#longMinutesInput"),
  dailyGoalInput: document.querySelector("#dailyGoalInput"),
  soundToggle: document.querySelector("#soundToggle"),
  resetStatsButton: document.querySelector("#resetStatsButton"),
  heatmapTitle: document.querySelector("#heatmapTitle"),
  heatmapSummary: document.querySelector("#heatmapSummary"),
  heatmapGrid: document.querySelector("#heatmapGrid"),
  prevMonthButton: document.querySelector("#prevMonthButton"),
  nextMonthButton: document.querySelector("#nextMonthButton"),
  heatmapTodayButton: document.querySelector("#heatmapTodayButton"),
  toggleHeatmapLabelsButton: document.querySelector("#toggleHeatmapLabelsButton"),
  accountEmail: document.querySelector("#accountEmail"),
  syncStatus: document.querySelector("#syncStatus"),
  authForm: document.querySelector("#authForm"),
  authEmailInput: document.querySelector("#authEmailInput"),
  authPasswordInput: document.querySelector("#authPasswordInput"),
  authLoginButton: document.querySelector("#authLoginButton"),
  authRegisterButton: document.querySelector("#authRegisterButton"),
  accountActions: document.querySelector("#accountActions"),
  syncNowButton: document.querySelector("#syncNowButton"),
  signOutButton: document.querySelector("#signOutButton"),
  cycleDialog: document.querySelector("#cycleDialog"),
  confirmNextCycleButton: document.querySelector("#confirmNextCycleButton"),
  cancelNextCycleButton: document.querySelector("#cancelNextCycleButton"),
};

const supabaseConfig = window.TOMATO_SUPABASE_CONFIG || {};

let state = loadState();
let timer = {
  mode: state.timer.mode,
  total: durationFor(state.timer.mode),
  remaining: clamp(state.timer.remaining, 0, durationFor(state.timer.mode)),
  isRunning: false,
  startedAt: 0,
  baseRemaining: 0,
  intervalId: null,
};
let lastFlipMinutes = "";
let lastFlipSeconds = "";
let heatmapCursor = getMonthStart(new Date());

const cloud = {
  client: null,
  user: null,
  pendingSaveId: null,
  isSyncing: false,
  lastSavedAt: 0,
  isApplyingRemote: false,
};

init();

function init() {
  ensureTodayStats();
  seedQuote();
  buildBackgroundChoices();
  hydrateControls();
  bindEvents();
  render();
  initCloud();
}

function bindEvents() {
  elements.backgroundButton.addEventListener("click", () => openPanel("background"));
  elements.displayButton.addEventListener("click", () => openPanel("display"));
  elements.settingsButton.addEventListener("click", () => openPanel("settings"));
  elements.accountButton.addEventListener("click", () => openPanel("account"));
  elements.heatmapButton.addEventListener("click", () => openPanel("heatmap"));
  elements.closePanelButton.addEventListener("click", closePanel);
  elements.sidePanel.addEventListener("click", (event) => event.stopPropagation());

  elements.startPauseButton.addEventListener("click", toggleTimer);
  elements.resetButton.addEventListener("click", resetTimer);
  elements.skipButton.addEventListener("click", () => finishCurrentSession({ skipped: true }));

  elements.modeTabs.forEach((button) => {
    button.addEventListener("click", () => switchMode(button.dataset.mode));
  });

  elements.displaySegments.forEach((button) => {
    button.addEventListener("click", () => {
      state.settings.display = button.dataset.display;
      persistState();
      render();
    });
  });

  elements.sessionTitle.addEventListener("input", () => {
    state.settings.title = elements.sessionTitle.value.trim() || "专注";
    persistState();
  });

  elements.backgroundUrlInput.addEventListener("change", applyBackgroundUrl);
  elements.backgroundUrlInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      applyBackgroundUrl();
    }
  });

  elements.backgroundFileInput.addEventListener("change", handleBackgroundFile);

  elements.shadeRange.addEventListener("input", () => {
    state.settings.shade = Number(elements.shadeRange.value);
    persistState();
    renderBackground();
  });

  elements.ringWidthRange.addEventListener("input", () => {
    state.settings.ringWidth = Number(elements.ringWidthRange.value);
    persistState();
    renderRing();
  });

  elements.ringGapRange.addEventListener("input", () => {
    state.settings.ringGap = Number(elements.ringGapRange.value);
    persistState();
    renderRing();
  });

  [
    [elements.focusMinutesInput, "focus"],
    [elements.shortMinutesInput, "short"],
    [elements.longMinutesInput, "long"],
  ].forEach(([input, mode]) => {
    input.addEventListener("change", () => updateDuration(mode, input.value));
  });

  elements.dailyGoalInput.addEventListener("change", () => {
    state.settings.dailyGoal = clamp(Number(elements.dailyGoalInput.value) || 400, 1, 1440);
    elements.dailyGoalInput.value = state.settings.dailyGoal;
    persistState();
    renderStats();
  });

  elements.soundToggle.addEventListener("change", () => {
    state.settings.sound = elements.soundToggle.checked;
    persistState();
  });

  elements.resetStatsButton.addEventListener("click", () => {
    state.stats.focusSeconds = 0;
    state.stats.completedFocus = 0;
    state.stats.history[getTodayKey()] = 0;
    persistState({ immediate: true });
    renderStats();
    renderHeatmap();
  });

  elements.prevMonthButton.addEventListener("click", () => {
    heatmapCursor = addMonths(heatmapCursor, -1);
    renderHeatmap();
  });

  elements.nextMonthButton.addEventListener("click", () => {
    heatmapCursor = addMonths(heatmapCursor, 1);
    renderHeatmap();
  });

  elements.heatmapTodayButton.addEventListener("click", () => {
    heatmapCursor = getMonthStart(new Date());
    renderHeatmap();
  });

  elements.toggleHeatmapLabelsButton.addEventListener("click", () => {
    state.settings.hideHeatmapLabels = !state.settings.hideHeatmapLabels;
    persistState();
    renderHeatmap();
  });

  elements.authForm.addEventListener("submit", handleSignIn);
  elements.authRegisterButton.addEventListener("click", handleSignUp);
  elements.signOutButton.addEventListener("click", handleSignOut);
  elements.syncNowButton.addEventListener("click", () => syncCloudNow({ showStatus: true }));
  elements.confirmNextCycleButton.addEventListener("click", startNextCycle);
  elements.cancelNextCycleButton.addEventListener("click", cancelNextCycle);
  elements.cycleDialog.addEventListener("click", (event) => {
    if (event.target === elements.cycleDialog) {
      cancelNextCycle();
    }
  });

  document.addEventListener("keydown", handleKeyboard);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      syncCloudNow({ quiet: true });
    }
  });
  document.addEventListener("click", (event) => {
    if (!elements.sidePanel.hidden && !event.target.closest(".icon-actions")) {
      closePanel();
    }
  });
}

async function initCloud() {
  renderAccountState();

  if (!hasSupabaseConfig()) {
    setSyncStatus("请先填写 supabase-config.js 中的 Supabase URL 和 anon key。", "error");
    return;
  }

  if (!window.supabase?.createClient) {
    setSyncStatus("Supabase SDK 未加载，当前仅使用本地数据。", "error");
    return;
  }

  try {
    cloud.client = window.supabase.createClient(
      supabaseConfig.url.trim(),
      supabaseConfig.anonKey.trim(),
    );

    const { data, error } = await cloud.client.auth.getSession();

    if (error) {
      throw error;
    }

    await applySession(data.session);

    cloud.client.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });
  } catch (error) {
    setSyncStatus(`云同步初始化失败：${error.message}`, "error");
  }
}

async function applySession(session) {
  const nextUser = session?.user || null;
  const previousUserId = cloud.user?.id || "";

  cloud.user = nextUser;
  renderAccountState();

  if (nextUser && nextUser.id !== previousUserId) {
    await loadCloudState();
  }
}

async function handleSignIn(event) {
  event.preventDefault();

  if (!ensureCloudClient()) {
    return;
  }

  const credentials = getAuthCredentials();

  if (!credentials) {
    return;
  }

  setSyncStatus("正在登录...", "muted");
  elements.authLoginButton.disabled = true;

  try {
    const { error } = await cloud.client.auth.signInWithPassword(credentials);

    if (error) {
      throw error;
    }

    setSyncStatus("登录成功，正在加载云端数据...", "ok");
  } catch (error) {
    setSyncStatus(`登录失败：${error.message}`, "error");
  } finally {
    elements.authLoginButton.disabled = false;
  }
}

async function handleSignUp() {
  if (!ensureCloudClient()) {
    return;
  }

  const credentials = getAuthCredentials();

  if (!credentials) {
    return;
  }

  setSyncStatus("正在注册...", "muted");
  elements.authRegisterButton.disabled = true;

  try {
    const { data, error } = await cloud.client.auth.signUp(credentials);

    if (error) {
      throw error;
    }

    if (data.session) {
      await applySession(data.session);
      setSyncStatus("注册成功，正在同步当前数据...", "ok");
      await syncCloudNow({ showStatus: true });
    } else {
      setSyncStatus("注册成功，请到邮箱完成验证后再登录。", "ok");
    }
  } catch (error) {
    setSyncStatus(`注册失败：${error.message}`, "error");
  } finally {
    elements.authRegisterButton.disabled = false;
  }
}

async function handleSignOut() {
  if (!ensureCloudClient()) {
    return;
  }

  setSyncStatus("正在退出登录...", "muted");

  try {
    const { error } = await cloud.client.auth.signOut();

    if (error) {
      throw error;
    }

    cloud.user = null;
    renderAccountState();
  } catch (error) {
    setSyncStatus(`退出失败：${error.message}`, "error");
  }
}

async function loadCloudState() {
  if (!cloud.client || !cloud.user) {
    return;
  }

  setSyncStatus("正在读取云端数据...", "muted");
  cloud.isApplyingRemote = true;

  try {
    const { data, error } = await cloud.client
      .from(CLOUD_TABLE)
      .select("settings, stats, timer, updated_at")
      .eq("user_id", cloud.user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      await syncCloudNow({ showStatus: true });
      return;
    }

    applyCloudState(data);
    saveLocalState();
    cloud.isApplyingRemote = false;
    queueCloudSave(800);
    setSyncStatus(`云端数据已加载，最后更新 ${formatDateTime(data.updated_at)}。`, "ok");
  } catch (error) {
    setSyncStatus(`读取云端失败：${error.message}`, "error");
  } finally {
    cloud.isApplyingRemote = false;
    renderAccountState({ keepStatus: true });
  }
}

function applyCloudState(row) {
  const localState = normalizeState(state);
  const remoteState = normalizeState({
    settings: row.settings,
    stats: row.stats,
    timer: row.timer,
  });
  const today = getTodayKey();

  if (remoteState.stats.date !== today) {
    remoteState.stats = {
      date: today,
      focusSeconds: 0,
      completedFocus: 0,
    };
  }

  if (localState.stats.date === today && remoteState.stats.date === today) {
    remoteState.stats.focusSeconds = Math.max(
      remoteState.stats.focusSeconds,
      localState.stats.focusSeconds,
    );
    remoteState.stats.completedFocus = Math.max(
      remoteState.stats.completedFocus,
      localState.stats.completedFocus,
    );
  }

  remoteState.stats.history = mergeHistories(
    localState.stats.history,
    remoteState.stats.history,
  );
  remoteState.stats.history[today] = Math.max(
    remoteState.stats.history[today] || 0,
    remoteState.stats.focusSeconds,
  );

  state = remoteState;
  timer.mode = modeMeta[state.timer.mode] ? state.timer.mode : "focus";
  timer.total = durationFor(timer.mode);
  timer.remaining = clamp(state.timer.remaining, 0, timer.total);
  timer.isRunning = false;
  timer.startedAt = 0;
  timer.baseRemaining = timer.remaining;
  clearInterval(timer.intervalId);
  timer.intervalId = null;

  hydrateControls();
  render();
}

function persistState(options = {}) {
  const { remote = true, immediate = false } = options;

  state.timer = {
    mode: timer.mode,
    remaining: timer.remaining,
  };

  saveLocalState();

  if (!remote || cloud.isApplyingRemote) {
    return;
  }

  if (immediate) {
    syncCloudNow({ quiet: true });
  } else {
    queueCloudSave();
  }
}

function saveLocalState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    if (state.settings.customBackground.startsWith("data:")) {
      state.settings.customBackground = "";
      state.settings.backgroundId = "sakura";
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      renderBackground();
      window.alert("图片过大，已恢复为默认背景。");
    }
  }
}

async function syncCloudNow(options = {}) {
  const { quiet = false, showStatus = false } = options;

  if (!cloud.client || !cloud.user || cloud.isSyncing) {
    return false;
  }

  if (cloud.pendingSaveId) {
    clearTimeout(cloud.pendingSaveId);
    cloud.pendingSaveId = null;
  }

  state.timer = {
    mode: timer.mode,
    remaining: timer.remaining,
  };

  if (!quiet || showStatus) {
    setSyncStatus("正在保存到云端...", "muted");
  }

  cloud.isSyncing = true;

  try {
    const { error } = await cloud.client.from(CLOUD_TABLE).upsert(
      {
        user_id: cloud.user.id,
        ...createCloudSnapshot(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      },
    );

    if (error) {
      throw error;
    }

    cloud.lastSavedAt = Date.now();
    setSyncStatus(`云端已保存 ${formatTimeOfDay(new Date())}`, "ok");
    return true;
  } catch (error) {
    setSyncStatus(`云端保存失败：${error.message}`, "error");
    return false;
  } finally {
    cloud.isSyncing = false;
    renderAccountState({ keepStatus: true });
  }
}

function createCloudSnapshot() {
  const settings = cloneValue(state.settings);

  if (settings.customBackground?.startsWith("data:")) {
    settings.customBackground = "";
    settings.backgroundId = "sakura";
  }

  return {
    settings,
    stats: cloneValue(state.stats),
    timer: {
      mode: timer.mode,
      remaining: timer.remaining,
    },
  };
}

function queueCloudSave(delay = 1400) {
  if (!cloud.client || !cloud.user || cloud.isApplyingRemote) {
    return;
  }

  if (cloud.pendingSaveId) {
    clearTimeout(cloud.pendingSaveId);
  }

  cloud.pendingSaveId = window.setTimeout(() => {
    cloud.pendingSaveId = null;
    syncCloudNow({ quiet: true });
  }, delay);
}

function queueCloudCheckpoint(delay = 10000) {
  if (!cloud.client || !cloud.user || cloud.isApplyingRemote || cloud.pendingSaveId) {
    return;
  }

  cloud.pendingSaveId = window.setTimeout(() => {
    cloud.pendingSaveId = null;
    syncCloudNow({ quiet: true });
  }, delay);
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return normalizeState(saved);
  } catch {
    return normalizeState();
  }
}

function normalizeState(partial = {}) {
  const normalized = {
    settings: {
      ...cloneValue(defaultState.settings),
      ...(partial.settings || {}),
      durations: {
        ...defaultState.settings.durations,
        ...(partial.settings?.durations || {}),
      },
    },
    stats: {
      ...defaultState.stats,
      ...(partial.stats || {}),
      history: {
        ...(partial.stats?.history || {}),
      },
    },
    timer: {
      ...defaultState.timer,
      ...(partial.timer || {}),
    },
  };

  if (!modeMeta[normalized.timer.mode]) {
    normalized.timer.mode = "focus";
  }

  normalized.settings.durations.focus = clamp(Number(normalized.settings.durations.focus) || 25, 1, 180);
  normalized.settings.durations.short = clamp(Number(normalized.settings.durations.short) || 5, 1, 60);
  normalized.settings.durations.long = clamp(Number(normalized.settings.durations.long) || 15, 1, 120);
  normalized.settings.longEvery = clamp(Number(normalized.settings.longEvery) || 4, 2, 12);
  normalized.settings.dailyGoal = clamp(Number(normalized.settings.dailyGoal) || 400, 1, 1440);
  normalized.settings.hideHeatmapLabels = Boolean(normalized.settings.hideHeatmapLabels);
  normalized.stats.focusSeconds = Math.max(0, Number(normalized.stats.focusSeconds) || 0);
  normalized.stats.completedFocus = Math.max(0, Number(normalized.stats.completedFocus) || 0);
  normalized.stats.history = normalizeHistory(normalized.stats.history);
  if (normalized.stats.date) {
    normalized.stats.history[normalized.stats.date] = Math.max(
      normalized.stats.history[normalized.stats.date] || 0,
      normalized.stats.focusSeconds,
    );
  }
  const duration = durationForState(normalized, normalized.timer.mode);
  const rawRemaining = Number(normalized.timer.remaining);
  normalized.timer.remaining = clamp(
    Number.isFinite(rawRemaining) ? rawRemaining : duration,
    0,
    duration,
  );

  return normalized;
}

function ensureTodayStats() {
  const today = getTodayKey();

  if (state.stats.date !== today) {
    if (state.stats.date && state.stats.focusSeconds > 0) {
      state.stats.history[state.stats.date] = Math.max(
        state.stats.history[state.stats.date] || 0,
        state.stats.focusSeconds,
      );
    }

    state.stats = {
      ...state.stats,
      date: today,
      focusSeconds: 0,
      completedFocus: 0,
    };
  }

  state.stats.history[today] = Math.max(
    state.stats.history[today] || 0,
    state.stats.focusSeconds,
  );
}

function seedQuote() {
  const dayIndex = new Date().getDate() % quotes.length;
  elements.quoteText.textContent = quotes[dayIndex];
}

function hydrateControls() {
  elements.sessionTitle.value = state.settings.title;
  elements.focusMinutesInput.value = state.settings.durations.focus;
  elements.shortMinutesInput.value = state.settings.durations.short;
  elements.longMinutesInput.value = state.settings.durations.long;
  elements.dailyGoalInput.value = state.settings.dailyGoal;
  elements.soundToggle.checked = state.settings.sound;
  elements.shadeRange.value = state.settings.shade;
  elements.ringWidthRange.value = state.settings.ringWidth;
  elements.ringGapRange.value = state.settings.ringGap;
  elements.backgroundUrlInput.value = state.settings.customBackground.startsWith("http")
    ? state.settings.customBackground
    : "";
}

function buildBackgroundChoices() {
  elements.backgroundGrid.innerHTML = "";

  backgroundPresets.forEach((preset) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "background-choice";
    button.dataset.name = preset.name;
    button.dataset.id = preset.id;
    button.style.backgroundImage = `url("${preset.url}")`;
    button.setAttribute("aria-label", preset.name);
    button.addEventListener("click", () => {
      state.settings.backgroundId = preset.id;
      state.settings.customBackground = "";
      elements.backgroundUrlInput.value = "";
      persistState();
      renderBackground();
      renderBackgroundChoices();
    });
    elements.backgroundGrid.appendChild(button);
  });
}

function render() {
  ensureTodayStats();
  renderModeTabs();
  renderTime();
  renderRing();
  renderStats();
  renderHeatmap();
  renderDisplayMode();
  renderBackground();
  renderBackgroundChoices();
  renderRunState();
  renderAccountState({ keepStatus: true });
}

function renderModeTabs() {
  elements.modeTabs.forEach((button) => {
    const isActive = button.dataset.mode === timer.mode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
}

function renderTime() {
  const formatted = formatCountdown(timer.remaining);
  const [minutes, seconds] = formatted.split(":");

  elements.digitalDisplay.textContent = formatted;
  setFlipValue(elements.flipMinutes, minutes, "minutes");
  setFlipValue(elements.flipSeconds, seconds, "seconds");
}

function setFlipValue(element, value, kind) {
  const previousValue = kind === "minutes" ? lastFlipMinutes : lastFlipSeconds;
  const card = element.closest(".flip-card");
  const parts = {
    top: card.querySelector('[data-role="top"]'),
    bottom: card.querySelector('[data-role="bottom"]'),
    front: card.querySelector('[data-role="front"]'),
    back: card.querySelector('[data-role="back"]'),
  };

  if (previousValue && previousValue !== value) {
    parts.front.textContent = previousValue;
    parts.back.textContent = value;
    parts.top.textContent = value;
    parts.bottom.textContent = value;
    card.classList.remove("is-flipping");
    void card.offsetWidth;
    card.classList.add("is-flipping");
  } else {
    parts.front.textContent = value;
    parts.back.textContent = value;
    parts.top.textContent = value;
    parts.bottom.textContent = value;
  }

  element.textContent = value;

  if (kind === "minutes") {
    lastFlipMinutes = value;
  } else {
    lastFlipSeconds = value;
  }
}

function renderRing() {
  const progress = timer.total > 0 ? clamp(timer.remaining / timer.total, 0, 1) : 0;
  const gapLength = RING_CIRCUMFERENCE * (state.settings.ringGap / 360);
  const visibleLength = RING_CIRCUMFERENCE - gapLength;
  const progressLength = visibleLength * progress;

  document.documentElement.style.setProperty("--ring-stroke", state.settings.ringWidth);
  document.documentElement.style.setProperty("--ring-gap", state.settings.ringGap);
  elements.progressValue.style.strokeDasharray = `${progressLength} ${RING_CIRCUMFERENCE}`;
  elements.progressValue.style.strokeDashoffset = "0";

  document.querySelectorAll(".progress-track").forEach((circle) => {
    circle.style.strokeDasharray = `${visibleLength} ${gapLength}`;
  });
}

function renderStats() {
  const minutes = Math.floor(state.stats.focusSeconds / 60);
  elements.habitLine.textContent = `习惯-今日 ${minutes}/${state.settings.dailyGoal} 分钟 · ${state.stats.completedFocus} 个番茄`;
}

function renderHeatmap() {
  const year = heatmapCursor.getFullYear();
  const month = heatmapCursor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1);
  const leadingBlanks = (firstDay.getDay() + 6) % 7;
  const todayKey = getTodayKey();
  let monthSeconds = 0;

  elements.heatmapTitle.textContent = `${year}-${String(month + 1).padStart(2, "0")}`;
  elements.heatmapGrid.innerHTML = "";
  elements.toggleHeatmapLabelsButton.textContent = state.settings.hideHeatmapLabels ? "显示时长" : "隐藏时长";

  for (let index = 0; index < leadingBlanks; index += 1) {
    const blank = document.createElement("span");
    blank.className = "heatmap-cell is-empty";
    elements.heatmapGrid.appendChild(blank);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = formatDateKey(new Date(year, month, day));
    const seconds = getDailyFocusSeconds(dateKey);
    const hours = seconds / 3600;
    const cell = document.createElement("div");
    const level = getHeatmapLevel(seconds);
    const dayLabel = document.createElement("span");

    monthSeconds += seconds;
    cell.className = `heatmap-cell level-${level}`;
    cell.classList.toggle("is-today", dateKey === todayKey);
    cell.setAttribute("aria-label", `${dateKey}，专注 ${formatHours(hours)}`);

    if (seconds > 0 && !state.settings.hideHeatmapLabels) {
      const value = document.createElement("span");
      value.className = "heatmap-cell-value";
      value.textContent = formatHours(hours);
      cell.appendChild(value);
    }

    dayLabel.className = "heatmap-cell-day";
    dayLabel.textContent = String(day);
    cell.appendChild(dayLabel);
    elements.heatmapGrid.appendChild(cell);
  }

  elements.heatmapSummary.textContent = `本月 ${formatHours(monthSeconds / 3600)} · 今日 ${formatHours(getDailyFocusSeconds(todayKey) / 3600)}`;
}

function renderDisplayMode() {
  const isFlip = state.settings.display === "flip";
  elements.digitalDisplay.hidden = isFlip;
  elements.flipDisplay.hidden = !isFlip;

  elements.displaySegments.forEach((button) => {
    const isActive = button.dataset.display === state.settings.display;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-checked", String(isActive));
  });
}

function renderBackground() {
  const selectedPreset = backgroundPresets.find((preset) => preset.id === state.settings.backgroundId);
  const imageUrl = state.settings.customBackground || selectedPreset?.url || backgroundPresets[0].url;

  elements.backgroundLayer.style.backgroundImage = `url("${imageUrl}")`;
  document.documentElement.style.setProperty("--shade-opacity", state.settings.shade / 100);
}

function renderBackgroundChoices() {
  [...elements.backgroundGrid.children].forEach((button) => {
    button.classList.toggle(
      "is-active",
      button.dataset.id === state.settings.backgroundId && !state.settings.customBackground,
    );
  });
}

function renderRunState() {
  elements.appShell.classList.toggle("is-running", timer.isRunning);
  elements.startPauseButton.setAttribute("aria-label", timer.isRunning ? "暂停" : "开始");
  elements.sessionState.textContent = timer.isRunning
    ? modeMeta[timer.mode].running
    : timer.remaining === durationFor(timer.mode)
      ? modeMeta[timer.mode].ready
      : modeMeta[timer.mode].paused;
}

function renderAccountState(options = {}) {
  const { keepStatus = false } = options;
  const configured = hasSupabaseConfig();

  elements.accountButton.classList.toggle("is-signed-in", Boolean(cloud.user));
  elements.authForm.hidden = !configured || Boolean(cloud.user);
  elements.accountActions.hidden = !configured || !cloud.user;
  elements.accountEmail.textContent = cloud.user?.email || (configured ? "未登录" : "未配置 Supabase");

  if (keepStatus) {
    return;
  }

  if (!configured) {
    setSyncStatus("请先填写 supabase-config.js 中的 Supabase URL 和 anon key。", "error");
  } else if (cloud.user) {
    setSyncStatus("已登录，云同步开启。", "ok");
  } else {
    setSyncStatus("登录后会在多个设备之间同步记录和设置。", "muted");
  }
}

function toggleTimer() {
  if (timer.isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
}

function startTimer() {
  if (timer.remaining <= 0) {
    timer.remaining = durationFor(timer.mode);
  }

  timer.isRunning = true;
  timer.startedAt = Date.now();
  timer.baseRemaining = timer.remaining;
  clearInterval(timer.intervalId);
  timer.intervalId = window.setInterval(tick, 100);
  renderRunState();
}

function pauseTimer() {
  if (!timer.isRunning) {
    return;
  }

  tick();
  timer.isRunning = false;
  clearInterval(timer.intervalId);
  timer.intervalId = null;
  persistState({ immediate: true });
  render();
}

function resetTimer() {
  pauseTimer();
  timer.total = durationFor(timer.mode);
  timer.remaining = timer.total;
  persistState({ immediate: true });
  render();
}

function tick() {
  if (!timer.isRunning) {
    return;
  }

  const elapsedSeconds = (Date.now() - timer.startedAt) / 1000;
  const nextRemaining = Math.max(0, timer.baseRemaining - elapsedSeconds);
  const consumed = Math.max(0, timer.remaining - nextRemaining);
  const secondChanged = Math.ceil(timer.remaining) !== Math.ceil(nextRemaining);

  if (consumed > 0 && timer.mode === "focus") {
    addFocusSeconds(consumed);
  }

  timer.remaining = nextRemaining;

  if (secondChanged) {
    persistState({ remote: false });
    queueCloudCheckpoint();
    renderStats();
    renderHeatmap();
  }

  renderTime();
  renderRing();

  if (timer.remaining <= 0) {
    finishCurrentSession({ skipped: false });
  }
}

function finishCurrentSession({ skipped }) {
  const completedMode = timer.mode;
  const shouldCountFocus = completedMode === "focus" && !skipped;

  clearInterval(timer.intervalId);
  timer.intervalId = null;
  timer.isRunning = false;

  if (shouldCountFocus) {
    state.stats.completedFocus += 1;
  }

  if (!skipped) {
    playChime();
  }

  if (completedMode === "focus" && !skipped) {
    switchMode("short", {
      shouldPersist: false,
    });
    persistState({ immediate: true });
    render();
    startTimer();
    return;
  }

  if ((completedMode === "short" || completedMode === "long") && !skipped) {
    switchMode("focus", {
      shouldPersist: false,
    });
    persistState({ immediate: true });
    render();
    showCycleDialog();
    return;
  }

  switchMode(getSkippedNextMode(completedMode), {
    shouldPersist: false,
  });
  persistState({ immediate: true });
  render();
}

function switchMode(mode, options = {}) {
  if (!modeMeta[mode]) {
    return;
  }

  const shouldPersist = options.shouldPersist ?? true;
  pauseTimer();
  timer.mode = mode;
  timer.total = durationFor(mode);
  timer.remaining = timer.total;

  if (shouldPersist) {
    persistState({ immediate: true });
  }

  render();
}

function getSkippedNextMode(completedMode) {
  return completedMode === "focus" ? "short" : "focus";
}

function updateDuration(mode, value) {
  const limits = {
    focus: [1, 180],
    short: [1, 60],
    long: [1, 120],
  };
  const [min, max] = limits[mode];
  const nextValue = clamp(Number(value) || defaultState.settings.durations[mode], min, max);

  state.settings.durations[mode] = nextValue;
  document.querySelector(`#${mode}MinutesInput`).value = nextValue;

  if (!timer.isRunning && timer.mode === mode) {
    timer.total = durationFor(mode);
    timer.remaining = timer.total;
  }

  persistState();
  render();
}

function applyBackgroundUrl() {
  const url = elements.backgroundUrlInput.value.trim();

  if (!url) {
    return;
  }

  state.settings.customBackground = url;
  state.settings.backgroundId = "custom-url";
  persistState();
  renderBackground();
  renderBackgroundChoices();
}

function handleBackgroundFile() {
  const [file] = elements.backgroundFileInput.files;

  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    state.settings.customBackground = String(reader.result);
    state.settings.backgroundId = "local-file";
    elements.backgroundUrlInput.value = "";
    persistState();
    renderBackground();
    renderBackgroundChoices();
    setSyncStatus("本地图片只保存在当前浏览器；要跨设备同步背景，请使用图片地址。", "muted");
  });
  reader.readAsDataURL(file);
}

function openPanel(panelName) {
  const copy = {
    background: ["背景", "更换背景"],
    display: ["样式", "倒计时样式"],
    heatmap: ["热力图", "专注热力图"],
    settings: ["设置", "计时设置"],
    account: ["账号", "云同步"],
  };
  const [kicker, title] = copy[panelName];

  elements.panelKicker.textContent = kicker;
  elements.panelTitle.textContent = title;
  elements.panelPages.forEach((page) => {
    page.classList.toggle("is-active", page.dataset.panel === panelName);
  });
  elements.sidePanel.hidden = false;
  if (panelName === "heatmap") {
    renderHeatmap();
  }
  renderAccountState({ keepStatus: panelName === "account" });
}

function closePanel() {
  elements.sidePanel.hidden = true;
}

function showCycleDialog() {
  closePanel();
  elements.cycleDialog.hidden = false;
  elements.confirmNextCycleButton.focus();
}

function hideCycleDialog() {
  elements.cycleDialog.hidden = true;
}

function startNextCycle() {
  hideCycleDialog();
  switchMode("focus", {
    shouldPersist: false,
  });
  persistState({ immediate: true });
  render();
  startTimer();
}

function cancelNextCycle() {
  hideCycleDialog();
  switchMode("focus", {
    shouldPersist: false,
  });
  persistState({ immediate: true });
  render();
}

function handleKeyboard(event) {
  const tagName = document.activeElement?.tagName;

  if (tagName === "INPUT" || tagName === "TEXTAREA") {
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();
    toggleTimer();
  }

  if (event.key.toLowerCase() === "r") {
    resetTimer();
  }

  if (event.key.toLowerCase() === "s") {
    finishCurrentSession({ skipped: true });
  }

  if (event.key === "Escape") {
    if (!elements.cycleDialog.hidden) {
      cancelNextCycle();
    } else {
      closePanel();
    }
  }
}

function playChime() {
  if (!state.settings.sound) {
    return;
  }

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContext();
    const gain = context.createGain();

    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.9);
    gain.connect(context.destination);

    [523.25, 659.25, 783.99].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.frequency.value = frequency;
      oscillator.type = "sine";
      oscillator.connect(gain);
      oscillator.start(context.currentTime + index * 0.09);
      oscillator.stop(context.currentTime + 0.55 + index * 0.09);
    });

    window.setTimeout(() => context.close(), 1200);
  } catch {
    // Audio is optional; browsers can block it until a user gesture happens.
  }
}

function getAuthCredentials() {
  const email = elements.authEmailInput.value.trim();
  const password = elements.authPasswordInput.value;

  if (!email || !password) {
    setSyncStatus("请输入邮箱和密码。", "error");
    return null;
  }

  if (password.length < 6) {
    setSyncStatus("密码至少需要 6 位。", "error");
    return null;
  }

  return {
    email,
    password,
  };
}

function ensureCloudClient() {
  if (!hasSupabaseConfig()) {
    setSyncStatus("请先填写 supabase-config.js 中的 Supabase URL 和 anon key。", "error");
    return false;
  }

  if (!cloud.client) {
    setSyncStatus("Supabase 还没有初始化完成，请刷新页面后重试。", "error");
    return false;
  }

  return true;
}

function hasSupabaseConfig() {
  const url = String(supabaseConfig.url || "").trim();
  const anonKey = String(supabaseConfig.anonKey || "").trim();
  return Boolean(url && anonKey && !url.includes("YOUR_") && !anonKey.includes("YOUR_"));
}

function setSyncStatus(message, tone = "muted") {
  elements.syncStatus.textContent = message;
  elements.syncStatus.classList.toggle("is-ok", tone === "ok");
  elements.syncStatus.classList.toggle("is-error", tone === "error");
}

function addFocusSeconds(seconds) {
  ensureTodayStats();
  const today = getTodayKey();
  state.stats.focusSeconds += seconds;
  state.stats.history[today] = (state.stats.history[today] || 0) + seconds;
}

function getDailyFocusSeconds(dateKey) {
  if (dateKey === getTodayKey()) {
    return Math.max(state.stats.history[dateKey] || 0, state.stats.focusSeconds);
  }

  return state.stats.history[dateKey] || 0;
}

function getHeatmapLevel(seconds) {
  if (seconds <= 0) {
    return 0;
  }

  const hours = seconds / 3600;

  if (hours < 1) {
    return 1;
  }

  if (hours < 2.5) {
    return 2;
  }

  if (hours < 4) {
    return 3;
  }

  return 4;
}

function formatHours(hours) {
  return `${hours.toFixed(1)}h`;
}

function normalizeHistory(history = {}) {
  return Object.fromEntries(
    Object.entries(history)
      .filter(([dateKey]) => /^\d{4}-\d{2}-\d{2}$/.test(dateKey))
      .map(([dateKey, seconds]) => [dateKey, Math.max(0, Number(seconds) || 0)]),
  );
}

function mergeHistories(...histories) {
  const merged = {};

  histories.forEach((history) => {
    Object.entries(normalizeHistory(history)).forEach(([dateKey, seconds]) => {
      merged[dateKey] = Math.max(merged[dateKey] || 0, seconds);
    });
  });

  return merged;
}

function getMonthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function durationFor(mode) {
  return clamp(state.settings.durations[mode], 1, 180) * 60;
}

function durationForState(sourceState, mode) {
  return clamp(sourceState.settings.durations[mode], 1, 180) * 60;
}

function formatCountdown(totalSeconds) {
  const safeSeconds = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatTimeOfDay(date) {
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(value) {
  if (!value) {
    return "刚刚";
  }

  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTodayKey() {
  return formatDateKey(new Date());
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
