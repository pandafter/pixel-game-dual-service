import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';

export default function GameView({ ws, userID }) {
  const containerRef = useRef(null);
  const appRef = useRef(null);
  const playersRef = useRef({});

  const GRAVITY = 0.25;
  const MOVE_SPEED = 4;
  const JUMP_FORCE_INITIAL = -4.5;
  const JUMP_FORCE_CONTINUOUS = -0.3;
  const MAX_JUMP_TIME = 15;

  useEffect(() => {
    const app = new PIXI.Application({
      resizeTo: window,
      backgroundColor: 0x1e1e1e,
    });

    appRef.current = app;
    containerRef.current?.appendChild(app.view);

    const texture = PIXI.Texture.from('/assets/player.png');

    app.ticker.add(() => {
      for (const id in playersRef.current) {
        const player = playersRef.current[id];
        if (!player) continue;

        // Movimiento lateral
        if (player.inputs.left) {
          player.velocity.x = -MOVE_SPEED;
        } else if (player.inputs.right) {
          player.velocity.x = MOVE_SPEED;
        } else {
          player.velocity.x = 0;
        }

        player.sprite.x += player.velocity.x;

        // Saltar
        if (player.inputs.jump) {
          if (player.onGround && !player.wasJumping) {
            player.velocity.y = JUMP_FORCE_INITIAL;
            player.jumpTime = 0;
          } else if (player.jumpTime != null && player.jumpTime < MAX_JUMP_TIME) {
            player.velocity.y += JUMP_FORCE_CONTINUOUS;
            player.jumpTime++;
          }
        } else {
          player.jumpTime = null;
        }

        player.wasJumping = player.inputs.jump;

        // Gravedad
        player.velocity.y += GRAVITY;
        player.sprite.y += player.velocity.y;

        const groundY = app.screen.height - player.sprite.height / 2;
        if (player.sprite.y >= groundY) {
          player.sprite.y = groundY;
          player.velocity.y = 0;
          player.onGround = true;
          player.jumpTime = null;
        } else {
          player.onGround = false;
        }

        // Limitar a bordes
        player.sprite.x = Math.max(
          player.sprite.width / 2,
          Math.min(app.screen.width - player.sprite.width / 2, player.sprite.x)
        );

        // Posición del nombre
        if (player.nameText) {
          player.nameText.x = player.sprite.x;
          player.nameText.y = player.sprite.y - player.sprite.height / 2 - 10;
        }
      }
    });

    if (ws) {
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.action === 'spawn') {
            const id = data.playerID;
            if (!playersRef.current[id]) {
              const sprite = new PIXI.Sprite(texture);
              sprite.anchor.set(0.5);
              sprite.scale.set(0.4);
              sprite.x = Math.random() * app.screen.width;
              sprite.y = 0;
              app.stage.addChild(sprite);

              const nameText = new PIXI.Text(data.playerName || id, {
                fontFamily: "'PressStart2P', monospace",
                fontSize: 25,
                fill: 0xffffff,
                stroke: 0x000000,
                strokeThickness: 3,
              });

              nameText.anchor.set(0.5, 1);
              nameText.x = sprite.x;
              nameText.y = sprite.y - sprite.height / 2 - 10;
              app.stage.addChild(nameText);

              playersRef.current[id] = {
                sprite,
                velocity: { x: 0, y: 0 },
                inputs: { left: false, right: false, jump: false },
                onGround: false,
                jumpTime: null,
                wasJumping: false,
                nameText,
              };
            }
          }

          if (data.action === 'move' && Array.isArray(data.directions)) {
            const id = data.playerID;
            const player = playersRef.current[id];
            if (player) {
              player.inputs = {
                left: data.directions.includes('left'),
                right: data.directions.includes('right'),
                jump: data.directions.includes('jump'),
              };
            }
          }

          if (data.action === 'player_disconnect' && data.playerID) {
            const player = playersRef.current[data.playerID];
            if (player) {
              app.stage.removeChild(player.sprite);
              if (player.nameText) app.stage.removeChild(player.nameText);
              delete playersRef.current[data.playerID];
            }
          }

        } catch (err) {
          console.error('❌ Error parsing WebSocket message:', err);
        }
      };

      // Importante: pedir el spawn de los jugadores actuales
      ws.send(JSON.stringify({ action: 'requestSpawn', userID }));
    }

    return () => {
      app.destroy(true, true);
      appRef.current = null;
      playersRef.current = {};
    };
  }, [ws, userID]);

  return <div ref={containerRef} className="game-canvas" />;
}
