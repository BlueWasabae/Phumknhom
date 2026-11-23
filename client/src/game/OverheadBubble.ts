import Phaser from 'phaser';

/**
 * Reusable overhead speech bubble (4.5s) + floating emoji emote (3s)
 * that tracks any player sprite smoothly across both Top-Down and Side-Scrolling scenes.
 */
export class OverheadBubble {
  private scene: Phaser.Scene;
  private bubbleBg: Phaser.GameObjects.Graphics;
  private bubbleText: Phaser.GameObjects.Text;
  private emoteText: Phaser.GameObjects.Text;
  private bubbleExpiresAt = 0;
  private emoteExpiresAt = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.bubbleBg = scene.add.graphics().setDepth(3000).setVisible(false);
    this.bubbleText = scene.add
      .text(0, 0, '', {
        fontFamily: 'Kantumruy Pro, system-ui, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#1e293b',
        wordWrap: { width: 190 },
        align: 'center',
      })
      .setOrigin(0.5, 1)
      .setDepth(3001)
      .setVisible(false);

    this.emoteText = scene.add
      .text(0, 0, '', {
        fontSize: '26px',
      })
      .setOrigin(0.5, 1)
      .setDepth(3002)
      .setVisible(false);
  }

  showSpeech(text: string, durationMs = 4500): void {
    const clean = text.trim().slice(0, 120);
    if (!clean) return;
    this.bubbleText.setText(clean).setVisible(true);
    this.bubbleBg.setVisible(true);
    this.bubbleExpiresAt = this.scene.time.now + durationMs;
  }

  showEmote(emoji: string, durationMs = 3000): void {
    this.emoteText.setText(emoji).setVisible(true);
    this.emoteExpiresAt = this.scene.time.now + durationMs;
  }

  update(targetX: number, targetY: number, offsetY = -46): void {
    const now = this.scene.time.now;

    if (this.bubbleExpiresAt > 0) {
      if (now >= this.bubbleExpiresAt) {
        this.bubbleBg.setVisible(false);
        this.bubbleText.setVisible(false);
        this.bubbleExpiresAt = 0;
      } else {
        const bx = Math.round(targetX);
        const by = Math.round(targetY + offsetY);
        this.bubbleText.setPosition(bx, by - 8);

        const padX = 12;
        const padY = 7;
        const w = Math.max(54, this.bubbleText.width + padX * 2);
        const h = Math.max(26, this.bubbleText.height + padY * 2);

        this.bubbleBg.clear();
        this.bubbleBg.fillStyle(0xffffff, 0.98);
        this.bubbleBg.lineStyle(2.5, 0x334155, 1);
        this.bubbleBg.fillRoundedRect(bx - w / 2, by - 8 - h + padY, w, h, 11);
        this.bubbleBg.strokeRoundedRect(bx - w / 2, by - 8 - h + padY, w, h, 11);
        // Speech pointer triangle
        this.bubbleBg.fillStyle(0xffffff, 0.98);
        this.bubbleBg.fillTriangle(bx - 6, by - 8 + padY, bx + 6, by - 8 + padY, bx, by + padY);
      }
    }

    if (this.emoteExpiresAt > 0) {
      if (now >= this.emoteExpiresAt) {
        this.emoteText.setVisible(false);
        this.emoteExpiresAt = 0;
      } else {
        const floatY = Math.sin(now / 160) * 4;
        const extraY = this.bubbleExpiresAt > 0 ? -52 : 0;
        this.emoteText.setPosition(targetX, targetY + offsetY + extraY + floatY);
      }
    }
  }

  destroy(): void {
    this.bubbleBg.destroy();
    this.bubbleText.destroy();
    this.emoteText.destroy();
  }
}
