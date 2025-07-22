import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';

export default function GameView({ ws, userID }) {
  const containerRef = useRef(null);
  const playersRef = useRef({});
  const sheetsRef = useRef({});
  const weaponTextureRef = useRef(null);
  const projectilesRef = useRef([]);



  const GRAVITY = 0.25;
  const MOVE_SPEED = 4;
  const JUMP_FORCE_INITIAL = -4.5;
  const JUMP_FORCE_CONTINUOUS = -0.3;
  const MAX_JUMP_TIME = 15;

  useEffect(() => {
    let mounted = true;

    const app = new PIXI.Application({
      resizeTo: window,
      backgroundColor: 0x1e1e1e,
      antialias: true,
    });
    containerRef.current.appendChild(app.view);

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
      if (!sheetsRef.current.idle || !weaponTextureRef.current) {
        console.warn("Spritesheet o arma no listos");
        return;
      }

      if (playersRef.current[id]) {
        console.log(`Player ${id} ya existe`);
        return;
      }

      const sprite = new PIXI.AnimatedSprite(sheetsRef.current.idle);
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
      nameText.x = sprite.x;
      nameText.y = sprite.y - sprite.height / 2 - 10;
      app.stage.addChild(nameText);

      // 👉 Crear el arma y agregarla como hijo del sprite
      const weapon = new PIXI.Sprite(weaponTextureRef.current);
      weapon.anchor.set(0.1, 0.5); // ancla cerca del mango

      weapon.x = 30; // posición relativa al sprite del jugador
      weapon.y = 10;
      weapon.scale.set(1.0); // escala pequeña

      sprite.addChild(weapon);

      playersRef.current[id] = {
        sprite,
        nameText,
        weapon,
        velocity: { x: 0, y: 0 },
        inputs: { left: false, right: false, jump: false },
        onGround: false,
        jumpTime: null,
        wasJumping: false,
        currentAnim: 'idle',
        facingRight: true,
        angle: 0,
      };
    };


    const chooseAnim = ({ left, right }) => {
      if (left) return 'izquierda';
      if (right) return 'derecha';
      return 'idle';
    };

    const loadSheet = (name, url, expectedFrameCount, callback) => {
      const image = new Image();
      image.src = `${url}?v=${Date.now()}`; // evitar caché
      image.onload = () => {
        const base = PIXI.BaseTexture.from(image);
        const textures = [];

        const frameWidth = image.width / expectedFrameCount;
        const frameHeight = image.height;

        for (let i = 0; i < expectedFrameCount; i++) {
          const frame = new PIXI.Rectangle(
            i * frameWidth,
            0,
            frameWidth,
            frameHeight
          );
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
      if (loadedCount === 3) {
        console.log('✅ Spritesheets cargados (manual PNG):', sheetsRef.current);

        if (ws) {
          ws.onmessage = (e) => {
            if (!mounted) return;
            const data = JSON.parse(e.data);

            switch (data.action) {
              case 'new_player':
                loadWeaponSprite(() => {
                  console.log("✅ Arma cargada");
                  createPlayerOnCanvas({
                    id: data.playerID,
                    name: data.playerName,
                    color: data.playerColor,
                  });
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
                console.log("📨 Señal de disparo recibida del jugador:", data.playerID);

                const p = playersRef.current[data.playerID];

                if (p && p.weapon) {
                  const weapon = p.weapon;
                  const weaponSprite = weapon; // si ya es el sprite

                  // Coordenadas globales de la punta del arma (30px adelante del pivote)
                  const weaponGlobal = weaponSprite.getGlobalPosition();
                  const angle = weaponSprite.rotation; // ángulo real del arma

                  const offset = 30; // distancia desde el centro del arma a la punta
                  const bulletX = weaponGlobal.x + Math.cos(angle) * offset;
                  const bulletY = weaponGlobal.y + Math.sin(angle) * offset;

                  const speed = 15;
                  const vx = Math.cos(angle) * speed;
                  const vy = Math.sin(angle) * speed;

                  const bullet = PIXI.Sprite.from('/assets/bala.png');
                  bullet.anchor.set(0.5);
                  bullet.scale.set(0.06);
                  bullet.x = bulletX;
                  bullet.y = bulletY;
                  bullet.rotation = angle;
                  bullet.vx = vx;
                  bullet.vy = vy;

                  app.stage.addChild(bullet);
                  projectilesRef.current.push(bullet);

                } else {
                  console.warn("⚠️ No se encontró jugador o arma para el disparo");
                }

                break;
              }


              case 'player_disconnect': {
                const p = playersRef.current[data.playerID];
                if (p) {
                  app.stage.removeChild(p.sprite, p.nameText);
                  p.sprite.destroy();
                  p.nameText.destroy();
                  delete playersRef.current[data.playerID];
                }
                break;
              }
            }
          };
          ws.send(JSON.stringify({ action: 'request_all_players' }));
        }
      }
    };

    loadSheet('idle', '/assets/idle.png', 3, onAssetLoaded);
    loadSheet('izquierda', '/assets/izquierda.png', 3, onAssetLoaded);
    loadSheet('derecha', '/assets/derecha.png', 3, onAssetLoaded);

    app.ticker.add(() => {
      if (!mounted || !sheetsRef.current.idle) return;

      // Actualizar todos los jugadores
      for (const id in playersRef.current) {
        const p = playersRef.current[id];
        const { sprite, nameText, velocity, inputs } = p;

        // Seleccionar la animación adecuada
        const nextAnim = chooseAnim(inputs);

        if (nextAnim === 'izquierda') {
          p.facingRight = false;
        } else if (nextAnim === 'derecha') {
          p.facingRight = true;
        }

        if (nextAnim !== p.currentAnim) {
          const textures = sheetsRef.current[nextAnim];
          if (textures?.length) {
            setupAndPlayAnimation(sprite, textures);
            p.currentAnim = nextAnim;
          }
        }

        // Movimiento horizontal
        velocity.x = inputs.left
          ? -MOVE_SPEED
          : inputs.right
          ? MOVE_SPEED
          : 0;

        sprite.x += velocity.x;

        // Rotación y flip del arma
        if (p.weapon) {
          const angle = Math.atan2(p.inputs.y, p.inputs.x);
          if (!isNaN(angle)) {
            p.angle = angle;
            p.weapon.rotation = angle;
          }

          const flip = Math.sign(Math.cos(p.angle));
          p.weapon.scale.y = flip >= 0
            ? Math.abs(p.weapon.scale.y)
            : -Math.abs(p.weapon.scale.y);
        }

        // Sistema de salto
        if (inputs.jump) {
          if (p.onGround && !p.wasJumping) {
            velocity.y = JUMP_FORCE_INITIAL;
            p.jumpTime = 0;
          } else if (p.jumpTime !== null && p.jumpTime < MAX_JUMP_TIME) {
            velocity.y += JUMP_FORCE_CONTINUOUS;
            p.jumpTime++;
          }
        } else {
          p.jumpTime = null;
        }
        p.wasJumping = inputs.jump;

        // Gravedad y caída
        velocity.y += GRAVITY;
        sprite.y += velocity.y;

        const groundY = app.screen.height - sprite.height / 2;
        if (sprite.y >= groundY) {
          sprite.y = groundY;
          velocity.y = 0;
          p.onGround = true;
          p.jumpTime = null;
        } else {
          p.onGround = false;
        }

        // Limitar dentro del escenario horizontalmente
        const halfW = sprite.width / 2;
        sprite.x = Math.max(halfW, Math.min(app.screen.width - halfW, sprite.x));

        // Actualizar posición del texto de nombre
        nameText.x = sprite.x;
        nameText.y = sprite.y - sprite.height / 2 - 10;
      }

      // Mover balas
      for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
        const bullet = projectilesRef.current[i];
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;

        // Eliminar si se sale de pantalla
        if (
          bullet.x < -50 || bullet.x > app.screen.width + 50 ||
          bullet.y < -50 || bullet.y > app.screen.height + 50
        ) {
          app.stage.removeChild(bullet);
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
    />
  );
}
