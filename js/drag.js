const DragDrop = (() => {
  let dragging = null;
  let offsetX = 0;
  let offsetY = 0;
  let origin = null;
  let startX = 0;
  let startY = 0;

  function clearHighlights() {
    document.querySelectorAll(".drop-slot.is-hot").forEach((slot) => {
      slot.classList.remove("is-hot");
    });
  }

  function slotFromPoint(x, y) {
    const stack = document.elementsFromPoint(x, y);
    const dragId = dragging?.dataset.dragId;
    return stack.find((node) => {
      if (!node.classList || !node.classList.contains("drop-slot") || node.classList.contains("is-filled")) {
        return false;
      }
      const accept = (node.dataset.dropAccept || "").split(",").filter(Boolean);
      if (accept.length && dragId && !accept.includes(dragId)) {
        return false;
      }
      if (dragId && typeof window.Game?.canDrop === "function" && !window.Game.canDrop(dragId, node.dataset.dropId)) {
        return false;
      }
      return true;
    });
  }

  function clearGhost(item) {
    if (origin?.host) {
      origin.host.classList.remove("is-ghosting");
    }
    if (item?.classList.contains("drag-ghost")) {
      item.remove();
    }
    origin = null;
  }

  function restoreKitchen() {
    window.Layout?.restoreKitchen?.();
  }

  function snapBack(item) {
    if (origin?.ghost) {
      clearGhost(item);
      restoreKitchen();
      return;
    }
    item.classList.remove("is-dragging");
    item.style.position = "";
    item.style.left = "";
    item.style.top = "";
    item.style.width = "";
    item.style.height = "";
    item.style.zIndex = "";
    item.style.pointerEvents = "";
    if (origin && origin.parent) {
      origin.parent.insertBefore(item, origin.next);
    }
    origin = null;
    restoreKitchen();
  }

  function onPointerMove(event) {
    if (!dragging) {
      return;
    }
    event.preventDefault();
    dragging.style.left = `${event.clientX - offsetX}px`;
    dragging.style.top = `${event.clientY - offsetY}px`;

    clearHighlights();
    const slot = slotFromPoint(event.clientX, event.clientY);
    if (slot) {
      slot.classList.add("is-hot");
    }
  }

  function onPointerUp(event) {
    if (!dragging) {
      return;
    }

    const item = dragging;
    const slot = slotFromPoint(event.clientX, event.clientY);
    clearHighlights();
    dragging = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);

    const moved = Math.hypot(event.clientX - startX, event.clientY - startY) > 10;
    if (!moved) {
      snapBack(item);
      return;
    }

    const accept = slot ? (slot.dataset.dropAccept || "").split(",").filter(Boolean) : [];
    const matches = slot && (accept.length === 0 || accept.includes(item.dataset.dragId));
    const allowed = matches && (typeof window.Game?.canDrop !== "function" || window.Game.canDrop(item.dataset.dragId, slot.dataset.dropId));

    if (allowed) {
      const stay = slot.dataset.dropStay !== "false";
      if (origin?.ghost || !stay) {
        snapBack(item);
      } else {
        item.classList.remove("is-dragging");
        item.style.position = "";
        item.style.left = "";
        item.style.top = "";
        item.style.width = "";
        item.style.height = "";
        item.style.zIndex = "";
        item.style.pointerEvents = "";
        slot.appendChild(item);
        slot.classList.add("is-filled");
        item.dataset.placed = "true";
        item.classList.add("is-placed");
        origin = null;
      }
      if (typeof window.Game?.onItemDropped === "function") {
        window.Game.onItemDropped(item.dataset.dragId, slot.dataset.dropId);
      }
      return;
    }

    snapBack(item);
    if (typeof window.Game?.onItemMissed === "function") {
      window.Game.onItemMissed(item.dataset.dragId);
    }
  }

  function listenDrag() {
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
  }

  function startGhost(event, spec, host) {
    if (dragging || window.Game?.state?.paused || !spec?.id || (!spec.src && !spec.clone)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const spawn = spec.clone ? null : window.Layout?.spawnBox?.(spec.id);
    const stage = document.getElementById("stage")?.getBoundingClientRect();
    let width;
    let height;
    if (spec.clone && host) {
      const rect = host.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      offsetX = event.clientX - rect.left;
      offsetY = event.clientY - rect.top;
    } else if (spawn && stage) {
      const left = stage.left + (spawn.left / 100) * stage.width;
      const top = stage.top + (spawn.top / 100) * stage.height;
      width = (spawn.width / 100) * stage.width;
      height = (spawn.height / 100) * stage.height;
      offsetX = event.clientX - left;
      offsetY = event.clientY - top;
      if (offsetX < 0 || offsetX > width || offsetY < 0 || offsetY > height) {
        offsetX = width / 2;
        offsetY = height / 2;
      }
    } else {
      const source = host?.querySelector?.("img") || host;
      const rect = source?.getBoundingClientRect?.();
      const fallback = spec.size || 88;
      width = fallback;
      height = fallback;
      if (rect && rect.width >= 40 && rect.height >= 40) {
        width = rect.width;
        height = rect.height;
        offsetX = event.clientX - rect.left;
        offsetY = event.clientY - rect.top;
      } else {
        offsetX = width / 2;
        offsetY = height / 2;
      }
    }
    let ghost;
    if (spec.clone && host) {
      ghost = host.cloneNode(true);
      ghost.removeAttribute("id");
      ghost.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
      ghost.className = `drag-ghost serve-ghost ${host.className}`;
      host.classList.add("is-ghosting");
    } else {
      ghost = document.createElement("img");
      ghost.src = spec.src;
      ghost.className = `drag-ghost ${spec.className || ""}`;
    }
    ghost.alt = "";
    ghost.dataset.dragId = spec.id;
    ghost.draggable = false;
    ghost.style.position = "fixed";
    ghost.style.zIndex = "90";
    ghost.style.width = `${width}px`;
    ghost.style.height = `${height}px`;
    ghost.style.left = `${event.clientX - offsetX}px`;
    ghost.style.top = `${event.clientY - offsetY}px`;
    document.body.appendChild(ghost);
    dragging = ghost;
    origin = { ghost: true, host: spec.clone ? host : null };
    startX = event.clientX;
    startY = event.clientY;
    if (typeof window.Game?.onItemPicked === "function") {
      window.Game.onItemPicked(spec.id);
    }
    listenDrag();
  }

  function onPointerDown(event) {
    if (dragging || event.target.closest("[data-ing]")) {
      return;
    }
    const item = event.target.closest("[data-drag-id]");
    if (!item || item.dataset.placed === "true" || window.Game?.state?.paused) {
      return;
    }
    if (typeof window.Game?.canPick === "function" && !window.Game.canPick(item.dataset.dragId)) {
      return;
    }

    event.preventDefault();
    const rect = item.getBoundingClientRect();
    origin = {
      parent: item.parentElement,
      next: item.nextSibling,
    };
    offsetX = event.clientX - rect.left;
    offsetY = event.clientY - rect.top;
    dragging = item;
    startX = event.clientX;
    startY = event.clientY;
    item.classList.add("is-dragging");
    item.style.width = `${rect.width}px`;
    item.style.height = `${rect.height}px`;
    item.style.left = `${rect.left}px`;
    item.style.top = `${rect.top}px`;
    item.style.position = "fixed";
    item.style.zIndex = "80";
    item.style.pointerEvents = "none";
    item.setPointerCapture?.(event.pointerId);

    if (typeof window.Game?.onItemPicked === "function") {
      window.Game.onItemPicked(item.dataset.dragId);
    }

    listenDrag();
  }

  function bind(root) {
    root.addEventListener("pointerdown", onPointerDown);
  }

  function reset(root) {
    document.querySelectorAll(".drag-ghost").forEach((node) => node.remove());
    dragging = null;
    origin = null;
    root.querySelectorAll("[data-drag-id]").forEach((item) => {
      item.dataset.placed = "";
      item.classList.remove("is-placed", "is-dragging");
    });
    root.querySelectorAll(".drop-slot").forEach((slot) => {
      slot.classList.remove("is-filled", "is-hot");
    });
  }

  return { bind, reset, startGhost };
})();
