import { describe, expect, it } from "vitest";
import { guessLetter, newTicState, newWordsState, playTic, publicWordsState } from "@/lib/games";

describe("tictactoe", () => {
  it("starts with empty board and X turn", () => {
    const state = newTicState();
    expect(state.board).toHaveLength(9);
    expect(state.board.every((c) => c === null)).toBe(true);
    expect(state.turn).toBe("X");
    expect(state.winner).toBeNull();
  });

  it("switches turns and ignores occupied cells", () => {
    let state = newTicState();
    state = playTic(state, 0);
    expect(state.board[0]).toBe("X");
    expect(state.turn).toBe("O");
    const same = playTic(state, 0);
    expect(same).toEqual(state);
  });

  it("detects a win for X", () => {
    let state = newTicState();
    state = playTic(state, 0); // X
    state = playTic(state, 3); // O
    state = playTic(state, 1); // X
    state = playTic(state, 4); // O
    state = playTic(state, 2); // X wins row
    expect(state.winner).toBe("X");
  });

  it("detects a draw", () => {
    let state = newTicState();
    // X O X
    // X O O
    // O X X
    for (const i of [0, 1, 2, 4, 3, 5, 7, 6, 8]) {
      state = playTic(state, i);
    }
    expect(state.winner).toBe("draw");
  });
});

describe("words", () => {
  it("hides the word while playing", () => {
    const state = newWordsState("host-1");
    const pub = publicWordsState(state);
    expect(pub.word).toBeUndefined();
    expect(pub.masked).toBe(state.word.replace(/./g, "_"));
  });

  it("reveals letters and can win", () => {
    let state = {
      ...newWordsState("host"),
      word: "мир",
      masked: "___",
    };
    state = guessLetter(state, "м");
    expect(state.masked).toBe("м__");
    state = guessLetter(state, "и");
    state = guessLetter(state, "р");
    expect(state.status).toBe("won");
    expect(publicWordsState(state).word).toBe("мир");
  });

  it("counts wrong guesses until lost", () => {
    let state = {
      ...newWordsState("host"),
      word: "а",
      masked: "_",
      maxWrong: 2,
      wrong: 0,
    };
    state = guessLetter(state, "б");
    expect(state.wrong).toBe(1);
    state = guessLetter(state, "в");
    expect(state.status).toBe("lost");
  });

  it("ignores duplicate guesses", () => {
    let state = {
      ...newWordsState("host"),
      word: "кот",
      masked: "___",
    };
    state = guessLetter(state, "к");
    const again = guessLetter(state, "к");
    expect(again.guesses).toEqual(["к"]);
  });
});
