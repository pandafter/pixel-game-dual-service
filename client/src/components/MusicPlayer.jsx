import { useEffect, useRef, useState } from "react";
import sound from "pixi-sound";

export default function MusicPlayer({
  src = "resources/bgSong.mp3",
  loop = true,
  defaultVolume = 0.5,
}) {
  const [volume, setVolume] = useState(defaultVolume);
  const [isMuted, setIsMuted] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [hovering, setHovering] = useState(false);
  const hoverTimeout = useRef(null);
  const soundRef = useRef(null);

  const startAudio = () => {
    if (hasStarted) return;

    sound.add("bg", {
      url: src,
      preload: true,
      loaded: (err, soundInstance) => {
        if (err) {
          console.error("Error loading sound:", err);
          return;
        }

        soundInstance.volume = defaultVolume;
        soundInstance.loop = loop;
        soundInstance.play();

        soundRef.current = soundInstance;
        setHasStarted(true);
      },
    });
  };

  useEffect(() => {
    if (hasStarted && soundRef.current) {
      soundRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted, hasStarted]);

  const toggleMute = () => {
    if (!soundRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    soundRef.current.volume = newMuted ? 0 : volume;
  };

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.stop();
        sound.remove("bg");
      }
      clearTimeout(hoverTimeout.current);
    };
  }, []);

  const handleMouseEnter = () => {
    clearTimeout(hoverTimeout.current);
    setHovering(true);
  };

  const handleMouseLeave = () => {
    hoverTimeout.current = setTimeout(() => {
      setHovering(false);
    }, 300); // Delay de 300ms
  };

  return (
    <div
      onClick={startAudio}
      style={{
        position: "absolute",
        top: 20,
        left: 20,
        zIndex: 1000,
      }}
    >
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          background: "rgba(10, 10, 10, 0.7)",
          borderRadius: "50%",
          width: "48px",
          height: "48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "#aaa",
          fontSize: "20px",
          boxShadow: "0 0 10px rgba(0, 0, 0, 0.4)",
          border: "1px solid #222",
        }}
      >
        🎵
      </div>

      {hasStarted && hovering && (
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            position: "absolute",
            top: "60px",
            left: 0,
            background: "rgba(25, 25, 25, 0.85)",
            padding: "10px",
            borderRadius: "12px",
            border: "1px solid #444",
            boxShadow: "0 0 6px rgba(0,0,0,0.4)",
            backdropFilter: "blur(4px)",
            minWidth: "120px",
            transition: "opacity 0.3s",
          }}
        >
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            style={{
              width: "100%",
              accentColor: "#4caf50",
              marginBottom: "8px",
            }}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleMute();
            }}
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              fontSize: "20px",
              cursor: "pointer",
              display: "block",
              margin: "0 auto",
            }}
            title={isMuted ? "Reanudar" : "Silenciar"}
          >
            {isMuted ? "🔊" : "🔇"}
          </button>
        </div>
      )}
    </div>
  );
}
