import { useRef, useState, useEffect } from 'react';

export default function Joystick({ onMove, deadZone = 0.05 }) {
  const baseRef = useRef(null);
  const stickRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [center, setCenter] = useState({ x: 0, y: 0 });
  const radius = 60; // radio visual del joystick

  useEffect(() => {
    const rect = baseRef.current.getBoundingClientRect();
    setCenter({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
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
    const magnitude = Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY);

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
        width: 120,
        height: 120,
        backgroundImage: 'url(/joystick-base.png)',
        backgroundSize: 'cover',
        borderRadius: '50%',
        touchAction: 'none',
      }}
    >
      <div
        ref={stickRef}
        style={{
          position: 'absolute',
          width: 60,
          height: 60,
          left: '50%',
          top: '50%',
          transform: 'translate(0px, 0px)',
          backgroundImage: 'url(/joystick-stick.png)',
          backgroundSize: 'cover',
          borderRadius: '50%',
          pointerEvents: 'none',
          translate: '-50% -50%',
        }}
      />
    </div>
  );
}
