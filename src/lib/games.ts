export type TicCell = "X" | "O" | null;

export type TicState = {
  board: TicCell[];
  turn: "X" | "O";
  winner: "X" | "O" | "draw" | null;
};

export function newTicState(): TicState {
  return {
    board: Array(9).fill(null),
    turn: "X",
    winner: null,
  };
}

function lines(board: TicCell[]) {
  const wins = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (const [a, b, c] of wins) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

export function playTic(state: TicState, index: number): TicState {
  if (state.winner || state.board[index]) return state;
  const board = [...state.board];
  board[index] = state.turn;
  const winnerMark = lines(board);
  const draw = !winnerMark && board.every(Boolean);
  return {
    board,
    turn: state.turn === "X" ? "O" : "X",
    winner: winnerMark ? winnerMark : draw ? "draw" : null,
  };
}

export type WordsState = {
  word: string;
  masked: string;
  guesses: string[];
  wrong: number;
  maxWrong: number;
  status: "playing" | "won" | "lost";
  hostId: string | null;
};

const WORD_BANK = [
  "любовь",
  "поцелуй",
  "свидание",
  "объятие",
  "романтика",
  "счастье",
  "нежность",
  "вечер",
  "письмо",
  "звезда",
];

export function newWordsState(hostId: string): WordsState {
  const word = WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)];
  return {
    word,
    masked: word.replace(/./g, "_"),
    guesses: [],
    wrong: 0,
    maxWrong: 7,
    status: "playing",
    hostId,
  };
}

export function guessLetter(state: WordsState, letter: string): WordsState {
  const ch = letter.toLowerCase().slice(0, 1);
  if (!ch || state.status !== "playing" || state.guesses.includes(ch)) return state;

  const guesses = [...state.guesses, ch];
  if (state.word.includes(ch)) {
    const masked = state.word
      .split("")
      .map((c) => (guesses.includes(c) ? c : "_"))
      .join("");
    const won = !masked.includes("_");
    return { ...state, guesses, masked, status: won ? "won" : "playing" };
  }

  const wrong = state.wrong + 1;
  return {
    ...state,
    guesses,
    wrong,
    status: wrong >= state.maxWrong ? "lost" : "playing",
  };
}

export function publicWordsState(state: WordsState) {
  return {
    ...state,
    word: state.status === "playing" ? undefined : state.word,
  };
}
