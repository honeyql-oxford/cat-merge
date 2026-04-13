const test = require("node:test");
const assert = require("node:assert/strict");

const { Board } = require("../../assets/scripts/core/Board");

test("initBoard creates an empty 4x4 board", () => {
  const board = new Board();

  assert.equal(board.grid.length, 4);
  assert.deepEqual(board.grid, [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  assert.equal(board.getEmptyCells().length, 16);
});

test("getCell and setCell read and write board values", () => {
  const board = new Board();

  board.setCell(2, 1, 3);

  assert.equal(board.getCell(2, 1), 3);
  assert.equal(board.getEmptyCells().length, 15);
});

test("move transfers a cat to an empty cell", () => {
  const board = new Board();
  board.setCell(0, 0, 2);

  const result = board.move(0, 0, 1, 1);

  assert.deepEqual(result, { success: true, merged: false, newLevel: 0 });
  assert.equal(board.getCell(0, 0), 0);
  assert.equal(board.getCell(1, 1), 2);
});

test("move merges cats of the same level", () => {
  const board = new Board();
  board.setCell(0, 0, 2);
  board.setCell(1, 1, 2);

  const result = board.move(0, 0, 1, 1);

  assert.deepEqual(result, { success: true, merged: true, newLevel: 3 });
  assert.equal(board.getCell(0, 0), 0);
  assert.equal(board.getCell(1, 1), 3);
});

test("move fails for invalid operations", () => {
  const board = new Board();
  board.setCell(0, 0, 2);
  board.setCell(1, 1, 3);
  board.setCell(2, 2, 6);
  board.setCell(3, 3, 6);

  assert.deepEqual(board.move(1, 0, 1, 1), {
    success: false,
    merged: false,
    newLevel: 0,
  });
  assert.deepEqual(board.move(0, 0, 1, 1), {
    success: false,
    merged: false,
    newLevel: 0,
  });
  assert.deepEqual(board.move(2, 2, 3, 3), {
    success: false,
    merged: false,
    newLevel: 0,
  });
  assert.deepEqual(board.move(-1, 0, 0, 0), {
    success: false,
    merged: false,
    newLevel: 0,
  });
  assert.deepEqual(board.move(0, 0, 0, 0), {
    success: false,
    merged: false,
    newLevel: 0,
  });
});

test("invalid coordinates and levels throw in direct cell access", () => {
  const board = new Board();

  assert.throws(() => board.getCell(4, 0), RangeError);
  assert.throws(() => board.setCell(0, 4, 1), RangeError);
  assert.throws(() => board.setCell(0, 0, 7), RangeError);
});

