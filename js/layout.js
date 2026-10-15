/**
 * 주방(phase2) 오브젝트 위치 / 클릭 영역 / 스폰 위치.
 *
 * 숫자만 바꾸고 저장한 뒤, 브라우저를 새로고침하면 반영된다.
 * 좌표를 새로 찍으려면 아래 DEBUG_MODE 를 true 로 둔다.
 *
 * 단위:
 *   left   = 화면(#stage) 왼쪽에서 얼마나 떨어졌는지 (%)
 *   top    = 화면 위쪽에서 얼마나 떨어졌는지 (%)
 *   width  = 가로 범위 (%)
 *   height = 세로 범위 (%)
 *
 * 재료마다 값이 세 갈래다. 하나를 바꿔도 나머지가 따라가지 않는다.
 *   ART   = 그림이 보이는 위치
 *   HIT   = 마우스로 클릭/집기 판정 영역
 *   SPAWN = 집었을 때 재료 고스트가 처음 뜨는 위치·크기
 *
 * 손볼 곳
 *   접시 / 그릴 / 재료 클릭   → 아래 ART / HIT / SPAWN
 *   아래 빵 높이 / 한 층 간격 → BURGER_BUN_TOP, BURGER_STACK_LIFT, BURGER_LAYER_LIFT
 *   케첩 위치                 → KETCHUP_POSITION  (x 좌우, y 아래+)
 *   마요 위치                 → MAYO_POSITION
 */
const Layout = (() => {
  // true 면 마우스 좌표 + 영역 박스가 보인다. 맞추기가 끝나면 false.
  const DEBUG_MODE = false;

  // =========================
  // 휴지통 — 숫자만 바꿔서 위치/크기 조절 (화면 #stage %)
  //   left / top = 왼쪽 위 모서리
  //   width / height = 판정·라벨 기준 크기
  // 이미지 라벨과 드래그 판정이 이 값을 함께 쓴다.
  // =========================
  const TRASH_CAN_POS = { left: 56, top: 94, width: 12.5, height: 14 };
  const TRASH_HIT = TRASH_CAN_POS;
  const TRASH_LABEL_OFFSET = { x: 0, y: -1.2 }; // 박스 중심 기준, y- 위
  const TRASH_LABEL = "휴지통";


  // =========================
  // 손님
  // left / top 만 퍼센트. 몸통 크기는 px (기존 CSS 값 그대로).
  // =========================

  // 손님 A (왼쪽) 슬롯 기준 위치 — 왼쪽 위 모서리
  const CUSTOMER_A = { left: 34, top: -9};
  // 손님 B (오른쪽) 슬롯 기준 위치 — 왼쪽 위 모서리
  const CUSTOMER_B = { left: 56, top: -9};
  // 손님 그림 크기 (픽셀). 그림 비율 3:4
  const CUSTOMER_BODY = { width: 168, height: 224 };
  // 주문 말풍선. x + 오른쪽 / y + 아래. 손님 위치는 그대로 두고 말풍선만 움직임.
  const CUSTOMER_ORDER_BUBBLE_OFFSET = { x: 0, y: 52 };
  // 대기 게이지. y + 아래. 손님/말풍선과 가깝게 내릴 때 이 숫자만 바꾸면 됨.
  const CUSTOMER_GAUGE_OFFSET = { x: 0, y: 44 };

  // =========================
  // 접시 두 개 (위 / 아래)
  // 숫자만 바꾸고 새로고침하면 반영된다. 단위는 화면(#stage) 기준 %.
  //   ART = 접시 그림이 보이는 위치·크기 (버거 재료 크기와 따로다)
  //   HIT = 재료를 놓거나 접시를 집는 클릭/드롭 판정
  // =========================

  const PLATE_A_ART = { left: 73, top: 56, width: 22, height: 22 };
  const PLATE_A_HIT = { left: 77, top: 58, width: 15, height: 15 };
  const PLATE_B_ART = { left: 74, top: 69, width: 23, height: 23 };
  const PLATE_B_HIT = { left: 77, top: 75, width: 15, height: 15 };

  // =========================
  // 접시 위 버거 쌓기 — 숫자만 바꾸고 새로고침
  //
  // 아래 빵: 접시 가운데, BURGER_BUN_TOP 에 고정. 재료가 쌓여도 아래로 안 내려감.
  // 속재료: 아래 빵 위에서 한 층씩 올라감. (패티/상추/치즈/소스/피클/토마토 무엇이든 동일)
  // 윗빵: 마지막 속재료 바로 위에 한 층 더.
  //
  // 조절
  //   BURGER_BUN_TOP      아래 빵 높이. 크게 하면 아래로, 작게 하면 위로.
  //   BURGER_STACK_LIFT   한 층 기본 간격. 크게 하면 재료가 더 또렷이 보임.
  //   BURGER_TOP_BUN_EXTRA 윗빵만 더 올리거나 내릴 때. +면 위로.
  //   BURGER_LAYER_LIFT   재료별 간격. 비우거나 0 이면 기본 간격을 씀.
  //   width / height      재료 그림 크기. 접시 크기와 따로다.
  // =========================

  const BURGER_BUN_TOP = 7.6;
  const BURGER_STACK_LIFT = 1.7;
  const BURGER_TOP_BUN_EXTRA = 0;
  const BURGER_LAYER_LIFT = {
    bun: 1.1,
    patty: 1.1,
    mayo: 0,
    ketchup: 0,
    cheese: 1.1,
    lettuce: 1.1,
    tomato: 1.1,
    pickle: 1.1,
    "bun-top": 0,
  };
  const BURGER_BUN = { width: 20, height: 10 };
  const BURGER_PATTY = { width: 18.8, height: 8.8 };
  const BURGER_MAYO = { width: 15.6, height: 4.4 };
  const BURGER_KETCHUP = { width: 15.6, height: 4.4 };
  const BURGER_CHEESE = { width: 19.2, height: 8 };
  const BURGER_LETTUCE = { width: 19.6, height: 9 };
  const BURGER_TOMATO = { width: 25, height: 8 };
  const BURGER_PICKLE = { width: 18.6, height: 8 };
  const BURGER_BUN_TOP_SIZE = { width: 19.6, height: 10 };

  // =========================
  // 케첩 / 마요 위치 (여기 숫자만 바꾸면 됨)
  // 쌓인 자리 기준 추가 이동. 단위는 화면(#stage) %.
  //   x + 오른쪽 / x - 왼쪽
  //   y + 아래   / y - 위
  // 다른 재료는 이 값을 쓰지 않는다.
  // =========================
  const KETCHUP_POSITION = { x: 0, y: 2.0 };
  const MAYO_POSITION = { x: 0, y: 2.0 };
  const BURGER_SAUCE_SHIFT = {
    ketchup: KETCHUP_POSITION,
    mayo: MAYO_POSITION,
  };

  // 접시 위 음료 컵. left/top 은 접시 ART 왼쪽 위 기준 (화면 %).
  const DRINK_CUP = { left: 13.4, top: 5.4, width: 8.6, height: 14.2 };

  // =========================
  // 그릴 위 패티 (왼쪽 / 오른쪽)
  // 그릴에 올려진 패티만 여기서 맞춘다. 단위는 화면(#stage) 기준 %.
  //   ART = 패티 그림이 보이는 위치·크기
  //   HIT = 생패티 드롭 / 뒤집기 클릭 / 익은 패티 집기
  // ART 와 HIT 를 같게 두면 그림과 클릭이 같은 칸을 쓴다.
  // =========================

  const GRILL_PATTY_LEFT_ART = { left: 26, top: 57, width: 9, height: 15 };
  const GRILL_PATTY_LEFT_HIT = { left: 25, top: 56, width: 11, height: 17 };
  const GRILL_PATTY_RIGHT_ART = { left: 36, top: 57, width: 9, height: 15 };
  const GRILL_PATTY_RIGHT_HIT = { left: 35, top: 56, width: 11, height: 17 };

  // 그릴 철판 전체 (디버그 박스). 패티 위치와는 따로 움직인다.
  const GRILL = { left: 20, top: 48, width: 29, height: 30 };

  // =========================
  // 소스통
  // 이미지는 따로 올린 PNG. ART / HIT / SPAWN 을 따로 바꿔도 된다.
  // =========================

  // 노란 마요 통 그림이 보이는 위치
  const MAYO_ART = { left: 93, top: 55, width: 9, height: 31 };
  // 노란 마요를 클릭할 수 있는 영역
  const MAYO_HIT = { left: 93, top: 55, width:8, height: 25 };
  // 마요를 집었을 때 고스트가 뜨는 위치
  const MAYO_SPAWN = { left: 93, top: 55, width: 9, height: 31 };

  // 빨간 케첩 통 그림이 보이는 위치
  const KETCHUP_ART = { left: 92, top: 40, width: 8, height: 32 };
  // 빨간 케첩을 클릭할 수 있는 영역
  const KETCHUP_HIT = { left: 92, top:40, width: 8, height: 25 };
  // 케첩을 집었을 때 고스트가 뜨는 위치
  const KETCHUP_SPAWN = { left: 92, top: 40, width: 8, height: 32 };

  // =========================
  // 하단 보관함 / 야채 칸 / 음료
  // 그림은 kitchen.png 에 그려져 있어서 ART 는 없다.
  // HIT = 클릭 판정, SPAWN = 집었을 때 재료 그림이 뜨는 위치.
  // =========================

  // 아래 빵 통 (하단 왼쪽) 클릭 영역
  const BUN_HIT = { left: 9, top: 85, width: 14, height: 14 };
  // 빵을 집었을 때 고스트가 뜨는 위치
  const BUN_SPAWN = { left: 5, top: 84, width: 24, height: 15.5 };

  // 생패티 통 (하단 가운데) 클릭 영역
  const PATTY_HIT = { left: 26, top: 85, width: 14, height: 14 };
  // 패티를 집었을 때 고스트가 뜨는 위치
  const PATTY_SPAWN = { left: 22, top: 85, width: 24, height: 19 };

  // 양상추 칸 클릭 영역
  const LETTUCE_HIT = { left: 54, top: 60, width: 10.5, height: 11 };
  // 양상추를 집었을 때 고스트가 뜨는 위치
  const LETTUCE_SPAWN = { left: 55.5, top: 58, width: 10.5, height: 11 };

  // 토마토 칸 클릭 영역
  const TOMATO_HIT = { left: 64, top: 60, width: 10.5, height: 11 };
  // 토마토를 집었을 때 고스트가 뜨는 위치
  const TOMATO_SPAWN = { left: 64, top: 58, width: 10.5, height: 11 };

  // 치즈 칸 클릭 영역
  const CHEESE_HIT = { left: 54, top: 70, width: 10.5, height: 11 };
  // 치즈를 집었을 때 고스트가 뜨는 위치
  const CHEESE_SPAWN = { left: 55.5, top: 68, width: 10.5, height: 11 };

  // 피클 칸 클릭 영역
  const PICKLE_HIT = { left: 64, top: 70, width: 10.5, height: 11 };
  // 피클을 집었을 때 고스트가 뜨는 위치
  const PICKLE_SPAWN = { left: 64, top: 68, width: 10.5, height: 11 };

  // 음료 기계 (보라 / 주황 / 초록)
  //   HIT   = 클릭해서 집을 수 있는 칸
  //   SPAWN = 집었을 때 음료 고스트의 위치·크기
  const GRAPE_HIT = { left: 8, top: 57.2, width: 3, height: 4.4 };
  const GRAPE_SPAWN = { left: 8, top: 57.2, width: 12, height: 12 };

  const ORANGE_HIT = { left: 11.8, top: 57.2, width: 3, height: 4.4 };
  const ORANGE_SPAWN = { left: 11.8, top: 57.2, width:12, height: 12 };

  const MELON_HIT = { left: 15.8, top: 57.2, width: 3, height: 4.4 };
  const MELON_SPAWN = { left: 15.8, top: 57.2, width:12, height: 12 };

  const ITEMS = {
    customerA: { label: "손님A", art: CUSTOMER_A, hit: CUSTOMER_A },
    customerB: { label: "손님B", art: CUSTOMER_B, hit: CUSTOMER_B },
    plateA: { label: "접시위", art: PLATE_A_ART, hit: PLATE_A_HIT },
    plateB: { label: "접시아래", art: PLATE_B_ART, hit: PLATE_B_HIT },
    grill: { label: "그릴", art: GRILL, hit: GRILL },
    grillPattyLeft: { label: "그릴패티L", art: GRILL_PATTY_LEFT_ART, hit: GRILL_PATTY_LEFT_HIT },
    grillPattyRight: { label: "그릴패티R", art: GRILL_PATTY_RIGHT_ART, hit: GRILL_PATTY_RIGHT_HIT },
    mayo: { label: "마요", art: MAYO_ART, hit: MAYO_HIT, spawn: MAYO_SPAWN },
    ketchup: { label: "케첩", art: KETCHUP_ART, hit: KETCHUP_HIT, spawn: KETCHUP_SPAWN },
    bun: { label: "빵", hit: BUN_HIT, spawn: BUN_SPAWN },
    patty: { label: "패티", hit: PATTY_HIT, spawn: PATTY_SPAWN },
    lettuce: { label: "양상추", hit: LETTUCE_HIT, spawn: LETTUCE_SPAWN },
    tomato: { label: "토마토", hit: TOMATO_HIT, spawn: TOMATO_SPAWN },
    cheese: { label: "치즈", hit: CHEESE_HIT, spawn: CHEESE_SPAWN },
    pickle: { label: "피클", hit: PICKLE_HIT, spawn: PICKLE_SPAWN },
    grape: { label: "포도", hit: GRAPE_HIT, spawn: GRAPE_SPAWN },
    orange: { label: "오렌지", hit: ORANGE_HIT, spawn: ORANGE_SPAWN },
    melon: { label: "멜론", hit: MELON_HIT, spawn: MELON_SPAWN },
    trash: { label: "휴지통", hit: TRASH_HIT },
  };

  function applyBox(el, box) {
    if (!el || !box) {
      return;
    }
    if (box.left != null) {
      el.style.left = `${box.left}%`;
    }
    if (box.top != null) {
      el.style.top = `${box.top}%`;
    }
    if (box.width != null) {
      el.style.width = `${box.width}%`;
    }
    if (box.height != null) {
      el.style.height = `${box.height}%`;
    }
  }

  // 부모 HIT 칸 안에 ART 그림을 놓는다. ART/HIT 는 둘 다 화면 % 다.
  function applyNestedArt(el, art, hit) {
    if (!el || !art || !hit?.width || !hit?.height) {
      return;
    }
    el.style.position = "absolute";
    el.style.left = `${((art.left - hit.left) / hit.width) * 100}%`;
    el.style.top = `${((art.top - hit.top) / hit.height) * 100}%`;
    el.style.width = `${(art.width / hit.width) * 100}%`;
    el.style.height = `${(art.height / hit.height) * 100}%`;
    el.style.maxWidth = "none";
    el.style.maxHeight = "none";
    el.style.transform = "none";
    el.style.objectFit = "contain";
    el.style.objectPosition = "center";
  }

  function applyArt(el, item) {
    if (!el || !item?.art || el.classList.contains("is-dragging")) {
      return;
    }
    const host = el.closest("[data-layout-hit]");
    const nested = host && host.dataset.layoutHit === el.dataset.layoutArt && item.hit;
    if (nested) {
      applyNestedArt(el, item.art, item.hit);
      return;
    }
    applyBox(el, item.art);
  }

  const BURGER_LAYERS = {
    bun: BURGER_BUN,
    patty: BURGER_PATTY,
    mayo: BURGER_MAYO,
    ketchup: BURGER_KETCHUP,
    cheese: BURGER_CHEESE,
    lettuce: BURGER_LETTUCE,
    tomato: BURGER_TOMATO,
    pickle: BURGER_PICKLE,
    "bun-top": BURGER_BUN_TOP_SIZE,
  };

  function layerLiftOf(id) {
    const custom = BURGER_LAYER_LIFT[id];
    return custom == null ? BURGER_STACK_LIFT : custom;
  }

  // 0번(아래 빵)은 항상 BURGER_BUN_TOP. 그다음 장은 이전 장 간격만큼 위로.
  function burgerLayerTop(layerIds, order) {
    let top = BURGER_BUN_TOP;
    const last = Math.max(0, Math.min(order, (layerIds?.length || 1) - 1));
    for (let i = 0; i < last; i += 1) {
      top -= layerLiftOf(layerIds[i]);
    }
    if (layerIds?.[order] === "bun-top") {
      top -= BURGER_TOP_BUN_EXTRA;
    }
    return top;
  }

  function plateArt(index) {
    return index === 1 ? PLATE_B_ART : PLATE_A_ART;
  }

  function burgerLayerBox(id) {
    return BURGER_LAYERS[id] || null;
  }

  // 접시 위 자식. box 의 width/height 는 화면 % 라서 접시 크기와 따로 간다.
  function applyPlateChild(el, box, art, lift) {
    if (!el || !box || !art?.width || !art?.height) {
      return;
    }
    const top = (box.top || 0) - (lift || 0);
    el.style.position = "absolute";
    el.style.left = `${((box.left || 0) / art.width) * 100}%`;
    el.style.top = `${(top / art.height) * 100}%`;
    el.style.bottom = "auto";
    el.style.width = `${(box.width / art.width) * 100}%`;
    el.style.height = `${(box.height / art.height) * 100}%`;
    el.style.maxWidth = "none";
    el.style.maxHeight = "none";
    el.style.transform = "none";
    el.style.objectFit = "contain";
    el.style.objectPosition = "center bottom";
  }

  function applyBurgerPlate(index, layerIds, hasDrink) {
    const art = plateArt(index);
    const serve = document.getElementById(`serve-item-${index}`);
    if (!serve || serve.classList.contains("is-dragging")) {
      return;
    }
    const layers = serve.querySelectorAll(".burger-layer");
    layers.forEach((el, order) => {
      const id = layerIds?.[order];
      const box = burgerLayerBox(id);
      if (!box) {
        return;
      }
      const shift = BURGER_SAUCE_SHIFT[id] || { x: 0, y: 0 };
      applyPlateChild(el, {
        left: (art.width - box.width) / 2 + (shift.x || 0),
        top: burgerLayerTop(layerIds, order) + (shift.y || 0),
        width: box.width,
        height: box.height,
      }, art, 0);
      el.style.zIndex = String(order + 1);
    });
    const cup = serve.querySelector(".drink-cup");
    if (cup && hasDrink) {
      applyPlateChild(cup, DRINK_CUP, art, 0);
      cup.style.zIndex = "12";
    }
  }

  function applyGrillPatty(img, index) {
    const item = index === 1 ? ITEMS.grillPattyRight : ITEMS.grillPattyLeft;
    if (!img || !item || img.classList.contains("is-dragging")) {
      return;
    }
    applyNestedArt(img, item.art, item.hit);
    img.style.zIndex = "8";
    img.style.opacity = "1";
    img.style.visibility = "visible";
    img.style.display = "block";
  }

  function apply() {
    const zone = document.getElementById("grill-zone");
    if (zone) {
      zone.style.left = "0";
      zone.style.top = "0";
      zone.style.width = "100%";
      zone.style.height = "100%";
    }
    document.querySelectorAll("[data-layout-hit]").forEach((el) => {
      applyBox(el, ITEMS[el.dataset.layoutHit]?.hit);
    });
    document.querySelectorAll("[data-layout-art]").forEach((el) => {
      applyArt(el, ITEMS[el.dataset.layoutArt]);
    });
    document.querySelectorAll(".customer-body").forEach((el) => {
      el.style.width = `${CUSTOMER_BODY.width}px`;
      el.style.height = `${CUSTOMER_BODY.height}px`;
    });
    document.querySelectorAll(".mini-speech").forEach((el) => {
      el.style.transform = `translate(${CUSTOMER_ORDER_BUBBLE_OFFSET.x}px, ${CUSTOMER_ORDER_BUBBLE_OFFSET.y}px)`;
    });
    document.querySelectorAll(".wait-bar").forEach((el) => {
      el.style.transform = `translate(${CUSTOMER_GAUGE_OFFSET.x}px, ${CUSTOMER_GAUGE_OFFSET.y}px)`;
    });
    document.querySelectorAll(".grill-patty").forEach((el, index) => {
      applyGrillPatty(el, Number(el.closest("[data-grill]")?.dataset.grill ?? index));
    });
    const trashLabel = document.getElementById("trash-label");
    if (trashLabel) {
      trashLabel.textContent = TRASH_LABEL;
      trashLabel.style.setProperty("--trash-label-x", `${TRASH_LABEL_OFFSET.x}%`);
      trashLabel.style.setProperty("--trash-label-y", `${TRASH_LABEL_OFFSET.y}%`);
    }
  }

  function restoreKitchen() {
    apply();
    document.querySelectorAll(".serve-item").forEach((serve) => {
      if (serve.classList.contains("is-dragging")) {
        return;
      }
      const index = Number(serve.dataset.plate);
      const ids = [...serve.querySelectorAll(".burger-layer")].map((el) => el.dataset.layerId).filter(Boolean);
      const cup = serve.querySelector(".drink-cup");
      applyBurgerPlate(index, ids, Boolean(cup && !cup.hidden));
    });
  }

  function spawnBox(id) {
    return ITEMS[id]?.spawn || null;
  }

  function formatBox(box) {
    if (!box) {
      return "";
    }
    let text = `L:${box.left} T:${box.top}`;
    if (box.width != null) {
      text += ` W:${box.width}`;
    }
    if (box.height != null) {
      text += ` H:${box.height}`;
    }
    return text;
  }

  function bootDebug() {
    const stage = document.getElementById("stage");
    const station = document.querySelector('[data-scene="phase2"] .station');
    if (!stage) {
      return;
    }

    document.body.classList.add("layout-debug");

    const overlay = document.createElement("div");
    overlay.id = "layout-debug";
    overlay.innerHTML = `
      <div class="layout-debug-hud">
        <p id="layout-debug-mouse">Mouse X: --\nMouse Y: --</p>
        <p id="layout-debug-values"></p>
        <p class="layout-debug-legend">하늘색 실선=그림 · 분홍 점선=클릭 · 노란 +=집기 · 초록=손님 실제영역</p>
      </div>
      <div class="layout-debug-cross" id="layout-debug-cross" hidden></div>
    `;
    stage.appendChild(overlay);

    const boxes = document.createElement("div");
    boxes.id = "layout-debug-boxes";
    (station || overlay).appendChild(boxes);

    const mouseEl = overlay.querySelector("#layout-debug-mouse");
    const valuesEl = overlay.querySelector("#layout-debug-values");
    const cross = overlay.querySelector("#layout-debug-cross");

    const lines = [];
    Object.values(ITEMS).forEach((item) => {
      const boxes = [
        item.art ? ["그림", item.art] : null,
        item.hit ? ["클릭", item.hit] : null,
        item.spawn ? ["생성", item.spawn] : null,
      ].filter(Boolean);
      const unique = [];
      boxes.forEach(([kind, box]) => {
        const same = unique.find((entry) => formatBox(entry[1]) === formatBox(box));
        if (same) {
          same[0] += `/${kind}`;
        } else {
          unique.push([kind, box]);
        }
      });
      unique.forEach(([kind, box]) => {
        lines.push(`${item.label} ${kind}  ${formatBox(box)}`);
      });
    });
    valuesEl.textContent = lines.join("\n");

    Object.entries(ITEMS).forEach(([id, item]) => {
      if (item.art && item.art.width != null) {
        const art = document.createElement("div");
        art.className = "layout-debug-art";
        applyBox(art, item.art);
        art.innerHTML = `<span>${item.label} 그림</span>`;
        boxes.appendChild(art);
      }
      if (item.hit && item.hit.width != null) {
        const hit = document.createElement("div");
        hit.className = "layout-debug-hit";
        applyBox(hit, item.hit);
        hit.innerHTML = `<span>${item.label} 클릭</span>`;
        boxes.appendChild(hit);
      }
      if (item.spawn) {
        const spawn = document.createElement("div");
        spawn.className = "layout-debug-spawn";
        applyBox(spawn, item.spawn);
        boxes.appendChild(spawn);
      }
    });

    const previewArt = PLATE_A_ART;
    const previewStack = ["bun", "patty", "cheese", "lettuce", "tomato", "bun-top"];
    previewStack.forEach((id, order) => {
      const box = BURGER_LAYERS[id];
      if (!box) {
        return;
      }
      const mark = document.createElement("div");
      mark.className = "layout-debug-art";
      applyBox(mark, {
        left: previewArt.left + (previewArt.width - box.width) / 2,
        top: previewArt.top + burgerLayerTop(previewStack, order),
        width: box.width,
        height: box.height,
      });
      mark.innerHTML = `<span>${id}</span>`;
      boxes.appendChild(mark);
    });
    const drinkMark = document.createElement("div");
    drinkMark.className = "layout-debug-art";
    applyBox(drinkMark, {
      left: previewArt.left + DRINK_CUP.left,
      top: previewArt.top + DRINK_CUP.top,
      width: DRINK_CUP.width,
      height: DRINK_CUP.height,
    });
    drinkMark.innerHTML = "<span>음료컵</span>";
    boxes.appendChild(drinkMark);

    const liveCustomers = [
      { id: "customer-a", label: "손님A 실제" },
      { id: "customer-b", label: "손님B 실제" },
    ].map((item) => {
      const mark = document.createElement("div");
      mark.className = "layout-debug-live";
      mark.innerHTML = `<span>${item.label}</span>`;
      boxes.appendChild(mark);
      return { ...item, mark };
    });

    function syncLiveCustomers() {
      const host = (station || stage).getBoundingClientRect();
      liveCustomers.forEach((item) => {
        const el = document.getElementById(item.id);
        if (!el || !host.width || !host.height) {
          return;
        }
        const rect = el.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) {
          item.mark.hidden = true;
          return;
        }
        item.mark.hidden = false;
        item.mark.style.left = `${((rect.left - host.left) / host.width) * 100}%`;
        item.mark.style.top = `${((rect.top - host.top) / host.height) * 100}%`;
        item.mark.style.width = `${(rect.width / host.width) * 100}%`;
        item.mark.style.height = `${(rect.height / host.height) * 100}%`;
      });
    }

    stage.addEventListener("pointermove", (event) => {
      const rect = stage.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const px = Math.round(x);
      const py = Math.round(y);
      const left = rect.width ? ((x / rect.width) * 100).toFixed(1) : "0";
      const top = rect.height ? ((y / rect.height) * 100).toFixed(1) : "0";
      mouseEl.textContent = `Mouse X: ${px}\nMouse Y: ${py}\n% left ${left}  top ${top}`;
      cross.hidden = false;
      cross.style.left = `${x}px`;
      cross.style.top = `${y}px`;
      syncLiveCustomers();
    });

    window.addEventListener("resize", syncLiveCustomers);
    syncLiveCustomers();
    const tick = () => {
      syncLiveCustomers();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  window.addEventListener("resize", apply);

  return {
    DEBUG_MODE,
    apply,
    applyGrillPatty,
    applyBurgerPlate,
    restoreKitchen,
    plateArt,
    burgerLayerBox,
    spawnBox,
    ITEMS,
    TRASH_CAN_POS,
    TRASH_HIT,
    TRASH_LABEL_OFFSET,
    TRASH_LABEL,
    bootDebug,
  };
})();

Layout.apply();
if (Layout.DEBUG_MODE) {
  Layout.bootDebug();
}
window.Layout = Layout;
