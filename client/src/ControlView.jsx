import './styles/control.css';
import { useState, useEffect, useRef } from 'react';

export default function ControlView({ ws, userID }) {
  const [controls, setControls] = useState({ left: false, right: false, jump: false });
  const pressedRef = useRef({ left: false, right: false, jump: false });
  const jumpRef = useRef(null);
  const shootRef = useRef(null);

  const updateControl = (key, isDown) => {
    if (pressedRef.current[key] !== isDown) {
      pressedRef.current[key] = isDown;
      setControls({ ...pressedRef.current });
    }
  };

  useEffect(() => {
    const preventDoubleTapZoom = (event) => {
      const now = Date.now();
      if (now - lastTouchEndRef.current <= 300) {
        event.preventDefault();
      }
      lastTouchEndRef.current = now;
    };

    const lastTouchEndRef = { current: 0 };

    document.addEventListener('touchend', preventDoubleTapZoom, false);

    return () => {
      document.removeEventListener('touchend', preventDoubleTapZoom);
    };
  }, []);


  useEffect(() => {
    if (!ws) return;

    const directions = [];
    if (controls.left) directions.push('left');
    if (controls.right) directions.push('right');
    if (controls.jump) directions.push('jump');

    ws.send(JSON.stringify({
      action: 'move',
      directions,
      userID,
    }));

    if (navigator.vibrate) navigator.vibrate(10);
  }, [controls, ws, userID]);

  // Botones táctiles
  useEffect(() => {
    const getTouchedButtons = (touches) => {
      const active = { jump: false };

      for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        const overEl = document.elementFromPoint(touch.clientX, touch.clientY);

        if (jumpRef.current?.contains(overEl)) active.jump = true;
        // Puedes capturar shootRef.current?.contains(overEl) si más adelante agregas funcionalidad
      }

      return active;
    };

    const handleTouchMove = (e) => {
      const active = getTouchedButtons(e.touches);
      updateControl('jump', active.jump);
    };

    window.addEventListener('touchstart', handleTouchMove);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchMove);

    return () => {
      window.removeEventListener('touchstart', handleTouchMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchMove);
    };
  }, []);

  useEffect(() => {
    let wakeLock = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
          console.log('🔋 Wake Lock activo');
        }
      } catch (err) {
        console.warn('No se pudo activar Wake Lock:', err);
      }
    };
    requestWakeLock();
    return () => {
      if (wakeLock && wakeLock.release) {
        wakeLock.release();
        console.log('🔌 Wake Lock liberado');
      }
    };
  }, []);

  const handleJoystickMove = ({ x, y, angle }) => {
    const threshold = 0.05;
    updateControl('left', x < -threshold);
    updateControl('right', x > threshold);
    // Puedes guardar `angle` si después lo usas para rotar / disparar
  };

  return (
    <div className="control-view">
      <h2>Control for {userID}</h2>

      <div className="controls-container">
        <div className="left-controls">
          <Joystick onMove={handleJoystickMove} />
        </div>

        <div className="right-controls">
          <button
            ref={jumpRef}
            className={`action-btn ${controls.jump ? 'active' : ''}`}
            style={{ backgroundImage: 'url(/assets/boton-salto.png)' }}
          />
          <button
            ref={shootRef}
            className="action-btn"
            style={{ backgroundImage: 'url(/assets/boton-disparo.png)' }}
            // Aquí podrías activar lógica con onTouchStart/onClick en el futuro
          />
        </div>
      </div>
    </div>
  );
}

// Joystick igual que antes
function Joystick({ onMove }) {
  const baseRef = useRef(null);
  const stickRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [center, setCenter] = useState({ x: 0, y: 0 });
  const radius = 128;

  const updateCenter = () => {
    const rect = baseRef.current.getBoundingClientRect();
    setCenter({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  };

  useEffect(() => {
    updateCenter();
    window.addEventListener('resize', updateCenter);
    window.addEventListener('orientationchange', updateCenter);
    return () => {
      window.removeEventListener('resize', updateCenter);
      window.removeEventListener('orientationchange', updateCenter);
    };
  }, []);

  const handleMove = (clientX, clientY) => {
    const dx = clientX - center.x;
    const dy = clientY - center.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    let clampedX = dx;
    let clampedY = dy;

    if (distance > radius) {
      const angle = Math.atan2(dy, dx);
      clampedX = Math.cos(angle) * radius;
      clampedY = Math.sin(angle) * radius;
    }

    stickRef.current.style.transform = `translate(${clampedX}px, ${clampedY}px)`;

    const normalizedX = clampedX / radius;
    const normalizedY = clampedY / radius;
    const angle = Math.atan2(normalizedY, normalizedX);

    const magnitude = Math.sqrt(normalizedX ** 2 + normalizedY ** 2);
    const deadZone = 0.05;

    if (magnitude < deadZone) {
      onMove({ x: 0, y: 0, angle: 0 });
    } else {
      onMove({ x: normalizedX, y: normalizedY, angle });
    }
  };

  const startDrag = (e) => {
    setDragging(true);
    const touch = e.touches?.[0] || e;
    handleMove(touch.clientX, touch.clientY);
  };

  const endDrag = () => {
    setDragging(false);
    stickRef.current.style.transform = `translate(0px, 0px)`;
    onMove({ x: 0, y: 0, angle: 0 });
  };

  const moveDrag = (e) => {
    if (!dragging) return;
    const touch = e.touches?.[0] || e;
    handleMove(touch.clientX, touch.clientY);
  };

  return (
    <div
      ref={baseRef}
      onTouchStart={startDrag}
      onTouchMove={moveDrag}
      onTouchEnd={endDrag}
      onMouseDown={startDrag}
      onMouseMove={moveDrag}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      style={{
        position: 'relative',
        width: 256,
        height: 256,
        backgroundImage: 'url(/assets/joystick-base.png)',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        borderRadius: '50%',
        touchAction: 'none',
      }}
    >
      <div
        ref={stickRef}
        style={{
          position: 'absolute',
          width: 128,
          height: 128,
          left: '50%',
          top: '50%',
          transform: 'translate(0px, 0px)',
          backgroundImage: 'url(/assets/joystick-stick.png)',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          borderRadius: '50%',
          pointerEvents: 'none',
          translate: '-50% -50%',
        }}
      />
    </div>
  );
}
