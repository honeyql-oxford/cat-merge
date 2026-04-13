import {
  _decorator,
  Color,
  Component,
  Graphics,
  HorizontalTextAlignment,
  Label,
  Node,
  UITransform,
  VerticalTextAlignment,
} from 'cc';

const { ccclass } = _decorator;

@ccclass('ScoreView')
export class ScoreView extends Component {
  private valueLabel: Label | null = null;

  onLoad(): void {
    this.buildUi();
  }

  setScore(score: number): void {
    if (this.valueLabel) {
      this.valueLabel.string = `${score}`;
    }
  }

  private buildUi(): void {
    this.node.removeAllChildren();

    const background = new Node('Background');
    background.layer = this.node.layer;
    this.node.addChild(background);

    const backgroundTransform = background.addComponent(UITransform);
    backgroundTransform.setContentSize(220, 96);

    const graphics = background.addComponent(Graphics);
    this.drawPanel(graphics, 220, 96);

    const titleNode = this.createLabelNode('Title', 180, 28, 20, new Color(126, 94, 66, 255));
    background.addChild(titleNode);
    titleNode.setPosition(0, 22, 0);
    const titleLabel = titleNode.getComponent(Label);
    if (titleLabel) {
      titleLabel.string = '分数';
    }

    const valueNode = this.createLabelNode('Value', 180, 42, 34, new Color(86, 63, 45, 255));
    background.addChild(valueNode);
    valueNode.setPosition(0, -14, 0);
    this.valueLabel = valueNode.getComponent(Label);
    this.setScore(0);
  }

  private createLabelNode(name: string, width: number, height: number, fontSize: number, color: Color): Node {
    const labelNode = new Node(name);
    labelNode.layer = this.node.layer;

    const transform = labelNode.addComponent(UITransform);
    transform.setContentSize(width, height);

    const label = labelNode.addComponent(Label);
    label.string = '';
    label.fontSize = fontSize;
    label.lineHeight = Math.floor(fontSize * 1.25);
    label.horizontalAlign = HorizontalTextAlignment.CENTER;
    label.verticalAlign = VerticalTextAlignment.CENTER;
    label.overflow = Label.Overflow.SHRINK;
    label.color = color;

    return labelNode;
  }

  private drawPanel(graphics: Graphics, width: number, height: number): void {
    graphics.clear();
    graphics.fillColor = new Color(252, 248, 239, 255);
    graphics.roundRect(-width / 2, -height / 2, width, height, 18);
    graphics.fill();

    graphics.lineWidth = 4;
    graphics.strokeColor = new Color(189, 173, 155, 255);
    graphics.roundRect(-width / 2, -height / 2, width, height, 18);
    graphics.stroke();
  }
}

