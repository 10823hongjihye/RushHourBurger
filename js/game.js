(() => {
  // 테스트 진입점. 타이틀/미니게임은 그대로 두고, 시작할 씬만 고른다.
  //   null     → 타이틀부터 (타이틀 → 양치 → 요리)
  //   "brush"  → 양치부터
  //   "phase2" → 버거 만들기만
  const DEV_START_SCENE = null;
  const state = createDefaultState();
  let timerId = null;
  let lastWarnSecond = null;

  const hud = document.getElementById("hud");
  const sceneNav = document.getElementById("scene-nav");
  const inventoryEl = document.getElementById("inventory");
  const timeEl = document.getElementById("hud-time");
  const soldEl = document.getElementById("hud-sold");
  const coinsEl = document.getElementById("hud-coins");
  const missedEl = document.getElementById("hud-missed");
  const overlays = {
    guide: document.getElementById("overlay-guide"),
    options: document.getElementById("overlay-options"),
    pause: document.getElementById("overlay-pause"),
  };

  window.Game = {
    state,
    renderInventory,
    onItemPicked(id) {
      AudioBus.play("pickup", state.sfxOn);
      if (state.scene === "phase2" && typeof CookScene.onPicked === "function") {
        CookScene.onPicked(id);
      }
    },
    onItemDropped(itemId, slotId) {
      if (state.scene === "brush") {
        BrushScene.onDropped(itemId, slotId);
        return;
      }
      if (state.scene === "dress") {
        DressScene.onDropped(itemId, slotId);
        return;
      }
      if (state.scene === "phase2") {
        CookScene.onDropped(itemId, slotId);
        return;
      }
      AudioBus.play("drop", state.sfxOn);
      if (!state.foundItems.includes(itemId)) {
        state.foundItems.push(itemId);
      }
      renderInventory();
      const practice = document.querySelector('[data-scene="practice"]');
      const remaining = practice.querySelectorAll("[data-drag-id]:not(.is-placed)");
      if (remaining.length === 0) {
        practice.classList.add("is-complete");
        AudioBus.play("success", state.sfxOn);
      }
      void slotId;
    },
    onItemMissed(itemId) {
      AudioBus.play("fail", state.sfxOn);
      if (state.scene === "phase2" && typeof CookScene.onMissed === "function") {
        CookScene.onMissed(itemId);
      }
    },
    canDrop(itemId, slotId) {
      if (state.scene === "brush") {
        return BrushScene.canDrop(itemId, slotId);
      }
      if (state.scene === "dress") {
        return DressScene.canDrop(itemId, slotId);
      }
      if (state.scene === "phase2") {
        return CookScene.canDrop(itemId, slotId);
      }
      return true;
    },
    canPick(itemId) {
      if (state.scene === "phase2" && typeof TutorialScene?.isActive === "function" && TutorialScene.isActive()) {
        return TutorialScene.allowsPick?.(itemId) !== false;
      }
      return true;
    },
    noteSale(coins) {
      state.burgersSold += 1;
      state.coins += coins;
      state.sales += coins;
      updateHud();
    },
    noteMiss() {
      state.missedCustomers += 1;
      state.coins = Math.max(0, state.coins - 3);
      updateHud();
    },
    goScene(sceneId) {
      showScene(sceneId);
    },
    endShift() {
      endShift();
    },
  };

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function renderInventory() {
    inventoryEl.innerHTML = "";
    const items = state.foundItems;
    for (let index = 0; index < 8; index += 1) {
      const slot = document.createElement("div");
      slot.className = "inv-slot";
      const itemId = items[index];
      if (itemId && ITEM_META[itemId]) {
        slot.classList.add("is-filled");
        slot.innerHTML = `<span>${ITEM_META[itemId].icon}</span>`;
        slot.title = ITEM_META[itemId].label;
      }
      inventoryEl.appendChild(slot);
    }
  }

  function updateHud() {
    timeEl.textContent = formatTime(state.timeLeft);
    soldEl.textContent = String(state.burgersSold);
    coinsEl.textContent = String(state.coins);
    missedEl.textContent = String(state.missedCustomers);
    document.getElementById("hud-timer").classList.toggle("is-urgent", state.timeLeft <= 10);
  }

  function updateResult() {
    const ending = ENDINGS[state.ending] || ENDINGS.clear;
    const scene = document.getElementById("scene-result");
    const art = document.getElementById("ending-art");
    const stats = document.getElementById("result-stats");
    scene.dataset.ending = ending.tone || "ab";
    document.getElementById("result-kicker").textContent = ending.kicker;
    document.getElementById("result-title").textContent = ending.title;
    document.getElementById("result-copy").textContent = ending.copy;
    document.getElementById("stat-sold").textContent = String(state.burgersSold);
    document.getElementById("stat-sales").textContent = String(state.sales);
    document.getElementById("stat-missed").textContent = String(state.missedCustomers);
    document.getElementById("stat-rank").textContent = state.rank || ending.rank || "-";
    stats.hidden = state.ending === "late";
    art.hidden = true;
    if (ending.art) {
      art.onload = () => {
        art.hidden = false;
      };
      art.onerror = () => {
        art.hidden = true;
      };
      art.src = `${ending.art}?v=18`;
    }
  }

  function stopTimer() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function endShift() {
    state.rank = rankFromSold(state.burgersSold);
    state.ending = endingFromRank(state.rank);
    AudioBus.play(state.rank === "C" ? "fail" : "success", state.sfxOn);
    showScene("result");
  }

  function expireTime() {
    if (PHASE1_SCENES.includes(state.scene)) {
      failGame("late");
      return;
    }
    endShift();
  }

  function failGame(reason) {
    state.ending = reason;
    state.rank = ENDINGS[reason]?.rank ?? null;
    AudioBus.play("fail", state.sfxOn);
    showScene("result");
  }

  function startTimer() {
    stopTimer();
    lastWarnSecond = null;
    if (state.timeLeft <= 0) {
      expireTime();
      return;
    }
    timerId = window.setInterval(() => {
      if (state.paused || !GAMEPLAY_SCENES.includes(state.scene)) {
        return;
      }
      if (state.timeLeft <= 0) {
        expireTime();
        return;
      }
      state.timeLeft -= 1;
      updateHud();
      if (state.timeLeft <= 10 && state.timeLeft !== lastWarnSecond) {
        lastWarnSecond = state.timeLeft;
        AudioBus.play("warn", state.sfxOn);
      }
      if (state.timeLeft <= 0) {
        expireTime();
      }
    }, 1000);
  }

  function closeOverlays() {
    Object.values(overlays).forEach((overlay) => {
      overlay.hidden = true;
    });
  }

  function setPaused(paused) {
    state.paused = paused;
    overlays.pause.hidden = !paused;
    if (paused) {
      AudioBus.play("click", state.sfxOn);
    }
  }

  function resetPractice() {
    const scene = document.querySelector('[data-scene="practice"]');
    scene.classList.remove("is-complete");
    scene.querySelectorAll("[data-drag-id]").forEach((item) => {
      item.dataset.placed = "";
      item.classList.remove("is-placed", "is-dragging");
      item.removeAttribute("style");
      const home = scene.querySelector(`[data-home="${item.dataset.dragId}"]`);
      if (home) {
        home.appendChild(item);
      }
    });
    DragDrop.reset(scene);
  }

  function showScene(sceneId) {
    // 예전 정적 가이드 씬은 주방+튜토리얼로 연결
    if (sceneId === "tutorial") {
      sceneId = "phase2";
    }
    const previous = state.scene;
    state.scene = sceneId;
    document.querySelectorAll(".scene").forEach((scene) => {
      const active = scene.dataset.scene === sceneId;
      scene.classList.toggle("is-active", active);
      scene.hidden = !active;
    });

    const showHud = GAMEPLAY_SCENES.includes(sceneId);
    hud.hidden = !showHud || sceneId === "brush";
    sceneNav.hidden = !showHud || sceneId === "brush" || sceneId === "search" || sceneId === "dress" || sceneId === "phase2";
    inventoryEl.hidden = !showHud || sceneId === "brush" || sceneId === "phase2";

    if (sceneId === "practice" && previous !== "practice") {
      resetPractice();
    }

    if (sceneId === "brush") {
      state.timeLeft = state.phase1Time;
      state.foundItems = [];
      BrushScene.reset();
    }

    if (sceneId === "search") {
      SearchScene.reset();
    }

    if (sceneId === "dress") {
      DressScene.reset();
    }

    let deferTimer = false;
    if (sceneId === "phase2") {
      state.timeLeft = state.phase2Time;
      state.burgersSold = 0;
      state.coins = 0;
      state.sales = 0;
      state.missedCustomers = 0;
      state.rank = null;
      state.ending = null;
      const runTutorial = TutorialScene.isEnabled?.();
      CookScene.reset({ tutorial: runTutorial });
      if (runTutorial) {
        deferTimer = true;
        stopTimer();
        TutorialScene.start(() => {
          if (state.scene === "phase2") {
            updateHud();
            startTimer();
          }
        });
      }
    }

    if (sceneId === "result") {
      stopTimer();
      setPaused(false);
      closeOverlays();
      if (!state.ending) {
        state.ending = "clear";
      }
      updateResult();
    }

    if (sceneId === "title") {
      TitleScreen.replay();
    }

    if (previous === "phase2" && sceneId !== "phase2") {
      TutorialScene.stop?.();
      CookScene.setTutorialLock?.(false);
    }

    if (showHud && sceneId !== "brush" && !deferTimer) {
      updateHud();
      renderInventory();
      startTimer();
    } else if (!showHud || sceneId === "brush") {
      stopTimer();
    } else if (deferTimer) {
      updateHud();
      renderInventory();
      stopTimer();
    }
  }

  function syncOptions() {
    document.getElementById("opt-bgm").checked = state.bgmOn;
    document.getElementById("opt-sfx").checked = state.sfxOn;
    document.querySelectorAll("input[name='opt-difficulty']").forEach((input) => {
      input.checked = input.value === state.difficulty;
    });
  }

  function resetGame() {
    const next = createDefaultState();
    next.bgmOn = state.bgmOn;
    next.sfxOn = state.sfxOn;
    next.difficulty = state.difficulty || "easy";
    Object.assign(state, next);
    syncOptions();
    resetPractice();
    updateHud();
    renderInventory();
  }

  function startGame() {
    AudioBus.unlock();
    AudioBus.play("click", state.sfxOn);
    resetGame();
    closeOverlays();
    setPaused(false);
    AudioBus.restartBgm(state.bgmOn);
    showScene(DEV_START_SCENE || "brush");
  }

  function nextScene() {
    AudioBus.play("click", state.sfxOn);
    const index = SCENE_ORDER.indexOf(state.scene);
    const nextId = SCENE_ORDER[index + 1];
    if (nextId) {
      setPaused(false);
      if (nextId === "result") {
        state.ending = "clear";
      }
      showScene(nextId);
    }
  }

  function goTitle() {
    AudioBus.play("click", state.sfxOn);
    resetGame();
    closeOverlays();
    setPaused(false);
    // 타이틀로 돌아오면 BGM을 처음부터 다시
    AudioBus.restartBgm(state.bgmOn);
    showScene("title");
  }

  document.getElementById("stage").addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (!action) {
      return;
    }
    AudioBus.unlock();
    if (action === "start") {
      startGame();
    }
    if (action === "guide") {
      AudioBus.play("click", state.sfxOn);
      overlays.guide.hidden = false;
    }
    if (action === "options") {
      AudioBus.play("click", state.sfxOn);
      overlays.options.hidden = false;
    }
  });

  document.querySelector('[data-close="guide"]').addEventListener("click", () => {
    overlays.guide.hidden = true;
  });
  document.querySelector('[data-close="options"]').addEventListener("click", () => {
    overlays.options.hidden = true;
  });

  document.getElementById("btn-pause").addEventListener("click", () => {
    setPaused(true);
  });
  document.getElementById("btn-resume").addEventListener("click", () => {
    setPaused(false);
    AudioBus.play("click", state.sfxOn);
  });
  document.getElementById("btn-to-title").addEventListener("click", goTitle);
  document.getElementById("btn-result-title").addEventListener("click", goTitle);
  document.getElementById("btn-retry").addEventListener("click", startGame);
  document.getElementById("btn-next").addEventListener("click", nextScene);

  document.getElementById("opt-bgm").addEventListener("change", (event) => {
    state.bgmOn = event.target.checked;
    AudioBus.setBgmEnabled(state.bgmOn);
  });
  document.getElementById("opt-sfx").addEventListener("change", (event) => {
    state.sfxOn = event.target.checked;
  });
  document.querySelectorAll("input[name='opt-difficulty']").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) {
        state.difficulty = input.value;
        CookScene.syncDifficulty?.();
      }
    });
  });

  overlays.guide.addEventListener("click", (event) => {
    if (event.target === overlays.guide) {
      overlays.guide.hidden = true;
    }
  });
  overlays.options.addEventListener("click", (event) => {
    if (event.target === overlays.options) {
      overlays.options.hidden = true;
    }
  });

  DragDrop.bind(document.querySelector('[data-scene="practice"]'));
  BrushScene.boot();
  SearchScene.boot();
  DressScene.boot();
  TutorialScene.boot();
  CookScene.boot();
  syncOptions();
  updateHud();
  renderInventory();
  TitleScreen.boot();
  showScene(DEV_START_SCENE || "title");
})();
