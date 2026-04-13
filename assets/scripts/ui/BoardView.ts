import {
  _decorator,
  Color,
  Component,
  EventMouse,
  EventTouch,
  Graphics,
  HorizontalTextAlignment,
  input,
  Input,
  Label,
  Node,
  UIOpacity,
  UITransform,
  Vec2,
  Vec3,
  VerticalTextAlignment,
} from 'cc';

const { ccclass, property } = _decorator;

export interface BoardLike {
  getCell(x: number, y: number): number;
  constructor: {
    SIZE?: number;
  };
}

export interface BoardCellPosition {
  x: number;
  y: number;
}

interface CellView {
  node: Node;
  background: Graphics;
  label: Label;
  opacity: UIOpacity;
}

interface DragState {
  source: BoardCellPosition;
  sourceView: CellView;
  previewNode: Node;
}

type PointerEventLike = EventTouch | EventMouse;

@ccclass('BoardView')
export class BoardView extends Component {
  @property
  cellSize = 120;

  @property
  cellGap = 12;

  @property
  dragThreshold = 18;

  private board: BoardLike | null = null;
  private boardSize = 4;
  private readonly cellViews: CellView[] = [];
  private selectedCell: BoardCellPosition | null = null;
  private cellClickHandler: ((position: BoardCellPosition) => void) | null = null;
  private cellDragHandler: ((from: BoardCellPosition, to: BoardCellPosition | null) => void) | null = null;
  private pendingPressCell: BoardCellPosition | null = null;
  private pendingPressCanDrag = false;
  private pressStartUILocation: Vec3 | null = null;
  private lastPointerUILocation: Vec3 | null = null;
  private dragState: DragState | null = null;
  private trackingGlobalPointer = false;
  private interactionEnabled = true;

  onDisable(): void {
    this.stopGlobalPointerTracking();
    this.endActiveDragVisual();
    this.clearPendingPress();
  }

  onDestroy(): void {
    this.stopGlobalPointerTracking();
  }

  setBoard(board: BoardLike): void {
    this.board = board;
    this.boardSize = board.constructor.SIZE ?? 4;
    this.rebuildGrid();
    this.refresh();
  }

  setCellClickHandler(handler: ((position: BoardCellPosition) => void) | null): void {
    this.cellClickHandler = handler;
  }

  setCellDragHandler(handler: ((from: BoardCellPosition, to: BoardCellPosition | null) => void) | null): void {
    this.cellDragHandler = handler;
  }

  setSelectedCell(position: BoardCellPosition | null): void {
    this.selectedCell = position;
    this.refresh();
  }

  setInteractionEnabled(enabled: boolean): void {
    this.interactionEnabled = enabled;

    if (!enabled) {
      this.stopGlobalPointerTracking();
      this.endActiveDragVisual();
      this.clearPendingPress();
    }
  }

  refresh(): void {
    if (!this.board) {
      return;
    }

    for (let y = 0; y < this.boardSize; y += 1) {
      for (let x = 0; x < this.boardSize; x += 1) {
        const cellIndex = y * this.boardSize + x;
        const level = this.board.getCell(x, y);
        const cellView = this.cellViews[cellIndex];
        const isSelected = this.isSelectedCell(x, y);

        this.drawCell(cellView.background, level, isSelected);
        cellView.label.string = level > 0 ? `${level}` : '';
        cellView.label.color = level > 0 ? new Color(60, 45, 30, 255) : new Color(0, 0, 0, 0);

        if (!this.isDraggedCell(x, y)) {
          cellView.node.setScale(isSelected ? new Vec3(1.05, 1.05, 1) : Vec3.ONE);
          cellView.opacity.opacity = 255;
        }
      }
    }
  }

  private rebuildGrid(): void {
    this.endActiveDragVisual();
    this.stopGlobalPointerTracking();
    this.clearPendingPress();
    this.node.removeAllChildren();
    this.cellViews.length = 0;

    const boardPixelSize = this.getBoardPixelSize();
    const transform = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
    transform.setContentSize(boardPixelSize, boardPixelSize);

    this.registerPointerTrackingNode(this.node);

    const startX = -boardPixelSize / 2 + this.cellSize / 2;
    const startY = boardPixelSize / 2 - this.cellSize / 2;
    const step = this.cellSize + this.cellGap;

    for (let y = 0; y < this.boardSize; y += 1) {
      for (let x = 0; x < this.boardSize; x += 1) {
        const cellNode = new Node(`Cell-${x}-${y}`);
        cellNode.layer = this.node.layer;
        this.node.addChild(cellNode);
        cellNode.setPosition(startX + x * step, startY - y * step);
        cellNode.on(Node.EventType.TOUCH_START, (event: EventTouch) => {
          this.handleCellTouchStart(x, y, event);
        });
        cellNode.on(Node.EventType.MOUSE_DOWN, (event: EventMouse) => {
          this.handleCellMouseDown(x, y, event);
        });
        this.registerPointerTrackingNode(cellNode);

        const cellTransform = cellNode.addComponent(UITransform);
        cellTransform.setContentSize(this.cellSize, this.cellSize);

        const opacity = cellNode.addComponent(UIOpacity);
        const background = cellNode.addComponent(Graphics);
        this.drawCell(background, 0, false);

        const labelNode = new Node('LevelLabel');
        labelNode.layer = this.node.layer;
        cellNode.addChild(labelNode);
        labelNode.setPosition(0, 0);

        const labelTransform = labelNode.addComponent(UITransform);
        labelTransform.setContentSize(this.cellSize, this.cellSize);

        const label = labelNode.addComponent(Label);
        label.string = '';
        label.fontSize = Math.floor(this.cellSize * 0.34);
        label.lineHeight = this.cellSize;
        label.horizontalAlign = HorizontalTextAlignment.CENTER;
        label.verticalAlign = VerticalTextAlignment.CENTER;
        label.overflow = Label.Overflow.SHRINK;

        this.cellViews.push({
          node: cellNode,
          background,
          label,
          opacity,
        });
      }
    }
  }

  private handleCellTouchStart(x: number, y: number, event: EventTouch): void {
    this.beginPress(x, y, event.getUILocation().x, event.getUILocation().y);
  }

  private handleCellMouseDown(x: number, y: number, event: EventMouse): void {
    this.beginPress(x, y, event.getUILocation().x, event.getUILocation().y);
  }

  private beginPress(x: number, y: number, uiX: number, uiY: number): void {
    if (!this.board || !this.interactionEnabled || this.dragState || this.pendingPressCell) {
      return;
    }

    const pointerLocation = new Vec3(uiX, uiY, 0);
    this.pendingPressCell = { x, y };
    this.pendingPressCanDrag = this.board.getCell(x, y) > 0;
    this.pressStartUILocation = pointerLocation;
    this.lastPointerUILocation = pointerLocation;
    this.startGlobalPointerTracking();
  }

  private handleGlobalTouchMove(event: EventTouch): void {
    this.handlePointerMove(event);
  }

  private handleGlobalMouseMove(event: EventMouse): void {
    this.handlePointerMove(event);
  }

  private handlePointerMove(event: PointerEventLike): void {
    if (!this.pendingPressCell || !this.pressStartUILocation) {
      return;
    }

    const location = event.getUILocation();
    const current = new Vec3(location.x, location.y, 0);
    this.lastPointerUILocation = current;

    if (!this.pendingPressCanDrag) {
      return;
    }

    if (!this.dragState) {
      const movedDistance = Vec3.distance(this.pressStartUILocation, current);
      if (movedDistance < this.dragThreshold) {
        return;
      }

      this.beginDrag(this.pendingPressCell, current);
      return;
    }

    this.updateDragPreviewPosition(current);
  }

  private handleGlobalTouchEnd(event: EventTouch): void {
    this.handlePointerEnd(event);
  }

  private handleGlobalMouseUp(event: EventMouse): void {
    this.handlePointerEnd(event);
  }

  private handlePointerEnd(event: PointerEventLike): void {
    if (!this.pendingPressCell) {
      return;
    }

    if (!this.dragState) {
      const clickedCell = this.pendingPressCell;
      this.stopGlobalPointerTracking();
      this.clearPendingPress();
      this.cellClickHandler?.(clickedCell);
      return;
    }

    const location = event.getUILocation();
    const pointerPosition = new Vec3(location.x, location.y, 0);
    this.lastPointerUILocation = pointerPosition;
    const targetCell = this.getCellAtUILocation(pointerPosition);
    const fromCell = this.dragState.source;

    this.endActiveDragVisual();
    this.stopGlobalPointerTracking();
    this.clearPendingPress();
    this.cellDragHandler?.(fromCell, targetCell);
  }

  private handleGlobalTouchCancel(): void {
    this.cancelPointerInteraction();
  }

  private cancelPointerInteraction(): void {
    if (!this.pendingPressCell) {
      return;
    }

    const fromCell = this.dragState?.source ?? null;
    const hadDrag = !!this.dragState;
    const targetCell = hadDrag && this.lastPointerUILocation
      ? this.getCellAtUILocation(this.lastPointerUILocation)
      : null;

    this.endActiveDragVisual();
    this.stopGlobalPointerTracking();
    this.clearPendingPress();

    if (hadDrag && fromCell) {
      this.cellDragHandler?.(fromCell, targetCell);
    }
  }

  private startGlobalPointerTracking(): void {
    if (this.trackingGlobalPointer) {
      return;
    }

    input.on(Input.EventType.TOUCH_MOVE, this.handleGlobalTouchMove, this);
    input.on(Input.EventType.TOUCH_END, this.handleGlobalTouchEnd, this);
    input.on(Input.EventType.TOUCH_CANCEL, this.handleGlobalTouchCancel, this);
    input.on(Input.EventType.MOUSE_MOVE, this.handleGlobalMouseMove, this);
    input.on(Input.EventType.MOUSE_UP, this.handleGlobalMouseUp, this);
    this.trackingGlobalPointer = true;
  }

  private stopGlobalPointerTracking(): void {
    if (!this.trackingGlobalPointer) {
      return;
    }

    input.off(Input.EventType.TOUCH_MOVE, this.handleGlobalTouchMove, this);
    input.off(Input.EventType.TOUCH_END, this.handleGlobalTouchEnd, this);
    input.off(Input.EventType.TOUCH_CANCEL, this.handleGlobalTouchCancel, this);
    input.off(Input.EventType.MOUSE_MOVE, this.handleGlobalMouseMove, this);
    input.off(Input.EventType.MOUSE_UP, this.handleGlobalMouseUp, this);
    this.trackingGlobalPointer = false;
  }

  private registerPointerTrackingNode(targetNode: Node): void {
    targetNode.on(Node.EventType.TOUCH_MOVE, this.handleGlobalTouchMove, this);
    targetNode.on(Node.EventType.TOUCH_END, this.handleGlobalTouchEnd, this);
    targetNode.on(Node.EventType.TOUCH_CANCEL, this.handleGlobalTouchCancel, this);
    targetNode.on(Node.EventType.MOUSE_MOVE, this.handleGlobalMouseMove, this);
    targetNode.on(Node.EventType.MOUSE_UP, this.handleGlobalMouseUp, this);
  }

  private beginDrag(source: BoardCellPosition, location: Vec3): void {
    const sourceIndex = source.y * this.boardSize + source.x;
    const sourceView = this.cellViews[sourceIndex];
    const level = this.board?.getCell(source.x, source.y) ?? 0;
    const previewNode = this.createDragPreview(level);

    this.node.addChild(previewNode);
    previewNode.setSiblingIndex(this.node.children.length - 1);

    sourceView.opacity.opacity = 110;
    sourceView.node.setScale(new Vec3(0.96, 0.96, 1));

    this.dragState = {
      source,
      sourceView,
      previewNode,
    };

    this.updateDragPreviewPosition(location);
  }

  private updateDragPreviewPosition(location: Vec3): void {
    if (!this.dragState) {
      return;
    }

    this.lastPointerUILocation = location;

    const transform = this.node.getComponent(UITransform);
    if (!transform) {
      return;
    }

    const localPosition = transform.convertToNodeSpaceAR(location);
    this.dragState.previewNode.setPosition(localPosition.x, localPosition.y, 0);
  }

  private endActiveDragVisual(): void {
    if (!this.dragState) {
      return;
    }

    this.dragState.sourceView.opacity.opacity = 255;
    this.dragState.sourceView.node.setScale(this.isSelectedCell(this.dragState.source.x, this.dragState.source.y) ? new Vec3(1.05, 1.05, 1) : Vec3.ONE);
    this.dragState.previewNode.destroy();
    this.dragState = null;
  }

  private clearPendingPress(): void {
    this.pendingPressCell = null;
    this.pendingPressCanDrag = false;
    this.pressStartUILocation = null;
    this.lastPointerUILocation = null;
  }

  private createDragPreview(level: number): Node {
    const previewNode = new Node('DragPreview');
    previewNode.layer = this.node.layer;
    previewNode.setScale(new Vec3(1.08, 1.08, 1));
    this.registerPointerTrackingNode(previewNode);

    const transform = previewNode.addComponent(UITransform);
    transform.setContentSize(this.cellSize, this.cellSize);

    const opacity = previewNode.addComponent(UIOpacity);
    opacity.opacity = 210;

    const background = previewNode.addComponent(Graphics);
    this.drawCell(background, level, true);

    const labelNode = new Node('DragLabel');
    labelNode.layer = this.node.layer;
    previewNode.addChild(labelNode);

    const labelTransform = labelNode.addComponent(UITransform);
    labelTransform.setContentSize(this.cellSize, this.cellSize);

    const label = labelNode.addComponent(Label);
    label.string = level > 0 ? `${level}` : '';
    label.fontSize = Math.floor(this.cellSize * 0.34);
    label.lineHeight = this.cellSize;
    label.horizontalAlign = HorizontalTextAlignment.CENTER;
    label.verticalAlign = VerticalTextAlignment.CENTER;
    label.overflow = Label.Overflow.SHRINK;
    label.color = new Color(60, 45, 30, 255);

    return previewNode;
  }

  private getCellAtUILocation(location: Vec3): BoardCellPosition | null {
    const point = new Vec2(location.x, location.y);

    for (let index = this.cellViews.length - 1; index >= 0; index -= 1) {
      const cellView = this.cellViews[index];
      const transform = cellView.node.getComponent(UITransform);
      if (!transform) {
        continue;
      }

      const worldBounds = transform.getBoundingBoxToWorld();
      if (worldBounds.contains(point)) {
        return {
          x: index % this.boardSize,
          y: Math.floor(index / this.boardSize),
        };
      }
    }

    return null;
  }

  private getBoardPixelSize(): number {
    return this.boardSize * this.cellSize + (this.boardSize - 1) * this.cellGap;
  }

  private drawCell(graphics: Graphics, level: number, isSelected: boolean): void {
    graphics.clear();
    graphics.fillColor = this.getCellColor(level);
    graphics.rect(-this.cellSize / 2, -this.cellSize / 2, this.cellSize, this.cellSize);
    graphics.fill();

    graphics.lineWidth = isSelected ? 8 : 3;
    graphics.strokeColor = isSelected
      ? new Color(255, 247, 180, 255)
      : new Color(160, 145, 130, 255);
    graphics.rect(-this.cellSize / 2, -this.cellSize / 2, this.cellSize, this.cellSize);
    graphics.stroke();
  }

  private getCellColor(level: number): Color {
    switch (level) {
      case 1:
        return new Color(248, 229, 180, 255);
      case 2:
        return new Color(244, 207, 145, 255);
      case 3:
        return new Color(236, 184, 111, 255);
      case 4:
        return new Color(227, 162, 91, 255);
      case 5:
        return new Color(213, 141, 74, 255);
      case 6:
        return new Color(197, 121, 62, 255);
      default:
        return new Color(226, 221, 214, 255);
    }
  }

  private isSelectedCell(x: number, y: number): boolean {
    return this.selectedCell?.x === x && this.selectedCell?.y === y;
  }

  private isDraggedCell(x: number, y: number): boolean {
    return this.dragState?.source.x === x && this.dragState?.source.y === y;
  }
}
