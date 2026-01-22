class WorldScene extends Phaser.Scene {
  constructor() {
    super('WorldScene')
  }

  preload() {
    // Placeholder assets - ensure these paths are correct in your project
    this.load.image('player', 'assets/player.png')
    this.load.image('shrine', 'assets/shrine.png')
    this.load.image('tiles', 'assets/tiles.png')

    this.load.audio('bgm', 'assets/Chapter-14-adv.mp3')
    this.load.audio('endBgm', 'assets/Chapter-14-end.mp3')
  }

  create() {
    /* ---------------- WORLD ---------------- */
    this.physics.world.setBounds(0, 0, 360, 1200)

    this.add.text(10, 10, "THE ACCORD OF THE FORSAKEN WORLD", {
      fontSize: "12px",
      color: "#ffffff"
    }).setScrollFactor(0).setDepth(10)

    this.add.text(10, 26, "Chapter 14 Demo v0.2.1", {
      fontSize: "10px",
      color: "#888888"
    }).setScrollFactor(0).setDepth(10)

    /* ---------------- INTRO ---------------- */
    this.isIntro = true
    this.introDismissed = false

    const isMobile = !this.sys.game.device.os.desktop;
    const introInstruction = isMobile 
      ? "TAP to toggle Silence.\nDRAG to Move." 
      : "Hold SPACE for Silence.\nARROWS to Move.";

    this.introText = this.add.text(180, 320,
      `Chapter 14 — The Rust That Remembers\n\nThe bridge does not collapse.\nIt waits.\n\n${introInstruction}`, {
        fontSize: "12px",
        color: "#cccccc",
        align: "center",
        wordWrap: { width: 300 }
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(20)

    /* ---------------- AUDIO ---------------- */
    if(this.cache.audio.exists('bgm')) {
        this.bgm = this.sound.add('bgm', { loop: true, volume: 0 });
        this.endBgm = this.sound.add('endBgm', { loop: false, volume: 0 });
    }

    /* ---------------- TILEMAP ---------------- */
    const width = 23
    const height = 75
    const data = []

    for (let y = 0; y < height; y++) {
      const row = []
      for (let x = 0; x < width; x++) {
        let tile = 0
        if (y === 18 && x >= 4 && x <= 7) tile = 1
        if (y >= 25 && y <= 40) tile = 2
        if (y === 50 && x >= 14 && x <= 17) tile = 1
        row.push(tile)
      }
      data.push(row)
    }

    this.map = this.make.tilemap({ data, tileWidth: 16, tileHeight: 16 })
    const tileset = this.map.addTilesetImage('tiles')
    this.groundLayer = this.map.createLayer(0, tileset, 0, 0)
    
    // Collide only with Walls (1). Rust (2) handled manually in update.
    this.groundLayer.setCollision([1]) 

    this.groundLayer.forEachTile(tile => {
      if (tile.index === 2) tile.properties.isRust = true
    })

    /* ---------------- PLAYER ---------------- */
    this.player = this.physics.add.sprite(180, 1000, 'player').setDepth(5)
    this.player.setCollideWorldBounds(true)
    this.physics.add.collider(this.player, this.groundLayer)

    this.respawnPoint = { x: 180, y: 1000 }

    // PULSATING INDICATOR
    this.pulseCircle = this.add.circle(0, 0, 24, 0x88ccff, 0.4).setVisible(false);
    this.tweens.add({
        targets: this.pulseCircle,
        scale: 1.6,
        alpha: 0,
        duration: 1000,
        repeat: -1
    });

    /* ---------------- SHRINE ---------------- */
    this.shrine = this.physics.add.staticSprite(180, 1050, 'shrine')
    this.physics.add.overlap(this.player, this.shrine, () => {
      this.respawnPoint.x = this.shrine.x
      this.respawnPoint.y = this.shrine.y - 40
    })

    /* ---------------- CAMERA ---------------- */
    this.cameras.main.setBounds(0, 0, 360, 1200)
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08)

    /* ---------------- INPUT ---------------- */
    this.cursors = this.input.keyboard.createCursorKeys()
    this.silenceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

    this.inputState = {
        isDragging: false,
        dragOrigin: { x: 0, y: 0 },
        moveVector: { x: 0, y: 0 },
        toggleSilence: false 
    }

    this.input.on('pointerdown', (pointer) => {
        this.inputState.dragOrigin = { x: pointer.x, y: pointer.y };
        this.inputState.isDragging = false; 
    });

    this.input.on('pointermove', (pointer) => {
        if (pointer.isDown) {
            const dist = Phaser.Math.Distance.Between(this.inputState.dragOrigin.x, this.inputState.dragOrigin.y, pointer.x, pointer.y);
            if (dist > 10) {
                this.inputState.isDragging = true;
                const angle = Phaser.Math.Angle.Between(this.inputState.dragOrigin.x, this.inputState.dragOrigin.y, pointer.x, pointer.y);
                this.inputState.moveVector = this.physics.velocityFromRotation(angle, 1); 
            }
        }
    });

    this.input.on('pointerup', () => {
        if (!this.inputState.isDragging && !this.isIntro) this.inputState.toggleSilence = !this.inputState.toggleSilence;
        this.inputState.isDragging = false;
        this.inputState.moveVector = { x: 0, y: 0 };
    });

    /* ---------------- STATE ---------------- */
    this.isSilent = false
    this.isKnockedback = false
    this.knockbackTimer = 0
    this.isDead = false
    this.isRespawning = false
    this.hasEnded = false
    this.currentDimmedTile = null

    this.silence = 100
    this.maxSilence = 100
    this.hp = 100
    this.maxHp = 100

    /* ---------------- HUD ---------------- */
    this.silenceBarBg = this.add.rectangle(180, 620, 200, 10, 0x333333).setScrollFactor(0).setDepth(10)
    this.silenceBar = this.add.rectangle(80, 620, 200, 10, 0x88ccff).setOrigin(0, 0.5).setScrollFactor(0).setDepth(10)
    this.silenceText = this.add.text(10, 600, "", { fontSize: "10px", color: "#88ccff" }).setScrollFactor(0).setDepth(10)
    this.hpText = this.add.text(10, 585, "", { fontSize: "10px", color: "#ff8888" }).setScrollFactor(0).setDepth(10)

    this.deathText = this.add.text(180, 320, "YOU FELL SILENT", { fontSize: "20px", color: "#ffffff" }).setOrigin(0.5).setAlpha(0).setScrollFactor(0).setDepth(20)
  }

  update(time, delta) {
    if (this.isIntro) {
      if ((this.silenceKey.isDown || this.input.activePointer.isDown) && !this.introDismissed) {
        this.introDismissed = true
        if(this.bgm) { this.bgm.play(); this.tweens.add({ targets: this.bgm, volume: 0.6, duration: 2000 }); }
        this.tweens.add({ targets: this.introText, alpha: 0, duration: 600, onComplete: () => { this.introText.destroy(); this.isIntro = false; }});
      }
      return
    }

    if (this.isDead || this.isRespawning || this.hasEnded) return

    const body = this.player.body
    this.pulseCircle.setPosition(this.player.x, this.player.y);

    if (this.isKnockedback) {
      this.knockbackTimer -= delta
      if (this.knockbackTimer <= 0) { this.isKnockedback = false; this.player.setTint(0xffffff); }
      return 
    }

    let speed = 120
    body.setVelocity(0)

    // Keyboard/Mobile Move
    if (this.cursors.left.isDown) body.setVelocityX(-speed)
    else if (this.cursors.right.isDown) body.setVelocityX(speed)
    if (this.cursors.up.isDown) body.setVelocityY(-speed)
    else if (this.cursors.down.isDown) body.setVelocityY(speed)
    if (this.inputState.isDragging) {
        body.setVelocityX(this.inputState.moveVector.x * speed);
        body.setVelocityY(this.inputState.moveVector.y * speed);
    }

    // Silence logic
    const requestSilence = this.silenceKey.isDown || this.inputState.toggleSilence;
    this.isSilent = requestSilence && this.silence > 0
    if (this.isSilent) this.silence -= 30 * delta / 1000
    else this.silence += 20 * delta / 1000

    if (this.silence <= 0 && requestSilence) {
        this.hp -= 20 * delta / 1000
        this.isSilent = false;
        this.inputState.toggleSilence = false;
    }

    this.silence = Phaser.Math.Clamp(this.silence, 0, this.maxSilence)
    this.hp = Phaser.Math.Clamp(this.hp, 0, this.maxHp)
    this.silenceBar.width = 200 * (this.silence / this.maxSilence)
    this.silenceText.setText(`Silence: ${Math.ceil(this.silence)}`)
    this.hpText.setText(`Vitality: ${Math.ceil(this.hp)}`)

    // Rust Logic
    const tile = this.groundLayer.getTileAtWorldXY(this.player.x, this.player.y)
    if (this.currentDimmedTile && this.currentDimmedTile !== tile) {
        this.currentDimmedTile.alpha = 1;
        this.currentDimmedTile = null;
    }

    if (tile && tile.properties.isRust) {
        if (this.isSilent) {
            body.velocity.x *= 0.8; // User adjusted speed
            body.velocity.y *= 0.8;
            tile.alpha = 0.5;
            this.currentDimmedTile = tile;
            this.pulseCircle.setVisible(true);
        } else if (!this.isKnockedback) {
            this.isKnockedback = true
            this.knockbackTimer = 220
            this.hp -= 15
            const angle = Phaser.Math.Angle.Between(tile.getCenterX(), tile.getCenterY(), this.player.x, this.player.y);
            const vector = this.physics.velocityFromRotation(angle, 260); 
            body.setVelocity(vector.x, vector.y);
            this.player.setTint(0xff0000);
            this.cameras.main.shake(120, 0.01);
            this.inputState.toggleSilence = false;
        }
    } else {
        this.pulseCircle.setVisible(false);
    }

    if (this.hp <= 0 && !this.isDead) this.triggerDeath()
    if (this.player.y < 50) this.triggerEnding()
  }

  triggerEnding() {
    this.hasEnded = true
    this.player.body.setVelocity(0)
    if (this.bgm) this.tweens.add({ targets: this.bgm, volume: 0, duration: 1500 })

    const curtain = this.add.rectangle(0, 0, 360, 640, 0x000000)
      .setOrigin(0).setScrollFactor(0).setDepth(100).setAlpha(0)

    this.tweens.add({
      targets: curtain,
      alpha: 1,
      duration: 2000,
      onComplete: () => {
        if (this.bgm) this.bgm.stop()
        if (this.endBgm) {
          this.endBgm.play()
          this.tweens.add({ targets: this.endBgm, volume: 0.6, duration: 2000 })
        }
        this.add.text(180, 320, "THE RUST REMEMBERS\n\nCreated by [Your Name]\nPhaser 3 Engine", {
            fontSize: "14px", color: "#ffffff", align: "center"
        }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
      }
    })
  }

  triggerDeath() {
    this.isDead = true
    this.player.body.setVelocity(0)
    this.player.setTint(0xffffff)
    this.pulseCircle.setVisible(false)
    this.inputState.toggleSilence = false
    this.cameras.main.fadeOut(800, 0, 0, 0)
    this.time.delayedCall(300, () => this.deathText.setAlpha(1))
    this.time.delayedCall(3600, () => this.respawn())
  }

  respawn() {
    this.isRespawning = true
    this.deathText.setAlpha(0)
    this.player.setPosition(this.respawnPoint.x, this.respawnPoint.y)
    this.hp = this.maxHp
    this.silence = this.maxSilence * 0.5
    this.cameras.main.fadeIn(800, 0, 0, 0)
    if(this.bgm) this.tweens.add({ targets: this.bgm, volume: 0.6, duration: 1500 })
    this.time.delayedCall(600, () => { this.isDead = false; this.isRespawning = false; })
  }
}

const config = {
  type: Phaser.AUTO,
  width: 360,
  height: 640,
  backgroundColor: '#111',
  physics: { default: 'arcade', arcade: { debug: false } },
  scene: WorldScene,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
}

new Phaser.Game(config)