const SCENE_ORDER = [
  "title",
  "brush",
  "phase2",
  "result",
];

const PHASE1_SCENES = ["practice", "brush", "search", "dress"];
const GAMEPLAY_SCENES = ["practice", "brush", "search", "dress", "phase2"];

const ITEM_META = {
  key: { label: "열쇠", icon: "🔑" },
  brush: { label: "칫솔", icon: "🪥" },
  bun: { label: "빵", icon: "🍔" },
  phone: { label: "핸드폰", icon: "📱" },
  wallet: { label: "지갑", icon: "👛" },
  hook: { label: "갈고리", icon: "🪝" },
  cosmetics: { label: "화장품", icon: "💄" },
  notebook: { label: "노트", icon: "📓" },
  earbuds: { label: "이어폰", icon: "🎧" },
  badge: { label: "사원증", icon: "🪪" },
  top: { label: "상의", icon: "👕" },
  bottom: { label: "하의", icon: "👗" },
  shoes: { label: "신발", icon: "👟" },
};

const ENDINGS = {
  late: {
    kicker: "지각 확정",
    title: "지각 확정...",
    copy: "제한 시간을 넘기고 침대 앞에 주저앉고 말았다.",
    rank: null,
    tone: "late",
    art: "assets/endings/late.png",
  },
  sRank: {
    kicker: "영업 종료",
    title: "완벽한 알바왕!",
    copy: "피크타임을 완벽하게 헤쳐 나왔다. 내일도 이 페이스다.",
    rank: "S",
    tone: "s",
    art: "assets/endings/s.png",
  },
  aRank: {
    kicker: "영업 종료",
    title: "무사히 퇴근",
    copy: "바빴지만 큰 실수 없이 하루를 마쳤다.",
    rank: "A",
    tone: "ab",
    art: "assets/endings/ab.png",
  },
  bRank: {
    kicker: "영업 종료",
    title: "무사히 퇴근",
    copy: "정신없었지만 한 끼 값은 해냈다.",
    rank: "B",
    tone: "ab",
    art: "assets/endings/ab.png",
  },
  timeup: {
    kicker: "영업 종료",
    title: "영업 대참사",
    copy: "손님들이 불만을 쏟아내고, 주인공은 탄 패티 연기 속에서 당황했다.",
    rank: "C",
    tone: "c",
    art: "assets/endings/c.png",
  },
  clear: {
    kicker: "영업 종료",
    title: "오늘의 결과",
    copy: "오늘은 여기까지. 내일 또 하자.",
    rank: null,
    tone: "ab",
    art: "assets/endings/ab.png",
  },
};

const RANK_CUTS = { S: 8, A: 6, B: 4 };

function rankFromSold(sold) {
  if (sold >= RANK_CUTS.S) {
    return "S";
  }
  if (sold >= RANK_CUTS.A) {
    return "A";
  }
  if (sold >= RANK_CUTS.B) {
    return "B";
  }
  return "C";
}

function endingFromRank(rank) {
  if (rank === "S") {
    return "sRank";
  }
  if (rank === "A") {
    return "aRank";
  }
  if (rank === "B") {
    return "bRank";
  }
  return "timeup";
}

function createDefaultState() {
  return {
    scene: "title",
    phase1Time: 75,
    phase2Time: 180,
    timeLeft: 75,
    foundItems: [],
    outfit: {
      top: null,
      bottom: null,
      shoes: null,
    },
    burger: [],
    coins: 0,
    burgersSold: 0,
    sales: 0,
    missedCustomers: 0,
    lives: 3,
    rank: null,
    ending: null,
    paused: false,
    bgmOn: true,
    sfxOn: true,
    difficulty: "easy",
  };
}
