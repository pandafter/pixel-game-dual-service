const WebSocket = require('ws');
const http = require('http');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

const sessions = {};

wss.on('connection', (ws) => {
  let userID = null;
  let playerID = null;
  let assignedRole = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.action === 'join') {
        if (!data.userID) return;

        userID = data.userID;
        playerID = data.playerID || null;
        const isMobile = data.isMobile;
        const playerName = data.playerName || playerID;
        const playerColor = data.playerColor || '#00ff99';

        sessions[userID] ||= { players: new Map() };

        if (!isMobile && !sessions[userID].game) {
          sessions[userID].game = ws;
          assignedRole = 'game';

          const currentPlayers = Array.from(sessions[userID].players.entries()).map(([id, info]) => ({
            playerID: id,
            playerName: info.name,
            playerColor: info.color,
          }));

          ws.send(JSON.stringify({
            action: 'existing_players',
            players: currentPlayers,
          }));
        } else if (isMobile && playerID) {
          sessions[userID].players.set(playerID, {
            ws,
            name: playerName,
            color: playerColor,
          });
          assignedRole = 'control';

          const gameWS = sessions[userID].game;
          if (gameWS && gameWS.readyState === WebSocket.OPEN) {
            gameWS.send(JSON.stringify({
              action: 'new_player',
              playerID,
              playerName,
              playerColor,
            }));
          }
        } else {
          ws.send(JSON.stringify({ error: 'Missing playerID or session full' }));
          return ws.close();
        }

        ws.send(JSON.stringify({ action: 'role', role: assignedRole, playerID }));
        console.log(`✅ ${assignedRole} conectado | session: ${userID} | playerID: ${playerID || '-'}`);
      }

      else if (data.action === 'move') {
        if (!userID || !playerID) return;

        const gameWS = sessions[userID]?.game;
        if (gameWS && gameWS.readyState === WebSocket.OPEN) {
          const playerInfo = sessions[userID].players.get(playerID);

          gameWS.send(JSON.stringify({
            action: 'move',
            playerID,
            directions: data.directions || [],
            x: data.x || 0,
            y: data.y || 0,
            angle: typeof data.angle === 'number' ? data.angle : null,
            playerName: playerInfo?.name || playerID,
            playerColor: playerInfo?.color || '#00ff99',
          }));
        }
      }

      else if (data.action === 'shoot') {
          if (!userID || !playerID) return;

          const gameWS = sessions[userID]?.game;
          if (gameWS && gameWS.readyState === WebSocket.OPEN) {
            const playerInfo = sessions[userID].players.get(playerID);

            gameWS.send(JSON.stringify({
              action: 'shoot',
              playerID,
              x: data.x || 0,
              y: data.y || 0,
              angle: typeof data.angle === 'number' ? data.angle : 0,
              playerName: playerInfo?.name || playerID,
              playerColor: playerInfo?.color || '#00ff99',
            }));
          }
        }


      else if (data.action === 'request_all_players') {
        const gameWS = sessions[userID]?.game;
        if (assignedRole === 'game' && gameWS === ws) {
          const players = Array.from(sessions[userID].players.entries()).map(([id, info]) => ({
            playerID: id,
            playerName: info.name,
            playerColor: info.color,
          }));
          ws.send(JSON.stringify({ action: 'existing_players', players }));
        }
      }

    } catch (err) {
      console.error('❌ Error parsing message:', err);
    }
  });

  ws.on('close', () => {
    if (!userID || !sessions[userID]) return;
    const session = sessions[userID];

    if (assignedRole === 'game' && session.game === ws) {
      delete session.game;
      console.log(`❌ Game desconectado: ${userID}`);
    } else if (assignedRole === 'control' && playerID) {
      session.players.delete(playerID);
      console.log(`❌ Player desconectado: ${playerID}`);

      const gameWS = session.game;
      if (gameWS && gameWS.readyState === WebSocket.OPEN) {
        gameWS.send(JSON.stringify({
          action: 'player_disconnect',
          playerID,
        }));
      }
    }

    if (!session.game && session.players.size === 0) {
      delete sessions[userID];
      console.log(`🗑️ Sesión eliminada: ${userID}`);
    }
  });
});

server.listen(3001, () => {
  console.log('🚀 WebSocket server running on ws://localhost:3001');
});
