/**
 * 햄버거 알바 튜토리얼 (실습형).
 * phase2 주방 위에 오버레이로 뜨며, 행동 완료 후 READY → START! → 실제 영업.
 *
 * 손볼 곳 (숫자만 바꾸고 새로고침)
 *   켜기/끄기           → TUTORIAL_ENABLED
 *   상단 위치           → TUTORIAL_TOP_DIALOGUE_POS / TEXT_POS / CHARACTER_POS
 *   하단 위치           → TUTORIAL_BOTTOM_DIALOGUE_POS / TEXT_POS / CHARACTER_POS
 *   조작형 말풍선       → TUTORIAL_ACTION_DIALOGUE_POS / TEXT_POS
 *   미니캐 크기         → TUTORIAL_CHARACTER_*
 *   ▼ 화살표(설명형)    → TUTORIAL_ARROW_* (마지막 글자 옆, GAP_PX)
 *   텍스트 폭           → TUTORIAL_TEXT_WIDTH / TUTORIAL_TEXT_WIDTH_NO_MINI
 *   드래그 가이드       → TUTORIAL_DRAG_GUIDE_*
 *   Glow                → TUTORIAL_GLOW_*
 *   READY/START 시간    → READY_DURATION_MS / START_DURATION_MS
 */
const TutorialScene = (() => {
  // =========================
  // TUTORIAL POSITION SETTINGS
  // 단위: 화면(#stage) %
  // 상단 / 하단을 각각 독립적으로 조절한다.
  // =========================
  const TUTORIAL_ENABLED = true;

  // --- 상단 (버거 조작 설명) ---
  // dialogue = chat.png 박스 전체 이동
  const TUTORIAL_TOP_DIALOGUE_POS = { x: 0, y: -52 };
  // text = 말풍선 안 글 (박스 기준 %)
  const TUTORIAL_TOP_TEXT_POS = { x: 13, y: 79 };
  // character = 미니캐 (박스 기준 %)
  const TUTORIAL_TOP_CHARACTER_POS = { x: 69, y: 70 };

  // --- 하단 (손님·규칙 설명) ---
  const TUTORIAL_BOTTOM_DIALOGUE_POS = { x: 0, y: 2 };
  const TUTORIAL_BOTTOM_TEXT_POS = { x: 13, y: 78 };
  const TUTORIAL_BOTTOM_CHARACTER_POS = { x: 69, y: 65 };

  // --- 조작형(미니캐 숨김) 말풍선 — 재료/휴지통 등 ---
  const TUTORIAL_ACTION_DIALOGUE_POS = { x: 0, y: -48 };
  const TUTORIAL_ACTION_TEXT_POS = { x: 13, y: 78 };

  const TUTORIAL_CHARACTER_SIZE = { width: 20, height: 34 };
  const TUTORIAL_CHARACTER_SCALE = 1;
  const TUTORIAL_DIALOGUE_SCALE = 1;
  const TUTORIAL_CHARACTER_ZOOM = 4.15;
  const TUTORIAL_CHARACTER_FOCUS = { x: 85.5, y: 66 };

  const TUTORIAL_TEXT_WIDTH = 54; // 미니캐 있을 때 텍스트 폭 (%)
  const TUTORIAL_TEXT_WIDTH_NO_MINI = 78; // 미니캐 없을 때 — 말풍선 더 넓게 사용
  const TUTORIAL_TEXT_COLOR = "#805847";
  const TUTORIAL_TEXT_FONT = '"Jua", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
  const TUTORIAL_TEXT_SIZE = 17;
  const TUTORIAL_TYPING_SPEED = 36;

  // 설명형(rule/dialogue) 말풍선 ▼ — 마지막 렌더 글자 옆에 표시
  const TUTORIAL_ARROW_GAP_PX = 8; // 마지막 글자와 화살표 간격
  const TUTORIAL_ARROW_SCALE = 1;
  const TUTORIAL_ARROW_COLOR = "#805847";
  const TUTORIAL_ARROW_BLINK_SPEED = 900;

  // 반투명 PNG 드래그 가이드 (출발→도착 한 번에, 도착 후 잠시 대기)
  const TUTORIAL_DRAG_GUIDE_ALPHA = 0.42;
  const TUTORIAL_DRAG_GUIDE_DURATION = 1800;
  const TUTORIAL_DRAG_GUIDE_PAUSE = 520;
  // null 이면 출발 오브젝트(또는 spawn) 실제 크기 사용
  const TUTORIAL_DRAG_GUIDE_SIZE = null;
  // 음료 가이드 크기 — null 이면 Layout GRAPE_SPAWN 사용
  const TUTORIAL_DRINK_GUIDE_SIZE = null;

  // PNG 외곽선 Glow (노란 네모 박스 대신)
  const TUTORIAL_GLOW_COLOR = "255, 210, 90";
  const TUTORIAL_GLOW_ALPHA = 0.85;
  const TUTORIAL_GLOW_SIZE = 10;
  const TUTORIAL_GLOW_LAYERS = 2;
  const TUTORIAL_GLOW_PULSE_MS = 1200;

  const READY_DURATION_MS = 1000;
  const START_DURATION_MS = 800;

  const TUTORIAL_MINIS = [
    "assets/bathroom/sleepy-mini-character.png",
    "assets/bathroom/point-mini-character.png",
    "assets/bathroom/cheerup-mini-character.png",
    "assets/bathroom/shake1-mini-character.png",
    "assets/bathroom/shake2-mini-character.png",
    "assets/bathroom/happy-mini-character.png",
    "assets/bathroom/basic-mini-character.png",
  ];

  const GUIDE_SRC = {
    bun: "assets/ingredients/bottom-bread.png",
    "bun-top": "assets/ingredients/upper-bread.png",
    patty: "assets/ingredients/uncooked-patty.png",
    cooked: "assets/ingredients/patty.png",
    ketchup: "assets/ingredients/source2.png",
    lettuce: "assets/ingredients/lettuce.png",
    grape: "assets/kitchen/grape-juice.png",
    burger: "assets/kitchen/dish.png",
  };

  // type: dialogue/rule=클릭 진행, drag/click=행동 완료 시 진행
  // showMini: false 이면 미니캐를 그리지 않음 (말풍선만)
  // place: top | bottom | action
  const STEPS = [
    {
      place: "top",
      type: "dialogue",
      showMini: true,
      glow: ["bun"],
      text: "알바 시작 전에 잠깐만! 버거 만드는 법을 알려줄게.",
    },
    {
      place: "top",
      type: "drag",
      showMini: true,
      source: "bun",
      target: "plate",
      glow: ["bun", "plate"],
      guide: { from: "bun", to: "plate", src: "bun" },
      text: "먼저 빵을 접시에 올려줘!",
    },
    {
      place: "top",
      type: "drag",
      showMini: true,
      source: "patty",
      target: "grillLeft",
      glow: ["patty", "grillLeft"],
      guide: { from: "patty", to: "grillLeft", src: "patty" },
      text: "이번에는 패티를 왼쪽 불판에 올려줘!",
    },
    {
      place: "top",
      type: "click",
      showMini: true,
      action: "flip",
      glow: ["grillLeft"],
      waitPhase: "needsFlip",
      text: "패티가 어느 정도 익으면 FLIP이 떠! 그때 패티를 클릭해서 뒤집어줘.",
    },
    {
      place: "top",
      type: "drag",
      showMini: true,
      source: "cooked",
      target: "plate",
      glow: ["grillLeft", "plate"],
      guide: { from: "grillLeft", to: "plate", src: "cooked" },
      waitPhase: "ready",
      text: "패티가 구워지면 click이 뜰거야! 패티를 태우기 전에 잡아서 접시 위 빵에 올려줘.",
    },
    {
      place: "bottom",
      type: "dialogue",
      showMini: true,
      glow: ["customer"],
      text: "이제 손님의 주문을 확인하자! 말풍선 아이콘이 원하는 재료야.",
    },
    {
      place: "action",
      type: "drag",
      showMini: false,
      source: "ketchup",
      target: "plate",
      glow: ["ketchup"],
      guide: { from: "ketchup", to: "plate", src: "ketchup" },
      text: "손님이 원하는 소스를 확인하고 넣어줘! EASY에서는 케첩만 나와.",
    },
    {
      place: "action",
      type: "drag",
      showMini: false,
      source: "lettuce",
      target: "plate",
      glow: ["lettuce"],
      guide: { from: "lettuce", to: "plate", src: "lettuce" },
      text: "손님이 원하는 재료도 확인해서 올려줘!",
    },
    {
      place: "bottom",
      type: "rule",
      showMini: true,
      glow: ["ketchup"],
      text: "EASY에서는 소스가 하나만 나와. 재료 순서는 상관없고, 종류와 개수만 맞으면 돼!",
    },
    {
      place: "bottom",
      type: "rule",
      showMini: true,
      glow: ["plate"],
      text: "MEDIUM 모드와 HARD 모드에서는 조심해! 손님이 말하는 순서대로 재료를 올려야 해.",
    },
    {
      place: "bottom",
      type: "rule",
      showMini: true,
      glow: ["customer"],
      text: "가끔 패티 아이콘이 없는 손님도 있어. 비건 손님이야! 주문을 꼭 확인해줘.",
    },
    {
      place: "action",
      type: "drag",
      showMini: false,
      source: "grape",
      target: "plate",
      glow: ["drinks"],
      guide: { from: "drinks", to: "plate", src: "grape" },
      text: "음료도 만들어야 해! 손님이 원하는 색 버튼을 눌러 음료를 접시에 끌어다 놓자!",
    },
    {
      place: "top",
      type: "drag",
      showMini: false,
      source: "bun",
      target: "plate",
      matchItem: "bun-top",
      glow: ["bun", "plate"],
      guide: { from: "bun", to: "plate", src: "bun-top" },
      text: "마지막으로 위쪽 빵을 올려서 햄버거를 완성해줘!",
    },
    {
      place: "bottom",
      type: "dialogue",
      showMini: true,
      glow: ["trash"],
      text: "앗! 햄버거를 잘못 만들었다면 어떻게 하지?",
    },
    {
      place: "action",
      type: "drag",
      showMini: false,
      source: "burger",
      target: "trash",
      glow: ["trash", "plate"],
      guide: { from: "plate", to: "trash", src: "burger" },
      text: "걱정 마! 잘못 만든 햄버거는 휴지통에 넣어주면 돼.",
    },
    {
      place: "bottom",
      type: "dialogue",
      showMini: true,
      glow: ["customer"],
      text: "잘했어! 다시 만든 햄버거를 손님에게 가져다주자.",
    },
    {
      place: "bottom",
      type: "drag",
      showMini: false,
      source: "burger",
      target: "customer",
      glow: ["customer", "plate"],
      guide: { from: "plate", to: "customer", src: "burger" },
      text: "이제 완성된 햄버거를 손님에게 가져다줘!",
    },
    {
      place: "bottom",
      type: "dialogue",
      showMini: true,
      glow: null,
      text: "준비됐어? 그럼 알바 시작해볼까!",
    },
  ];

  const HIGHLIGHT_MAP = {
    bun: ['[data-layout-hit="bun"]'],
    patty: ['[data-layout-hit="patty"]'],
    grill: ["#grill-zone", '[data-layout-hit="grillPattyLeft"]', '[data-layout-hit="grillPattyRight"]'],
    grillLeft: [
      '#grill-zone [data-grill="0"] .grill-patty:not(.is-empty):not([hidden])',
      '[data-layout-hit="grillPattyLeft"]',
      '#grill-zone [data-grill="0"]',
    ],
    plate: ["#serve-item-0", "#build-plate-0"],
    ketchup: ['[data-layout-art="ketchup"] img', '[data-layout-art="ketchup"]'],
    mayo: ['[data-layout-art="mayo"] img', '[data-layout-art="mayo"]'],
    lettuce: ['[data-layout-hit="lettuce"]'],
    tomato: ['[data-layout-hit="tomato"]'],
    cheese: ['[data-layout-hit="cheese"]'],
    pickle: ['[data-layout-hit="pickle"]'],
    toppings: [
      '[data-layout-hit="lettuce"]',
      '[data-layout-hit="tomato"]',
      '[data-layout-hit="cheese"]',
      '[data-layout-hit="pickle"]',
    ],
    drinks: ['[data-layout-hit="grape"]'],
    grape: ['[data-layout-hit="grape"]'],
    customer: ["#customer-a .customer-art", "#customer-a"],
    trash: ["#trash-slot", "#trash-label"],
  };

  const GLOW_SRC = {
    bun: GUIDE_SRC.bun,
    patty: GUIDE_SRC.patty,
    lettuce: GUIDE_SRC.lettuce,
    tomato: "assets/ingredients/tomato.png",
    cheese: "assets/ingredients/cheese.png",
    pickle: "assets/ingredients/pickle.png",
    drinks: GUIDE_SRC.grape,
    grape: GUIDE_SRC.grape,
    grillLeft: GUIDE_SRC.patty,
  };

  let active = false;
  let stepIndex = 0;
  let typed = 0;
  let line = "";
  let typeTimer = 0;
  let awaitClick = false;
  let lastMini = -1;
  let cueTimer = 0;
  let onFinished = null;
  let guideRaf = 0;
  let guideStartedAt = 0;
  let phaseWatch = 0;
  let actionReady = false;

  function els() {
    return {
      root: document.getElementById("cook-tutorial"),
      dim: document.getElementById("cook-tutorial-dim"),
      chat: document.getElementById("cook-tutorial-chat"),
      chatBg: document.getElementById("cook-tutorial-chat-bg"),
      text: document.getElementById("cook-tutorial-text"),
      miniWrap: document.getElementById("cook-tutorial-mini-wrap"),
      mini: document.getElementById("cook-tutorial-mini"),
      hit: document.getElementById("cook-tutorial-hit"),
      arrow: document.getElementById("cook-tutorial-arrow"),
      rings: document.getElementById("cook-tutorial-rings"),
      guides: document.getElementById("cook-tutorial-guides"),
      cue: document.getElementById("cook-tutorial-cue"),
      phase2: document.querySelector('[data-scene="phase2"]'),
    };
  }

  function currentStep() {
    return STEPS[stepIndex] || null;
  }

  function isClickAdvanceType(type) {
    return type === "dialogue" || type === "rule";
  }

  function isActionType(type) {
    return type === "drag" || type === "click" || type === "action";
  }

  function isEnabled() {
    return TUTORIAL_ENABLED;
  }

  function isActive() {
    return active;
  }

  function pickMini() {
    if (TUTORIAL_MINIS.length === 1) {
      return 0;
    }
    let next = Math.floor(Math.random() * TUTORIAL_MINIS.length);
    if (next === lastMini) {
      next = (next + 1) % TUTORIAL_MINIS.length;
    }
    lastMini = next;
    return next;
  }

  function dialoguePosFor(place) {
    if (place === "top") {
      return TUTORIAL_TOP_DIALOGUE_POS;
    }
    if (place === "action") {
      return TUTORIAL_ACTION_DIALOGUE_POS;
    }
    return TUTORIAL_BOTTOM_DIALOGUE_POS;
  }

  function textPosFor(place) {
    if (place === "top") {
      return TUTORIAL_TOP_TEXT_POS;
    }
    if (place === "action") {
      return TUTORIAL_ACTION_TEXT_POS;
    }
    return TUTORIAL_BOTTOM_TEXT_POS;
  }

  function characterPosFor(place) {
    if (place === "top") {
      return TUTORIAL_TOP_CHARACTER_POS;
    }
    return TUTORIAL_BOTTOM_CHARACTER_POS;
  }

  function shouldShowMini(step) {
    return step?.showMini !== false;
  }

  function applyMiniVisibility(step) {
    const { miniWrap, mini } = els();
    const show = shouldShowMini(step);
    if (miniWrap) {
      miniWrap.hidden = !show;
    }
    if (mini) {
      if (show) {
        mini.src = TUTORIAL_MINIS[pickMini()];
        mini.hidden = false;
      } else {
        mini.removeAttribute("src");
        mini.hidden = true;
      }
    }
  }

  function layoutChat(place) {
    const { chat, text, miniWrap, mini, arrow, hit } = els();
    const dialogue = dialoguePosFor(place);
    const textPos = textPosFor(place);
    const character = characterPosFor(place);
    const step = currentStep();
    const showMini = step ? shouldShowMini(step) : place !== "action";
    if (chat) {
      chat.style.transform = `translate(${dialogue.x}%, ${dialogue.y}%) scale(${TUTORIAL_DIALOGUE_SCALE})`;
      chat.classList.toggle("is-top", place === "top" || place === "action");
      chat.classList.toggle("is-bottom", place === "bottom");
      chat.classList.toggle("is-action-place", place === "action");
    }
    if (text) {
      text.style.left = `${textPos.x}%`;
      text.style.top = `${textPos.y}%`;
      text.style.width = `${showMini ? TUTORIAL_TEXT_WIDTH : TUTORIAL_TEXT_WIDTH_NO_MINI}%`;
      text.style.color = TUTORIAL_TEXT_COLOR;
      text.style.fontFamily = TUTORIAL_TEXT_FONT;
      text.style.fontSize = `${TUTORIAL_TEXT_SIZE}px`;
    }
    if (miniWrap) {
      miniWrap.style.left = `${character.x}%`;
      miniWrap.style.top = `${character.y}%`;
      miniWrap.style.width = `${TUTORIAL_CHARACTER_SIZE.width}%`;
      miniWrap.style.height = `${TUTORIAL_CHARACTER_SIZE.height}%`;
      miniWrap.style.transform = `scale(${TUTORIAL_CHARACTER_SCALE})`;
      miniWrap.style.transformOrigin = "right bottom";
    }
    if (mini) {
      mini.style.objectPosition = `${TUTORIAL_CHARACTER_FOCUS.x}% ${TUTORIAL_CHARACTER_FOCUS.y}%`;
      mini.style.transform = `scale(${TUTORIAL_CHARACTER_ZOOM})`;
      mini.style.transformOrigin = `${TUTORIAL_CHARACTER_FOCUS.x}% ${TUTORIAL_CHARACTER_FOCUS.y}%`;
    }
    if (arrow) {
      arrow.style.color = TUTORIAL_ARROW_COLOR;
      arrow.style.setProperty("--chat-arrow-blink", `${TUTORIAL_ARROW_BLINK_SPEED}ms`);
    }
    if (hit) {
      hit.style.pointerEvents = awaitClick ? "auto" : "none";
      hit.hidden = !awaitClick;
    }
  }

  function lastTextNode(root) {
    if (!root) {
      return null;
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let last = null;
    let node = walker.nextNode();
    while (node) {
      if (node.nodeValue && node.nodeValue.length) {
        last = node;
      }
      node = walker.nextNode();
    }
    return last;
  }

  // 실제 렌더된 마지막 줄·마지막 글자 Rect 오른쪽에 ▼ 배치
  function placeContinueArrow() {
    const { chat, text, arrow } = els();
    if (!chat || !text || !arrow || arrow.hidden) {
      return;
    }
    const textNode = lastTextNode(text);
    if (!textNode) {
      return;
    }
    const range = document.createRange();
    const len = textNode.length;
    range.setStart(textNode, Math.max(0, len - 1));
    range.setEnd(textNode, len);
    const rects = range.getClientRects();
    const glyph = rects.length ? rects[rects.length - 1] : range.getBoundingClientRect();
    if (!glyph || (!glyph.width && !glyph.height)) {
      return;
    }
    const chatBox = chat.getBoundingClientRect();
    if (!chatBox.width || !chatBox.height) {
      return;
    }
    const arrowW = arrow.offsetWidth || 16;
    const arrowH = arrow.offsetHeight || 16;
    const pad = 6;
    let left = glyph.right - chatBox.left + TUTORIAL_ARROW_GAP_PX;
    let top = glyph.top + glyph.height / 2 - chatBox.top;
    left = Math.min(Math.max(pad, left), chatBox.width - arrowW - pad);
    top = Math.min(Math.max(pad + arrowH / 2, top), chatBox.height - pad - arrowH / 2);
    arrow.style.left = `${left}px`;
    arrow.style.top = `${top}px`;
    arrow.style.transform = `translate(0, -50%) scale(${TUTORIAL_ARROW_SCALE})`;
  }

  function setArrow(visible) {
    const { arrow, hit, chat } = els();
    awaitClick = Boolean(visible);
    if (arrow) {
      arrow.hidden = !visible;
      arrow.style.pointerEvents = visible ? "auto" : "none";
    }
    if (hit) {
      hit.hidden = !visible;
      hit.style.pointerEvents = visible ? "auto" : "none";
    }
    chat?.classList.toggle("is-awaiting-click", awaitClick);
    if (visible) {
      requestAnimationFrame(() => {
        placeContinueArrow();
        requestAnimationFrame(() => placeContinueArrow());
      });
    }
  }

  function stageBox(el) {
    const stage = document.getElementById("stage")?.getBoundingClientRect();
    const box = el?.getBoundingClientRect();
    if (!stage || !box || !stage.width || !stage.height) {
      return null;
    }
    return {
      left: ((box.left - stage.left) / stage.width) * 100,
      top: ((box.top - stage.top) / stage.height) * 100,
      width: (box.width / stage.width) * 100,
      height: (box.height / stage.height) * 100,
      cx: ((box.left + box.width / 2 - stage.left) / stage.width) * 100,
      cy: ((box.top + box.height / 2 - stage.top) / stage.height) * 100,
    };
  }

  function firstVisible(selectors) {
    const phase2 = els().phase2;
    if (!phase2) {
      return null;
    }
    for (const sel of selectors) {
      const nodes = phase2.querySelectorAll(sel);
      for (const el of nodes) {
        if (el.hidden) {
          continue;
        }
        const box = stageBox(el);
        if (box && box.width > 0.2 && box.height > 0.2) {
          return { el, box };
        }
      }
    }
    return null;
  }

  function resolveKey(key) {
    return firstVisible(HIGHLIGHT_MAP[key] || []);
  }

  function clearFx() {
    const { rings, guides, phase2 } = els();
    if (rings) {
      rings.innerHTML = "";
    }
    if (guides) {
      guides.innerHTML = "";
    }
    phase2?.querySelectorAll(".is-tutorial-glow").forEach((el) => {
      el.classList.remove("is-tutorial-glow");
      el.style.removeProperty("--tut-glow-color");
      el.style.removeProperty("--tut-glow-alpha");
      el.style.removeProperty("--tut-glow-size");
      el.style.removeProperty("--tut-glow-pulse");
    });
    window.cancelAnimationFrame(guideRaf);
    guideRaf = 0;
    window.clearInterval(phaseWatch);
    phaseWatch = 0;
  }

  function applyGlowStyle(el) {
    el.classList.add("is-tutorial-glow");
    el.style.setProperty("--tut-glow-color", TUTORIAL_GLOW_COLOR);
    el.style.setProperty("--tut-glow-alpha", String(TUTORIAL_GLOW_ALPHA));
    el.style.setProperty("--tut-glow-size", `${TUTORIAL_GLOW_SIZE}px`);
    el.style.setProperty("--tut-glow-pulse", `${TUTORIAL_GLOW_PULSE_MS}ms`);
    el.style.setProperty("--tut-glow-layers", String(TUTORIAL_GLOW_LAYERS));
  }

  function showGlow(keys) {
    const { guides, phase2 } = els();
    if (!keys || !phase2 || !guides) {
      return;
    }
    const list = Array.isArray(keys) ? keys : [keys];
    const seen = new Set();
    list.forEach((key) => {
      const hit = resolveKey(key);
      if (!hit || seen.has(hit.el)) {
        return;
      }
      seen.add(hit.el);
      const img = hit.el.tagName === "IMG" ? hit.el : hit.el.querySelector?.("img");
      if (img && !img.hidden) {
        applyGlowStyle(img);
        return;
      }
      // 투명 hit 버튼 → PNG 클론으로 외곽선 Glow
      const src = GLOW_SRC[key] || GUIDE_SRC[key];
      if (!src) {
        applyGlowStyle(hit.el);
        return;
      }
      const ghost = document.createElement("img");
      ghost.className = "cook-tutorial-glow-img is-tutorial-glow";
      ghost.src = src;
      ghost.alt = "";
      ghost.draggable = false;
      ghost.style.left = `${hit.box.left}%`;
      ghost.style.top = `${hit.box.top}%`;
      ghost.style.width = `${Math.max(hit.box.width, 4)}%`;
      ghost.style.height = `${Math.max(hit.box.height, 4)}%`;
      applyGlowStyle(ghost);
      guides.appendChild(ghost);
    });
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function stopGuideLoop() {
    window.cancelAnimationFrame(guideRaf);
    guideRaf = 0;
    const { guides } = els();
    guides?.querySelectorAll(".cook-tutorial-drag-ghost, .cook-tutorial-order-ghost").forEach((n) => n.remove());
  }

  function guideBoxSize(spec, fromBox) {
    if (TUTORIAL_DRAG_GUIDE_SIZE != null) {
      return { w: TUTORIAL_DRAG_GUIDE_SIZE, h: TUTORIAL_DRAG_GUIDE_SIZE };
    }
    // 음료: 실제 집기 spawn 크기 (작은 버튼 hit 아님)
    if (spec.src === "grape" || spec.from === "drinks" || spec.from === "grape") {
      if (TUTORIAL_DRINK_GUIDE_SIZE != null) {
        return { w: TUTORIAL_DRINK_GUIDE_SIZE, h: TUTORIAL_DRINK_GUIDE_SIZE };
      }
      const spawn = window.Layout?.spawnBox?.("grape");
      if (spawn?.width && spawn?.height) {
        return { w: spawn.width, h: spawn.height };
      }
    }
    return {
      w: Math.max(fromBox.width, 3.5),
      h: Math.max(fromBox.height, 3.5),
    };
  }

  function runGuideLoop(ghost, start, end) {
    guideStartedAt = performance.now();
    const tick = (now) => {
      if (!active || !actionReady) {
        return;
      }
      const cycle = TUTORIAL_DRAG_GUIDE_DURATION + TUTORIAL_DRAG_GUIDE_PAUSE;
      const t = (now - guideStartedAt) % cycle;
      let x;
      let y;
      if (t <= TUTORIAL_DRAG_GUIDE_DURATION) {
        const p = easeInOut(t / TUTORIAL_DRAG_GUIDE_DURATION);
        x = start.x + (end.x - start.x) * p;
        y = start.y + (end.y - start.y) * p;
        ghost.style.opacity = String(TUTORIAL_DRAG_GUIDE_ALPHA);
      } else {
        x = end.x;
        y = end.y;
        ghost.style.opacity = String(TUTORIAL_DRAG_GUIDE_ALPHA * 0.9);
      }
      ghost.style.left = `${x}%`;
      ghost.style.top = `${y}%`;
      guideRaf = window.requestAnimationFrame(tick);
    };
    guideRaf = window.requestAnimationFrame(tick);
  }

  // 완성 주문(접시+햄버거+음료) 클론이 한 덩어리로 이동
  function startOrderGuide(toKey) {
    const serve = document.getElementById("serve-item-0");
    const to = resolveKey(toKey);
    const { guides } = els();
    if (!serve || !to || !guides) {
      return false;
    }
    const fromBox = stageBox(serve);
    if (!fromBox) {
      return false;
    }
    const clone = serve.cloneNode(true);
    clone.removeAttribute("id");
    clone.classList.add("cook-tutorial-drag-ghost", "cook-tutorial-order-ghost");
    clone.classList.remove("is-dragging", "is-ready", "is-ghosting");
    clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
    clone.style.position = "absolute";
    clone.style.margin = "0";
    clone.style.opacity = String(TUTORIAL_DRAG_GUIDE_ALPHA);
    clone.style.width = `${fromBox.width}%`;
    clone.style.height = `${fromBox.height}%`;
    clone.style.pointerEvents = "none";
    clone.style.zIndex = "4";
    guides.appendChild(clone);

    const start = { x: fromBox.left, y: fromBox.top };
    const end = {
      x: to.box.cx - fromBox.width / 2,
      y: to.box.cy - fromBox.height / 2,
    };
    runGuideLoop(clone, start, end);
    return true;
  }

  function startDragGuide(spec) {
    stopGuideLoop();
    if (!spec || !actionReady) {
      return;
    }
    // 휴지통/전달: 빈 접시 PNG가 아니라 완성 주문 클론
    if (spec.src === "burger") {
      if (startOrderGuide(spec.to)) {
        return;
      }
    }
    const from = resolveKey(spec.from);
    const to = resolveKey(spec.to);
    const { guides } = els();
    if (!from || !to || !guides) {
      return;
    }
    const src = GUIDE_SRC[spec.src] || GUIDE_SRC[spec.from] || spec.src;
    if (!src) {
      return;
    }
    const size = guideBoxSize(spec, from.box);
    const ghost = document.createElement("img");
    ghost.className = "cook-tutorial-drag-ghost";
    ghost.src = src;
    ghost.alt = "";
    ghost.draggable = false;
    ghost.style.opacity = String(TUTORIAL_DRAG_GUIDE_ALPHA);
    ghost.style.width = `${size.w}%`;
    ghost.style.height = `${size.h}%`;
    ghost.style.objectFit = "contain";
    guides.appendChild(ghost);

    // 음료는 spawn 위치에서 출발 (작은 버튼 중심이 아님)
    let startCx = from.box.cx;
    let startCy = from.box.cy;
    if (spec.src === "grape" || spec.from === "drinks") {
      const spawn = window.Layout?.spawnBox?.("grape");
      if (spawn) {
        startCx = spawn.left + spawn.width / 2;
        startCy = spawn.top + spawn.height / 2;
      }
    }

    const start = {
      x: startCx - size.w / 2,
      y: startCy - size.h / 2,
    };
    const end = {
      x: to.box.cx - size.w / 2,
      y: to.box.cy - size.h / 2,
    };
    runGuideLoop(ghost, start, end);
  }

  function refreshStepFx() {
    const step = currentStep();
    const { rings } = els();
    if (!step) {
      return;
    }
    if (rings) {
      rings.innerHTML = "";
    }
    els().guides?.querySelectorAll(".cook-tutorial-glow-img").forEach((n) => n.remove());
    els().phase2?.querySelectorAll(".is-tutorial-glow").forEach((el) => {
      if (!el.classList.contains("cook-tutorial-glow-img")) {
        el.classList.remove("is-tutorial-glow");
      }
    });
    showGlow(step.glow);
    if (step.guide && actionReady && step.type === "drag") {
      startDragGuide(step.guide);
    } else {
      stopGuideLoop();
    }
  }

  function stopTyping() {
    window.clearTimeout(typeTimer);
    typeTimer = 0;
  }

  function finishTyping() {
    const { text } = els();
    stopTyping();
    typed = line.length;
    if (text) {
      text.textContent = line;
    }
    const step = currentStep();
    if (!step) {
      return;
    }
    if (isClickAdvanceType(step.type)) {
      setArrow(true);
      return;
    }
    // 행동형: 대사가 끝난 뒤 가이드/입력을 연다
    actionReady = true;
    setArrow(false);
    maybeArmWaitPhase(step);
    refreshStepFx();
  }

  function typeTick(token) {
    const { text } = els();
    if (!active || token !== stepIndex || !text) {
      return;
    }
    typed = Math.min(line.length, typed + 1);
    text.textContent = line.slice(0, typed);
    if (typed < line.length) {
      typeTimer = window.setTimeout(() => typeTick(token), TUTORIAL_TYPING_SPEED);
      return;
    }
    finishTyping();
  }

  function maybeArmWaitPhase(step) {
    window.clearInterval(phaseWatch);
    phaseWatch = 0;
    if (!step?.waitPhase) {
      return;
    }
    // 이미 해당 단계면 가이드 한 번만 갱신. 준비되면 한 번만 재시작(짧은 루프 끊김 방지)
    let armed = false;
    const tryArm = () => {
      if (!active || !actionReady || armed) {
        return false;
      }
      let ready = false;
      document.querySelectorAll(".grill-pad").forEach((pad) => {
        if (pad.dataset.phase === step.waitPhase) {
          ready = true;
        }
      });
      if (!ready) {
        return false;
      }
      armed = true;
      window.clearInterval(phaseWatch);
      phaseWatch = 0;
      refreshStepFx();
      return true;
    };
    if (tryArm()) {
      return;
    }
    phaseWatch = window.setInterval(() => {
      tryArm();
    }, 200);
  }

  function showStep(index) {
    const step = STEPS[index];
    const { text, root } = els();
    if (!step || !text) {
      beginReadyStart();
      return;
    }
    stopTyping();
    clearFx();
    setArrow(false);
    actionReady = false;
    stepIndex = index;
    line = step.text;
    typed = 0;
    text.textContent = "";
    // 휴지통/전달 가이드는 완성 주문(버거+음료)이 접시에 있어야 함
    if (step.source === "burger" && (step.target === "trash" || step.target === "customer")) {
      CookScene.fillTutorialPlate?.(0);
    }
    layoutChat(step.place || "bottom");
    applyMiniVisibility(step);
    root?.classList.toggle("is-top-place", step.place === "top" || step.place === "action");
    root?.classList.toggle("is-bottom-place", step.place === "bottom");
    root?.classList.toggle("is-action-step", isActionType(step.type));
    root?.classList.toggle("is-mini-hidden", !shouldShowMini(step));
    showGlow(step.glow);
    typeTick(index);
  }

  function advanceFromClick() {
    if (!active) {
      return;
    }
    const step = currentStep();
    if (!step || !isClickAdvanceType(step.type)) {
      // 행동형은 말풍선 클릭으로 건너뛸 수 없음. 타이핑만 스킵
      if (typed < line.length) {
        finishTyping();
      }
      return;
    }
    if (typed < line.length) {
      finishTyping();
      return;
    }
    if (stepIndex >= STEPS.length - 1) {
      beginReadyStart();
      return;
    }
    showStep(stepIndex + 1);
  }

  function completeStep() {
    if (!active) {
      return;
    }
    clearFx();
    actionReady = false;
    if (stepIndex >= STEPS.length - 1) {
      beginReadyStart();
      return;
    }
    showStep(stepIndex + 1);
  }

  function plateSlotOk(slotId) {
    return slotId === "plate" || slotId === "plate-0" || slotId === "plate-1";
  }

  function grillSlotOk(slotId, step) {
    if (step?.target === "grillLeft") {
      return slotId === "grill-0";
    }
    return slotId === "grill-0" || slotId === "grill-1";
  }

  function customerSlotOk(slotId) {
    return slotId === "customer-a" || slotId === "customer-b";
  }

  function onPracticeEvent(event, detail) {
    if (!active || !actionReady) {
      return;
    }
    const step = currentStep();
    if (!step || !isActionType(step.type)) {
      return;
    }

    if (step.type === "click" && step.action === "flip" && event === "flip") {
      completeStep();
      return;
    }

    if (step.type === "drag" && event === "drop") {
      const itemId = detail.itemId;
      const slotId = detail.slotId;
      const want = step.matchItem || step.source;
      if (step.source === "cooked") {
        if (String(itemId).startsWith("cooked-") && plateSlotOk(slotId)) {
          completeStep();
        }
        return;
      }
      if (step.source === "burger") {
        return;
      }
      if (want === "bun-top") {
        if (itemId === "bun-top" && plateSlotOk(slotId)) {
          completeStep();
        }
        return;
      }
      if (itemId !== want && !(want === "bun" && itemId === "bun")) {
        return;
      }
      if (step.target === "plate" && plateSlotOk(slotId)) {
        completeStep();
        return;
      }
      if ((step.target === "grill" || step.target === "grillLeft") && grillSlotOk(slotId, step)) {
        completeStep();
      }
      return;
    }

    if (step.type === "drag" && step.source === "burger" && event === "trash" && detail.ok) {
      // 연습용으로 비운 접시를 튜토리얼 주문으로 다시 채운 뒤 전달 단계로
      CookScene.fillTutorialPlate?.(0);
      completeStep();
      return;
    }

    if (step.type === "drag" && step.source === "burger" && event === "serve" && detail.ok) {
      completeStep();
    }
  }

  function allowsPick(itemId) {
    if (!active) {
      return true;
    }
    const step = currentStep();
    if (!step || !isActionType(step.type) || !actionReady) {
      return false;
    }
    if (step.type === "click") {
      return false;
    }
    if (step.source === "cooked") {
      return String(itemId).startsWith("cooked-");
    }
    if (step.source === "burger") {
      return String(itemId).startsWith("burger-");
    }
    if (step.matchItem === "bun-top") {
      return itemId === "bun";
    }
    return itemId === step.source;
  }

  function allowsCookAction(itemId, slotId) {
    if (!active) {
      return true;
    }
    const step = currentStep();
    if (!step || step.type !== "drag" || !actionReady) {
      return false;
    }
    if (step.source === "cooked") {
      return String(itemId).startsWith("cooked-") && plateSlotOk(slotId);
    }
    if (step.source === "burger") {
      if (step.target === "trash") {
        return String(itemId).startsWith("burger-") && slotId === "trash";
      }
      return String(itemId).startsWith("burger-") && customerSlotOk(slotId);
    }
    if (step.matchItem === "bun-top") {
      return itemId === "bun" && plateSlotOk(slotId);
    }
    if (itemId !== step.source) {
      return false;
    }
    if (step.target === "plate") {
      return plateSlotOk(slotId);
    }
    if (step.target === "grill" || step.target === "grillLeft") {
      return grillSlotOk(slotId, step);
    }
    if (step.target === "customer") {
      return customerSlotOk(slotId);
    }
    return false;
  }

  function allowsGrillClick() {
    if (!active) {
      return true;
    }
    const step = currentStep();
    return Boolean(step && step.type === "click" && step.action === "flip" && actionReady);
  }

  function showCue(label, done) {
    const { cue } = els();
    if (!cue) {
      done?.();
      return;
    }
    cue.hidden = false;
    cue.textContent = label;
    cue.classList.remove("is-pop");
    void cue.offsetWidth;
    cue.classList.add("is-pop");
    window.clearTimeout(cueTimer);
    cueTimer = window.setTimeout(() => {
      cue.classList.remove("is-pop");
      cue.hidden = true;
      done?.();
    }, label === "READY" ? READY_DURATION_MS : START_DURATION_MS);
  }

  function beginReadyStart() {
    stopTyping();
    clearFx();
    setArrow(false);
    actionReady = false;
    const { chat } = els();
    if (chat) {
      chat.hidden = true;
    }
    showCue("READY", () => {
      showCue("START!", () => {
        finish();
      });
    });
  }

  function finish() {
    active = false;
    stopTyping();
    window.clearTimeout(cueTimer);
    clearFx();
    const { root, phase2, cue } = els();
    if (root) {
      root.hidden = true;
      root.classList.remove("is-action-step");
    }
    if (cue) {
      cue.hidden = true;
    }
    phase2?.classList.remove("is-tutorial");
    CookScene.setTutorialLock?.(false);
    CookScene.beginShift?.();
    if (typeof onFinished === "function") {
      onFinished();
      onFinished = null;
    }
  }

  function start(done) {
    if (!TUTORIAL_ENABLED) {
      CookScene.setTutorialLock?.(false);
      CookScene.beginShift?.();
      done?.();
      return;
    }
    active = true;
    onFinished = done || null;
    stepIndex = 0;
    lastMini = -1;
    actionReady = false;
    const { root, chat, phase2, cue } = els();
    phase2?.classList.add("is-tutorial");
    CookScene.setTutorialLock?.(true);
    if (root) {
      root.hidden = false;
    }
    if (chat) {
      chat.hidden = false;
    }
    if (cue) {
      cue.hidden = true;
    }
    showStep(0);
  }

  function stop() {
    if (!active) {
      return;
    }
    active = false;
    stopTyping();
    window.clearTimeout(cueTimer);
    clearFx();
    const { root, phase2 } = els();
    if (root) {
      root.hidden = true;
    }
    phase2?.classList.remove("is-tutorial");
    CookScene.setTutorialLock?.(false);
  }

  function boot() {
    const { hit, arrow, root } = els();
    const go = (event) => {
      event.preventDefault();
      event.stopPropagation();
      advanceFromClick();
    };
    hit?.addEventListener("click", go);
    arrow?.addEventListener("click", go);
    document.getElementById("btn-start-shift")?.addEventListener("click", () => {
      AudioBus.play("click", window.Game?.state?.sfxOn);
      window.Game?.goScene?.("phase2");
    });
    TUTORIAL_MINIS.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
    Object.values(GUIDE_SRC).forEach((src) => {
      const img = new Image();
      img.src = src;
    });
    if (root) {
      root.hidden = true;
    }
  }

  return {
    boot,
    start,
    stop,
    isEnabled,
    isActive,
    onPracticeEvent,
    allowsPick,
    allowsCookAction,
    allowsGrillClick,
  };
})();

window.TutorialScene = TutorialScene;
