class WorldScene extends Phaser.Scene {
  constructor() {
    super('WorldScene')
  }

  create() {
    /* ---------------- WORLD ---------------- */
    this.physics.world.setBounds(0, 0, 360, 1200)

    this.add.text(10, 10, "THE ACCORD OF THE FORSAKEN WORLD", {
      fontSize: "12px",
      color: "#ffffff"
    }).setScrollFactor(0)

    /* ---------------- PLAYER ---------------- */
    this.player = this.add.rectangle(180, 1000, 24, 32, 0xffffff)
    this.physics.add.existing(this.player)
    this.player.body.setCollideWorldBounds(true)

    this.prevX = this.player.x
    this.prevY = this.player.y

    /* ---------------- CAMERA ---------------- */
    this.cameras.main.setBounds(0, 0, 360, 1200)
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08)

    /* ---------------- TERRAIN ---------------- */
    this.safeTerrain = this.physics.add.staticGroup()
    this.rustTerrain = this.physics.add.staticGroup()

    const stoneTop = this.add.rectangle(60, 300, 120, 40, 0x555555)
    this.physics.add.existing(stoneTop, true)
    this.safeTerrain.add(stoneTop)

    const stoneBottom = this.add.rectangle(300, 800, 120, 40, 0x555555)
    this.physics.add.existing(stoneBottom, true)
    this.safeTerrain.add(stoneBottom)

    this.rust = this.add.rectangle(180, 500, 360, 80, 0x8b4513)
    this.physics.add.existing(this.rust, true)
    this.rustTerrain.add(this.rust)

    /* ---------------- COLLISION ---------------- */
    this.physics.add.collider(this.player, this.safeTerrain)
    this.rustCollider = this.physics.add.collider(this.player, this.rustTerrain)

    /* ---------------- INPUT ---------------- */
    this.cursors = this.input.keyboard.createCursorKeys()
    this.silenceKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    )

    /* ---------------- STATES ---------------- */
    this.inRust = false
    this.isSilent = false
    this.isKnockedback = false
    this.knockbackTimer = 0

    this.silence = 100
    this.maxSilence = 100

    // NEW: Vitality / exhaustion
    this.hp = 100
    this.maxHp = 100
    this.exhausted = false

    /* ---------------- HUD ---------------- */
    this.silenceBarBg = this.add.rectangle(180, 620, 200, 10, 0x333333)
      .setScrollFactor(0)

    this.silenceBar = this.add.rectangle(80, 620, 200, 10, 0x88ccff)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)

    // NEW: HUD text
    this.silenceText = this.add.text(10, 40, 'Silence: 100', {
      fontSize: '10px',
      color: '#cccccc'
    }).setScrollFactor(0)

    this.hpText = this.add.text(10, 52, 'Vitality: 100', {
      fontSize: '10px',
      color: '#aaaaaa'
    }).setScrollFactor(0)

    // Version stamp (LOCK)
    this.add.text(180, 632, 'Chapter 14 Demo — Rust & Silence', {
      fontSize: '9px',
      color: '#666666'
    }).setOrigin(0.5).setScrollFactor(0)

    /* ---------------- OVERLAP ---------------- */
    this.physics.add.overlap(
      this.player,
      this.rustTerrain,
      this.onRustOverlap,
      null,
      this
    )
  }

  /* ================= RUST ================= */

  onRustOverlap(player, rust) {
    this.inRust = true

    if (!this.isSilent && !this.isKnockedback) {
      this.applyDirectionalKnockback(player, rust)
    }
  }

  applyDirectionalKnockback(player, rust) {
    this.isKnockedback = true
    this.knockbackTimer = 220

    const rustBounds = rust.getBounds()
    const px = this.prevX
    const py = this.prevY

    let vx = 0
    let vy = 0
    const power = 260

    if (py < rustBounds.top) {
      player.y = rustBounds.top - player.height / 2 - 1
      vy = -power
    } else if (py > rustBounds.bottom) {
      player.y = rustBounds.bottom + player.height / 2 + 1
      vy = power
    } else if (px < rustBounds.left) {
      player.x = rustBounds.left - player.width / 2 - 1
      vx = -power
    } else if (px > rustBounds.right) {
      player.x = rustBounds.right + player.width / 2 + 1
      vx = power
    } else {
      vy = power
    }

    player.body.setVelocity(vx, vy)

    this.cameras.main.shake(100, 0.01)
    this.rust.setFillStyle(0xaa5533)
    this.time.delayedCall(120, () => {
      this.rust.setFillStyle(0x8b4513)
    })
  }

  /* ================= UPDATE ================= */

  update(time, delta) {
    const body = this.player.body
    const speed = 120
    this.inRust = false

    this.prevX = this.player.x
    this.prevY = this.player.y

    /* ---------- KNOCKBACK ---------- */
    if (this.isKnockedback) {
      this.knockbackTimer -= delta
      if (this.knockbackTimer <= 0) {
        this.isKnockedback = false
      }
      return
    }

    /* ---------- INPUT ---------- */
    body.setVelocity(0)

    if (this.cursors.left.isDown) body.setVelocityX(-speed)
    else if (this.cursors.right.isDown) body.setVelocityX(speed)

    if (this.cursors.up.isDown) body.setVelocityY(-speed)
    else if (this.cursors.down.isDown) body.setVelocityY(speed)

    /* ---------- SILENCE ---------- */
    this.isSilent = this.silenceKey.isDown && this.silence > 0
    this.rustCollider.active = !this.isSilent

    if (this.isSilent) {
      this.silence -= 30 * (delta / 1000)
    } else {
      this.silence += 20 * (delta / 1000)
    }

    this.silence = Phaser.Math.Clamp(this.silence, 0, this.maxSilence)

    const ratio = this.silence / this.maxSilence
    this.silenceBar.width = 200 * ratio

    /* ---------- EXHAUSTION / DAMAGE ---------- */
    if (this.silence <= 0 && this.inRust) {
      this.exhausted = true
      this.hp -= 10 * (delta / 1000)
      this.cameras.main.shake(40, 0.003)
    } else {
      this.exhausted = false
    }

    this.hp = Phaser.Math.Clamp(this.hp, 0, this.maxHp)

    /* ---------- HUD TEXT UPDATE ---------- */
    this.silenceText.setText(`Silence: ${Math.ceil(this.silence)}`)
    this.hpText.setText(`Vitality: ${Math.ceil(this.hp)}`)

    /* ---------- DISTORTION ---------- */
    if (this.inRust && this.isSilent) {
      this.player.scaleX = 0.9 + Math.sin(time * 0.02) * 0.05
      this.player.scaleY = 1.1
    } else {
      this.player.setScale(1)
    }
  }
}

/* ================= CONFIG ================= */

const config = {
  type: Phaser.AUTO,
  width: 360,
  height: 640,
  backgroundColor: '#111',
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  },
  scene: WorldScene
}

new Phaser.Game(config)
