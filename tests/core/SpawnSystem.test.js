const test = require("node:test");
const assert = require("node:assert/strict");

const { Board } = require("../../assets/scripts/core/Board");
const { SpawnSystem } = require("../../assets/scripts/core/SpawnSystem");

test("spawnOne succeeds when the board has empty cells", () => {
  const board = new Board();
  const spawnSystem = new SpawnSystem(() => 0);

  const result = spawnSystem.spawnOne(board);

  assert.equal(result.success, true);
  assert.deepEqual(result.position, { x: 0, y: 0 });
  assert.equal(result.level, 1);
});

test("spawnOne only places a cat into an empty cell", () => {
  const board = new Board();
  const spawnSystem = new SpawnSystem(() => 0);

  board.setCell(0, 0, 2);
  board.setCell(1, 0, 3);

  const emptyCellsBeforeSpawn = board.getEmptyCells();
  const result = spawnSystem.spawnOne(board);

  assert.equal(
    emptyCellsBeforeSpawn.some(
      (cell) => cell.x === result.position.x && cell.y === result.position.y
    ),
    true
  );
  assert.equal(board.getCell(0, 0), 2);
  assert.equal(board.getCell(1, 0), 3);
});

test("spawnOne writes level 1 to the spawned position", () => {
  const board = new Board();
  const spawnSystem = new SpawnSystem(() => 0.5);

  const result = spawnSystem.spawnOne(board);

  assert.notEqual(result.position, null);
  assert.equal(board.getCell(result.position.x, result.position.y), 1);
});

test("spawnOne fails when the board is full", () => {
  const board = new Board();
  const spawnSystem = new SpawnSystem();

  for (let y = 0; y < Board.SIZE; y += 1) {
    for (let x = 0; x < Board.SIZE; x += 1) {
      board.setCell(x, y, 1);
    }
  }

  const result = spawnSystem.spawnOne(board);

  assert.deepEqual(result, {
    success: false,
    position: null,
    level: null,
  });
});

test("spawnOne is predictable with an injected random function", () => {
  const board = new Board();
  const spawnSystem = new SpawnSystem(() => 0.9999);

  board.setCell(0, 0, 2);

  const result = spawnSystem.spawnOne(board);

  assert.deepEqual(result, {
    success: true,
    position: { x: 3, y: 3 },
    level: 1,
  });
  assert.equal(board.getCell(3, 3), 1);
});

