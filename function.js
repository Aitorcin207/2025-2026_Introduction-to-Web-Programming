    // This creates the characteristics of the place the game is going to take place
    const configuration = {
      type: Phaser.AUTO,
      width: 900,
      height: 650,
      parent: 'gameContainer',
      physics: { default: 'arcade', arcade: { debug: false } },
      scene: { preload, create, update }
    };
    // Some global constants that are going to work throug all the game
    let player, cursors, bullets, enemies, extraEnemy;
    // The initial score when you start the game
    let score = 0, scoreText;
    // This allow you to shoot(for the cooldown)
    let canShoot = true;
    let enemyVelocity = 50;
    let movingRight = true;

    // This will let you restart the game when ever you like
    let rButton;
    let restartButton = null;
    let gameBeenStarted = false;
    // Initiates the game characteristics
    const game = new Phaser.Game(configuration);
    // This function load all the images and songs you can hear over the game
    function preload() {
      this.load.image('irradiado', 'assets/irradiado.webp');
      this.load.image('bonus', 'assets/nukalurk.webp');
      this.load.image('mirelurk', 'assets/Mirelurk.webp');
      this.load.image('mutaracha', 'assets/mutaracha.webp');
      this.load.image('background', 'assets/NEW_VEGAS.PNG')
      this.load.image('player', 'assets/servo.png');
      this.load.audio('explosion', 'assets/cartoon-splat-310479.mp3');
      this.load.image('reina_mirelurk', 'assets/reina-mirelurk.webp')
      this.load.audio('song', 'assets/Emi Meyer - For Whom the Bell Tolls (From Blue Eye Samurai).mp3');
      this.load.image('sanginario', 'assets/sanginario.webp');
      this.load.audio('shoot', 'assets/laser-312360.mp3');
      this.load.audio('endsong', 'assets/I Dont Want To Set The World On Fire-The Ink Spots.mp3')
    }
    // This function will be the one containing practically all the game functionalities
    function create() {
      // This puts the image of the background
      this.add.image(450, 325, 'background').setDisplaySize(900, 650);

      // This starts the music when you touch any button after reading the controls
      this.backgroundMusic = this.sound.add('song', { loop: true, volume: 0.3 });

      // This make the bullets that you have to use to kill the enemies work
      bullets = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, runChildUpdate: true });

      // This starts the player you control(its image to know where is it)
      player = this.physics.add.sprite(450, 600, 'player').setScale(0.1);
      player.setCollideWorldBounds(true);

      // This put the start formation of enemies and their positions
      enemies = this.physics.add.group();
      const enemyTypes = ['sanginario', 'mirelurk', 'irradiado', 'mutaracha', 'reina_mirelurk'];
      let startX = 130, startY = 80;
      // number of enemies and their places
      let cols = 8, rows = 4;
      // The functionalities of the enemies and how the game understand if they are alive or not
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const type = enemyTypes[(r * cols + c) % enemyTypes.length];
          const x = startX + c * 90;
          const y = startY + r * 70;
          const enemy = enemies.create(x, y, type).setScale(0.07);
          enemy.setData('alive', true);
        }
      }

      // The extra enemy that appear(every X time) in the upper part of the game and
      // if you hit it gives you bonus points for the game each time you hit it
      extraEnemy = this.physics.add.sprite(-100, 100, 'bonus').setScale(0.05).setVisible(false);

      // The position of the score in the game
      scoreText = this.add.text(20, 20, '0 pts', { fontSize: '24px', fill: '#fff' });

      // The input to make the shoot work
      cursors = this.input.keyboard.createCursorKeys();
      this.input.keyboard.on('keydown-SPACE', () => shoot_gun.call(this));

      // The imput to restart the game pressing the R button if you want
      rButton = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

      // The collisions that make posible to eliminate the enemies
      this.physics.add.overlap(bullets, enemies, hit_enemy, null, this);
      this.physics.add.overlap(bullets, extraEnemy, hit_bonus_enemy, null, this);

      // This is necesary to make the bullet appear(and with that work)
      this.textures.generate('bullet', {
        data: [
          '.....8.....',
          '.....8.....',
          '.....8.....',
          '.....8.....',
          '.....8.....',
        ],
        pixelWidth: 2,
        palette: { '8': '#ffff00' }
      });

      // Timer for how much it takes for the extra enemy to appear and appear again each time
      this.time.addEvent({
        delay: Phaser.Math.Between(15000, 30000),
        loop: true,
        callback: () => {
          extraEnemy.setVisible(true);
          extraEnemy.x = 0;
          extraEnemy.setVelocityX(150);
        }
      });

      // Showing the controls tutorial before starting playing the game
      const tutorial = this.add.text(450, 200,
        'CONTROLS:\n\n>RIGHT and LEFT ARROWS to move \n>SPACEBAR to shoot(2s cooldown)\n>R to restart again\n\n>Pulse ANYTHING to start playing',
        {
          fontSize: '22px',
          color: '#00FF00',
          backgroundColor: '#000000',
          padding: { x: 20, y: 20 },
          align: 'center'
        }
      ).setOrigin(0.5).setDepth(10);

      // This is to stop the game functions before the game start to let you read the instructions
      this.physics.pause();

      // When you touch any key in the keyboard the game will start
      this.input.keyboard.once('keydown', () => {
        tutorial.destroy();
        this.physics.resume();
        this.backgroundMusic.play();
        gameBeenStarted = true;
      });

      // This is what make the game not start before you click any key
      gameBeenStarted = false;
    }
    // This function updates the canvas every time something change like an enemy dies or the player wins
    function update() {
      // You can restart the game at any moment you want
      if (Phaser.Input.Keyboard.JustDown(rButton)) {
        restart_game(this);
        return;
      }
      // If the game has not been started yet you cannot continue from here
      if (!gameBeenStarted) return;

      // This makes the player movement posible
      if (cursors.left.isDown) player.setVelocityX(-200);
      else if (cursors.right.isDown) player.setVelocityX(200);
      else player.setVelocityX(0);

      // This makes the player movement posible and make it start
      const children = enemies.getChildren();
      if (children.length > 0) {
        // to make the boundaries of where the enemies can move
        const leftMost = children.reduce((min, e) => Math.min(min, e.x), 900);
        const rightMost = children.reduce((max, e) => Math.max(max, e.x), 0);
        // to make it turn arround when it found a wall(the one of the screen game)
        if (movingRight && rightMost > 850) { movingRight = false; enemyVelocity = -50; enemies.incY(10); }
        else if (!movingRight && leftMost < 50) { movingRight = true; enemyVelocity = 50; enemies.incY(10); }
        // velocity of the enemies(the same to each side)
        enemies.setVelocityX(enemyVelocity);
      }

      // To make the reset work propertly(it crashed before)
      if ((extraEnemy.visible && extraEnemy.x > 900) || extraEnemy.y == -50) {
        extraEnemy.setVisible(false);
        extraEnemy.setVelocityX(0);
      }

      // If all the enemies are destroyed before they reach the botton the you win
      if (enemies.countActive(true) === 0) {
        // messages of winning
        this.add.text(450, 325, 'Well done you saved New Vegas.', { fontSize: '24px', color: '#00FF00' }).setOrigin(0.5).setBackgroundColor('#000000');
        this.add.text(450, 345, 'Enter inside to talk with Mr. House', { fontSize: '24px', color: '#00FF00' }).setOrigin(0.5).setBackgroundColor('#000000');

        // Pausing the game when you win so you can read the messages
        this.physics.pause();
        gameBeenStarted = false;
        //the music of the end of the game
        if (this.backgroundMusic && this.backgroundMusic.isPlaying) this.backgroundMusic.stop();
        this.endMusic = this.sound.add('endsong', { loop: true, volume: 0.3 });
        this.endMusic.play();

        // This show the restart button that tells you to press R to do it
        create_restart_button(this);
      }

      // If any of the active enemies touches the button you lost and this arise
      enemies.children.iterate((enemy) => {
        if (enemy.active && enemy.y >= 500) {
          gameover.call(this);
        }
      });
    }
    // This function makes that when a shoot hits the enemy it 'dies' and dissapear from the screen
    function hit_enemy(bullet, enemy) {
      bullet.destroy();
      enemy.destroy();
      score += 400;
      scoreText.setText(score + ' pts');
      this.sound.play('explosion', { volume: 0.5 });
    }
    // The fintion that makes the shooting work correctly
    function shoot_gun() {
      if (!canShoot) return;
      canShoot = false;
      const bullet = bullets.create(player.x, player.y - 20, 'bullet');
      bullet.setVelocityY(-400);
      this.sound.play('shoot', { volume: 0.4 });
      // to have 2 seconds of cooldown and make it more difficoult
      setTimeout(() => (canShoot = true), 2000);
    }
    // This function is the one that restart the game when the button R has been pressed
    function restart_game(scene) {
      // This if is to make sure that there the game do not crash becuase of restarting again and again a lot of times
      if (!scene) return;
      // Stop the end music to assure that both songs are not playing at the same time
      scene.sound.stopAll();
      score = 0;
      // It restarts the game to the tutorial screen
      scene.scene.restart();
    }
    // This function makes that if any of the enemies touch the end of the screen the game
    // ends and you lost
    function gameover() {
      // Stop everything (física)
      enemies.setVelocityX(0);
      enemies.setVelocityY(0);
      this.physics.pause();
      gameBeenStarted = false;

      // Stop the background music of the game because yo lost
      if (this.backgroundMusic && this.backgroundMusic.isPlaying) {
        this.backgroundMusic.stop();
      }

      // Then show the message on screen telling you that you have lost and New Vegas has been destroyed
      this.add.text(450, 325, 'The monsters have entered New Vegas.', {
        fontSize: '24px',
        color: '#00FF00',
        fontStyle: 'bold'
      }).setOrigin(0.5).setBackgroundColor('#000000');
      this.add.text(450, 345, 'Now Caesar will control the Mojave.', {
        fontSize: '24px',
        color: '#00FF00',
        fontStyle: 'bold'
      }).setOrigin(0.5).setBackgroundColor('#000000');

      // This show the player the text that tells them to restart the game again to try and win this time
      create_restart_button(this);
    }
    // This function has the text that appears when you have won/lost the game telling you to retry or play again
    // This function makes that when a shoot hits the extra enemy it 'dies' and dissapear from the screen
    function hit_bonus_enemy(bullet, bonus) {
      bonus.setVisible(false);
      bonus.disableBody(true, true);
      player.scene.time.delayedCall(500, () => {
        const x = -50;
        const y = -50;
        bonus.enableBody(true, x, y, true, true);
      });
      bullet.setVisible(false);
      bonus.setVelocityX(0);
      score += 5000;
      scoreText.setText(score + ' pts');
      this.sound.play('explosion', { volume: 0.6 });
    }
    function create_restart_button(scene) {
      // The characteristics of the restart text that will appear on screen
      restartButton = scene.add.text(450, 400, 'Try again (Press R to restart)', {
        fontSize: '24px',
        color: '#00ff00',
        backgroundColor: '#222',
        padding: { x: 12, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive()
      .setDepth(11);
    }