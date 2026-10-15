const AudioBus = (() => {
  const FILES = {
    click: "assets/sfx/click.mp3",
    pickup: "assets/sfx/pickup.mp3",
    drop: "assets/sfx/drop.mp3",
    success: "assets/sfx/success.mp3",
    fail: "assets/sfx/fail.mp3",
    warn: "assets/sfx/warn.mp3",
    scrub: "assets/sfx/scrub.mp3",
  };

  // 플레이 중 루프 BGM. 타이틀로 돌아오면 처음부터 다시 재생.
  const BGM_SRC = "sound/starostin-cute-whistle-ukulele-music-260565.mp3";
  const BGM_VOLUME = 0.45;

  const TONES = {
    click: [880, 0.06],
    pickup: [520, 0.08],
    drop: [320, 0.09],
    success: [660, 0.18],
    fail: [180, 0.22],
    warn: [740, 0.05],
    scrub: [640, 0.04],
  };

  const cache = {};
  let context = null;
  let bgm = null;
  let bgmWanted = true;

  Object.entries(FILES).forEach(([name, src]) => {
    const audio = new Audio();
    audio.preload = "auto";
    audio.src = src;
    audio.addEventListener("error", () => {
      cache[name] = null;
    });
    cache[name] = audio;
  });

  function ensureBgm() {
    if (bgm) {
      return bgm;
    }
    bgm = new Audio(BGM_SRC);
    bgm.preload = "auto";
    bgm.loop = true;
    bgm.volume = BGM_VOLUME;
    return bgm;
  }

  function getContext() {
    if (!context) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        context = new Ctx();
      }
    }
    return context;
  }

  function unlock() {
    const ctx = getContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume();
    }
  }

  function playTone(name) {
    const ctx = getContext();
    const tone = TONES[name];
    if (!ctx || !tone) {
      return;
    }

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = name === "fail" ? "sawtooth" : "sine";
    oscillator.frequency.value = tone[0];
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + tone[1]);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + tone[1]);
  }

  function play(name, enabled) {
    if (!enabled) {
      return;
    }

    const file = cache[name];
    if (file && file.readyState >= 2) {
      file.currentTime = 0;
      file.play().catch(() => {
        playTone(name);
      });
      return;
    }

    playTone(name);
  }

  // 처음부터 재생 + 끝까지 반복. 타이틀 복귀 / 게임 시작 시 호출.
  function restartBgm(enabled) {
    bgmWanted = Boolean(enabled);
    const track = ensureBgm();
    track.loop = true;
    track.pause();
    track.currentTime = 0;
    if (!bgmWanted) {
      return;
    }
    unlock();
    track.play().catch(() => {
      // 브라우저 autoplay 정책 — 다음 유저 제스처에서 재시도
    });
  }

  function setBgmEnabled(enabled) {
    bgmWanted = Boolean(enabled);
    const track = ensureBgm();
    if (!bgmWanted) {
      track.pause();
      return;
    }
    unlock();
    if (track.paused) {
      track.play().catch(() => {});
    }
  }

  function stopBgm() {
    if (!bgm) {
      return;
    }
    bgm.pause();
    bgm.currentTime = 0;
  }

  return { unlock, play, restartBgm, setBgmEnabled, stopBgm };
})();
