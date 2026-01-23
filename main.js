class WorldScene extends Phaser.Scene {
  constructor() {
    super('WorldScene')
  }

  preload() {
    // We no longer need 'player' or 'shrine' images! 
    // They are generated procedurally in create()
    this.load.image('tiles', 'assets/tiles.png')
    this.load.image('scrap', 'assets/scrap.png')
    this.load.audio('bgm', 'assets/Chapter-14-adv.mp3')
    this.load.audio('endBgm', 'assets/Chapter-14-end.mp3')
  }

  /* ---------------- PROCEDURAL ART GENERATORS ---------------- */
  // These create textures on the fly so the game looks unique without assets
  createProceduralAssets() {
    // 1. The Player: Hooded figure with a glowing core
    const pGfx = this.make.graphics({ x: 0, y: 0, add: false });
    pGfx.fillStyle(0x222222, 1); // Cloak
    pGfx.fillEllipse(8, 10, 10, 12);
    pGfx.fillStyle(0x000000, 1); // Hood shadow
    pGfx.fillCircle(8, 5, 4);
    pGfx.fillStyle(0x88ccff, 1); // Glowing Soul
    pGfx.fillCircle(8, 7, 2);
    pGfx.generateTexture('player_proc', 16, 16);

    // 2. The Shrine: Stone pillar with energy rings
    const sGfx = this.make.graphics({ x: 0, y: 0, add: false });
    sGfx.fillStyle(0x444444, 1); // Base
    sGfx.fillRect(2, 12, 12, 4);
    sGfx.fillStyle(0x666666, 1); // Main Pillar
    sGfx.fillRect(5, 4, 6, 8);
    sGfx.lineStyle(1, 0x00ffff, 0.8); // Top Ring
    sGfx.strokeCircle(8, 4, 6);
    sGfx.generateTexture('shrine_proc', 16, 16);
  }

  create() {
    this.createProceduralAssets();

    /* ---------------- WORLD & PHYSICS ---------------- */
    this.physics.world.setBounds(0, 0, 360, 1200)

    this.add.text(10, 10, "THE ACCORD OF THE FORSAKEN WORLD", { fontSize: "12px", color: "#ffffff" }).setScrollFactor(0).setDepth(10)
    this.add.text(10, 26, "Chapter 14 Demo v0.2.8", { fontSize: "10px", color: "#888888" }).setScrollFactor(0).setDepth(10)

    /* ---------------- INITIAL FADE IN ---------------- */
    const startFade = this.add.rectangle(180, 320, 360, 640, 0x000000).setScrollFactor(0).setDepth(1000);
    this.tweens.add({ targets: startFade, alpha: 0, duration: 2000 });

    /* ---------------- INTRO ---------------- */
    this.isIntro = true
    const isMobile = !this.sys.game.device.os.desktop;
    const introInstruction = isMobile ? "TAP to toggle Silence.\nDRAG to Move." : "Hold SPACE for Silence.\nARROWS to Move.";

    this.introText = this.add.text(180, 320, `Chapter 14 — The Sieve of Rust\n\n${introInstruction}`, {
        fontSize: "12px", color: "#cccccc", align: "center", wordWrap: { width: 300 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(20)

    /* ---------------- AUDIO ---------------- */
    if(this.cache.audio.exists('bgm')) {
        this.bgm = this.sound.add('bgm', { loop: true, volume: 0 });
        this.endBgm = this.sound.add('endBgm', { loop: false, volume: 0 });
    }

    /* ---------------- TILEMAP ---------------- */
    const width = 23; const height = 75; const data = [];
    for (let y = 0; y < height; y++) {
      const row = []
      for (let x = 0; x < width; x++) {
        let tile = 0 
        if (y >= 65) tile = 1 
        else if (y >= 20 && y < 65) {
          if (x === 8 || x === 14) tile = 3 
          else if (x >= 9 && x <= 13) tile = 2 
          else tile = 0 
        } 
        else if (y < 20) tile = 1 
        row.push(tile)
      }
      data.push(row)
    }

    this.map = this.make.tilemap({ data, tileWidth: 16, tileHeight: 16 })
    const tileset = this.map.addTilesetImage('tiles')
    this.groundLayer = this.map.createLayer(0, tileset, 0, 0)
    this.groundLayer.setCollision([0, 3]) 
    this.groundLayer.forEachTile(tile => { if (tile.index === 2) tile.properties.isRust = true })

    /* ---------------- DECORATION ---------------- */
    for (let i = 0; i < 20; i++) {
        let rx = Phaser.Math.Between(0, 360); let ry = Phaser.Math.Between(250, 1000);
        if (rx < 110 || rx > 250) {
            this.add.image(rx, ry, 'scrap').setAlpha(Phaser.Math.FloatBetween(0.1, 0.4)).setRotation(Phaser.Math.FloatBetween(0, 6)).setDepth(0);
        }
    }

    /* ---------------- SHRINE (HEALING) ---------------- */
    // Positioned at the beginning of the bridge area
    this.shrine = this.add.sprite(180, 1040, 'shrine_proc').setDepth(4);
    
    // Healing Aura Circle (Visual Feedback)
    this.shrineAura = this.add.circle(180, 1040, 45, 0x00ffff, 0.15).setDepth(3);
    this.tweens.add({
        targets: this.shrineAura,
        scale: 1.3,
        alpha: 0.05,
        duration: 2000,
        yoyo: true,
        repeat: -1
    });

    /* ---------------- PLAYER ---------------- */
    this.player = this.physics.add.sprite(180, 1100, 'player_proc').setDepth(5)
    this.player.setCollideWorldBounds(true)
    this.player.body.setSize(10, 10).setOffset(3, 3);
    this.physics.add.collider(this.player, this.groundLayer)

    // Pulsing "Silence" effect (Visual Feedback)
    this.pulseCircle = this.add.circle(0, 0, 24, 0x88ccff, 0.4).setVisible(false);
    this.tweens.add({ targets: this.pulseCircle, scale: 1.6, alpha: 0, duration: 1000, repeat: -1 });

    /* ---------------- HUD & UI ---------------- */
    this.alertSign = this.add.text(0, 0, "!", { fontSize: "24px", color: "#ff0000", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5).setAlpha(0).setDepth(20);
    this.silenceBarBg = this.add.rectangle(180, 620, 200, 10, 0x333333).setScrollFactor(0).setDepth(10)
    this.silenceBar = this.add.rectangle(80, 620, 200, 10, 0x88ccff).setOrigin(0, 0.5).setScrollFactor(0).setDepth(10)
    this.silenceText = this.add.text(10, 600, "Silence", { fontSize: "10px", color: "#88ccff" }).setScrollFactor(0).setDepth(10)
    this.hpText = this.add.text(10, 585, "Vitality", { fontSize: "10px", color: "#ff8888" }).setScrollFactor(0).setDepth(10)
    this.deathText = this.add.text(180, 320, "THE RUST CONSUMED YOU", { fontSize: "20px", color: "#ffffff" }).setOrigin(0.5).setAlpha(0).setScrollFactor(0).setDepth(20)

    /* ---------------- INPUT ---------------- */
    this.cursors = this.input.keyboard.createCursorKeys()
    this.silenceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.inputState = { isDragging: false, dragOrigin: { x: 0, y: 0 }, moveVector: { x: 0, y: 0 }, toggleSilence: false }
    this.input.on('pointerdown', (p) => { this.inputState.dragOrigin = { x: p.x, y: p.y }; });
    this.input.on('pointermove', (p) => {
        if (p.isDown) {
            this.inputState.isDragging = true;
            const angle = Phaser.Math.Angle.Between(this.inputState.dragOrigin.x, this.inputState.dragOrigin.y, p.x, p.y);
            this.inputState.moveVector = this.physics.velocityFromRotation(angle, 1);
        }
    });
    this.input.on('pointerup', () => { 
        if (!this.inputState.isDragging && !this.isIntro) this.inputState.toggleSilence = !this.inputState.toggleSilence;
        this.inputState.isDragging = false; 
    });

    /* ---------------- CAMERA ---------------- */
    this.cameras.main.setBounds(0, 0, 360, 1200); this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    /* ---------------- STATE ---------------- */
    this.isSilent = false; this.hp = 100; this.silence = 100; this.maxSilence = 100;
    this.stepsTaken = 0; this.nextEncounter = Phaser.Math.Between(3000, 6000);
    this.hasEnded = false;
  }

  update(time, delta) {
    if (this.hp <= 0 && !this.isDead) { this.triggerDeath(); return; }

    if (this.isIntro) {
      if ((this.silenceKey.isDown || this.input.activePointer.isDown)) {
        this.isIntro = false; if(this.bgm) { this.bgm.play(); this.tweens.add({ targets: this.bgm, volume: 0.6, duration: 2000 }); }
        this.tweens.add({ targets: this.introText, alpha: 0, duration: 400 });
      } return;
    }
    if (this.isDead || this.hasEnded) return

    const body = this.player.body; 
    this.pulseCircle.setPosition(this.player.x, this.player.y);

    // 1. MOVEMENT
    let speed = 120; body.setVelocity(0);
    if (this.cursors.left.isDown) body.setVelocityX(-speed)
    else if (this.cursors.right.isDown) body.setVelocityX(speed)
    if (this.cursors.up.isDown) body.setVelocityY(-speed)
    else if (this.cursors.down.isDown) body.setVelocityY(speed)
    if (this.inputState.isDragging) { body.setVelocity(this.inputState.moveVector.x * speed, this.inputState.moveVector.y * speed); }

    // 2. SILENCE LOGIC
    const requestSilence = this.silenceKey.isDown || this.inputState.toggleSilence;
    this.isSilent = requestSilence && this.silence > 0
    if (this.isSilent) this.silence -= 18 * delta / 1000; else this.silence += 30 * delta / 1000;
    
    // Encounter Check
    if (body.speed > 0 && !this.isSilent) {
        this.stepsTaken += delta;
        if (this.stepsTaken >= this.nextEncounter) { this.triggerAlert(); this.stepsTaken = 0; this.nextEncounter = Phaser.Math.Between(4000, 8000); }
    }
    this.alertSign.setPosition(this.player.x, this.player.y - 30);

    // 3. RUST / SHRINE LOGIC
    const tile = this.groundLayer.getTileAtWorldXY(this.player.x, this.player.y)
    const distToShrine = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.shrine.x, this.shrine.y);

    if (distToShrine < 45) {
        // HEALING ZONE
        if (this.hp < 100) this.hp += 15 * delta / 1000; // Heal 15 HP/sec
        this.player.setTint(0x00ffff); // Teal tint for healing
        this.pulseCircle.setVisible(false);
    } else if (tile && tile.properties.isRust) {
        // RUST ZONE
        if (this.isSilent) {
            body.velocity.x *= 0.8; body.velocity.y *= 0.8;
            this.pulseCircle.setVisible(true);
            this.player.setTint(0x88ccff); 
        } else {
            this.hp -= 12 * delta / 1000; 
            this.player.setTint(0xff0000);
            this.pulseCircle.setVisible(false);
            if (time % 500 < 50) this.cameras.main.shake(100, 0.002);
        }
    } else {
        // SAFE ZONE
        this.pulseCircle.setVisible(false);
        this.player.clearTint();
    }

    // UI Updates
    this.silence = Phaser.Math.Clamp(this.silence, 0, this.maxSilence);
    this.hp = Phaser.Math.Clamp(this.hp, 0, 100);
    this.silenceBar.width = 200 * (this.silence / this.maxSilence);
    this.hpText.setText(`Vitality: ${Math.ceil(this.hp)}`);

    if (this.player.y < 150 && !this.hasEnded) { this.triggerEnding(); }
  }

  triggerAlert() {
    this.tweens.add({ targets: this.alertSign, alpha: 1, y: this.player.y - 45, duration: 200, yoyo: true, hold: 1000, onComplete: () => { this.alertSign.setAlpha(0); } });
  }

  triggerDeath() {
    this.isDead = true; 
    this.player.body.setVelocity(0);
    this.player.setTint(0x330000); 
    this.cameras.main.fadeOut(1000, 0, 0, 0);
    this.tweens.add({ targets: this.deathText, alpha: 1, duration: 500 });
    this.time.delayedCall(3000, () => { this.scene.restart(); });
  }

  triggerEnding() {
    this.hasEnded = true;
    this.player.body.setVelocity(0);
    if (this.bgm) this.tweens.add({ targets: this.bgm, volume: 0, duration: 1500 });
    const overlay = this.add.rectangle(180, 320, 360, 640, 0x000000).setScrollFactor(0).setDepth(100).setAlpha(0);
    this.tweens.add({
        targets: overlay, alpha: 1, duration: 2000,
        onComplete: () => {
            if (this.bgm) this.bgm.stop();
            if (this.endBgm) { this.endBgm.play(); this.tweens.add({ targets: this.endBgm, volume: 0.6, duration: 2000 }); }
            const creditText = "THE RUST REMEMBERS\n\nYou have crossed the sieve.\n\nThank you for playing the demo.\nChapter 14 [v0.2.8]";
            const credits = this.add.text(180, 280, creditText, { fontSize: "16px", color: "#ffffff", align: "center", wordWrap: { width: 300 } }).setOrigin(0.5).setScrollFactor(0).setDepth(101).setAlpha(0);
            const btnBg = this.add.rectangle(180, 420, 120, 40, 0x333333).setOrigin(0.5).setScrollFactor(0).setDepth(101).setAlpha(0).setInteractive({ useHandCursor: true });
            const btnText = this.add.text(180, 420, "RESTART", { fontSize: "14px", color: "#88ccff" }).setOrigin(0.5).setScrollFactor(0).setDepth(102).setAlpha(0);
            this.tweens.add({ targets: [credits, btnBg, btnText], alpha: 1, duration: 1000 });
            btnBg.on('pointerdown', () => { this.sound.stopAll(); this.scene.restart(); });
        }
    });
  }
}

const config = {
  type: Phaser.AUTO, width: 360, height: 640, backgroundColor: '#111',
  physics: { default: 'arcade', arcade: { debug: false } },
  scene: WorldScene, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
}
new Phaser.Game(config)