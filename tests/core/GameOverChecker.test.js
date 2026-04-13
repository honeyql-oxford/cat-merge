const test = require("node:test");
const assert = require("node:assert/strict");

const { Board } = require("../../assets/scripts/core/Board");
const { GameOverChecker } = require("../../assets/scripts/core/GameOverChecker");

function fillBoard(board, levels) {
  for (let y = 0; y < levels.length; y += 1) {
    for (let x = 0; x < levels[y].length; x += 1) {
      board.setCell(x, y, levels[y][x]);
    }
  }
}

test("isGameOver returns false when the board is not full", () => {
  const board = new Board();
  const checker = new GameOverChecker();

  fillBoard(board, [
    [1, 2, 3, 4],
    [2, 3, 4, 5],
    [3, 4, 5, 6],
    [4, 5, 6, 0],
  ]);

  assert.equal(checker.isGameOver(board), false);
});

test("isGameOver returns false when a full board has matching levels anywhere", () => {
  const board = new Board();
  const checker = new GameOverChecker();

  fillBoard(board, [
    [1, 2, 3, 4],
    [2, 3, 4, 5],
    [3, 4, 5, 1],
    [4, 5, 6, 2],
  ]);

  assert.equal(checker.isGameOver(board), false);
});

test("isGameOver returns false when a full board still has repeated mergeable levels", () => {
  const board = new Board();
  const checker = new GameOverChecker();

  fillBoard(board, [
    [1, 2, 3, 4],
    [2, 3, 4, 5],
    [3, 4, 5, 6],
    [4, 5, 6, 1],
  ]);

  assert.equal(checker.isGameOver(board), false);
});

test("isGameOver returns true when every non-max level appears at most once", () => {
  const board = new Board();
  const checker = new GameOverChecker();

  fillBoard(board, [
    [1, 2, 3, 4],
    [5, 6, 6, 6],
    [6, 6, 6, 6],
    [6, 6, 6, 6],
  ]);

  assert.equal(checker.isGameOver(board), true);
});

test("isGameOver ignores repeated max-level cats because they cannot merge", () => {
  const board = new Board();
  const checker = new GameOverChecker();

  fillBoard(board, [
    [1, 2, 3, 4],
    [5, 6, 6, 6],
    [6, 6, 6, 6],
    [6, 6, 6, 6],
  ]);

  assert.equal(checker.isGameOver(board), true);
});

