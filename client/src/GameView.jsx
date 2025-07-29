import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import MusicPlayer from './components/MusicPlayer';

export default function GameView({ ws, userID }) {
  const containerRef = useRef(null);
  const playersRef = useRef({});
  const sheetsRef = useRef({});
  const weaponTextureRef = useRef(null);
  const projectilesRef = useRef([]);
  const hudRef = useRef(null);
  const platforms = useRef([]);



  const GRAVITY = 0.23;
  const MOVE_SPEED = 4;
  const JUMP_FORCE_INITIAL = -4;
  const JUMP_FORCE_CONTINUOUS = -0.4;
  const MAX_JUMP_TIME = 17;

  useEffect(() => {
    let mounted = true;

    const app = new PIXI.Application({
      resizeTo: window,
      backgroundColor: 0x1e1e1e,
      antialias: true,
    });
    containerRef.current.appendChild(app.view);


      const createPlatforms = () => {
        // Eliminar plataformas existentes
        platforms.current.forEach(p => app.stage.removeChild(p));
        platforms.current = [];

        const w = app.screen.width;
        const h = app.screen.height;

        const configs = [
          // Plataforma base (suelo principal)
          { x: w * 0.1, y: h * 0.92 - 20, width: w * 0.8, height: 25 },

          // Plataformas flotantes superiores (estilo "Battlefield")
          { x: w * 0.2, y: h * 0.68 - 40, width: w * 0.25, height: 20 },
          { x: w * 0.55, y: h * 0.68 - 40, width: w * 0.25, height: 20 },

          // Plataforma central elevada
          { x: w * 0.35, y: h * 0.52 - 40, width: w * 0.3, height: 20 },

          // Plataforma flotante más alta (centro)
          { x: w * 0.4, y: h * 0.35 - 30, width: w * 0.2, height: 20 },

          // Plataformas laterales pequeñas cerca del suelo
          { x: w * 0.05, y: h * 0.82 - 40, width: w * 0.15, height: 18 },
          { x: w * 0.8, y: h * 0.82 - 40, width: w * 0.15, height: 18 },

          // Opcional: plataformas trampolín más pequeñas (tipo recuperación)
          { x: w * 0.1, y: h * 0.45 - 40, width: w * 0.15, height: 15 },
          { x: w * 0.75, y: h * 0.4 - 40, width: w * 0.15, height: 15 },
        ];

        configs.forEach(({ x, y, width, height }, index) => {
          const plat = new PIXI.Graphics();

          const isOrange = index == 8 || index == 7;


          plat.lineStyle(2, isOrange ? 0xff9900 : 0x00FF6A);
          plat.beginFill(0x444444);
          plat.drawRect(0, 0, width, height);
          plat.endFill();
          plat.x = x;
          plat.y = y;
          plat.width = width;
          plat.height = height;
          app.stage.addChild(plat);
          platforms.current.push(plat);
        });
    };


    createPlatforms();


    const setupAndPlayAnimation = (sprite, textures) => {
      if (!textures || textures.length === 0 || !textures[0]) {
        console.warn("⚠️ Invalid textures provided for animation:", textures);
        return;
      }
      sprite.textures = textures;
      sprite.animationSpeed = 0.07;
      sprite.loop = true;
      sprite.play();
    };

    const loadWeaponSprite = (onComplete) => {
      const image = new Image();
      image.src = `/assets/arma.png?v=${Date.now()}`;
      image.onload = () => {
        weaponTextureRef.current = PIXI.Texture.from(image);
        onComplete();
      };
      image.onerror = () => {
        console.error("❌ Error al cargar el arma");
        onComplete();
      };
    };

    const createPlayerOnCanvas = ({ id, name, color }) => {
      const lives = 3;

      if (!sheetsRef.current.idle || !weaponTextureRef.current) {
        console.warn("Spritesheet o arma no listos");
        return;
      }

      if (playersRef.current[id]) {
        console.log(`Player ${id} ya existe`);
        return;
      }

      const sprite = new PIXI.AnimatedSprite(sheetsRef.current.idle);


      const aura = new PIXI.Graphics();
      aura.beginFill(PIXI.utils.string2hex(color || '#ffffff'), 0.4); // usa color con opacidad
      aura.drawCircle(0, 0, 45); // radio del aura
      aura.endFill();
      sprite.addChildAt(aura, 0); // detrás del sprite


      // MINIATURA EN EL HUD
      const mini = document.createElement('div');
      mini.style.display = 'flex';
      mini.style.flexDirection = 'column';
      mini.style.alignItems = 'center';
      mini.style.padding = '4px 8px';

      const safeColor = /^#[0-9A-F]{6}$/i.test(color) ? color : '#888';

      mini.style.background = safeColor
      mini.style.borderRadius = '12px';
      mini.style.color = 'white';
      mini.style.fontFamily = 'monospace';
      mini.style.fontSize = '12px';
      mini.style.boxShadow = '0 0 8px rgba(0,0,0,0.3)';
      mini.dataset.playerId = id;
      aura.beginFill(PIXI.utils.string2hex(safeColor), 0.4);
      const img = document.createElement('img');
      img.src = '/assets/idle.png'; // o un PNG visible del personaje
      img.style.width = '36px';
      img.style.height = '36px';
      img.style.objectFit = 'contain';
      img.style.marginBottom = '4px';

      const nameLabel = document.createElement('div');
      nameLabel.textContent = name || id;

      const livesLabel = document.createElement('div');
      livesLabel.textContent = `❤️ ${lives}`;
      livesLabel.className = 'lives-label';

      mini.appendChild(img);
      mini.appendChild(nameLabel);
      mini.appendChild(livesLabel);

      hudRef.current?.appendChild(mini);





      sprite.anchor.set(0.5);
      sprite.scale.set(0.4);
      setupAndPlayAnimation(sprite, sheetsRef.current.idle);

      sprite.x = Math.random() * app.screen.width;
      sprite.y = 0;
      app.stage.addChild(sprite);

      const nameText = new PIXI.Text(name || id, {
        fontFamily: 'monospace',
        fontSize: 14,
        fill: color || '#ffffff',
      });
      nameText.anchor.set(0.5, 1);
      app.stage.addChild(nameText);

      const livesText = new PIXI.Text(`❤️ ${lives}`, {
        fontFamily: 'monospace',
        fontSize: 18,
        fill: '#ff5555',
      });
      livesText.anchor.set(0.5, 0);
      app.stage.addChild(livesText);

      const weapon = new PIXI.Sprite(weaponTextureRef.current);
      weapon.anchor.set(0.1, 0.5);
      weapon.x = 30;
      weapon.y = 10;
      weapon.scale.set(1.0);
      sprite.addChild(weapon);

      playersRef.current[id] = {
        sprite,
        nameText,
        lives,
        livesText,
        weapon,
        hudElement:mini,
        velocity: { x: 0, y: 0 },
        inputs: { left: false, right: false, jump: false },
        onGround: false,
        jumpTime: null,
        wasJumping: false,
        currentAnim: 'idle',
        facingRight: true,
        angle: 0,
      };

      playersRef.current[id].hudElement = mini;
      playersRef.current[id].livesLabel = livesLabel;
    };

    const chooseAnim = ({ left, right }) => {
      if (left) return 'izquierda';
      if (right) return 'derecha';
      return 'idle';
    };

    const loadSheet = (name, url, expectedFrameCount, callback) => {
      const image = new Image();
      image.src = `${url}?v=${Date.now()}`;
      image.onload = () => {
        const base = PIXI.BaseTexture.from(image);
        const textures = [];
        const frameWidth = image.width / expectedFrameCount;
        const frameHeight = image.height;

        for (let i = 0; i < expectedFrameCount; i++) {
          const frame = new PIXI.Rectangle(i * frameWidth, 0, frameWidth, frameHeight);
          const texture = new PIXI.Texture(base, frame);
          texture.defaultAnchor = new PIXI.Point(0.5, 0.5);
          textures.push(texture);
        }

        sheetsRef.current[name] = textures;
        callback();
      };

      image.onerror = () => {
        console.error(`❌ Failed to load image: ${url}`);
        callback();
      };
    };

    let loadedCount = 0;
    const onAssetLoaded = () => {
      loadedCount++;
      if (loadedCount === 4 && mounted && ws) {
        console.log('✅ Spritesheets cargados:', sheetsRef.current);

        ws.onmessage = (e) => {
          if (!mounted) return;
          const data = JSON.parse(e.data);

          switch (data.action) {
            case 'new_player':
                createPlayerOnCanvas({
                  id: data.playerID,
                  name: data.playerName,
                  color: data.playerColor,
                });
              break;

            case 'move': {
              const p = playersRef.current[data.playerID];
              if (p) {
                p.inputs = {
                  left: data.directions.includes('left'),
                  right: data.directions.includes('right'),
                  jump: data.directions.includes('jump'),
                  x: data.x || 0,
                  y: data.y || 0,
                };
                if (typeof data.angle === 'number') {
                  p.angle = data.angle;
                }
              }
              break;
            }

            case 'shoot': {
              const p = playersRef.current[data.playerID];
              if (!p || !p.weapon) return;

              const weapon = p.weapon;
              const pos = weapon.getGlobalPosition();
              const angle = weapon.rotation;

              const offset = 30;
              const bulletX = pos.x + Math.cos(angle) * offset;
              const bulletY = pos.y + Math.sin(angle) * offset;
              const speed = 15;

              const bullet = PIXI.Sprite.from('/assets/bala.png');
              bullet.anchor.set(0.5);
              bullet.scale.set(0.06);
              bullet.x = bulletX;
              bullet.y = bulletY;
              bullet.rotation = angle;
              bullet.vx = Math.cos(angle) * speed;
              bullet.vy = Math.sin(angle) * speed;
              bullet.ownerID = data.playerID;

              app.stage.addChild(bullet);
              projectilesRef.current.push(bullet);
              break;
            }

            case 'player_disconnect': {
              const p = playersRef.current[data.playerID];
              if (p) {
                app.stage.removeChild(p.sprite, p.nameText, p.livesText);
                p.sprite.destroy({ children: true });
                p.nameText.destroy();
                p.livesText.destroy();


                if (p.hudElement) {
                  hudRef.current?.removeChild(p.hudElement);
                }

                delete playersRef.current[data.playerID];
              }
              break;
            }
          }
        };

        ws.send(JSON.stringify({ action: 'request_all_players' }));
      }
    };

    loadSheet('idle', '/assets/idle.png', 3, onAssetLoaded);
    loadSheet('izquierda', '/assets/izquierda.png', 3, onAssetLoaded);
    loadSheet('derecha', '/assets/derecha.png', 3, onAssetLoaded);
    loadWeaponSprite(onAssetLoaded);


app.ticker.add(() => {
  if (!mounted) return;

  for (const id in playersRef.current) {
    const p = playersRef.current[id];
    const { sprite, nameText, livesText, velocity, inputs } = p;

    const nextAnim = chooseAnim(inputs);
    if (nextAnim !== p.currentAnim) {
      const textures = sheetsRef.current[nextAnim];
      if (textures?.length) {
        setupAndPlayAnimation(sprite, textures);
        p.currentAnim = nextAnim;
      }
    }

    if (nextAnim === 'izquierda') p.facingRight = false;
    else if (nextAnim === 'derecha') p.facingRight = true;

    velocity.x = inputs.left ? -MOVE_SPEED : inputs.right ? MOVE_SPEED : 0;
    sprite.x += velocity.x;

    // Rotación arma
    if (p.weapon) {
      const angle = Math.atan2(inputs.y, inputs.x);
      if (!isNaN(angle)) {
        p.angle = angle;
        p.weapon.rotation = angle;
      }
      const flip = Math.sign(Math.cos(p.angle));
      p.weapon.scale.y = flip >= 0 ? Math.abs(p.weapon.scale.y) : -Math.abs(p.weapon.scale.y);
    }

    const MAX_SALTOS = 2;
    if (typeof p.wasOnGround === "undefined") p.wasOnGround = false;

    // ✳️ Aplicar salto inicial solo si NO se está en el aire
    if (p.onGround) {
      if (!p.wasOnGround) {
        p.jumpCount = 0;
        p.wasOnGround = true;
      }
    } else {
      p.wasOnGround = false;
    }

    if (inputs.jump && !p.wasJumping && p.jumpCount < MAX_SALTOS) {
      velocity.y = JUMP_FORCE_INITIAL;
      p.jumpTime = 0;
      p.jumpCount++;
    } else if (inputs.jump && p.jumpTime !== null && p.jumpTime < MAX_JUMP_TIME) {
      velocity.y += JUMP_FORCE_CONTINUOUS;
      p.jumpTime++;
    } else if (!inputs.jump) {
      p.jumpTime = null;
    }

    p.wasJumping = inputs.jump;

    // ✳️ Aplicar gravedad solo si no está en plataforma
    velocity.y += GRAVITY;
    sprite.y += velocity.y;

    const spriteBounds = sprite.getBounds();
    let landed = false;

    for (const plat of platforms.current) {
      const platBounds = plat.getBounds();

      const spriteBounds = {
        x: sprite.x - sprite.width * 0.5,
        y: sprite.y - sprite.height * 0.5,
        width: sprite.width,
        height: sprite.height,
      };

      const intersectX =
        spriteBounds.x + spriteBounds.width > platBounds.x &&
        spriteBounds.x < platBounds.x + platBounds.width;

      const previousBottom = sprite.y - sprite.height * 0.5 - velocity.y + sprite.height;
      const currentBottom = sprite.y + sprite.height * 0.5;
      const platTop = platBounds.y;

      if (
        velocity.y >= 0 &&
        previousBottom <= platTop &&
        currentBottom >= platTop &&
        intersectX
      ) {
        sprite.y = platTop - sprite.height * 0.5;
        velocity.y = 0;
        p.onGround = true;
        p.jumpTime = null;
        landed = true;
        break;
      }

      const intersectY =
        spriteBounds.y + spriteBounds.height > platBounds.y &&
        spriteBounds.y < platBounds.y + platBounds.height;

      const spriteRight = spriteBounds.x + spriteBounds.width;
      const platLeft = platBounds.x;

      if (
        intersectY &&
        velocity.x > 0 &&
        spriteRight > platLeft &&
        spriteBounds.x < platLeft
      ) {
        sprite.x = platLeft - sprite.width * 0.5;
        velocity.x = 0;
      }

      const spriteLeft = spriteBounds.x;
      const platRight = platBounds.x + platBounds.width;

      if (
        intersectY &&
        velocity.x < 0 &&
        spriteLeft < platRight &&
        spriteRight > platRight
      ) {
        sprite.x = platRight + sprite.width * 0.5;
        velocity.x = 0;
      }
    }

    if (!landed) {
      p.onGround = false;
    }

    const halfW = sprite.width / 2;
    sprite.x = Math.max(halfW, Math.min(app.screen.width - halfW, sprite.x));

    nameText.x = sprite.x;
    nameText.y = sprite.y - sprite.height / 2 - 10;
    livesText.x = sprite.x;
    livesText.y = sprite.y + sprite.height / 2 - 160;
  }

  // Las balas (no modificado)
  for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
    const bullet = projectilesRef.current[i];
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;

    let impacted = false;

    for (const plat of platforms.current) {
      const bx = bullet.x;
      const by = bullet.y;

      const platLeft = plat.x;
      const platRight = plat.x + plat.width;
      const platTop = plat.y;
      const platBottom = plat.y + plat.height;

      if (
        bx > platLeft &&
        bx < platRight &&
        by > platTop &&
        by < platBottom
      ) {
        app.stage.removeChild(bullet);
        projectilesRef.current.splice(i, 1);
        i--;
        impacted = true;
        break;
      }
    }

    for (const id in playersRef.current) {
      if (id === bullet.ownerID) continue;

      const p = playersRef.current[id];
      const dx = bullet.x - p.sprite.x;
      const dy = bullet.y - p.sprite.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const hitRadius = p.sprite.width * 0.3;

      if (dist < hitRadius) {
        p.lives -= 1;
        p.sprite.tint = 0xFF4444;
        setTimeout(() => (p.sprite.tint = 0xFFFFFF), 150);

        p.livesText.text = `❤️ ${p.lives}`;
        if (p.livesLabel) p.livesLabel.textContent = `❤️ ${p.lives}`;

        if (app.stage && bullet.parent) app.stage.removeChild(bullet);
        projectilesRef.current.splice(i, 1);
        i--;

        if (p.lives <= 0) {
          app.stage.removeChild(p.sprite, p.nameText, p.livesText);
          p.sprite.destroy({ children: true });
          p.nameText.destroy();
          p.livesText.destroy();
          if (p.hudElement) p.hudElement.remove();
          delete playersRef.current[id];

          if (String(id) === String(userID)) {
            alert("Has muerto. Volverás al menú.");
            window.location.href = "/";
          }
        }

        impacted = true;
        break;
      }
    }

    if (
      !impacted &&
      (bullet.x < -50 || bullet.x > app.screen.width + 50 ||
        bullet.y < -50 || bullet.y > app.screen.height + 50)
    ) {
      if (app.stage && bullet.parent) app.stage.removeChild(bullet);
      projectilesRef.current.splice(i, 1);
    }
  }
});


    return () => {
      mounted = false;
      app.destroy(true, { children: true, texture: true, baseTexture: true });
      playersRef.current = {};
      sheetsRef.current = {};
      console.log('🧹 GameView desmontado y PIXI limpiado');
    };
  }, [ws, userID]);

  return (
    <div
      ref={containerRef}
      className="game-canvas"
      style={{ width: '100%', height: '100vh', overflow: 'hidden' }}
    >
      <div
      ref={hudRef}
      className="player-hud"
      style={{
        position: 'absolute',
        top: 10,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        gap: '16px',
        zIndex: 10,
        pointerEvents: 'none'
      }}
    >
    </div>
      <MusicPlayer src="resources/bgSong.mp3" loop={true} defaultVolume={0.2}/>
    </div>
    
  );
}
