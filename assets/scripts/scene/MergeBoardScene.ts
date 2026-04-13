import { _decorator, Component, Node, UITransform, Widget } from 'cc';
import * as BoardModule from '../core/Board.js';
import * as GameOverCheckerModule from '../core/GameOverChecker.js';
import * as SpawnSystemModule from '../core/SpawnSystem.js';
import { WeChatLoginService, LoginProfile } from './WeChatLoginService';
import { BoardCellPosition, BoardLike, BoardView } from '../ui/BoardView';
import { LoginPanelView } from '../ui/LoginPanelView';
import { ScoreView } from '../ui/ScoreView';

const { ccclass, property } = _decorator;

type GameState = 'playing' | 'gameOver';

interface WritableBoard extends BoardLike {
  setCell(x: number, y: number, level: number): void;
  move(fromX: number, fromY: number, toX: number, toY: number): {
    success: boolean;
    merged: boolean;
    newLevel: number;
  };
}

interface BoardConstructor {
  new (): WritableBoard;
}

interface SpawnSystemLike {
  spawnOne(board: WritableBoard): {
    success: boolean;
    position: BoardCellPosition | null;
    level: number | null;
  };
}

interface SpawnSystemConstructor {
  new (): SpawnSystemLike;
}

interface GameOverCheckerLike {
  isGameOver(board: WritableBoard): boolean;
}

interface GameOverCheckerConstructor {
  new (): GameOverCheckerLike;
}

const ImportedBoard = ((BoardModule as { Board?: BoardConstructor; default?: unknown }).Board
  ?? (BoardModule as { default?: { Board?: BoardConstructor } }).default?.Board
  ?? (BoardModule as { default?: BoardConstructor }).default) as BoardConstructor | undefined;

const ImportedSpawnSystem = ((SpawnSystemModule as { SpawnSystem?: SpawnSystemConstructor; default?: unknown }).SpawnSystem
  ?? (SpawnSystemModule as { default?: { SpawnSystem?: SpawnSystemConstructor } }).default?.SpawnSystem
  ?? (SpawnSystemModule as { default?: SpawnSystemConstructor }).default) as SpawnSystemConstructor | undefined;

const ImportedGameOverChecker = ((GameOverCheckerModule as { GameOverChecker?: GameOverCheckerConstructor; default?: unknown }).GameOverChecker
  ?? (GameOverCheckerModule as { default?: { GameOverChecker?: GameOverCheckerConstructor } }).default?.GameOverChecker
  ?? (GameOverCheckerModule as { default?: GameOverCheckerConstructor }).default) as GameOverCheckerConstructor | undefined;

@ccclass('MergeBoardScene')
export class MergeBoardScene extends Component {
  @property(BoardView)
  boardView: BoardView | null = null;

  @property(LoginPanelView)
  loginPanelView: LoginPanelView | null = null;

  @property(ScoreView)
  scoreView: ScoreView | null = null;

  @property
  initialSpawnCount = 2;

  private readonly loginService = new WeChatLoginService();
  private board: WritableBoard | null = null;
  private spawnSystem: SpawnSystemLike | null = null;
  private gameOverChecker: GameOverCheckerLike | null = null;
  private selectedCell: BoardCellPosition | null = null;
  private currentUser: LoginProfile | null = null;
  private isLoggingIn = false;
  private hasBoundBoardViewHandlers = false;
  private score = 0;
  private gameState: GameState = 'playing';

  start(): void {
    if (!ImportedBoard || !ImportedSpawnSystem || !ImportedGameOverChecker) {
      console.error('[MergeBoardScene] Core module is unavailable.', {
        BoardModule,
        SpawnSystemModule,
        GameOverCheckerModule,
      });
      return;
    }

    this.spawnSystem = new ImportedSpawnSystem();
    this.gameOverChecker = new ImportedGameOverChecker();

    const boardView = this.resolveBoardView();
    boardView.node.active = false;
    boardView.setSelectedCell(null);
    boardView.setInteractionEnabled(false);

    const scoreView = this.resolveScoreView();
    scoreView.node.active = false;
    scoreView.setScore(0);

    const loginPanelView = this.resolveLoginPanelView();
    loginPanelView.setLoginHandler(() => {
      void this.handleLoginRequest();
    });
    loginPanelView.showPrompt(this.loginService.isWeChatGameEnvironment());
  }

  async restart(): Promise<void> {
    if (!ImportedBoard || !this.spawnSystem || !this.gameOverChecker) {
      return;
    }

    this.board = new ImportedBoard();
    this.score = 0;
    this.gameState = 'playing';
    this.selectedCell = null;

    const scoreView = this.resolveScoreView();
    scoreView.node.active = true;
    scoreView.setScore(this.score);

    const boardView = this.resolveBoardView();
    boardView.node.active = true;
    boardView.setInteractionEnabled(true);
    boardView.setBoard(this.board);
    boardView.setSelectedCell(null);

    if (!this.hasBoundBoardViewHandlers) {
      boardView.setCellClickHandler((position) => {
        this.handleCellClick(position);
      });
      boardView.setCellDragHandler((from, to) => {
        this.handleCellDrag(from, to);
      });
      this.hasBoundBoardViewHandlers = true;
    }

    this.spawnInitialCats();
    boardView.refresh();
    this.updateGameStateAfterBoardChange();
  }

  private async handleLoginRequest(): Promise<void> {
    if (this.isLoggingIn) {
      return;
    }

    this.isLoggingIn = true;
    const loginPanelView = this.resolveLoginPanelView();
    loginPanelView.setLoading();

    try {
      const loginProfile = await this.loginService.login();
      this.currentUser = loginProfile;
      loginPanelView.showLoggedIn(loginProfile.displayName);
      await this.restart();
      loginPanelView.hide();
    } catch (error) {
      console.error('[MergeBoardScene] Login failed.', error);
      loginPanelView.showError('登录失败，请重试。');
    } finally {
      this.isLoggingIn = false;
    }
  }

  private spawnInitialCats(): void {
    if (!this.board || !this.spawnSystem) {
      return;
    }

    for (let count = 0; count < this.initialSpawnCount; count += 1) {
      const spawnResult = this.spawnSystem.spawnOne(this.board);
      if (!spawnResult.success) {
        break;
      }
    }
  }

  private handleCellClick(position: BoardCellPosition): void {
    if (!this.board || this.gameState !== 'playing') {
      return;
    }

    const clickedLevel = this.board.getCell(position.x, position.y);

    if (!this.selectedCell) {
      if (clickedLevel === 0) {
        return;
      }

      this.selectedCell = position;
      this.boardView?.setSelectedCell(position);
      return;
    }

    if (this.selectedCell.x === position.x && this.selectedCell.y === position.y) {
      this.clearSelection();
      return;
    }

    const from = this.selectedCell;
    this.clearSelection();
    this.attemptMove(from, position);
  }

  private handleCellDrag(from: BoardCellPosition, to: BoardCellPosition | null): void {
    if (this.gameState !== 'playing') {
      return;
    }

    this.clearSelection();

    if (!to) {
      this.boardView?.refresh();
      return;
    }

    if (from.x === to.x && from.y === to.y) {
      this.boardView?.refresh();
      return;
    }

    this.attemptMove(from, to);
  }

  private attemptMove(from: BoardCellPosition, to: BoardCellPosition): void {
    if (!this.board || !this.spawnSystem || !this.gameOverChecker || this.gameState !== 'playing') {
      return;
    }

    const moveResult = this.board.move(from.x, from.y, to.x, to.y);

    if (!moveResult.success) {
      this.boardView?.refresh();
      return;
    }

    if (moveResult.merged) {
      this.addScore(Math.pow(2, moveResult.newLevel));
    }

    this.spawnSystem.spawnOne(this.board);
    this.boardView?.refresh();
    this.updateGameStateAfterBoardChange();
  }

  private updateGameStateAfterBoardChange(): void {
    if (!this.board || !this.gameOverChecker) {
      return;
    }

    if (this.gameOverChecker.isGameOver(this.board)) {
      this.gameState = 'gameOver';
      this.clearSelection();
      this.resolveBoardView().setInteractionEnabled(false);
      console.log('Game Over');
      return;
    }

    this.gameState = 'playing';
    this.resolveBoardView().setInteractionEnabled(true);
  }

  private addScore(points: number): void {
    this.score += points;
    this.resolveScoreView().setScore(this.score);
  }

  private resolveBoardView(): BoardView {
    if (this.boardView) {
      return this.boardView;
    }

    const existingBoardView = this.getComponentInChildren(BoardView);
    if (existingBoardView) {
      this.boardView = existingBoardView;
      return existingBoardView;
    }

    const boardNode = new Node('BoardView');
    boardNode.layer = this.node.layer;
    this.node.addChild(boardNode);

    const transform = boardNode.addComponent(UITransform);
    transform.setContentSize(516, 516);

    const widget = boardNode.addComponent(Widget);
    widget.isAlignHorizontalCenter = true;
    widget.isAlignVerticalCenter = true;
    widget.horizontalCenter = 0;
    widget.verticalCenter = -20;

    const boardView = boardNode.addComponent(BoardView);
    this.boardView = boardView;
    return boardView;
  }

  private resolveLoginPanelView(): LoginPanelView {
    if (this.loginPanelView) {
      return this.loginPanelView;
    }

    const existingLoginPanelView = this.getComponentInChildren(LoginPanelView);
    if (existingLoginPanelView) {
      this.loginPanelView = existingLoginPanelView;
      return existingLoginPanelView;
    }

    const panelNode = new Node('LoginPanelView');
    panelNode.layer = this.node.layer;
    this.node.addChild(panelNode);

    const panelTransform = panelNode.addComponent(UITransform);
    const parentTransform = this.node.getComponent(UITransform);
    const panelWidth = parentTransform?.contentSize.width ?? 1280;
    const panelHeight = parentTransform?.contentSize.height ?? 720;
    panelTransform.setContentSize(panelWidth, panelHeight);

    const widget = panelNode.addComponent(Widget);
    widget.isAlignTop = true;
    widget.isAlignBottom = true;
    widget.isAlignLeft = true;
    widget.isAlignRight = true;
    widget.top = 0;
    widget.bottom = 0;
    widget.left = 0;
    widget.right = 0;

    const loginPanelView = panelNode.addComponent(LoginPanelView);
    this.loginPanelView = loginPanelView;
    return loginPanelView;
  }

  private resolveScoreView(): ScoreView {
    if (this.scoreView) {
      return this.scoreView;
    }

    const existingScoreView = this.getComponentInChildren(ScoreView);
    if (existingScoreView) {
      this.scoreView = existingScoreView;
      return existingScoreView;
    }

    const scoreNode = new Node('ScoreView');
    scoreNode.layer = this.node.layer;
    this.node.addChild(scoreNode);

    const transform = scoreNode.addComponent(UITransform);
    transform.setContentSize(220, 96);

    const widget = scoreNode.addComponent(Widget);
    widget.isAlignTop = true;
    widget.isAlignRight = true;
    widget.top = 34;
    widget.right = 42;

    const scoreView = scoreNode.addComponent(ScoreView);
    this.scoreView = scoreView;
    return scoreView;
  }

  private clearSelection(): void {
    this.selectedCell = null;
    this.boardView?.setSelectedCell(null);
  }
}
