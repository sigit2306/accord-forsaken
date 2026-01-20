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

    this.add.text(10, 26, "Chapter 14 Demo v0.1.1", {
      fontSize: "10px",
      color: "#888888"
    }).setScrollFactor(0)

    /* ---------------- PLAYER ---------------- */
    this.player = this.add.rectangle(180, 1000, 24, 32, 0xffffff)
    this.physics.add.existing(this.player)
    this.player.body.setCollideWorldBounds(true)

    this.prevX = this.player.x
    this.prevY = this.player.y

    /* ---------------- RESPAWN ---------------- */
    this.respawnPoint = { x: 180, y: 1000 }

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

    /* ---------------- SHRINE ---------------- */
    this.shrine = this.add.rectangle(180, 1050, 28, 28, 0x66ccff)
    this.physics.add.existing(this.shrine, true)

    this.add.text(140, 1070, "Shrine", {
      fontSize: "10px",
      color: "#66ccff"
    })

    /* ---------------- COLLISION ---------------- */
    this.physics.add.collider(this.player, this.safeTerrain)
    this.rustCollider = this.physics.add.collider(this.player, this.rustTerrain)

    this.physics.add.overlap(this.player, this.shrine, () => {
      this.respawnPoint.x = this.shrine.x
      this.respawnPoint.y = this.shrine.y - 40
    })

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
    this.isDead = false
    this.isRespawning = false

    this.silence = 100
    this.maxSilence = 100

    this.hp = 100
    this.maxHp = 100

    /* ---------------- HUD ---------------- */
    this.silenceBarBg = this.add.rectangle(180, 620, 200, 10, 0x333333)
      .setScrollFactor(0)

    this.silenceBar = this.add.rectangle(80, 620, 200, 10, 0x88ccff)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)

    this.silenceText = this.add.text(10, 600, "", {
      fontSize: "10px",
      color: "#88ccff"
    }).setScrollFactor(0)

    this.hpText = this.add.text(10, 585, "", {
      fontSize: "10px",
      color: "#ff8888"
    }).setScrollFactor(0)

    /* ---------------- DEATH UI ---------------- */
    this.deathText = this.add.text(180, 320, "YOU FELL SILENT", {
      fontSize: "20px",
      color: "#ffffff"
    }).setOrigin(0.5).setAlpha(0)

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

    if (!this.isSilent && !this.isKnockedback && !this.isDead) {
      this.applyDirectionalKnockback(player, rust)
      this.hp -= 15
    }
  }

  applyDirectionalKnockback(player, rust) {
    this.isKnockedback = true
    this.knockbackTimer = 220

    const bounds = rust.getBounds()
    const power = 260
    let vx = 0, vy = 0

    if (this.prevY < bounds.top) vy = -power
    else if (this.prevY > bounds.bottom) vy = power
    else if (this.prevX < bounds.left) vx = -power
    else if (this.prevX > bounds.right) vx = power
    else vy = power

    player.body.setVelocity(vx, vy)
    this.cameras.main.shake(120, 0.01)
  }

  /* ================= DEATH / RESPAWN ================= */

  triggerDeath() {
    if (this.isDead) return
    this.enterDeath()
  }

  enterDeath() {
    this.isDead = true
    this.player.body.setVelocity(0)

    this.cameras.main.fadeOut(800, 0, 0, 0)

    this.time.delayedCall(300, () => {
      this.deathText.setAlpha(1)
    })

    this.time.delayedCall(3600, () => {
      this.enterRespawn()
    })
  }

  enterRespawn() {
    this.isRespawning = true
    this.deathText.setAlpha(0)

    this.player.setPosition(this.respawnPoint.x, this.respawnPoint.y)
    this.hp = this.maxHp
    this.silence = this.maxSilence * 0.5

    this.cameras.main.fadeIn(800, 0, 0, 0)

    this.time.delayedCall(600, () => {
      this.isDead = false
      this.isRespawning = false
    })
  }

  /* ================= UPDATE ================= */

  update(time, delta) {
    if (this.isDead || this.isRespawning) return

    const body = this.player.body
    const speed = 120
    this.inRust = false

    this.prevX = this.player.x
    this.prevY = this.player.y

    if (this.isKnockedback) {
      this.knockbackTimer -= delta
      if (this.knockbackTimer <= 0) this.isKnockedback = false
      return
    }

    body.setVelocity(0)

    if (this.cursors.left.isDown) body.setVelocityX(-speed)
    else if (this.cursors.right.isDown) body.setVelocityX(speed)

    if (this.cursors.up.isDown) body.setVelocityY(-speed)
    else if (this.cursors.down.isDown) body.setVelocityY(speed)

    this.isSilent = this.silenceKey.isDown && this.silence > 0
    this.rustCollider.active = !this.isSilent

    if (this.isSilent) this.silence -= 30 * (delta / 1000)
    else this.silence += 20 * (delta / 1000)

    if (this.silence <= 0) this.hp -= 20 * (delta / 1000)

    this.silence = Phaser.Math.Clamp(this.silence, 0, this.maxSilence)
    this.hp = Phaser.Math.Clamp(this.hp, 0, this.maxHp)

    this.silenceBar.width = 200 * (this.silence / this.maxSilence)

    this.silenceText.setText(`Silence: ${Math.ceil(this.silence)}`)
    this.hpText.setText(`Vitality: ${Math.ceil(this.hp)}`)

    if (this.inRust && this.isSilent) {
      this.player.scaleX = 0.9 + Math.sin(time * 0.02) * 0.05
      this.player.scaleY = 1.1
    } else {
      this.player.setScale(1)
    }

    if (this.hp <= 0) {
      this.triggerDeath()
    }
  }
}

/* ---------------- CONFIG ---------------- */

const config = {
  type: Phaser.AUTO,
  width: 360,
  height: 640,
  backgroundColor: '#111',
  physics: {
    default: 'arcade',
    arcade: { debug: false }
  },
  scene: WorldScene
}

new Phaser.Game(config)
