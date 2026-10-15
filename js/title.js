const TitleScreen = (() => {
  // =========================
  // 타이틀 버튼 — 숫자/색만 바꾸고 새로고침
  //   x / y / width / height = 화면(#stage) %
  // =========================
  // 이 값을 바꾸면 Start / Guide / Option 전체를 좌우로 이동 (화면 %). +오른쪽 / -왼쪽
  const TITLE_BUTTON_X_OFFSET = 6;
  const START_BUTTON = { x: 8.4, y: 53.6, width: 21.2, height: 9.4 };
  const GUIDE_BUTTON = { x: 8.4, y: 67.4, width: 21.2, height: 9.4 };
  const OPTION_BUTTON = { x: 8.4, y: 81.2, width: 21.2, height: 9.4 };

  const START_BUTTON_COLOR = "#E96B6B";
  const GUIDE_BUTTON_COLOR = "#F3C95B";
  const OPTION_BUTTON_COLOR = "#A8D96B";

  const BUTTON_TEXT_COLOR = "#5A3A32";
  const BUTTON_RADIUS = 999;
  const BUTTON_HOVER_SCALE = 1.05;
  const BUTTON_CLICK_SCALE = 0.96;
  const BUTTON_HOVER_LIFT = -3;
  const BUTTON_CLICK_OFFSET_Y = 3;
  const BUTTON_HOVER_DURATION = 120;
  const BUTTON_CLICK_DURATION = 80;

  const LAYERS = {
    bg: ["assets/title/bg.png", "assets/bg.png"],
    logo: ["assets/title/logo.png"],
    character: ["assets/title/character.png"],
  };

  const BUTTON_LAYOUT = {
    start: START_BUTTON,
    guide: GUIDE_BUTTON,
    options: OPTION_BUTTON,
  };

  const BUTTON_COLORS = {
    start: START_BUTTON_COLOR,
    guide: GUIDE_BUTTON_COLOR,
    options: OPTION_BUTTON_COLOR,
  };

  function probe(src) {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(src);
      image.onerror = () => resolve(null);
      image.src = src;
    });
  }

  async function firstExisting(paths) {
    for (const src of paths) {
      const found = await probe(src);
      if (found) {
        return found;
      }
    }
    return null;
  }

  function applyButtonVars(root) {
    if (!root) {
      return;
    }
    root.style.setProperty("--title-btn-text", BUTTON_TEXT_COLOR);
    root.style.setProperty("--title-btn-radius", `${BUTTON_RADIUS}px`);
    root.style.setProperty("--title-btn-hover-scale", String(BUTTON_HOVER_SCALE));
    root.style.setProperty("--title-btn-click-scale", String(BUTTON_CLICK_SCALE));
    root.style.setProperty("--title-btn-hover-lift", `${BUTTON_HOVER_LIFT}px`);
    root.style.setProperty("--title-btn-click-y", `${BUTTON_CLICK_OFFSET_Y}px`);
    root.style.setProperty("--title-btn-hover-ms", `${BUTTON_HOVER_DURATION}ms`);
    root.style.setProperty("--title-btn-click-ms", `${BUTTON_CLICK_DURATION}ms`);
  }

  function layoutButtons(container, absolute) {
    if (!container) {
      return;
    }
    applyButtonVars(container);
    container.querySelectorAll(".title-menu-btn").forEach((btn) => {
      const key = btn.dataset.action;
      const box = BUTTON_LAYOUT[key];
      const color = BUTTON_COLORS[key];
      if (!box || !color) {
        return;
      }
      btn.style.setProperty("--title-btn-color", color);
      if (absolute) {
        btn.style.left = `${box.x + TITLE_BUTTON_X_OFFSET}%`;
        btn.style.top = `${box.y}%`;
        btn.style.width = `${box.width}%`;
        btn.style.height = `${box.height}%`;
      }
    });
  }

  function apply(found) {
    const scene = document.querySelector('[data-scene="title"]');
    const composite = scene.querySelector(".title-composite");
    const layers = scene.querySelector(".title-layers");
    const ready = found.bg && found.logo && found.character;

    scene.dataset.titleMode = ready ? "layered" : "composite";
    composite.hidden = Boolean(ready);
    layers.hidden = !ready;

    layoutButtons(document.getElementById("title-hotspots"), true);
    layoutButtons(document.getElementById("title-menu"), true);

    if (!ready) {
      replay(scene);
      return;
    }

    layers.querySelector(".layer-bg").src = found.bg;
    layers.querySelector(".layer-logo").src = found.logo;
    layers.querySelector(".layer-character").src = found.character;

    replay(scene);
  }

  function replay(scene) {
    scene.classList.remove("is-entering");
    void scene.offsetWidth;
    scene.classList.add("is-entering");
  }

  async function boot() {
    layoutButtons(document.getElementById("title-hotspots"), true);
    layoutButtons(document.getElementById("title-menu"), true);

    const found = {};
    await Promise.all(
      Object.entries(LAYERS).map(async ([key, paths]) => {
        found[key] = await firstExisting(paths);
      })
    );
    apply(found);
  }

  return { boot, replay: () => replay(document.querySelector('[data-scene="title"]')) };
})();
