/**
 * 양치 미니게임.
 *
 * 손볼 곳 (숫자만 바꾸고 새로고침)
 *   칫솔질 중 입 거품     → BRUSHING_BUBBLE_POSITION
 *   헹구기(want_rinse) 거품 → RINSE_BUBBLE_POSITION
 *   안내 chat 말풍선      → CHAT_TEXT_POSITION / CHAT_CHARACTER_POSITION / DIALOGUE_GROUP_OFFSET_Y
 *   ▼ 화살표               → DIALOGUE_ARROW_GAP_PX / SCALE / BLINK_SPEED (마지막 글자 옆)
 *   칫솔 클릭/입/치약     → HIT
 *   눈 깜빡임 타이밍      → EYE_BLINK_INTERVAL / EYE_BLINK_DURATION (초)
 *   거품 깜빡 간격        → BUBBLE_INTERVAL
 *   컵 크기               → CUP_SCALE
 *   치약 짜기 후 대기     → TOOTHPASTE_FINISHED_HOLD_TIME (초)
 *   치약 입구             → TOOTHPASTE_NOZZLE
 *   칫솔모(짜기 영역)     → HIT.brushHead  ※ 칫솔대 말고 칫솔모만
 *   치약 클릭 칸          → HIT.toothpaste  ※ 몸통까지 포함
 *   치약 짜기 시작        → CREAM_START_FROM_RIGHT (1에 가까울수록 더 오른쪽 끝)
 *   칫솔모 칸 보기        → BRUSH_DEBUG = true
 */
const BrushScene = (() => {
  const SRC = {
    open: "assets/bathroom/open_eyes_character.png",
    half: "assets/bathroom/half_open_eyes_character.png",
    closed: "assets/bathroom/closed-eyes_character.png",
    squeeze: "assets/bathroom/squeeze_the_toothpaste_character.png",
    wantRinse: "assets/bathroom/want_rinse_character.png",
    rinseLeft: "assets/bathroom/rinse_leftside.png",
    rinseRight: "assets/bathroom/rinse_righside.png",
    done: "assets/bathroom/done_character.png",
  };

  const FACE_CYCLE = [SRC.open, SRC.half, SRC.closed];
  const BUBBLE_INTERVAL = 960;
  const RINSE_INTERVAL = 280;
  const RINSE_MS = 2200;
  const FILL_PER_PX = 0.16;
  const RINSE_FILL_MS = 2200;
  // 이 값을 바꾸면 눈 깜빡임 타이밍을 조절할 수 있음 (단위: 초)
  const EYE_BLINK_INTERVAL = 3.0; // 눈을 뜨고 있는 간격
  const EYE_BLINK_DURATION = 0.15; // 눈을 감고 있는 시간
  const BLINK_HOLD_MS = Math.round(EYE_BLINK_INTERVAL * 1000);
  const BLINK_CLOSED_MS = Math.round(EYE_BLINK_DURATION * 1000);
  const BLINK_HALF_MS = Math.max(40, Math.round(EYE_BLINK_DURATION * 1000 * 0.7));
  const CREAM_START_FROM_RIGHT = 0.7;
  const CUP_SCALE = 0.9;
  const BRUSH_DEBUG = false;
  // 치약이 다 짜진 뒤, 칫솔질 시작까지 유지 시간(초)
  const TOOTHPASTE_FINISHED_HOLD_TIME = 1;

  // =========================
  // 대화(chat) — 숫자만 바꾸고 새로고침
  // =========================
  const CHAT_TYPING_SPEED = 42;
  const CHAT_SHAKE_INTERVAL = 420;
  const CHAT_TEXT_COLOR = "#805847";
  const CHAT_TEXT_FONT = '"Jua", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
  const CHAT_TEXT_SIZE = 18;
  // 채팅 박스 + 문구 + 미니캐를 함께 아래로. y + 아래 (화면 %)
  const DIALOGUE_GROUP_OFFSET_Y = 4;
  // 컵(칫솔+치약) 등장 시 아래 방향 화살표 — Glow 대신 사용
  // 단위: 화면(#stage) %. OFFSET은 컵 히트박스 중심 기준
  const CUP_TUTORIAL_ARROW_OFFSET = { x: 0, y: -10 };
  const CUP_TUTORIAL_ARROW_SCALE = 1.35;
  const CUP_TUTORIAL_ARROW_BLINK_SPEED = 900;
  const CUP_TUTORIAL_ARROW_COLOR = "#805847";
  // ▼ 화살표 — 마지막 글자 옆에 붙음. GAP=글자와의 간격(px)
  const DIALOGUE_ARROW_GAP_PX = 8;
  const DIALOGUE_ARROW_SCALE = 1;
  const DIALOGUE_ARROW_COLOR = "#805847";
  const DIALOGUE_ARROW_BLINK_SPEED = 900;
  // 입 헹구기(rinsing)는 클릭 진행 예외 — 기존 자동 진행 유지
  const CHAT_CLICK_SKIP_KEYS = ["rinsing"];

  const CHAT_MINI = {
    sleepy: "assets/bathroom/sleepy-mini-character.png",
    point: "assets/bathroom/point-mini-character.png",
    cheerup: "assets/bathroom/cheerup-mini-character.png",
    shake1: "assets/bathroom/shake1-mini-character.png",
    shake2: "assets/bathroom/shake2-mini-character.png",
    happy: "assets/bathroom/happy-mini-character.png",
    basic: "assets/bathroom/basic-mini-character.png",
  };
  // next: 대사 완성 후 ▼ 클릭 시 넘어갈 키. 없으면 클릭해도 장면은 그대로(게임 조작으로 진행)
  const CHAT_LINES = {
    wake: { face: "sleepy", text: "아 잘잤다! 알바 가기 전에 양치부터 해볼까?", next: "cup" },
    cup: { face: "point", text: "먼저 컵을 눌러서 칫솔과 치약을 꺼내줘!" },
    paste: { face: "cheerup", text: "치약을 칫솔모 오른쪽 끝에 대고, 누른 채로 왼쪽으로 밀어봐~" },
    brush: { face: "shake1", text: "이제 칫솔을 이빨 위에서 문질러 줘~!", loop: ["shake1", "shake2"] },
    rinseAsk: { face: "point", text: "컵을 입에다 가져다 줄래?" },
    rinsing: { face: "cheerup", text: "(입 헹구는 중~)" },
    fresh: { face: "happy", text: "아이~ 개운해!", next: "next" },
    next: { face: "basic", text: "이제 준비물을 챙겨 볼까?" },
  };

  // =========================
  // 양치에서 숫자만 바꾸고 새로고침
  //   x + 오른쪽 / x - 왼쪽
  //   y + 아래   / y - 위
  //   단위는 화면(#stage) %
  // =========================

  // A. 칫솔질 중 (open / half / closed 얼굴) 입 거품
  const BRUSHING_BUBBLE_POSITION = { x: -0.4, y: 0 };
  // B. want_rinse 얼굴, 컵 가져다 달라는 장면 입 거품
  const RINSE_BUBBLE_POSITION = { x: -2.0, y: -0.5 };

  // chat.png 위 대사/미니캐. 단위는 화면(#stage) %
  const CHAT_TEXT_POSITION = { x: 14, y: 79 };
  const CHAT_TEXT_WIDTH = 60;
  const CHAT_CHARACTER_POSITION = { x: 69, y: 58 };
  const CHAT_CHARACTER_SIZE = { width: 20, height: 34 };
  const CHAT_CHARACTER_SCALE = 1;
  const CHAT_CHARACTER_ZOOM = 4.15;
  const CHAT_CHARACTER_FOCUS = { x: 85.5, y: 66 };

  const HIT = {
    cupTools: { left: 4.3, top: 40.2, width: 19.2, height: 51.8 },
    toothpaste: { left: 32.4, top: 46.8, width: 21.4, height: 23.0 },
    toothbrush: { left: 33.0, top: 50.0, width: 17.4, height: 10.0 },
    cup: { left: 4.1, top: 59.5, width: 19.2, height: 32.6 },
    // 칫솔모만. 짜기는 이 칸의 오른쪽 끝에서 시작해 왼쪽 끝에서 끝난다.
    // 칫솔대(손잡이)는 넣지 말 것.
    brushHead: { left: 50.6, top: 65.6, width: 6.8, height: 6.8 },
    mouth: { left: 41.0, top: 45.0, width: 18.0, height: 15.0 },
  };

  // 치약 이미지에서 입구(nozzle) 위치. 클릭한 곳과 상관없이 이 점을 판정에 쓴다.
  const TOOTHPASTE_NOZZLE = { x: 51.2, y: 65.2 };

  const layerBase = {
    toothpaste: { x: 0, y: 0 },
    toothbrush: { x: 0, y: 0 },
    cup: { x: 0, y: 0 },
  };

  let runId = 0;
  let step = "ready";
  let clean = 0;
  let rinseFill = 0;
  let dragging = null;
  let dragOrigin = { x: 0, y: 0 };
  let lastX = 0;
  let lastY = 0;
  let lastScrubSound = 0;
  let lastRinseTick = 0;
  let faceIndex = 0;
  let bubbleOn = false;
  let rinseOnRight = false;
  let faceTimer = 0;
  let bubbleTimer = 0;
  let rinseTimer = 0;
  let rinseHoldTimer = 0;
  let creamTimer = 0;
  let rinseStartedAt = 0;
  let inMouth = false;
  let creamProgress = 0;
  let creamSqueezing = false;
  let creamLeftX = null;
  let chatKey = "";
  let chatLine = "";
  let chatTyped = 0;
  let chatFace = "";
  let chatTypeTimer = 0;
  let chatShakeTimer = 0;
  let chatShakeOn = false;
  let chatAwaitClick = false;

  function els() {
    return {
      scene: document.querySelector('[data-scene="brush"]'),
      chat: document.getElementById("brush-chat"),
      chatText: document.getElementById("brush-chat-text"),
      chatMiniWrap: document.getElementById("brush-chat-mini-wrap"),
      chatMini: document.getElementById("brush-chat-mini"),
      chatArrow: document.getElementById("brush-chat-arrow"),
      chatHit: document.getElementById("brush-chat-hit"),
      character: document.getElementById("brush-character"),
      cupTools: document.getElementById("bath-cup-tools"),
      cup: document.getElementById("bath-cup"),
      toothpaste: document.getElementById("bath-toothpaste"),
      toothbrush: document.getElementById("bath-toothbrush"),
      cream: document.getElementById("bath-cream"),
      bubbleA: document.getElementById("bath-bubble-a"),
      bubbleB: document.getElementById("bath-bubble-b"),
      sparkles: document.getElementById("bath-sparkles"),
      gauge: document.getElementById("rinse-gauge"),
      fill: document.getElementById("rinse-fill"),
      nextBtn: document.getElementById("btn-brush-next"),
      skipBtn: document.getElementById("btn-brush-skip"),
      hitCupTools: document.getElementById("hit-cup-tools"),
      hitToothpaste: document.getElementById("hit-toothpaste"),
      hitToothbrush: document.getElementById("hit-toothbrush"),
      hitCup: document.getElementById("hit-cup"),
      hitBrushHead: document.getElementById("hit-brush-head"),
      hitMouth: document.getElementById("hit-mouth"),
      cupArrow: document.getElementById("bath-cup-arrow"),
    };
  }

  function applyHit(el, box) {
    if (!el || !box) {
      return;
    }
    el.style.left = `${box.left}%`;
    el.style.top = `${box.top}%`;
    el.style.width = `${box.width}%`;
    el.style.height = `${box.height}%`;
    if (BRUSH_DEBUG && el.id === "hit-brush-head") {
      el.style.outline = "2px solid #f15d75";
      el.style.background = "rgba(241, 93, 117, 0.22)";
    }
  }

  function setHidden(el, hidden) {
    if (el) {
      el.hidden = hidden;
    }
  }

  function layoutChat() {
    const { chat, chatText, chatMini, chatMiniWrap, chatArrow, chatHit } = els();
    // 채팅 박스·문구·미니캐 상대 위치 유지한 채 전체 아래로
    if (chat) {
      chat.style.transform = `translateY(${DIALOGUE_GROUP_OFFSET_Y}%)`;
      chat.hidden = false;
    }
    if (chatText) {
      chatText.style.left = `${CHAT_TEXT_POSITION.x}%`;
      chatText.style.top = `${CHAT_TEXT_POSITION.y}%`;
      chatText.style.width = `${CHAT_TEXT_WIDTH}%`;
      chatText.style.color = CHAT_TEXT_COLOR;
      chatText.style.fontFamily = CHAT_TEXT_FONT;
      chatText.style.fontSize = `${CHAT_TEXT_SIZE}px`;
    }
    if (chatMiniWrap) {
      chatMiniWrap.style.left = `${CHAT_CHARACTER_POSITION.x}%`;
      chatMiniWrap.style.top = `${CHAT_CHARACTER_POSITION.y}%`;
      chatMiniWrap.style.width = `${CHAT_CHARACTER_SIZE.width}%`;
      chatMiniWrap.style.height = `${CHAT_CHARACTER_SIZE.height}%`;
      chatMiniWrap.style.transform = `scale(${CHAT_CHARACTER_SCALE})`;
      chatMiniWrap.style.transformOrigin = "right bottom";
    }
    if (chatMini) {
      chatMini.style.objectPosition = `${CHAT_CHARACTER_FOCUS.x}% ${CHAT_CHARACTER_FOCUS.y}%`;
      chatMini.style.transform = `scale(${CHAT_CHARACTER_ZOOM})`;
      chatMini.style.transformOrigin = `${CHAT_CHARACTER_FOCUS.x}% ${CHAT_CHARACTER_FOCUS.y}%`;
    }
    if (chatArrow) {
      chatArrow.style.color = DIALOGUE_ARROW_COLOR;
      chatArrow.style.setProperty("--chat-arrow-blink", `${DIALOGUE_ARROW_BLINK_SPEED}ms`);
    }
    if (chatHit) {
      chatHit.style.pointerEvents = chatAwaitClick ? "auto" : "none";
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

  // 렌더된 마지막 글자 Rect 기준으로 ▼ 배치 (말풍선 밖으로 나가지 않게 clamp)
  function placeChatArrowAtTextEnd() {
    const { chat, chatText, chatArrow } = els();
    if (!chat || !chatText || !chatArrow || chatArrow.hidden) {
      return;
    }
    const textNode = lastTextNode(chatText);
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
    const arrowW = chatArrow.offsetWidth || 16;
    const arrowH = chatArrow.offsetHeight || 16;
    const pad = 6;
    let left = glyph.right - chatBox.left + DIALOGUE_ARROW_GAP_PX;
    let top = glyph.top + glyph.height / 2 - chatBox.top;
    left = Math.min(Math.max(pad, left), chatBox.width - arrowW - pad);
    top = Math.min(Math.max(pad + arrowH / 2, top), chatBox.height - pad - arrowH / 2);
    chatArrow.style.left = `${left}px`;
    chatArrow.style.top = `${top}px`;
    chatArrow.style.transform = `translate(0, -50%) scale(${DIALOGUE_ARROW_SCALE})`;
  }

  function setChatArrowVisible(visible, clickable) {
    const { chatArrow, chat, chatHit } = els();
    const show = Boolean(visible);
    chatAwaitClick = Boolean(show && (clickable == null ? true : clickable));
    if (chatArrow) {
      chatArrow.hidden = !show;
      chatArrow.style.pointerEvents = chatAwaitClick ? "auto" : "none";
    }
    if (chat) {
      chat.classList.toggle("is-awaiting-click", chatAwaitClick);
    }
    if (chatHit) {
      chatHit.hidden = !chatAwaitClick;
      chatHit.style.pointerEvents = chatAwaitClick ? "auto" : "none";
    }
    if (show) {
      requestAnimationFrame(() => {
        placeChatArrowAtTextEnd();
        requestAnimationFrame(() => placeChatArrowAtTextEnd());
      });
    }
  }

  function stopChatAnim() {
    window.clearTimeout(chatTypeTimer);
    window.clearInterval(chatShakeTimer);
    chatTypeTimer = 0;
    chatShakeTimer = 0;
    chatShakeOn = false;
    chatAwaitClick = false;
    setChatArrowVisible(false, false);
  }

  function setChatFace(face) {
    const { chatMini } = els();
    const src = CHAT_MINI[face];
    if (!chatMini || !src) {
      return;
    }
    chatFace = face;
    if (!chatMini.src.endsWith(src)) {
      chatMini.src = src;
    }
    chatMini.hidden = false;
  }

  function chatAllowsClickAdvance(key) {
    return !CHAT_CLICK_SKIP_KEYS.includes(key || chatKey);
  }

  function finishChatTyping() {
    const { chatText } = els();
    window.clearTimeout(chatTypeTimer);
    chatTypeTimer = 0;
    chatTyped = chatLine.length;
    if (chatText) {
      chatText.textContent = chatLine;
    }
    const line = CHAT_LINES[chatKey];
    // 입 헹구기(rinsing)는 ▼ 없이 자동 진행. 그 외는 ▼ 표시. next 있을 때만 클릭 진행
    if (chatAllowsClickAdvance(chatKey) && line) {
      setChatArrowVisible(true, Boolean(line.next));
      layoutChat();
    } else {
      setChatArrowVisible(false, false);
    }
  }

  function typeChatTick(startedRun) {
    const { chatText } = els();
    if (startedRun !== runId || !chatText) {
      return;
    }
    chatTyped = Math.min(chatLine.length, chatTyped + 1);
    chatText.textContent = chatLine.slice(0, chatTyped);
    if (chatTyped < chatLine.length) {
      chatTypeTimer = window.setTimeout(() => typeChatTick(startedRun), CHAT_TYPING_SPEED);
      return;
    }
    finishChatTyping();
  }

  function startChatShake() {
    window.clearInterval(chatShakeTimer);
    chatShakeOn = false;
    setChatFace("shake1");
    const startedRun = runId;
    chatShakeTimer = window.setInterval(() => {
      if (startedRun !== runId || chatKey !== "brush") {
        return;
      }
      chatShakeOn = !chatShakeOn;
      setChatFace(chatShakeOn ? "shake2" : "shake1");
    }, CHAT_SHAKE_INTERVAL);
  }

  function playChat(key) {
    const line = CHAT_LINES[key];
    const { chatText } = els();
    if (!line || !chatText) {
      return;
    }
    window.clearTimeout(chatTypeTimer);
    window.clearInterval(chatShakeTimer);
    chatShakeTimer = 0;
    chatKey = key;
    chatLine = line.text;
    chatTyped = 0;
    chatText.textContent = "";
    setChatArrowVisible(false, false);
    layoutChat();
    if (line.loop) {
      startChatShake();
    } else {
      setChatFace(line.face);
    }
    typeChatTick(runId);
  }

  function layoutCupArrow() {
    const { cupArrow, hitCupTools } = els();
    if (!cupArrow || !hitCupTools) {
      return;
    }
    const box = HIT.cupTools;
    const cx = box.left + box.width / 2 + CUP_TUTORIAL_ARROW_OFFSET.x;
    const cy = box.top + CUP_TUTORIAL_ARROW_OFFSET.y;
    cupArrow.style.left = `${cx}%`;
    cupArrow.style.top = `${cy}%`;
    cupArrow.style.color = CUP_TUTORIAL_ARROW_COLOR;
    cupArrow.style.transform = `translate(-50%, -50%) scale(${CUP_TUTORIAL_ARROW_SCALE})`;
    cupArrow.style.setProperty("--cup-arrow-blink", `${CUP_TUTORIAL_ARROW_BLINK_SPEED}ms`);
  }

  function showCupArrow(visible) {
    const { cupArrow } = els();
    if (!cupArrow) {
      return;
    }
    if (visible) {
      layoutCupArrow();
      cupArrow.hidden = false;
    } else {
      cupArrow.hidden = true;
    }
  }

  function revealCupTools() {
    const ui = els();
    setHidden(ui.cupTools, false);
    setHidden(ui.hitCupTools, false);
    ui.cupTools?.classList.remove("is-tutorial-glow");
    showCupArrow(true);
  }

  function clearCupToolsHint() {
    const ui = els();
    ui.cupTools?.classList.remove("is-tutorial-glow");
    showCupArrow(false);
  }

  // 대사 완성 후 ▼ / 채팅 박스 클릭 → 다음 대사. 타이핑 중이면 먼저 전부 표시
  function onChatAdvance() {
    if (!chatAllowsClickAdvance(chatKey)) {
      return;
    }
    if (chatTyped < chatLine.length) {
      finishChatTyping();
      return;
    }
    const line = CHAT_LINES[chatKey];
    if (!line?.next) {
      return;
    }
    const nextKey = line.next;
    if (nextKey === "next") {
      setHidden(els().nextBtn, false);
    }
    // wake → cup: 말풍선 클릭 후에야 컵(칫솔+치약) 등장. 자동 진행 없음
    if (nextKey === "cup") {
      revealCupTools();
    }
    playChat(nextKey);
  }

  function drawSpeechBubble() {
    layoutChat();
  }

  function currentBubblePos() {
    return step === "rinseReady" ? RINSE_BUBBLE_POSITION : BRUSHING_BUBBLE_POSITION;
  }

  function bubbleTransform(scale) {
    const pos = currentBubblePos();
    return `translate(${pos.x}%, ${pos.y}%) scale(${scale})`;
  }

  function applyCreamMask(nozzleClientX) {
    const { cream, hitBrushHead } = els();
    const stage = document.getElementById("stage")?.getBoundingClientRect();
    const head = hitBrushHead?.getBoundingClientRect();
    if (!cream || !stage?.width || !head?.width || !stage.height) {
      return;
    }
    const nozzleX = Math.min(head.right, Math.max(head.left, nozzleClientX));
    const leftPct = ((nozzleX - stage.left) / stage.width) * 100;
    const rightPct = ((stage.right - head.right) / stage.width) * 100;
    cream.style.clipPath = `inset(0 ${rightPct}% 0 ${leftPct}%)`;
    creamProgress = Math.max(0, Math.min(100, ((head.right - nozzleX) / head.width) * 100));
  }

  function setCreamReveal(progress) {
    creamProgress = Math.max(0, Math.min(100, progress));
    const { cream, hitBrushHead } = els();
    const head = hitBrushHead?.getBoundingClientRect();
    if (!cream) {
      return;
    }
    if (!head?.width) {
      cream.style.clipPath = "inset(0 0 0 100%)";
      return;
    }
    const nozzleX = head.right - (head.width * creamProgress) / 100;
    applyCreamMask(nozzleX);
  }

  function setFace(src) {
    const { character } = els();
    if (character && !character.src.endsWith(src)) {
      character.src = src;
    }
  }

  function setLayerPos(name, x, y) {
    layerBase[name] = { x, y };
    const ui = els();
    const layer = ui[name];
    if (layer) {
      if (name === "cup") {
        layer.style.transformOrigin = "13.7% 75.8%";
        layer.style.transform = `translate(${x}px, ${y}px) scale(${CUP_SCALE})`;
      } else {
        layer.style.transform = `translate(${x}px, ${y}px)`;
      }
    }
    const hit = {
      toothpaste: ui.hitToothpaste,
      toothbrush: ui.hitToothbrush,
      cup: ui.hitCup,
    }[name];
    if (hit) {
      hit.style.transform = `translate(${x}px, ${y}px)`;
    }
  }

  function resetLayer(name) {
    setLayerPos(name, 0, 0);
  }

  function overBox(el, x, y) {
    if (!el || el.hidden) {
      return false;
    }
    const rect = el.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }

  function toothpasteNozzlePoint() {
    const stage = document.getElementById("stage")?.getBoundingClientRect();
    const shift = layerBase.toothpaste || { x: 0, y: 0 };
    if (!stage?.width) {
      return { x: 0, y: 0 };
    }
    return {
      x: stage.left + (TOOTHPASTE_NOZZLE.x / 100) * stage.width + shift.x,
      y: stage.top + (TOOTHPASTE_NOZZLE.y / 100) * stage.height + shift.y,
    };
  }

  function nozzleNearBristles(nozzle, head) {
    const padX = Math.max(12, head.width * 0.22);
    const padY = Math.max(16, head.height * 0.7);
    return nozzle.y >= head.top - padY && nozzle.y <= head.bottom + padY
      && nozzle.x >= head.left - padX && nozzle.x <= head.right + padX;
  }

  function stagePoint(box) {
    const stage = document.getElementById("stage").getBoundingClientRect();
    return {
      x: stage.left + ((box.left + box.width / 2) / 100) * stage.width,
      y: stage.top + ((box.top + box.height / 2) / 100) * stage.height,
    };
  }

  function updateGauge() {
    const { fill } = els();
    if (fill) {
      fill.style.width = `${Math.max(0, Math.min(100, rinseFill))}%`;
    }
  }

  function showBubbles(progress) {
    const { bubbleA, bubbleB } = els();
    if (step === "rinseReady") {
      return;
    }
    const shown = progress > 6 && step === "brushing";
    const opacity = Math.min(1, 0.2 + progress / 100);
    const scale = 0.7 + Math.min(0.45, progress / 220);
    [bubbleA, bubbleB].forEach((el) => {
      if (!el) {
        return;
      }
      el.style.opacity = String(opacity);
      el.style.transform = bubbleTransform(scale);
    });
    if (!shown) {
      setHidden(bubbleA, true);
      setHidden(bubbleB, true);
      return;
    }
    setHidden(bubbleA, bubbleOn);
    setHidden(bubbleB, !bubbleOn);
  }

  function startMouthBubbles() {
    const { bubbleA, bubbleB } = els();
    window.clearInterval(bubbleTimer);
    bubbleOn = false;
    setHidden(bubbleA, false);
    setHidden(bubbleB, true);
    if (bubbleA) {
      bubbleA.style.opacity = "1";
      bubbleA.style.transform = bubbleTransform(1.08);
    }
    if (bubbleB) {
      bubbleB.style.opacity = "1";
      bubbleB.style.transform = bubbleTransform(1.08);
    }
    const startedRun = runId;
    bubbleTimer = window.setInterval(() => {
      if (startedRun !== runId || step !== "rinseReady") {
        return;
      }
      bubbleOn = !bubbleOn;
      setHidden(bubbleA, bubbleOn);
      setHidden(bubbleB, !bubbleOn);
    }, BUBBLE_INTERVAL);
  }

  function startBrushBubbles() {
    const { bubbleA, bubbleB } = els();
    window.clearInterval(bubbleTimer);
    bubbleOn = false;
    setHidden(bubbleA, true);
    setHidden(bubbleB, true);
    const startedRun = runId;
    bubbleTimer = window.setInterval(() => {
      if (startedRun !== runId || step !== "brushing") {
        return;
      }
      if (window.Game?.state?.paused || clean <= 6) {
        return;
      }
      bubbleOn = !bubbleOn;
      showBubbles(clean);
    }, BUBBLE_INTERVAL);
  }

  function stopIdleBlink() {
    window.clearTimeout(faceTimer);
    faceTimer = 0;
  }

  function startIdleBlink() {
    stopIdleBlink();
    if (step !== "brushing") {
      return;
    }
    setFace(SRC.open);
    const startedRun = runId;
    function holdThenBlink() {
      faceTimer = window.setTimeout(() => {
        if (startedRun !== runId || step !== "brushing") {
          return;
        }
        if (window.Game?.state?.paused) {
          holdThenBlink();
          return;
        }
        play(0);
      }, BLINK_HOLD_MS);
    }
    function play(index) {
      const frames = [
        { src: SRC.half, ms: BLINK_HALF_MS },
        { src: SRC.closed, ms: BLINK_CLOSED_MS },
        { src: SRC.open, ms: BLINK_HOLD_MS },
      ];
      if (startedRun !== runId || step !== "brushing") {
        return;
      }
      if (index >= frames.length) {
        play(0);
        return;
      }
      setFace(frames[index].src);
      faceTimer = window.setTimeout(() => play(index + 1), frames[index].ms);
    }
    holdThenBlink();
  }

  function stopFaceAnim() {
    stopIdleBlink();
    inMouth = false;
    if (step === "brushing") {
      window.clearInterval(bubbleTimer);
      bubbleTimer = 0;
      setFace(SRC.open);
      showBubbles(clean);
    }
  }

  function beginBrushing() {
    if (step !== "pasteShow" && step !== "pasteReady") {
      return;
    }
    step = "brushing";
    clean = 0;
    const ui = els();
    setHidden(ui.cream, true);
    setHidden(ui.toothpaste, true);
    setHidden(ui.hitToothpaste, true);
    setHidden(ui.hitBrushHead, true);
    setHidden(ui.toothbrush, false);
    setHidden(ui.hitToothbrush, false);
    setHidden(ui.hitMouth, false);
    applyHit(ui.hitToothbrush, HIT.toothbrush);
    applyHit(ui.hitMouth, HIT.mouth);
    resetLayer("toothbrush");
    playChat("brush");
    startIdleBlink();
    startBrushBubbles();
  }

  function finishSqueeze() {
    if (step !== "pasteReady") {
      return;
    }
    creamSqueezing = false;
    creamLeftX = null;
    creamProgress = 100;
    endDrag();
    // 치약 완료 상태 유지 → 대기 후 양치 시작
    step = "pasteShow";
    const ui = els();
    setHidden(ui.cream, false);
    setCreamReveal(100);
    setHidden(ui.toothpaste, true);
    setHidden(ui.hitToothpaste, true);
    setHidden(ui.hitBrushHead, true);
    resetLayer("toothpaste");
    AudioBus.play("drop", window.Game?.state?.sfxOn);
    window.clearTimeout(creamTimer);
    const startedRun = runId;
    creamTimer = window.setTimeout(() => {
      if (startedRun !== runId || step !== "pasteShow") {
        return;
      }
      beginBrushing();
    }, Math.round(TOOTHPASTE_FINISHED_HOLD_TIME * 1000));
  }

  function finishBrushing() {
    stopFaceAnim();
    step = "rinseReady";
    clean = 100;
    rinseFill = 0;
    updateGauge();
    const ui = els();
    setFace(SRC.wantRinse);
    setHidden(ui.toothbrush, true);
    setHidden(ui.cream, true);
    setHidden(ui.hitToothbrush, true);
    setHidden(ui.hitMouth, false);
    setHidden(ui.hitCup, false);
    setHidden(ui.cup, false);
    setHidden(ui.gauge, false);
    applyHit(ui.hitCup, HIT.cup);
    applyHit(ui.hitMouth, HIT.mouth);
    resetLayer("cup");
    startMouthBubbles();
    playChat("rinseAsk");
    AudioBus.play("success", window.Game?.state?.sfxOn);
  }

  function finishRinse() {
    window.clearInterval(rinseTimer);
    rinseTimer = 0;
    step = "done";
    const ui = els();
    setFace(SRC.done);
    setHidden(ui.cup, true);
    setHidden(ui.hitCup, true);
    setHidden(ui.hitMouth, true);
    setHidden(ui.gauge, true);
    setHidden(ui.bubbleA, true);
    setHidden(ui.bubbleB, true);
    setHidden(ui.sparkles, false);
    playChat("fresh");
    AudioBus.play("success", window.Game?.state?.sfxOn);
    // 다음 대사(next)는 ▼ 클릭으로 진행. 자동 전환 없음
  }

  function startRinse() {
    if (step !== "rinseReady") {
      return;
    }
    step = "rinsing";
    const ui = els();
    window.clearInterval(bubbleTimer);
    bubbleTimer = 0;
    setHidden(ui.cup, true);
    setHidden(ui.hitCup, true);
    setHidden(ui.hitMouth, true);
    setHidden(ui.gauge, true);
    setHidden(ui.bubbleA, true);
    setHidden(ui.bubbleB, true);
    resetLayer("cup");
    setFace(SRC.rinseLeft);
    rinseOnRight = false;
    rinseStartedAt = Date.now();
    playChat("rinsing");
    AudioBus.play("drop", window.Game?.state?.sfxOn);
    const startedRun = runId;
    rinseTimer = window.setInterval(() => {
      if (startedRun !== runId || step !== "rinsing" || window.Game?.state?.paused) {
        return;
      }
      rinseOnRight = !rinseOnRight;
      setFace(rinseOnRight ? SRC.rinseRight : SRC.rinseLeft);
      if (Date.now() - rinseStartedAt >= RINSE_MS) {
        finishRinse();
      }
    }, RINSE_INTERVAL);
  }

  function stopRinseHold() {
    window.clearInterval(rinseHoldTimer);
    rinseHoldTimer = 0;
    lastRinseTick = 0;
  }

  function startRinseHold() {
    stopRinseHold();
    lastRinseTick = Date.now();
    const startedRun = runId;
    rinseHoldTimer = window.setInterval(() => {
      if (startedRun !== runId || dragging !== "cup" || step !== "rinseReady") {
        return;
      }
      const now = Date.now();
      if (overBox(els().hitMouth, lastX, lastY)) {
        rinseFill = Math.min(100, rinseFill + ((now - lastRinseTick) * 100) / RINSE_FILL_MS);
        updateGauge();
        if (rinseFill >= 100) {
          stopRinseHold();
          endDrag();
          startRinse();
        }
      }
      lastRinseTick = now;
    }, 40);
  }

  function openCup(event) {
    if (step !== "ready") {
      return;
    }
    // 컵 대사가 나온 뒤에만 클릭 가능 (말풍선만으로는 진행 안 됨)
    if (chatKey !== "cup") {
      return;
    }
    step = "pasteReady";
    const ui = els();
    clearCupToolsHint();
    setHidden(ui.cupTools, true);
    setHidden(ui.hitCupTools, true);
    setHidden(ui.cup, false);
    setHidden(ui.toothpaste, false);
    setHidden(ui.hitToothpaste, false);
    setHidden(ui.hitBrushHead, false);
    applyHit(ui.hitToothpaste, HIT.toothpaste);
    applyHit(ui.hitBrushHead, HIT.brushHead);
    setFace(SRC.squeeze);
    resetLayer("toothpaste");
    playChat("paste");
  }

  function onPointerMove(event) {
    if (!dragging) {
      return;
    }
    event.preventDefault();
    const prevX = lastX;
    const prevY = lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    setLayerPos(dragging, event.clientX - dragOrigin.x, event.clientY - dragOrigin.y);

    if (dragging === "toothpaste" && step === "pasteReady") {
      const headEl = els().hitBrushHead;
      const box = headEl?.getBoundingClientRect();
      if (!box?.width) {
        return;
      }
      const nozzle = toothpasteNozzlePoint();
      const fromLeft = (nozzle.x - box.left) / box.width;
      if (!creamSqueezing) {
        if (!nozzleNearBristles(nozzle, box) || fromLeft < CREAM_START_FROM_RIGHT) {
          return;
        }
        creamSqueezing = true;
        creamLeftX = box.right;
      }
      if (nozzle.x < creamLeftX) {
        creamLeftX = Math.max(box.left, nozzle.x);
        setHidden(els().cream, false);
        applyCreamMask(creamLeftX);
      }
      if (creamProgress >= 98 || creamLeftX <= box.left + 2) {
        finishSqueeze();
      }
      return;
    }

    if (dragging === "toothbrush" && step === "brushing") {
      const over = overBox(els().hitMouth, event.clientX, event.clientY);
      if (over) {
        inMouth = true;
        const dist = Math.hypot(event.clientX - prevX, event.clientY - prevY);
        clean = Math.min(100, clean + dist * FILL_PER_PX);
        showBubbles(clean);
        const now = Date.now();
        if (now - lastScrubSound > 160) {
          AudioBus.play("scrub", window.Game?.state?.sfxOn);
          lastScrubSound = now;
        }
        if (clean >= 100) {
          endDrag();
          finishBrushing();
        }
      } else {
        inMouth = false;
        showBubbles(clean);
      }
    }
  }

  function endDrag() {
    if (!dragging) {
      return;
    }
    const name = dragging;
    dragging = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    stopRinseHold();
    if (name === "toothbrush") {
      inMouth = false;
      resetLayer("toothbrush");
      showBubbles(clean);
    } else if (name === "cup" && step === "rinseReady") {
      resetLayer("cup");
    }
  }

  function onPointerUp() {
    if (dragging === "toothpaste" && step === "pasteReady" && creamProgress >= 98) {
      finishSqueeze();
      return;
    }
    endDrag();
  }

  function startDrag(name, event) {
    if (window.Game?.state?.paused) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    dragging = name;
    const base = layerBase[name] || { x: 0, y: 0 };
    dragOrigin = { x: event.clientX - base.x, y: event.clientY - base.y };
    lastX = event.clientX;
    lastY = event.clientY;
    AudioBus.play("pickup", window.Game?.state?.sfxOn);
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    if (name === "cup") {
      startRinseHold();
    }
  }

  function onSceneDown(event) {
    if (window.Game?.state?.paused) {
      return;
    }
    const hit = event.target.closest(".bath-hit");
    if (!hit) {
      return;
    }
    if (hit.id === "hit-cup-tools") {
      openCup(event);
      return;
    }
    if (hit.id === "hit-toothpaste" && step === "pasteReady") {
      startDrag("toothpaste", event);
      return;
    }
    if (hit.id === "hit-toothbrush" && step === "brushing") {
      startDrag("toothbrush", event);
      return;
    }
    if (hit.id === "hit-cup" && step === "rinseReady") {
      startDrag("cup", event);
    }
  }

  function layoutHits() {
    const ui = els();
    applyHit(ui.hitCupTools, HIT.cupTools);
    applyHit(ui.hitToothpaste, HIT.toothpaste);
    applyHit(ui.hitToothbrush, HIT.toothbrush);
    applyHit(ui.hitCup, HIT.cup);
    applyHit(ui.hitBrushHead, HIT.brushHead);
    applyHit(ui.hitMouth, HIT.mouth);
  }

  function reset() {
    runId += 1;
    endDrag();
    stopFaceAnim();
    stopRinseHold();
    window.clearInterval(rinseTimer);
    window.clearInterval(bubbleTimer);
    window.clearTimeout(creamTimer);
    stopChatAnim();
    rinseTimer = 0;
    bubbleTimer = 0;
    creamTimer = 0;
    step = "ready";
    clean = 0;
    rinseFill = 0;
    faceIndex = 0;
    bubbleOn = false;
    inMouth = false;
    creamProgress = 0;
    creamSqueezing = false;
    creamLeftX = null;
    const ui = els();
    setFace(SRC.open);
    // wake 대사 중에는 컵 숨김 → 말풍선 클릭 후 cup 대사와 함께 등장
    setHidden(ui.cupTools, true);
    setHidden(ui.cup, true);
    clearCupToolsHint();
    setHidden(ui.toothpaste, true);
    setHidden(ui.toothbrush, true);
    setHidden(ui.cream, true);
    if (ui.cream) {
      ui.cream.style.clipPath = "inset(0 0 0 100%)";
    }
    setHidden(ui.bubbleA, true);
    setHidden(ui.bubbleB, true);
    setHidden(ui.sparkles, true);
    setHidden(ui.gauge, true);
    setHidden(ui.nextBtn, true);
    setHidden(ui.hitCupTools, true);
    setHidden(ui.hitToothpaste, true);
    setHidden(ui.hitToothbrush, true);
    setHidden(ui.hitCup, true);
    setHidden(ui.hitBrushHead, true);
    setHidden(ui.hitMouth, true);
    ["toothpaste", "toothbrush", "cup"].forEach(resetLayer);
    if (ui.bubbleA) {
      ui.bubbleA.style.opacity = "";
      ui.bubbleA.style.transform = "";
    }
    if (ui.bubbleB) {
      ui.bubbleB.style.opacity = "";
      ui.bubbleB.style.transform = "";
    }
    updateGauge();
    layoutHits();
    // wake → (▼ 클릭) → cup 등장+Glow → 컵 실클릭 → paste
    playChat("wake");
  }

  function leaveBrush(nextScene) {
    // 진행 중 타이머/애니메이션 중단 후 다음 씬으로
    runId += 1;
    endDrag();
    stopFaceAnim();
    stopRinseHold();
    window.clearInterval(rinseTimer);
    window.clearInterval(bubbleTimer);
    window.clearTimeout(creamTimer);
    stopChatAnim();
    rinseTimer = 0;
    bubbleTimer = 0;
    creamTimer = 0;
    if (typeof window.Game?.goScene === "function") {
      window.Game.goScene(nextScene);
    }
  }

  function canDrop() {
    return false;
  }

  function onDropped() {}

  function boot() {
    const { scene, nextBtn, skipBtn, chatHit, chatArrow } = els();
    Object.values(SRC).forEach((src) => {
      const img = new Image();
      img.src = src;
    });
    Object.values(CHAT_MINI).forEach((src) => {
      const img = new Image();
      img.src = src;
    });
    layoutHits();
    scene.addEventListener("pointerdown", onSceneDown);
    const advance = (event) => {
      event.preventDefault();
      event.stopPropagation();
      onChatAdvance();
    };
    chatHit?.addEventListener("click", advance);
    chatArrow?.addEventListener("click", advance);
    // 정상 완료: 기존과 동일하게 햄버거 알바로
    nextBtn?.addEventListener("click", () => leaveBrush("phase2"));
    // 테스트용 SKIP: 준비물 찾기 씬으로
    skipBtn?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      leaveBrush("search");
    });
  }

  return { boot, reset, canDrop, onDropped, drawSpeechBubble };
})();
