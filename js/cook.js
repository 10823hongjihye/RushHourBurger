const CookScene = (() => {
  const SLOTS = ["a", "b"];
  const TOPPINGS = ["cheese", "lettuce", "tomato", "pickle"];
  const SAUCES = ["mayo", "ketchup"];
  const DRINKS = ["grape", "orange", "melon"];
  const GUEST_TYPES = [1, 2, 3];
  const GUEST_MOOD_ART = { calm: "happy", worry: "upset", angry: "angry" };
  const ANGRY_SHAKE_INTERVAL = 2000;
  const ANGRY_SHAKE_DURATION = 400;
  const ANGRY_SHAKE_AMOUNT = 5;

  // =========================
  // 패티 굽기 — 숫자만 바꾸고 새로고침
  // =========================
  // 뒤집기까지 기다리는 시간(ms)
  const FLIP_MS = 3000;
  // 뒤집힌 뒤 집기 가능해지는 시간(ms). PATTY_BURN_DELAY 보다 짧아야 함
  const READY_MS = 3000;
  // 뒤집지 않고 오래 방치하면 타는 시간(ms)
  const BURN_MS = 8000;
  // 뒤집힌 뒤 그릴에 그대로 두면 타는 시간(초). 집으면 타는 타이머 취소
  const PATTY_BURN_DELAY = 4.0;
  const PATTY_BURN_DELAY_MS = Math.round(PATTY_BURN_DELAY * 1000);
  // 패티 위 FLIP/CLICK 안내. 단위: 그릴 패티 기준 % / 배율
  const COOKING_HINT_ENABLED = true;
  const COOKING_HINT_OFFSET_X = 0;
  const COOKING_HINT_OFFSET_Y = -18;
  const COOKING_HINT_SCALE = 1;
  // FLIP 필요 시 패티 PNG 외곽 노란 glow (크기/강도). needsFlip 단계에서만 표시
  const PATTY_FLIP_GLOW_SIZE = 11; // px
  const PATTY_FLIP_GLOW_ALPHA = 0.9;
  const PATTY_FLIP_GLOW_RGB = "255, 210, 90";

  const SPAWN_MS = 600;

  // =========================
  // Easy 모드 — 소스 / 대기시간 / 주문 순서
  // =========================
  // Easy에서만 등장하는 소스. Normal/Hard는 SAUCES 전체 사용
  const EASY_SAUCES = ["ketchup"];
  // Easy 손님 대기시간(ms). 기존 easy(base 46000)보다 여유 있게
  const EASY_CUSTOMER_WAIT = { base: 72000, per: 4000, max: 95000 };
  // Normal은 기존 값 유지
  const NORMAL_CUSTOMER_WAIT = { base: 24000, per: 1500, max: 32000 };
  const HARD_CUSTOMER_WAIT = { base: 20000, per: 1200, max: 26000 };
  // 손님 대기시간. 옵션 난이도 easy / normal / hard.
  const WAIT = {
    easy: EASY_CUSTOMER_WAIT,
    normal: NORMAL_CUSTOMER_WAIT,
    hard: HARD_CUSTOMER_WAIT,
  };
  const RAW_PATTY = "assets/ingredients/uncooked-patty.png";
  const COOKED_PATTY = "assets/ingredients/patty.png";
  const DRINK_SRC = {
    grape: "assets/kitchen/grape-juice.png",
    orange: "assets/kitchen/orange-juice.png",
    melon: "assets/kitchen/melon-juice.png",
  };

  const LAYERS = {
    bun: { src: "assets/ingredients/bottom-bread.png", className: "layer-bun" },
    "bun-top": { src: "assets/ingredients/upper-bread.png", className: "layer-bun-top" },
    patty: { src: COOKED_PATTY, className: "layer-patty" },
    mayo: { src: "assets/ingredients/saucylicious1.png", icon: "assets/ingredients/source1.png", className: "layer-sauce layer-mayo" },
    ketchup: { src: "assets/ingredients/saucylicious2.png", icon: "assets/ingredients/source2.png", className: "layer-sauce layer-ketchup" },
    cheese: { src: "assets/ingredients/cheese.png", className: "layer-topping" },
    lettuce: { src: "assets/ingredients/lettuce.png", className: "layer-topping" },
    tomato: { src: "assets/ingredients/tomato.png", className: "layer-topping" },
    pickle: { src: "assets/ingredients/pickle.png", className: "layer-topping" },
  };

  let plates = [
    { stack: [], drink: null },
    { stack: [], drink: null },
  ];
  let grills = [null, null];
  let tickId = null;
  let guests = { a: null, b: null };
  let spawnAt = { a: 0, b: 0 };
  let angryShakeTimer = { a: 0, b: 0 };
  // 튜토리얼 실습 중: 조작·패티 굽기는 허용, 손님 타이머/점수만 멈춤
  let tutorialPractice = false;

  // 튜토리얼에서 맞춰 만들 고정 주문 (빌드 순서와 동일 → Medium/Hard 순서 판정도 통과)
  const TUTORIAL_ORDER = {
    layers: ["bun", "patty", "ketchup", "lettuce", "bun-top"],
    drink: "grape",
  };

  function emitPractice(event, detail) {
    if (!tutorialPractice) {
      return;
    }
    if (typeof window.TutorialScene?.onPracticeEvent === "function") {
      window.TutorialScene.onPracticeEvent(event, detail || {});
    }
  }

  function pauseGuestsOnly() {
    const now = clock();
    SLOTS.forEach((id) => {
      if (guests[id] && !guests[id].pauseStart) {
        guests[id].pauseStart = now;
      }
    });
  }

  function setTutorialLock(on) {
    tutorialPractice = Boolean(on);
    if (tutorialPractice) {
      // 그릴은 굴리고, 손님 대기만 멈춤
      grills.forEach((grill) => unpauseTime(grill));
      pauseGuestsOnly();
    } else {
      unpauseAll();
    }
  }

  function isTutorialLocked() {
    return tutorialPractice;
  }

  function isPractice() {
    return tutorialPractice;
  }

  function seedTutorialGuest() {
    guests.a = {
      id: "a",
      type: 1,
      layers: TUTORIAL_ORDER.layers.slice(),
      drink: TUTORIAL_ORDER.drink,
      waitMs: 10 * 60 * 1000,
      startedAt: clock(),
      pauseStart: clock(),
      mood: null,
    };
    guests.b = null;
    spawnAt = { a: 0, b: Number.MAX_SAFE_INTEGER };
  }

  // 튜토리얼 종료 후 실제 영업 시작
  function beginShift() {
    tutorialPractice = false;
    SLOTS.forEach(stopAngryShake);
    grills = [null, null];
    guests = { a: null, b: null };
    spawnAt = { a: 0, b: 0 };
    clearPlate();
    unpauseAll();
    fillEmptySlots();
    render();
  }

  function els() {
    return {
      scene: document.querySelector('[data-scene="phase2"]'),
      hint: document.getElementById("shift-hint"),
      grill: document.getElementById("grill-zone"),
      pads: [...document.querySelectorAll(".grill-pad")],
    };
  }

  function plateEls(index) {
    return {
      root: document.getElementById(`build-plate-${index}`),
      serve: document.getElementById(`serve-item-${index}`),
      stack: document.getElementById(`burger-stack-${index}`),
      drink: document.getElementById(`drink-cup-${index}`),
    };
  }

  function plateOf(index) {
    return plates[index];
  }

  function plateIndexFromSlot(slotId) {
    if (slotId === "plate-0" || slotId === "plate") {
      return 0;
    }
    if (slotId === "plate-1") {
      return 1;
    }
    return -1;
  }

  function burgerPlateIndex(itemId) {
    if (itemId === "burger-0" || itemId === "burger") {
      return 0;
    }
    if (itemId === "burger-1") {
      return 1;
    }
    return -1;
  }

  function slotEl(id) {
    return document.getElementById(`customer-${id}`);
  }

  function sfx(name) {
    AudioBus.play(name, window.Game?.state?.sfxOn);
  }

  function setHint(text) {
    els().hint.textContent = text;
  }

  function clock() {
    return Date.now();
  }

  function shuffled(list) {
    const next = list.slice();
    for (let i = next.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    return next;
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function difficultyKey() {
    return window.Game?.state?.difficulty || "easy";
  }

  function isEasyMode() {
    return difficultyKey() === "easy";
  }

  // Easy는 EASY_SAUCES만, 그 외는 mayo/ketchup 전부
  function saucesForMode() {
    return isEasyMode() ? EASY_SAUCES.slice() : SAUCES.slice();
  }

  function generateOrder() {
    const vegan = Math.random() < 0.28;
    const middles = [];
    if (!vegan) {
      middles.push("patty");
    }
    const extras = [pick(saucesForMode()), ...shuffled(TOPPINGS)];
    extras.forEach((item) => {
      if (middles.length < 4 && !middles.includes(item)) {
        middles.push(item);
      }
    });
    const layers = ["bun", ...middles, "bun-top"];
    const drink = pick(DRINKS);
    return { layers, drink, waitMs: waitMsFor(middles.length) };
  }

  function waitMsFor(middleCount) {
    const key = difficultyKey();
    const spec = WAIT[key] || WAIT.easy;
    return Math.min(spec.max, spec.base + middleCount * spec.per);
  }

  // Easy에서는 마요 병/클릭 칸을 숨겨 케첩만 쓰게 함
  function syncSauceUi() {
    const easy = isEasyMode();
    document.querySelectorAll('[data-ing="mayo"], [data-layout-art="mayo"]').forEach((el) => {
      el.hidden = easy;
    });
  }

  function orderPrice(order) {
    return 8 + Math.max(0, order.layers.length - 3) * 2 + (order.drink ? 2 : 0);
  }

  function pickGuestType() {
    const used = SLOTS.map((slot) => guests[slot]?.type).filter(Boolean);
    const free = GUEST_TYPES.filter((type) => !used.includes(type));
    return pick(free.length ? free : GUEST_TYPES);
  }

  function guestArtSrc(type, mood) {
    const face = GUEST_MOOD_ART[mood] || "happy";
    return `assets/kitchen/customer${type}-${face}.png`;
  }

  function makeGuest(id) {
    const order = generateOrder();
    return {
      id,
      type: pickGuestType(),
      layers: order.layers,
      drink: order.drink,
      waitMs: order.waitMs,
      startedAt: clock(),
      pauseStart: null,
      mood: null,
    };
  }

  function startAngryPop(slot) {
    if (!slot) {
      return;
    }
    slot.style.setProperty("--angry-shake", `${ANGRY_SHAKE_AMOUNT}px`);
    slot.style.setProperty("--angry-shake-ms", `${ANGRY_SHAKE_DURATION}ms`);
    slot.classList.remove("is-angry-pop");
    void slot.offsetWidth;
    slot.classList.add("is-angry-pop");
    window.setTimeout(() => {
      slot.classList.remove("is-angry-pop");
    }, ANGRY_SHAKE_DURATION);
  }

  function stopAngryShake(id) {
    window.clearTimeout(angryShakeTimer[id]);
    angryShakeTimer[id] = 0;
    slotEl(id)?.classList.remove("is-angry-pop");
  }

  function queueAngryShake(id) {
    window.clearTimeout(angryShakeTimer[id]);
    angryShakeTimer[id] = window.setTimeout(() => {
      if (!guests[id] || moodOf(guests[id]) !== "angry" || window.Game?.state?.paused) {
        if (!guests[id] || moodOf(guests[id]) !== "angry") {
          stopAngryShake(id);
        } else {
          queueAngryShake(id);
        }
        return;
      }
      startAngryPop(slotEl(id));
      queueAngryShake(id);
    }, ANGRY_SHAKE_INTERVAL);
  }

  function remainingMs(guest) {
    if (!guest) {
      return 0;
    }
    const end = guest.pauseStart || clock();
    return guest.waitMs - (end - guest.startedAt);
  }

  function moodOf(guest) {
    const ratio = remainingMs(guest) / guest.waitMs;
    if (ratio > 0.6) {
      return "calm";
    }
    if (ratio > 0.3) {
      return "worry";
    }
    return "angry";
  }

  function iconNode(id, asIcon) {
    const meta = LAYERS[id];
    if (!meta) {
      return null;
    }
    const node = document.createElement("img");
    node.src = asIcon && meta.icon ? meta.icon : meta.src;
    node.alt = "";
    return node;
  }

  function drinkNode(flavor) {
    if (!flavor) {
      return null;
    }
    const node = document.createElement("img");
    node.src = DRINK_SRC[flavor];
    node.alt = "";
    node.className = "drink-icon";
    return node;
  }

  function hasSauce(index) {
    return plateOf(index).stack.some((id) => SAUCES.includes(id));
  }

  function unpauseTime(obj) {
    if (!obj?.pauseStart) {
      return;
    }
    const pausedFor = clock() - obj.pauseStart;
    obj.startedAt += pausedFor;
    if (obj.flippedAt) {
      obj.flippedAt += pausedFor;
    }
    obj.pauseStart = null;
  }

  function elapsedMs(slot) {
    const grill = grills[slot];
    if (!grill) {
      return 0;
    }
    const end = grill.pauseStart || clock();
    return end - grill.startedAt;
  }

  function sideElapsedMs(slot) {
    const grill = grills[slot];
    if (!grill?.flippedAt) {
      return 0;
    }
    const end = grill.pauseStart || clock();
    return end - grill.flippedAt;
  }

  function grillPhase(slot) {
    const grill = grills[slot];
    if (!grill) {
      return "empty";
    }
    if (!grill.flippedAt) {
      // 튜토리얼 실습 중에는 뒤집기 전에도 타지 않음
      if (!tutorialPractice && elapsedMs(slot) >= BURN_MS) {
        return "burnt";
      }
      if (elapsedMs(slot) >= FLIP_MS) {
        return "needsFlip";
      }
      return "cooking";
    }
    // 튜토리얼 실습 중에는 뒤집힌 패티가 타지 않게 해 여유를 줌
    if (!tutorialPractice && !grill.savedFromBurn && !grill.held && sideElapsedMs(slot) >= PATTY_BURN_DELAY_MS) {
      return "burnt";
    }
    if (sideElapsedMs(slot) >= READY_MS) {
      return "ready";
    }
    return "cooking2";
  }

  function firstSlot(phase) {
    return grills.findIndex((_, index) => grillPhase(index) === phase);
  }

  function canCloseBun(index) {
    return plateOf(index).stack.includes("bun");
  }

  function isClosed(index) {
    return plateOf(index).stack.includes("bun-top");
  }

  function anyClosed() {
    return plates.some((_, index) => isClosed(index));
  }

  function matchesGuest(guest, index) {
    const plate = plateOf(index);
    if (!guest || plate.drink !== guest.drink || plate.stack.length !== guest.layers.length) {
      return false;
    }
    // Easy: 재료 종류·개수만 확인 (쌓는 순서는 무시). Normal/Hard: 순서까지 일치
    if (isEasyMode()) {
      const need = guest.layers.slice().sort().join("\0");
      const have = plate.stack.slice().sort().join("\0");
      return need === have;
    }
    return guest.layers.every((id, layerIndex) => plate.stack[layerIndex] === id);
  }

  function hintForState() {
    if (firstSlot("burnt") !== -1) {
      return "탔어요! 탄 패티를 눌러 버리세요";
    }
    if (firstSlot("needsFlip") !== -1) {
      return "그릴의 패티를 눌러 뒤집으세요";
    }
    if (firstSlot("cooking") !== -1 || firstSlot("cooking2") !== -1) {
      return "노릇해지면 그릴의 패티를 뒤집으세요";
    }
    if (firstSlot("ready") !== -1) {
      return "익은 패티를 접시로 드래그하세요";
    }
    if (plates.every((plate) => !plate.stack.includes("bun"))) {
      return "아래 빵을 집어서 접시에 놓으세요";
    }
    if (!anyClosed()) {
      return "재료를 집어 접시에 쌓으세요. 케첩·마요, 주스 맛도 맞춰 주세요";
    }
    return "접시를 집어서 손님에게 주세요";
  }

  function fitGrillPatty(img, index) {
    if (typeof window.Layout?.applyGrillPatty === "function") {
      window.Layout.applyGrillPatty(img, index);
    }
    img.style.pointerEvents = "none";
  }

  function applyFlipGlowVars(root) {
    if (!root) {
      return;
    }
    root.style.setProperty("--patty-flip-glow-size", `${PATTY_FLIP_GLOW_SIZE}px`);
    root.style.setProperty("--patty-flip-glow-alpha", String(PATTY_FLIP_GLOW_ALPHA));
    root.style.setProperty("--patty-flip-glow-rgb", PATTY_FLIP_GLOW_RGB);
  }

  function cookingHintText(phase) {
    if (phase === "needsFlip") {
      return "FLIP";
    }
    if (phase === "ready") {
      return "CLICK";
    }
    return "";
  }

  function renderGrill() {
    const labels = {
      empty: "",
      cooking: "굽는 중",
      needsFlip: "뒤집기!",
      cooking2: "굽는 중",
      ready: "완성",
      burnt: "탐",
    };
    els().pads.forEach((pad, index) => {
      const phase = grillPhase(index);
      pad.dataset.phase = phase;
      const img = pad.querySelector(".grill-patty");
      const label = pad.querySelector(".grill-label");
      let hint = pad.querySelector(".grill-cook-hint");
      if (!hint) {
        hint = document.createElement("span");
        hint.className = "grill-cook-hint";
        hint.setAttribute("aria-hidden", "true");
        pad.appendChild(hint);
      }
      if (img.classList.contains("is-dragging")) {
        hint.hidden = true;
        return;
      }
      img.hidden = phase === "empty";
      img.classList.toggle("is-empty", phase === "empty");
      const src = phase === "cooking" || phase === "needsFlip" ? RAW_PATTY : COOKED_PATTY;
      if (!img.getAttribute("src") || !img.getAttribute("src").includes(src)) {
        img.src = src;
      }
      if (phase !== "empty") {
        fitGrillPatty(img, index);
      }
      if (phase === "ready") {
        img.dataset.dragId = `cooked-${index}`;
        img.style.pointerEvents = "auto";
      } else {
        delete img.dataset.dragId;
        img.classList.remove("is-placed");
      }
      label.textContent = labels[phase] || "";
      // 처음 플레이어도 패티를 눌러야 함을 바로 알 수 있게 FLIP / CLICK 표시
      const hintText = COOKING_HINT_ENABLED ? cookingHintText(phase) : "";
      if (hintText) {
        hint.hidden = false;
        hint.textContent = hintText;
        hint.style.setProperty("--cook-hint-x", `${COOKING_HINT_OFFSET_X}%`);
        hint.style.setProperty("--cook-hint-y", `${COOKING_HINT_OFFSET_Y}%`);
        hint.style.setProperty("--cook-hint-scale", String(COOKING_HINT_SCALE));
      } else {
        hint.hidden = true;
        hint.textContent = "";
      }
    });
  }

  function renderStack() {
    plates.forEach((plate, index) => {
      const { stack: stackEl, drink: drinkEl, serve } = plateEls(index);
      if (!stackEl || !drinkEl || !serve) {
        return;
      }
      stackEl.innerHTML = "";
      plate.stack.forEach((id) => {
        const node = iconNode(id);
        if (!node) {
          return;
        }
        node.className = `burger-layer ${LAYERS[id].className || ""}`;
        node.dataset.layerId = id;
        stackEl.appendChild(node);
      });
      drinkEl.hidden = !plate.drink;
      if (plate.drink) {
        drinkEl.src = DRINK_SRC[plate.drink];
      }
      delete serve.dataset.dragId;
      serve.dataset.placed = "";
      serve.classList.toggle("is-ready", plateHasContent(index));
      serve.classList.remove("is-dragging");
    });
    window.Layout?.apply?.();
    plates.forEach((plate, index) => {
      window.Layout?.applyBurgerPlate?.(index, plate.stack, Boolean(plate.drink));
    });
  }

  function renderGuest(id) {
    const slot = slotEl(id);
    const guest = guests[id];
    const speech = slot.querySelector(".mini-speech");
    const bar = slot.querySelector(".wait-bar i");
    const art = slot.querySelector(".customer-art");
    if (!guest) {
      slot.hidden = spawnAt[id] > clock();
      slot.classList.add("is-empty");
      stopAngryShake(id);
      slot.dataset.mood = "";
      speech.innerHTML = "";
      bar.style.width = "0%";
      if (art) {
        art.hidden = true;
        art.removeAttribute("src");
      }
      return;
    }
    slot.hidden = false;
    slot.classList.remove("is-empty");
    slot.dataset.layers = guest.layers.join(",");
    slot.dataset.drink = guest.drink || "0";
    slot.dataset.waitMs = String(guest.waitMs);
    const mood = moodOf(guest);
    if (mood === "angry") {
      if (guest.mood !== "angry") {
        startAngryPop(slot);
        queueAngryShake(id);
      }
    } else {
      stopAngryShake(id);
    }
    guest.mood = mood;
    slot.dataset.mood = mood;
    if (art) {
      const src = guestArtSrc(guest.type, mood);
      if (!art.src.endsWith(src)) {
        art.src = src;
      }
      art.hidden = false;
    }
    const ratio = Math.max(0, Math.min(1, remainingMs(guest) / guest.waitMs));
    bar.style.width = `${ratio * 100}%`;
    speech.innerHTML = "";
    guest.layers.forEach((layerId) => {
      if (layerId === "bun" || layerId === "bun-top") {
        return;
      }
      const node = iconNode(layerId, true);
      if (node) {
        speech.appendChild(node);
      }
    });
    const cup = drinkNode(guest.drink);
    if (cup) {
      speech.appendChild(cup);
    }
  }

  function renderGuests() {
    SLOTS.forEach(renderGuest);
  }

  function render() {
    renderGrill();
    renderStack();
    renderGuests();
    setHint(hintForState());
  }

  function clearPlate(index) {
    const targets = index == null ? [0, 1] : [index];
    targets.forEach((plateIndex) => {
      const plate = plateOf(plateIndex);
      plate.stack = [];
      plate.drink = null;
      const { serve } = plateEls(plateIndex);
      if (!serve) {
        return;
      }
      delete serve.dataset.dragId;
      serve.dataset.placed = "";
      serve.classList.remove("is-placed", "is-dragging", "is-ready");
    });
    window.Layout?.apply?.();
  }

  function queueSpawn(id) {
    guests[id] = null;
    spawnAt[id] = clock() + SPAWN_MS;
    renderGuest(id);
  }

  function fillEmptySlots() {
    const now = clock();
    SLOTS.forEach((id) => {
      if (guests[id] || spawnAt[id] > now) {
        return;
      }
      guests[id] = makeGuest(id);
      spawnAt[id] = 0;
      renderGuest(id);
    });
  }

  function startGrill(slot) {
    const index = slot ?? firstSlot("empty");
    if (index < 0) {
      setHint("그릴이 가득이에요");
      sfx("fail");
      return;
    }
    grills[index] = {
      startedAt: clock(),
      flippedAt: null,
      pauseStart: null,
      savedFromBurn: false,
      held: false,
      warned: {},
    };
    sfx("drop");
    render();
  }

  function pickupPatty(slot, plateIndex) {
    const plate = plateOf(plateIndex);
    if (!plate.stack.includes("bun")) {
      setHint("먼저 아래 빵을 올리세요");
      sfx("fail");
      return;
    }
    if (plate.stack.includes("patty")) {
      setHint("패티는 이미 올렸어요");
      sfx("fail");
      return;
    }
    if (isClosed(plateIndex)) {
      setHint("이미 빵을 닫았어요");
      sfx("fail");
      return;
    }
    // 집는 순간 타는 타이머 영구 취소
    if (grills[slot]) {
      grills[slot].savedFromBurn = true;
      grills[slot].held = false;
    }
    plate.stack.push("patty");
    grills[slot] = null;
    sfx("pickup");
    render();
  }

  // 드래그로 익은 패티를 집으면 타는 타이머 정지/취소
  function onPicked(itemId) {
    const cooked = cookedIndex(itemId);
    if (cooked === -1) {
      return;
    }
    const grill = grills[cooked];
    if (!grill) {
      return;
    }
    grill.savedFromBurn = true;
    grill.held = true;
  }

  function onMissed(itemId) {
    const cooked = cookedIndex(itemId);
    if (cooked === -1) {
      return;
    }
    const grill = grills[cooked];
    if (!grill) {
      return;
    }
    // 다시 그릴에 돌아와도 이미 집었으므로 타지 않음
    grill.held = false;
    grill.savedFromBurn = true;
  }

  function discardGrill(slot) {
    grills[slot] = null;
    sfx("fail");
    render();
  }

  function flipPatty(slot) {
    const grill = grills[slot];
    if (!grill || grill.flippedAt) {
      return;
    }
    grill.flippedAt = clock();
    sfx("click");
    render();
  }

  function onGrillClick(event) {
    if (window.Game?.state?.paused) {
      return;
    }
    if (tutorialPractice && typeof window.TutorialScene?.allowsGrillClick === "function" && !window.TutorialScene.allowsGrillClick()) {
      return;
    }
    const pad = event.target.closest(".grill-pad");
    if (!pad) {
      return;
    }
    const slot = Number(pad.dataset.grill);
    const phase = grillPhase(slot);
    if (phase === "needsFlip") {
      flipPatty(slot);
      emitPractice("flip", { slot });
      return;
    }
    if (phase === "burnt") {
      if (tutorialPractice) {
        return;
      }
      discardGrill(slot);
      return;
    }
    if (phase === "empty") {
      setHint("생패티를 그릴에 드래그하세요");
    }
  }

  function addBun(plateIndex) {
    const plate = plateOf(plateIndex);
    if (!plate.stack.includes("bun")) {
      plate.stack.push("bun");
      sfx("drop");
      render();
      emitPractice("drop", { itemId: "bun", slotId: `plate-${plateIndex}`, plateIndex });
      return;
    }
    if (isClosed(plateIndex)) {
      setHint("빵은 이미 닫혔어요");
      sfx("fail");
      return;
    }
    if (!canCloseBun(plateIndex)) {
      setHint("먼저 아래 빵을 올리세요");
      sfx("fail");
      return;
    }
    plate.stack.push("bun-top");
    sfx("drop");
    render();
    emitPractice("drop", { itemId: "bun-top", slotId: `plate-${plateIndex}`, plateIndex });
  }

  function addDrink(flavor, plateIndex) {
    const plate = plateOf(plateIndex);
    if (plate.drink) {
      setHint("음료는 이미 받았어요");
      return;
    }
    plate.drink = flavor;
    sfx("drop");
    render();
    emitPractice("drop", { itemId: flavor, slotId: `plate-${plateIndex}`, plateIndex });
  }

  function addLayer(id, plateIndex) {
    const plate = plateOf(plateIndex);
    if (!plate.stack.includes("bun")) {
      setHint("먼저 아래 빵을 올리세요");
      sfx("fail");
      return;
    }
    if (isClosed(plateIndex)) {
      setHint("이미 빵을 닫았어요");
      sfx("fail");
      return;
    }
    if (SAUCES.includes(id) && hasSauce(plateIndex)) {
      setHint("소스는 이미 올렸어요");
      sfx("fail");
      return;
    }
    // Easy 모드에서는 케첩만 허용
    if (isEasyMode() && SAUCES.includes(id) && !EASY_SAUCES.includes(id)) {
      setHint("Easy에서는 케첩만 써요");
      sfx("fail");
      return;
    }
    if (id !== "bun" && plate.stack.includes(id)) {
      setHint("이미 올렸어요");
      sfx("fail");
      return;
    }
    plate.stack.push(id);
    sfx("drop");
    render();
    emitPractice("drop", { itemId: id, slotId: `plate-${plateIndex}`, plateIndex });
  }

  function useIngredient(id, plateIndex) {
    if (window.Game?.state?.paused) {
      return;
    }
    if (id === "bun") {
      addBun(plateIndex);
      return;
    }
    if (id === "patty") {
      const ready = firstSlot("ready");
      const plate = plateOf(plateIndex);
      if (ready !== -1 && plate.stack.includes("bun") && !plate.stack.includes("patty") && !isClosed(plateIndex)) {
        pickupPatty(ready, plateIndex);
        emitPractice("drop", { itemId: `cooked-${ready}`, slotId: `plate-${plateIndex}`, plateIndex });
        return;
      }
      if (firstSlot("empty") !== -1) {
        const slot = firstSlot("empty");
        startGrill(slot);
        emitPractice("drop", { itemId: "patty", slotId: `grill-${slot}`, grill: slot });
        return;
      }
      setHint(hintForState());
      return;
    }
    if (DRINKS.includes(id)) {
      addDrink(id, plateIndex);
      return;
    }
    addLayer(id, plateIndex);
  }

  function react(id, kind) {
    const slot = slotEl(id);
    slot.classList.remove("is-happy", "is-mad");
    slot.classList.add(kind === "happy" ? "is-happy" : "is-mad");
    window.setTimeout(() => {
      slot.classList.remove("is-happy", "is-mad");
    }, 650);
  }

  function guestIdFromSlot(slotId) {
    if (slotId === "customer-a") {
      return "a";
    }
    if (slotId === "customer-b") {
      return "b";
    }
    return null;
  }

  function ghostFor(id) {
    if (id === "bun") {
      const needsTop = plates.some((plate) => plate.stack.includes("bun") && !plate.stack.includes("bun-top"));
      return {
        id: "bun",
        src: needsTop ? LAYERS["bun-top"].src : LAYERS.bun.src,
        size: 108,
      };
    }
    if (id === "burger-0" || id === "burger-1") {
      return { id, clone: true };
    }
    if (id === "patty") {
      return { id: "patty", src: RAW_PATTY, size: 96 };
    }
    if (DRINKS.includes(id)) {
      return { id, src: DRINK_SRC[id], size: 72 };
    }
    const meta = LAYERS[id];
    if (!meta) {
      return null;
    }
    return {
      id,
      src: meta.icon || meta.src,
      size: SAUCES.includes(id) ? 78 : 96,
    };
  }

  function grillIndex(slotId) {
    if (slotId === "grill-0" || slotId === "grill-1") {
      return Number(slotId.slice(-1));
    }
    return -1;
  }

  function cookedIndex(itemId) {
    if (!itemId.startsWith("cooked-")) {
      return -1;
    }
    return Number(itemId.slice(-1));
  }

  function canDropOnPlate(itemId, plateIndex) {
    const plate = plateOf(plateIndex);
    if (burgerPlateIndex(itemId) !== -1) {
      return true;
    }
    const cooked = cookedIndex(itemId);
    if (cooked !== -1) {
      return grillPhase(cooked) === "ready" && plate.stack.includes("bun") && !plate.stack.includes("patty") && !isClosed(plateIndex);
    }
    if (itemId === "bun") {
      return !isClosed(plateIndex);
    }
    if (DRINKS.includes(itemId)) {
      return !plate.drink;
    }
    if (SAUCES.includes(itemId) || TOPPINGS.includes(itemId)) {
      if (isEasyMode() && SAUCES.includes(itemId) && !EASY_SAUCES.includes(itemId)) {
        return false;
      }
      return plate.stack.includes("bun") && !isClosed(plateIndex) && !plate.stack.includes(itemId) && !(SAUCES.includes(itemId) && hasSauce(plateIndex));
    }
    return false;
  }

  function plateHasContent(index) {
    const plate = plateOf(index);
    return plate.stack.length > 0 || Boolean(plate.drink);
  }

  function fillTutorialPlate(index = 0) {
    plates[index] = {
      stack: TUTORIAL_ORDER.layers.slice(),
      drink: TUTORIAL_ORDER.drink,
    };
    render();
  }

  function canDrop(itemId, slotId) {
    if (window.Game?.state?.paused) {
      return false;
    }
    if (tutorialPractice && typeof window.TutorialScene?.allowsCookAction === "function" && !window.TutorialScene.allowsCookAction(itemId, slotId)) {
      return false;
    }
    if (slotId === "trash") {
      return burgerPlateIndex(itemId) !== -1;
    }
    const grill = grillIndex(slotId);
    if (grill !== -1) {
      return itemId === "patty" && grillPhase(grill) === "empty";
    }
    const plateIndex = plateIndexFromSlot(slotId);
    if (plateIndex !== -1) {
      return canDropOnPlate(itemId, plateIndex);
    }
    const served = burgerPlateIndex(itemId);
    if (served === -1) {
      return false;
    }
    const id = guestIdFromSlot(slotId);
    return Boolean(id && guests[id] && isClosed(served));
  }

  function onDropped(itemId, slotId) {
    if (slotId === "trash") {
      const served = burgerPlateIndex(itemId);
      if (served === -1) {
        return;
      }
      clearPlate(served);
      sfx("drop");
      setHint("버거를 버렸어요");
      renderStack();
      renderGrill();
      emitPractice("trash", { plateIndex: served, ok: true });
      return;
    }
    const grill = grillIndex(slotId);
    if (itemId === "patty" && grill !== -1) {
      startGrill(grill);
      emitPractice("drop", { itemId, slotId, grill });
      return;
    }
    const plateIndex = plateIndexFromSlot(slotId);
    if (plateIndex !== -1) {
      const cooked = cookedIndex(itemId);
      if (cooked !== -1) {
        pickupPatty(cooked, plateIndex);
        emitPractice("drop", { itemId, slotId, plateIndex });
        return;
      }
      if (burgerPlateIndex(itemId) !== -1) {
        return;
      }
      useIngredient(itemId, plateIndex);
      return;
    }
    const served = burgerPlateIndex(itemId);
    const id = guestIdFromSlot(slotId);
    if (served === -1 || !id || !isClosed(served) || !guests[id]) {
      return;
    }
    const guest = guests[id];
    if (matchesGuest(guest, served)) {
      if (tutorialPractice) {
        react(id, "happy");
        sfx("success");
        clearPlate(served);
        renderStack();
        renderGrill();
        emitPractice("serve", { guestId: id, plateIndex: served, ok: true });
        return;
      }
      window.Game.noteSale(orderPrice(guest));
      react(id, "happy");
      sfx("success");
      clearPlate(served);
      queueSpawn(id);
      setHint("잘 팔렸다! 다음 손님이다");
      renderStack();
      renderGrill();
      window.setTimeout(() => {
        if (window.Game?.state?.scene === "phase2") {
          setHint(hintForState());
        }
      }, 900);
      return;
    }
    react(id, "mad");
    sfx("fail");
    if (!tutorialPractice) {
      clearPlate(served);
    }
    renderStack();
    renderGrill();
    setHint("주문이 달라요. 다시 만들어 주세요");
  }

  function walkOut(id) {
    guests[id] = null;
    window.Game.noteMiss();
    sfx("fail");
    setHint("손님이 기다리다 나갔다");
    queueSpawn(id);
  }

  function pauseAll() {
    const now = clock();
    grills.forEach((grill) => {
      if (grill && !grill.pauseStart) {
        grill.pauseStart = now;
      }
    });
    SLOTS.forEach((id) => {
      if (guests[id] && !guests[id].pauseStart) {
        guests[id].pauseStart = now;
      }
    });
  }

  function unpauseAll() {
    grills.forEach((grill) => unpauseTime(grill));
    SLOTS.forEach((id) => unpauseTime(guests[id]));
  }

  function tickGrillWarnings() {
    grills.forEach((grill, index) => {
      if (!grill) {
        return;
      }
      const phase = grillPhase(index);
      if (phase === "needsFlip" && !grill.warned.flip) {
        grill.warned.flip = true;
        sfx("warn");
        emitPractice("needsFlip", { slot: index });
      }
      if (phase === "ready" && !grill.warned.ready) {
        grill.warned.ready = true;
        sfx("warn");
        emitPractice("ready", { slot: index });
      }
      if (phase === "burnt" && !grill.warned.burn) {
        grill.warned.burn = true;
        sfx("fail");
      }
    });
    renderGrill();
  }

  function tick() {
    if (window.Game?.state?.scene !== "phase2") {
      return;
    }
    if (window.Game.state.paused) {
      pauseAll();
      return;
    }
    if (tutorialPractice) {
      // 실습: 패티만 굽고 손님은 멈춰 둠
      grills.forEach((grill) => unpauseTime(grill));
      pauseGuestsOnly();
      tickGrillWarnings();
      if (firstSlot("needsFlip") !== -1 || firstSlot("ready") !== -1) {
        setHint(hintForState());
      }
      return;
    }
    unpauseAll();
    fillEmptySlots();
    SLOTS.forEach((id) => {
      if (guests[id] && remainingMs(guests[id]) <= 0) {
        walkOut(id);
      }
    });
    tickGrillWarnings();
    renderGuests();
    if (firstSlot("needsFlip") !== -1 || firstSlot("ready") !== -1 || firstSlot("burnt") !== -1) {
      setHint(hintForState());
    }
  }

  function reset(options = {}) {
    SLOTS.forEach(stopAngryShake);
    grills = [null, null];
    guests = { a: null, b: null };
    spawnAt = { a: 0, b: 0 };
    tutorialPractice = Boolean(options.tutorial);
    syncSauceUi();
    clearPlate();
    if (tutorialPractice) {
      seedTutorialGuest();
    } else {
      fillEmptySlots();
    }
    render();
  }

  function boot() {
    if (tickId !== null) {
      return;
    }
    const { scene, grill: grillEl } = els();
    applyFlipGlowVars(scene);
    scene.addEventListener("pointerdown", (event) => {
      if (window.Game?.state?.paused) {
        return;
      }
      const chip = event.target.closest("[data-ing]");
      if (chip) {
        if (tutorialPractice && typeof window.TutorialScene?.allowsPick === "function" && !window.TutorialScene.allowsPick(chip.dataset.ing)) {
          return;
        }
        const spec = ghostFor(chip.dataset.ing);
        if (spec) {
          DragDrop.startGhost(event, spec, chip);
        }
        return;
      }
      const plateRoot = event.target.closest(".build-plate");
      const plateIndex = plateIndexFromSlot(plateRoot?.dataset.dropId);
      if (plateIndex === -1 || !plateHasContent(plateIndex)) {
        return;
      }
      if (tutorialPractice && typeof window.TutorialScene?.allowsPick === "function" && !window.TutorialScene.allowsPick(`burger-${plateIndex}`)) {
        return;
      }
      const serve = plateEls(plateIndex).serve;
      const spec = ghostFor(`burger-${plateIndex}`);
      if (serve && spec) {
        DragDrop.startGhost(event, spec, serve);
      }
    });
    grillEl.addEventListener("click", onGrillClick);
    DragDrop.bind(scene);
    GUEST_TYPES.forEach((type) => {
      ["calm", "worry", "angry"].forEach((mood) => {
        const img = new Image();
        img.src = guestArtSrc(type, mood);
      });
    });
    tickId = window.setInterval(tick, 100);
    syncSauceUi();
  }

  return {
    boot,
    reset,
    canDrop,
    onDropped,
    onPicked,
    onMissed,
    syncDifficulty: syncSauceUi,
    setTutorialLock,
    isTutorialLocked,
    isPractice,
    beginShift,
    fillTutorialPlate,
    TUTORIAL_ORDER,
  };
})();
