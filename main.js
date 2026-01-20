class WorldScene extends Phaser.Scene {
  constructor() {
    super('WorldScene')
  }

  create() {

    // WORLD SIZE
    this.physics.world.setBounds(0, 0, 360, 1200)

    this.add.text(10, 10, "THE ACCORD OF THE FORSAKEN WORLD", {
      fontSize: "12px",
      color: "#ffffff"
    }).setScrollFactor(0)

    // PLAYER (CREATE FIRST)
    this.player = this.add.rectangle(180, 1000, 24, 32, 0xffffff)
    this.physics.add.existing(this.player)
    this.player.body.setCollideWorldBounds(true)

    // CAMERA
    this.cameras.main.setBounds(0, 0, 360, 1200)
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08)

    // TERRAIN GROUPS
    this.safeTerrain = this.physics.add.staticGroup()
    this.rustTerrain = this.physics.add.staticGroup()

    // SAFE STONE (LEDGES - NOT FULL WIDTH)
    const stoneTop = this.add.rectangle(60, 300, 120, 40, 0x555555)
    this.physics.add.existing(stoneTop, true)
    this.safeTerrain.add(stoneTop)

    const stoneBottom = this.add.rectangle(300, 800, 120, 40, 0x555555)
    this.physics.add.existing(stoneBottom, true)
    this.safeTerrain.add(stoneBottom)

    // RUST (SILENCE GATE)
    const rust = this.add.rectangle(180, 500, 360, 80, 0x8b4513)
    this.physics.add.existing(rust, true)
    this.rustTerrain.add(rust)

    // COLLISIONS (AFTER EVERYTHING EXISTS)
    this.physics.add.collider(this.player, this.safeTerrain)
    
    this.rustCollider = this.physics.add.collider(
      this.player, 
      this.rustTerrain
    )

    // INPUT
    this.cursors = this.input.keyboard.createCursorKeys()

    this.silenceKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    )

    this.isSilent = false

    // DEBUG HEIGHT MARKERS
    for (let y = 0; y <= 1200; y += 200) {
      const marker = this.add.rectangle(180, y, 360, 1, 0x333333)
      marker.setOrigin(0.5, 0)
    }

  }

  update() {
    const speed = 120
    const body = this.player.body

    body.setVelocity(0)

    if (this.cursors.left.isDown) {
      body.setVelocityX(-speed)
    } else if (this.cursors.right.isDown) {
      body.setVelocityX(speed)
    }

    if (this.cursors.up.isDown) {
      body.setVelocityY(-speed)
    } else if (this.cursors.down.isDown) {
      body.setVelocityY(speed)
    }

    // UPDATE SILENCE
    this.isSilent = this.silenceKey.isDown
    this.rustCollider.active = !this.isSilent
    // RUST COLOR FEEDACK
    this.rustTerrain.children.iterate(rust => {
      rust.setFillStyle(this.isSilent ? 0x3a2414 : 0x8b4513)
    })
  }
}

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
