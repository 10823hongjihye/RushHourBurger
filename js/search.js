/**
 * 준비물 찾기 미니게임 — Scene 골격만.
 *
 * 지금은 화면 전환 + SKIP만 구현.
 * 방 이미지 / 핫스팟 / 아이템 로직은 나중에 이 파일과
 * index.html [data-scene="search"] 안에 추가한다.
 *
 * 이동:
 *   양치 SKIP → 이 씬
 *   이 씬 SKIP → 햄버거 만들기(phase2)
 */
const SearchScene = (() => {
  function els() {
    return {
      scene: document.querySelector('[data-scene="search"]'),
      skipBtn: document.getElementById("btn-search-skip"),
      stage: document.getElementById("search-stage"),
      placeholder: document.getElementById("search-placeholder"),
    };
  }

  function goToBurgerGame() {
    if (typeof window.Game?.goScene === "function") {
      window.Game.goScene("phase2");
    }
  }

  function reset() {
    // 추후: 찾은 아이템 / 핫스팟 상태 초기화
  }

  function boot() {
    const { skipBtn } = els();
    skipBtn?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      goToBurgerGame();
    });
  }

  return { boot, reset };
})();
