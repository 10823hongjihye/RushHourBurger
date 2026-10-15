const DressScene = (() => {
  const SLOTS = {
    "wear-top": "top",
    "wear-bottom": "bottom",
    "wear-shoes": "shoes",
  };

  let done = false;

  function els() {
    return {
      scene: document.querySelector('[data-scene="dress"]'),
      hint: document.getElementById("dress-hint"),
      count: document.getElementById("dress-count"),
    };
  }

  function wornCount() {
    const outfit = window.Game.state.outfit;
    return ["top", "bottom", "shoes"].filter((part) => outfit[part]).length;
  }

  function setHint(text) {
    els().hint.textContent = text;
  }

  function render() {
    els().count.textContent = `${wornCount()} / 3`;
    els().scene.classList.toggle("is-ready", wornCount() === 3);
  }

  function canDrop(itemId, slotId) {
    return SLOTS[slotId] === itemId && !window.Game.state.outfit[itemId];
  }

  function onDropped(itemId, slotId) {
    if (SLOTS[slotId] !== itemId) {
      return;
    }
    window.Game.state.outfit[itemId] = itemId;
    const meta = ITEM_META[itemId];
    setHint(`${meta.icon} ${meta.label} 입었다!`);
    AudioBus.play("drop", window.Game?.state?.sfxOn);
    render();

    if (wornCount() === 3 && !done) {
      done = true;
      setHint("준비 완료! 출근한다");
      AudioBus.play("success", window.Game?.state?.sfxOn);
      els().scene.classList.add("is-leaving");
      window.setTimeout(() => {
        if (window.Game?.state?.scene === "dress") {
          window.Game.goScene("tutorial");
        }
      }, 900);
    }
  }

  function reset() {
    done = false;
    const { scene } = els();
    scene.classList.remove("is-ready", "is-leaving");
    window.Game.state.outfit = { top: null, bottom: null, shoes: null };
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
    setHint("옷장에서 옷을 집어 캐릭터에게 입혀 주세요");
    render();
  }

  function boot() {
    DragDrop.bind(els().scene);
  }

  return { boot, reset, canDrop, onDropped };
})();
