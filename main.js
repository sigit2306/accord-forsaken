class WorldScene extends Phaser.Scene {
  constructor() {
    super("WorldScene")
  }

  create() {
    this.physics.world.setBounds(0, 0, 360, 1200)

    /* ---------- PLAYER ---------- */
    this.player = this.add.rectangle(180, 1000, 24, 32, 0xffffff)
    this.physics.add.existing(this.player)
    this.player.body.setCollideWorldBounds(true)

    /* ---------- CAMERA ---------- */
    this.cameras.main.setBounds(0, 0, 360, 1200)
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08)

    /* ---------- TERRAIN ---------- */
    this.safeTerrain = this.physics.add.staticGroup()
    this.rustTerrain = this.physics.add.staticGroup()

    const stoneTop = this.add.rectangle(60, 300, 120, 40, 0x555555)
    this.physics.add.existing(stoneTop, true)
    this.safeTerrain.add(stoneTop)

    const rust = this.add.rectangle(180, 500, 360, 80, 0x8b4513)
    this.physics.add.existing(rust, true)
    this.rustTerrain.add(rust)

    /* ---------- INPUT ---------- */
    this.cursors = this.input.keyboard.createCursorKeys()
    this.silenceKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    )

    /* ---------- STATE ---------- */
    this.inRust = false
    this.isSilent = false
    this.isKnockedback = false
    this.knockbackTimer = 0

    /* ---------- SYSTEM INIT ---------- */
    PlayerSystem.init(this)
    RustSystem.init(this)
    SilenceSystem.init(this)
    HUDSystem.init(this)
  }

  update(time, delta) {
    PlayerSystem.update(this, delta)
    RustSystem.update(this, time)
    SilenceSystem.update(this, delta)
    HUDSystem.update(this)
  }
}

/* =========================
   PLAYER SYSTEM
========================= */

const PlayerSystem = {
  init(scene) {
    scene.physics.add.collider(scene.player, scene.safeTerrain)

    scene.rustCollider = scene.physics.add.overlap(
      scene.player,
      scene.rustTerrain,
      (player, rust) => {
        if (scene.isSilent || scene.isKnockedback) return

        scene.isKnockedback = true
        scene.knockbackTimer = 180

        const dx = player.x - rust.x
        const dy = player.y - rust.y
        const power = 260

        if (Math.abs(dx) > Math.abs(dy)) {
          player.body.setVelocityX(Math.sign(dx) * power)
          player.body.setVelocityY(0)
        } else {
          player.body.setVelocityY(Math.sign(dy) * power)
          player.body.setVelocityX(0)
        }

        scene.cameras.main.shake(80, 0.01)
      }
    )
  },

  update(scene, delta) {
    const body = scene.player.body
    const speed = 120

    /* ---------- KNOCKBACK OVERRIDE ---------- */
    if (scene.isKnockedback) {
      scene.knockbackTimer -= delta
      if (scene.knockbackTimer <= 0) {
        scene.isKnockedback = false
      }
      return
    }

    /* ---------- INPUT ---------- */
    body.setVelocity(0)

    if (scene.cursors.left.isDown) body.setVelocityX(-speed)
    if (scene.cursors.right.isDown) body.setVelocityX(speed)
    if (scene.cursors.up.isDown) body.setVelocityY(-speed)
    if (scene.cursors.down.isDown) body.setVelocityY(speed)
  }
}

/* =========================
   RUST SYSTEM
========================= */

const RustSystem = {
  init(scene) {},

  update(scene, time) {
    scene.isSilent = scene.silenceKey.isDown
    scene.inRust = false

    scene.rustTerrain.children.iterate(rust => {
      rust.setFillStyle(scene.isSilent ? 0x3a2414 : 0x8b4513)

      if (
        Phaser.Geom.Intersects.RectangleToRectangle(
          scene.player.getBounds(),
          rust.getBounds()
        )
      ) {
        scene.inRust = true
      }
    })

    /* ---------- DISTORTION ---------- */
    if (scene.inRust && scene.isSilent) {
      scene.player.scaleX =
        0.9 + Math.sin(time * 0.02) * 0.05
      scene.player.scaleY = 1.1
    } else {
      scene.player.setScale(1)
    }
  }
}

/* =========================
   SILENCE SYSTEM
========================= */

const SilenceSystem = {
  init(scene) {
    scene.maxSilence = 100
    scene.silence = 100
    scene.maxHP = 100
    scene.hp = 100
  },

  update(scene, delta) {
    const dt = delta / 1000

    if (scene.isSilent) scene.silence -= 30 * dt
    else scene.silence += 20 * dt

    scene.silence = Phaser.Math.Clamp(
      scene.silence,
      0,
      scene.maxSilence
    )

    if (scene.silence === 0 && scene.inRust) {
      scene.hp -= 20 * dt
      scene.cameras.main.shake(40, 0.004)
    }

    scene.hp = Phaser.Math.Clamp(scene.hp, 0, scene.maxHP)
  }
}

/* =========================
   HUD SYSTEM
========================= */

const HUDSystem = {
  init(scene) {
    scene.add.text(
      10, 10,
      "CHAPTER 14 — LOCKED BUILD",
      { fontSize: "12px", color: "#ffffff" }
    ).setScrollFactor(0)

    scene.silenceBarBg = scene.add.rectangle(
      180, 620, 200, 8, 0x222222
    ).setScrollFactor(0)

    scene.silenceBar = scene.add.rectangle(
      80, 620, 200, 8, 0xcccccc
    ).setOrigin(0, 0.5).setScrollFactor(0)

    scene.silenceText = scene.add.text(
      180, 600, "", { fontSize: "10px", color: "#ccc" }
    ).setOrigin(0.5).setScrollFactor(0)

    scene.hpText = scene.add.text(
      180, 585, "", { fontSize: "10px", color: "#cc8888" }
    ).setOrigin(0.5).setScrollFactor(0)
  },

  update(scene) {
    scene.silenceBar.width =
      200 * (scene.silence / scene.maxSilence)

    scene.silenceText.setText(
      `Silence: ${Math.ceil(scene.silence)}`
    )

    scene.hpText.setText(
      `Vitality: ${Math.ceil(scene.hp)}`
    )
  }
}

/* =========================
   CONFIG
========================= */

new Phaser.Game({
  type: Phaser.AUTO,
  width: 360,
  height: 640,
  backgroundColor: "#111",
  physics: {
    default: "arcade",
    arcade: { debug: false }
  },
  scene: WorldScene
})
