import {
  _decorator,
  BlockInputEvents,
  Color,
  Component,
  Graphics,
  HorizontalTextAlignment,
  Label,
  Node,
  UITransform,
  UIOpacity,
  VerticalTextAlignment,
  Widget,
} from 'cc';

const { ccclass } = _decorator;

@ccclass('LoginPanelView')
export class LoginPanelView extends Component {
  private titleLabel: Label | null = null;
  private hintLabel: Label | null = null;
  private statusLabel: Label | null = null;
  private buttonNode: Node | null = null;
  private buttonGraphics: Graphics | null = null;
  private buttonLabel: Label | null = null;
  private buttonEnabled = true;
  private loginHandler: (() => void) | null = null;

  onLoad(): void {
    this.buildUi();
    this.refreshLayout();
    this.updateButtonVisual();
  }

  start(): void {
    this.refreshLayout();
  }

  setLoginHandler(handler: (() => void) | null): void {
    this.loginHandler = handler;
  }

  showPrompt(useWeChatLogin: boolean): void {
    this.node.active = true;

    if (this.hintLabel) {
      this.hintLabel.string = useWeChatLogin
        ? '启动后请授权微信登录，完成后进入游戏。'
        : '当前不是微信小游戏环境，将使用开发预览登录流程。';
    }

    if (this.statusLabel) {
      this.statusLabel.string = useWeChatLogin
        ? '请点击下方按钮进行微信授权。'
        : '请点击下方按钮进入开发预览模式。';
    }

    if (this.buttonLabel) {
      this.buttonLabel.string = useWeChatLogin ? '微信授权登录' : '开发预览登录';
    }

    this.buttonEnabled = true;
    this.updateButtonVisual();
  }

  setLoading(): void {
    if (this.statusLabel) {
      this.statusLabel.string = '登录中，请稍候...';
    }

    this.buttonEnabled = false;
    this.updateButtonVisual();
  }

  showLoggedIn(displayName: string): void {
    if (this.statusLabel) {
      this.statusLabel.string = '登录成功：' + displayName;
    }

    this.buttonEnabled = false;
    this.updateButtonVisual();
  }

  showError(message: string): void {
    if (this.statusLabel) {
      this.statusLabel.string = message;
    }

    this.buttonEnabled = true;
    this.updateButtonVisual();
  }

  hide(): void {
    this.node.active = false;
  }

  private buildUi(): void {
    this.node.removeAllChildren();
    this.node.addComponent(BlockInputEvents);

    const backgroundNode = new Node('Background');
    backgroundNode.layer = this.node.layer;
    this.node.addChild(backgroundNode);

    const backgroundTransform = backgroundNode.addComponent(UITransform);
    const backgroundWidget = backgroundNode.addComponent(Widget);
    backgroundWidget.isAlignTop = true;
    backgroundWidget.isAlignBottom = true;
    backgroundWidget.isAlignLeft = true;
    backgroundWidget.isAlignRight = true;
    backgroundWidget.top = 0;
    backgroundWidget.bottom = 0;
    backgroundWidget.left = 0;
    backgroundWidget.right = 0;
    backgroundTransform.setContentSize(1280, 720);

    const backgroundOpacity = backgroundNode.addComponent(UIOpacity);
    backgroundOpacity.opacity = 255;
    const backgroundGraphics = backgroundNode.addComponent(Graphics);
    this.drawRect(backgroundGraphics, 1280, 720, new Color(241, 232, 214, 255));

    const cardNode = new Node('Card');
    cardNode.layer = this.node.layer;
    this.node.addChild(cardNode);
    cardNode.setPosition(0, 20, 0);

    const cardTransform = cardNode.addComponent(UITransform);
    cardTransform.setContentSize(820, 500);
    const cardGraphics = cardNode.addComponent(Graphics);
    this.drawRect(cardGraphics, 820, 500, new Color(252, 248, 239, 255), new Color(189, 173, 155, 255), 4);

    const titleNode = this.createLabelNode('Title', 700, 72, 48, new Color(86, 63, 45, 255));
    cardNode.addChild(titleNode);
    titleNode.setPosition(0, 130, 0);
    this.titleLabel = titleNode.getComponent(Label);
    if (this.titleLabel) {
      this.titleLabel.string = '猫咪合成';
    }

    const hintNode = this.createLabelNode('Hint', 680, 96, 26, new Color(116, 90, 70, 255));
    cardNode.addChild(hintNode);
    hintNode.setPosition(0, 35, 0);
    this.hintLabel = hintNode.getComponent(Label);

    const statusNode = this.createLabelNode('Status', 680, 72, 24, new Color(139, 111, 84, 255));
    cardNode.addChild(statusNode);
    statusNode.setPosition(0, -50, 0);
    this.statusLabel = statusNode.getComponent(Label);

    const buttonNode = new Node('LoginButton');
    buttonNode.layer = this.node.layer;
    cardNode.addChild(buttonNode);
    buttonNode.setPosition(0, -165, 0);
    buttonNode.on(Node.EventType.TOUCH_END, this.handleButtonPress, this);
    buttonNode.on(Node.EventType.MOUSE_UP, this.handleButtonPress, this);

    const buttonTransform = buttonNode.addComponent(UITransform);
    buttonTransform.setContentSize(360, 88);
    this.buttonGraphics = buttonNode.addComponent(Graphics);

    const buttonLabelNode = this.createLabelNode('ButtonLabel', 320, 56, 30, new Color(255, 250, 239, 255));
    buttonNode.addChild(buttonLabelNode);
    buttonLabelNode.setPosition(0, 0, 0);
    this.buttonLabel = buttonLabelNode.getComponent(Label);
    this.buttonNode = buttonNode;
  }

  private refreshLayout(): void {
    const backgroundNode = this.node.getChildByName('Background');
    const backgroundTransform = backgroundNode?.getComponent(UITransform);
    const backgroundGraphics = backgroundNode?.getComponent(Graphics);
    const rootTransform = this.node.getComponent(UITransform);

    if (!backgroundNode || !backgroundTransform || !backgroundGraphics || !rootTransform) {
      return;
    }

    const { width, height } = rootTransform.contentSize;
    backgroundTransform.setContentSize(width, height);
    this.drawRect(backgroundGraphics, width, height, new Color(241, 232, 214, 255));
  }

  private createLabelNode(name: string, width: number, height: number, fontSize: number, color: Color): Node {
    const labelNode = new Node(name);
    labelNode.layer = this.node.layer;

    const transform = labelNode.addComponent(UITransform);
    transform.setContentSize(width, height);

    const label = labelNode.addComponent(Label);
    label.string = '';
    label.fontSize = fontSize;
    label.lineHeight = Math.floor(fontSize * 1.35);
    label.horizontalAlign = HorizontalTextAlignment.CENTER;
    label.verticalAlign = VerticalTextAlignment.CENTER;
    label.overflow = Label.Overflow.SHRINK;
    label.color = color;

    return labelNode;
  }

  private handleButtonPress(): void {
    if (!this.buttonEnabled) {
      return;
    }

    this.loginHandler?.();
  }

  private updateButtonVisual(): void {
    if (!this.buttonGraphics || !this.buttonLabel || !this.buttonNode) {
      return;
    }

    const fillColor = this.buttonEnabled
      ? new Color(70, 150, 96, 255)
      : new Color(142, 170, 148, 255);
    const strokeColor = this.buttonEnabled
      ? new Color(49, 110, 68, 255)
      : new Color(122, 143, 127, 255);

    this.drawRect(this.buttonGraphics, 360, 88, fillColor, strokeColor, 4);
    this.buttonLabel.color = this.buttonEnabled
      ? new Color(255, 250, 239, 255)
      : new Color(230, 233, 228, 255);
    this.buttonNode.setScale(this.buttonEnabled ? 1 : 0.98, this.buttonEnabled ? 1 : 0.98, 1);
  }

  private drawRect(
    graphics: Graphics,
    width: number,
    height: number,
    fillColor: Color,
    strokeColor?: Color,
    lineWidth = 0,
  ): void {
    graphics.clear();
    graphics.fillColor = fillColor;
    graphics.rect(-width / 2, -height / 2, width, height);
    graphics.fill();

    if (strokeColor && lineWidth > 0) {
      graphics.lineWidth = lineWidth;
      graphics.strokeColor = strokeColor;
      graphics.rect(-width / 2, -height / 2, width, height);
      graphics.stroke();
    }
  }
}
