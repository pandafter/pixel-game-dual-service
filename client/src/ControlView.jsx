import './styles/control.css';
import { useState, useEffect, useRef } from 'react';

export default function ControlView({ ws, userID }) {

  const [controls, setControls] = useState({ left: false, right: false, jump: false });
  const pressedRef = useRef({ left: false, right: false, jump: false });

  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const jumpRef = useRef(null);

  const updateControl = (key, isDown) => {
    if (pressedRef.current[key] !== isDown) {
      pressedRef.current[key] = isDown;
      setControls({ ...pressedRef.current });
    }
  };

  useEffect(() => {
    if (!ws) return;

    const directions = [];
    if (controls.left) directions.push('left');
    if (controls.right) directions.push('right');
    if (controls.jump) directions.push('jump');

    ws.send(JSON.stringify({
      action: 'move',
      directions,
      userID
    }));

    if (navigator.vibrate) navigator.vibrate(10);
  }, [controls, ws, userID]);

  useEffect(() => {
    const getTouchedButtons = (touches) => {
      const active = { left: false, right: false, jump: false };

      for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        const overEl = document.elementFromPoint(touch.clientX, touch.clientY);

        if (leftRef.current?.contains(overEl)) active.left = true;
        if (rightRef.current?.contains(overEl)) active.right = true;
        if (jumpRef.current?.contains(overEl)) active.jump = true;
      }

      return active;
    };

        

    const handleTouchMove = (e) => {
      const active = getTouchedButtons(e.touches);
      updateControl('left', active.left);
      updateControl('right', active.right);
      updateControl('jump', active.jump);
    };

    const handleTouchStart = (e) => {
      handleTouchMove(e);
    };

    const handleTouchEnd = (e) => {
      const active = getTouchedButtons(e.touches);
      updateControl('left', active.left);
      updateControl('right', active.right);
      updateControl('jump', active.jump);
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  return (
    <div className="control-view">
      <h2>Control for {userID}</h2>

      <div className="controls-container">
        <div className="left-controls">
          <button
            ref={leftRef}
            className={`dpad-btn ${controls.left ? 'active' : ''}`}
          >
            ←
          </button>

          <button
            ref={rightRef}
            className={`dpad-btn ${controls.right ? 'active' : ''}`}
          >
            →
          </button>
        </div>

        <div className="right-controls">
          <button
            ref={jumpRef}
            className={`dpad-btn ${controls.jump ? 'active' : ''}`}
          >
            ⤒
          </button>
        </div>
      </div>
    </div>
  );
}
