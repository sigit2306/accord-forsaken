class WorldScene extends Phaser.Scene {
  constructor() {
    super('WorldScene')
  }

  preload() {
    this.load.image('player', 'assets/player.png')
    this.load.image('shrine', 'assets/shrine.png')
    this.load.image('tiles', 'assets/tiles.png')
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

    /* ---------------- TILEMAP ---------------- */
    const width = 23
    const height = 75
    const data = []

    for (let y = 0; y < height; y++) {
      const row = []
      for (let x = 0; x < width; x++) {
        let tile = 0

        if (y === 18 && x >= 4 && x <= 7) tile = 1
        if (y === 31) tile = 2
        if (y === 50 && x >= 14 && x <= 17) tile = 1

        row.push(tile)
      }
      data.push(row)
    }

    this.map = this.make.tilemap({
      data,
      tileWidth: 16,
      tileHeight: 16
    })

    const tileset = this.map.addTilesetImage('tiles')
    this.groundLayer = this.map.createLayer(0, tileset, 0, 0)

    // Normal collisions
    this.groundLayer.setCollision([1, 2])

    // Tag rust tiles once
    this.groundLayer.forEachTile(tile => {
      if (tile.index === 2) {
        tile.properties.isRust = true
      }
    })

    /* ---------------- PLAYER ---------------- */
    this.player = this.physics.add.sprite(180, 1000, 'player')
    this.player.setCollideWorldBounds(true)

    this.prevX = this.player.x
    this.prevY = this.player.y

    this.physics.add.collider(this.player, this.groundLayer)

    /* ---------------- RESPAWN ---------------- */
    this.respawnPoint = { x: 180, y: 1000 }

    /* ---------------- SHRINE ---------------- */
    this.shrine = this.physics.add.staticSprite(180, 1050, 'shrine')

    this.add.text(140, 1070, "Shrine", {
      fontSize: "10px",
      color: "#66ccff"
    })

    this.physics.add.overlap(this.player, this.shrine, () => {
      this.respawnPoint.x = this.shrine.x
      this.respawnPoint.y = this.shrine.y - 40
    })

    /* ---------------- CAMERA ---------------- */
    this.cameras.main.setBounds(0, 0, 360, 1200)
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08)

    /* ---------------- INPUT ---------------- */
    this.cursors = this.input.keyboard.createCursorKeys()
    this.silenceKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    )

    /* ---------------- STATE ---------------- */
    this.isSilent = false
    this.wasSilent = false
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
  }

  /* ================= UPDATE ================= */

  update(time, delta) {
    if (this.isDead || this.isRespawning) return

    const body = this.player.body
    const speed = 120

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

    /* ---------------- SILENCE ---------------- */
    this.isSilent = this.silenceKey.isDown && this.silence > 0

    if (this.isSilent) this.silence -= 30 * delta / 1000
    else this.silence += 20 * delta / 1000

    if (this.silence <= 0) this.hp -= 20 * delta / 1000

    this.silence = Phaser.Math.Clamp(this.silence, 0, this.maxSilence)
    this.hp = Phaser.Math.Clamp(this.hp, 0, this.maxHp)

    this.silenceBar.width = 200 * (this.silence / this.maxSilence)

    this.silenceText.setText(`Silence: ${Math.ceil(this.silence)}`)
    this.hpText.setText(`Vitality: ${Math.ceil(this.hp)}`)

    /* ---------------- RUST COLLISION TOGGLE ---------------- */
    if (this.isSilent !== this.wasSilent) {
      this.groundLayer.forEachTile(tile => {
        if (tile.properties.isRust) {
          tile.setCollision(!this.isSilent)
        }
      })
      this.wasSilent = this.isSilent
    }

    /* ---------------- RUST DAMAGE / KNOCKBACK ---------------- */
    const tile = this.groundLayer.getTileAtWorldXY(
      this.player.x,
      this.player.y
    )

    if (tile && tile.index === 2 && !this.isSilent && !this.isKnockedback) {
      this.isKnockedback = true
      this.knockbackTimer = 220
      this.hp -= 15

      const power = 260
      body.setVelocity(0, this.prevY < tile.pixelY ? -power : power)

      this.cameras.main.shake(120, 0.01)
    }

    if (this.hp <= 0 && !this.isDead) {
      this.triggerDeath()
    }
  }

  triggerDeath() {
    this.isDead = true
    this.player.body.setVelocity(0)

    this.cameras.main.fadeOut(800, 0, 0, 0)

    this.time.delayedCall(300, () => {
      this.deathText.setAlpha(1)
    })

    this.time.delayedCall(3600, () => {
      this.respawn()
    })
  }

  respawn() {
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
