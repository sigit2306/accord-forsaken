class WorldScene extends Phaser.Scene {
  constructor() {
    super('WorldScene')
  }

  preload() {
    this.load.image('tiles', 'assets/tiles.png')
    this.load.image('scrap', 'assets/scrap.png')
    this.load.audio('bgm', 'assets/Chapter-14-adv.mp3')
    this.load.audio('endBgm', 'assets/Chapter-14-end.mp3')
  }

  createProceduralAssets() {
    const pGfx = this.make.graphics({ x: 0, y: 0, add: false });
    pGfx.fillStyle(0x222222, 1); pGfx.fillEllipse(8, 10, 10, 12);
    pGfx.fillStyle(0x000000, 1); pGfx.fillCircle(8, 5, 4);
    pGfx.fillStyle(0x88ccff, 1); pGfx.fillCircle(8, 7, 2);
    pGfx.generateTexture('player_proc', 16, 16);

    const sGfx = this.make.graphics({ x: 0, y: 0, add: false });
    sGfx.fillStyle(0x444444, 1); sGfx.fillRect(2, 12, 12, 4);
    sGfx.fillStyle(0x666666, 1); sGfx.fillRect(5, 4, 6, 8);
    sGfx.lineStyle(1, 0x00ffff, 0.8); sGfx.strokeCircle(8, 4, 6);
    sGfx.generateTexture('shrine_proc', 16, 16);
  }

  create() {
    // 1. HARD RESET: Prevents audio doubling and state freezes on restart
    this.sound.stopAll();
    this.sound.removeAll();
    this.tweens.killAll();
    this.isDead = false;

    this.createProceduralAssets();

    /* ---------------- GLOBAL COUNTER (PATCHED) ---------------- */
    this.globalTravelers = "...";
    const counterURL = "https://api.counterapi.dev/v1/accord_forsaken/global_v029/";
    
    fetch(counterURL, { mode: 'cors' })
        .then(res => res.json())
        .then(data => {
            if (data && data.count) {
                this.globalTravelers = data.count.toLocaleString();
                if (this.counterText) this.counterText.setText(`Previous Souls: ${this.globalTravelers}`);
            }
        })
        .catch(err => { 
            console.warn("Counter Error (Using Offline Mode):", err);
            this.globalTravelers = "0"; 
        });

    /* ---------------- WORLD SETUP ---------------- */
    this.physics.world.setBounds(0, 0, 360, 1200);
    this.add.text(10, 10, "THE ACCORD OF THE FORSAKEN WORLD", { fontSize: "12px", color: "#ffffff" }).setScrollFactor(0).setDepth(10);
    this.add.text(10, 26, "Chapter 14 Demo v0.2.9c", { fontSize: "10px", color: "#888888" }).setScrollFactor(0).setDepth(10);

    const startFade = this.add.rectangle(180, 320, 360, 640, 0x000000).setScrollFactor(0).setDepth(1000);
    this.tweens.add({ targets: startFade, alpha: 0, duration: 2000 });

    /* ---------------- AUDIO ---------------- */
    this.bgm = this.sound.add('bgm', { loop: true, volume: 0 });
    this.endBgm = this.sound.add('endBgm', { loop: false, volume: 0 });

    /* ---------------- MAP & PHYSICS ---------------- */
    const width = 23; const height = 75; const data = [];
    for (let y = 0; y < height; y++) {
      const row = [];
      for (let x = 0; x < width; x++) {
        let tile = 0;
        if (y >= 65) tile = 1;
        else if (y >= 20 && y < 65) {
          if (x === 8 || x === 14) tile = 3;
          else if (x >= 9 && x <= 13) tile = 2;
          else tile = 0;
        } 
        else if (y < 20) tile = 1;
        row.push(tile);
      }
      data.push(row);
    }

    this.map = this.make.tilemap({ data, tileWidth: 16, tileHeight: 16 });
    const tileset = this.map.addTilesetImage('tiles');
    this.groundLayer = this.map.createLayer(0, tileset, 0, 0);
    this.groundLayer.setCollision([0, 3]);
    this.groundLayer.forEachTile(tile => { if (tile.index === 2) tile.properties.isRust = true; });

    this.shrine = this.add.sprite(180, 1040, 'shrine_proc').setDepth(4);
    this.shrineAura = this.add.circle(180, 1040, 45, 0x00ffff, 0.15).setDepth(3);
    this.tweens.add({ targets: this.shrineAura, scale: 1.3, alpha: 0.05, duration: 2000, yoyo: true, repeat: -1 });

    this.player = this.physics.add.sprite(180, 1100, 'player_proc').setDepth(5);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(10, 10).setOffset(3, 3);
    this.physics.add.collider(this.player, this.groundLayer);

    /* ---------------- HUD & UI ---------------- */
    this.hpText = this.add.text(10, 585, "Vitality", { fontSize: "10px", color: "#ff8888" }).setScrollFactor(0).setDepth(10);
    this.silenceText = this.add.text(10, 605, "Silence", { fontSize: "10px", color: "#88ccff" }).setScrollFactor(0).setDepth(10);
    this.silenceBar = this.add.rectangle(80, 620, 200, 10, 0x88ccff).setOrigin(0, 0.5).setScrollFactor(0).setDepth(10);
    this.deathText = this.add.text(180, 320, "THE RUST CONSUMED YOU", { fontSize: "20px", color: "#ffffff" }).setOrigin(0.5).setAlpha(0).setScrollFactor(0).setDepth(20);

    /* ---------------- MOBILE CONTROLS ---------------- */
    this.setupMobileControls();

    /* ---------------- INITIAL STATE ---------------- */
    this.isIntro = true;
    this.hp = 100; this.silence = 100; this.maxSilence = 100;
    this.hasEnded = false;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.silenceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    
    this.setupDifficultyMenu();
    this.cameras.main.setBounds(0, 0, 360, 1200); 
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
  }

  setupMobileControls() {
    // Mobile touch controls for movement
    this.touchMoving = false;
    this.touchX = 0;
    this.touchY = 0;
    
    // Silence button (right side) - TOGGLE MODE
    const silenceBtn = this.add.circle(320, 560, 30, 0x88ccff, 0.3)
      .setScrollFactor(0)
      .setDepth(15)
      .setInteractive();
    
    this.silenceBtnText = this.add.text(320, 560, "S", { fontSize: "20px", color: "#ffffff", fontStyle: "bold" })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(16);

    this.isTouchSilent = false;
    
    // Toggle on/off with single tap
    silenceBtn.on('pointerdown', () => {
      this.isTouchSilent = !this.isTouchSilent;
      if (this.isTouchSilent) {
        silenceBtn.setAlpha(0.6);
        silenceBtn.setFillStyle(0x88ccff, 0.6);
      } else {
        silenceBtn.setAlpha(0.3);
        silenceBtn.setFillStyle(0x88ccff, 0.3);
      }
    });

    // Movement zone (left side of screen)
    const moveZone = this.add.zone(90, 560, 180, 120)
      .setScrollFactor(0)
      .setInteractive();
    
    // Visual indicator for movement zone
    const moveCircle = this.add.circle(90, 560, 40, 0xffffff, 0.1)
      .setScrollFactor(0)
      .setDepth(15);
    
    const moveText = this.add.text(90, 560, "↑↓←→", { fontSize: "16px", color: "#666666" })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(16);

    moveZone.on('pointerdown', (pointer) => {
      this.touchMoving = true;
      this.touchX = pointer.x;
      this.touchY = pointer.y;
    });
    
    moveZone.on('pointermove', (pointer) => {
      if (this.touchMoving) {
        this.touchX = pointer.x;
        this.touchY = pointer.y;
      }
    });
    
    moveZone.on('pointerup', () => {
      this.touchMoving = false;
    });
    
    moveZone.on('pointerout', () => {
      this.touchMoving = false;
    });
    
    // Group all mobile controls and hide during intro
    this.mobileControlsGroup = this.add.container(0, 0).setScrollFactor(0).setDepth(15);
    this.mobileControlsGroup.add([silenceBtn, this.silenceBtnText, moveZone, moveCircle, moveText]);
    this.mobileControlsGroup.setVisible(false);
  }

  setupDifficultyMenu() {
    const menuBg = this.add.rectangle(180, 320, 360, 640, 0x000000, 0.85)
      .setScrollFactor(0)
      .setDepth(200);
    
    const title = this.add.text(180, 200, "SELECT YOUR ACCORD", { 
      fontSize: "18px", 
      color: "#ffffff", 
      fontStyle: "bold" 
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
    
    const hint = this.add.text(180, 470, "Click or press ENTER to start", { 
      fontSize: "10px", 
      color: "#666666" 
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
    
    this.counterText = this.add.text(180, 500, `Previous Souls: ${this.globalTravelers}`, { 
      fontSize: "11px", 
      color: "#bbbbbb", 
      fontStyle: "italic" 
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
    
    this.previewBox = this.add.text(180, 405, "", { 
      fontSize: "11px", 
      color: "#88ccff", 
      align: "center", 
      wordWrap: { width: 260 } 
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    const options = [
        { label: 'THE CROSSING (EASY)', locked: false, desc: "Traverse the bridge through silence.\nRecommended for first-time explorers." },
        { label: 'THE STORM (NORMAL)', locked: true, desc: "[LOCKED]\nUnlocks Rust Storms and falling debris." },
        { label: 'THE HUNTED (HARD)', locked: true, desc: "[LOCKED]\nUnlocks The Stalker and Combat system." }
    ];

    this.menuButtons = [];
    this.menuElements = [menuBg, title, hint, this.counterText, this.previewBox];
    this.selectedMenuIndex = 0;

    options.forEach((opt, index) => {
        const yPos = 280 + (index * 45);
        const color = opt.locked ? "#444444" : "#ffffff";
        
        const btnBg = this.add.rectangle(180, yPos, 220, 35, 0x222222, 0.8)
          .setScrollFactor(0)
          .setDepth(201);
        
        const btnText = this.add.text(180, yPos, opt.label, { 
          fontSize: "12px", 
          color: color 
        }).setOrigin(0.5).setScrollFactor(0).setDepth(202);
        
        this.menuButtons.push({ bg: btnBg, text: btnText, locked: opt.locked, desc: opt.desc });
        this.menuElements.push(btnBg, btnText);
        
        if (!opt.locked) {
            btnBg.setInteractive({ useHandCursor: true });
            btnBg.on('pointerover', () => { 
                this.selectedMenuIndex = index; 
                this.updateMenuSelection(); 
            });
            btnBg.on('pointerdown', () => { 
                this.startGame(); 
            });
        }
    });

    this.updateMenuSelection();
  }

  updateMenuSelection() {
    this.menuButtons.forEach(btn => btn.bg.setStrokeStyle(0));
    const current = this.menuButtons[this.selectedMenuIndex];
    if (!current.locked) {
      current.bg.setStrokeStyle(2, 0x88ccff);
      this.previewBox.setText(current.desc).setColor("#88ccff");
    }
  }

  startGame() {
    if (!this.isIntro) return;
    this.isIntro = false;

    fetch('https://api.counterapi.dev/v1/accord_forsaken/global_v029/up/', { mode: 'cors' })
        .catch(() => {});
    
    if(this.bgm) {
        this.bgm.play();
        this.tweens.add({ targets: this.bgm, volume: 0.6, duration: 2000 });
    }
    
    // Fade out all menu elements
    this.tweens.add({ 
      targets: this.menuElements, 
      alpha: 0, 
      duration: 500, 
      onComplete: () => {
        this.menuElements.forEach(el => el.destroy());
        this.menuElements = [];
        this.menuButtons = [];
      }
    });
    
    // Show mobile controls
    this.mobileControlsGroup.setVisible(true);
  }

  update(time, delta) {
    if (this.hp <= 0 && !this.isDead) { this.triggerDeath(); return; }
    
    if (this.isIntro) {
      if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
        this.selectedMenuIndex = (this.selectedMenuIndex - 1 + this.menuButtons.length) % this.menuButtons.length;
        while(this.menuButtons[this.selectedMenuIndex].locked) { 
          this.selectedMenuIndex = (this.selectedMenuIndex - 1 + this.menuButtons.length) % this.menuButtons.length; 
        }
        this.updateMenuSelection();
      } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
        this.selectedMenuIndex = (this.selectedMenuIndex + 1) % this.menuButtons.length;
        while(this.menuButtons[this.selectedMenuIndex].locked) { 
          this.selectedMenuIndex = (this.selectedMenuIndex + 1) % this.menuButtons.length; 
        }
        this.updateMenuSelection();
      } else if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
        this.startGame();
      }
      return;
    }
    
    if (this.isDead || this.hasEnded) return;
    
    const body = this.player.body; 

    let speed = 120; 
    body.setVelocity(0);
    
    // Keyboard controls
    if (this.cursors.left.isDown) body.setVelocityX(-speed);
    else if (this.cursors.right.isDown) body.setVelocityX(speed);
    if (this.cursors.up.isDown) body.setVelocityY(-speed);
    else if (this.cursors.down.isDown) body.setVelocityY(speed);

    // Mobile touch controls
    if (this.touchMoving) {
      const dx = this.touchX - 90; // 90 is the center of the movement zone
      const dy = this.touchY - 560;
      
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        const angle = Math.atan2(dy, dx);
        body.setVelocityX(Math.cos(angle) * speed);
        body.setVelocityY(Math.sin(angle) * speed);
      }
    }

    // Silence mechanic (keyboard OR touch)
    this.isSilent = (this.silenceKey.isDown || this.isTouchSilent) && this.silence > 0;
    if (this.isSilent) this.silence -= 18 * delta / 1000; else this.silence += 30 * delta / 1000;
    
    const tile = this.groundLayer.getTileAtWorldXY(this.player.x, this.player.y);
    const distToShrine = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.shrine.x, this.shrine.y);

    if (distToShrine < 45) {
        if (this.hp < 100) this.hp += 15 * delta / 1000;
        this.player.setTint(0x00ffff);
    } else if (tile && tile.properties.isRust) {
        if (this.isSilent) {
            body.velocity.x *= 0.8; body.velocity.y *= 0.8;
            this.player.setTint(0x88ccff); 
        } else {
            this.hp -= 12 * delta / 1000; 
            this.player.setTint(0xff0000);
            if (time % 500 < 50) this.cameras.main.shake(100, 0.002);
        }
    } else {
        this.player.clearTint();
    }

    this.silence = Phaser.Math.Clamp(this.silence, 0, this.maxSilence);
    this.hp = Phaser.Math.Clamp(this.hp, 0, 100);
    this.silenceBar.width = 200 * (this.silence / this.maxSilence);
    this.hpText.setText(`Vitality: ${Math.ceil(this.hp)}`);

    if (this.player.y < 150 && !this.hasEnded) { this.triggerEnding(); }
  }

  triggerDeath() {
    this.isDead = true; 
    this.player.body.setVelocity(0);
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
            const creditText = "THE RUST REMEMBERS\n\nYou have crossed the sieve.\n\nThank you for playing the demo.\nChapter 14 [v0.2.9] by 3go\nMusic Copyright/Attribution:\nIn game music: Jan125\nCredit page: RandomMind";
            this.add.text(180, 280, creditText, { fontSize: "16px", color: "#ffffff", align: "center", wordWrap: { width: 300 } }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
            const btnBg = this.add.rectangle(180, 420, 120, 40, 0x333333).setOrigin(0.5).setScrollFactor(0).setDepth(101).setInteractive({ useHandCursor: true });
            this.add.text(180, 420, "RESTART", { fontSize: "14px", color: "#88ccff" }).setOrigin(0.5).setScrollFactor(0).setDepth(102);
            btnBg.on('pointerdown', () => { this.scene.restart(); });
        }
    });
  }
}

const config = {
  type: Phaser.AUTO, width: 360, height: 640, backgroundColor: '#111',
  physics: { default: 'arcade', arcade: { debug: false } },
  scene: WorldScene, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
}
new Phaser.Game(config);