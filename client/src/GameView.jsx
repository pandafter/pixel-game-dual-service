import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';

export default function GameView({ ws, userID }) {
  const containerRef = useRef(null);
  const playersRef = useRef({});
  const sheetsRef = useRef({});

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

    const createPlayerOnCanvas = ({ id, name, color }) => {
      if (!sheetsRef.current.idle) {
        console.warn("Idle spritesheet not loaded yet, cannot create player.");
        return;
      }
      if (playersRef.current[id]) {
        console.log(`Player ${id} already exists.`);
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

      playersRef.current[id] = {
        sprite,
        nameText,
        velocity: { x: 0, y: 0 },
        inputs: { left: false, right: false, jump: false },
        onGround: false,
        jumpTime: null,
        wasJumping: false,
        currentAnim: 'idle',
        facingRight: true,
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
                  };
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

      for (const id in playersRef.current) {
        const p = playersRef.current[id];
        const { sprite, nameText, velocity, inputs } = p;

        const nextAnim = chooseAnim(inputs);

        // No flipping. Las animaciones ya están mirando en su dirección correcta.
        if (nextAnim === 'izquierda') {
          p.facingRight = false;
        } else if (nextAnim === 'derecha') {
          p.facingRight = true;
        }

        // No cambiar scale.x en idle — conserva dirección previa
        if (nextAnim !== p.currentAnim) {
          const textures = sheetsRef.current[nextAnim];
          if (textures?.length) {
            setupAndPlayAnimation(sprite, textures);
            p.currentAnim = nextAnim;
          }
        }

        // Ajuste visual según orientación (solo si los sprites requieren flipping)
        // sprite.scale.x = p.facingRight ? Math.abs(sprite.scale.x) : -Math.abs(sprite.scale.x);

        velocity.x = inputs.left
          ? -MOVE_SPEED
          : inputs.right
          ? MOVE_SPEED
          : 0;
        sprite.x += velocity.x;

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

        const halfW = sprite.width / 2;
        sprite.x = Math.max(halfW, Math.min(app.screen.width - halfW, sprite.x));

        nameText.x = sprite.x;
        nameText.y = sprite.y - sprite.height / 2 - 10;
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
