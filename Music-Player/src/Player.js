import { useEffect, useRef, useState } from "react";
import "./Player.css";

export default function Player({ track, next, prev }) {

  const audioRef = useRef(new Audio(track.src));

  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {

    audioRef.current.pause();
    audioRef.current = new Audio(track.src);

    const audio = audioRef.current;

    audio.addEventListener("loadedmetadata", () => {
      setDuration(audio.duration);
    });

    audio.addEventListener("timeupdate", () => {
      setTime(audio.currentTime);
    });

    audio.addEventListener("ended", next);

    if (isPlaying) audio.play();

    return () => audio.pause();

  }, [track]);

  const togglePlay = () => {
    const audio = audioRef.current;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }

    setIsPlaying(!isPlaying);
  };

  const seek = (e) => {
    audioRef.current.currentTime = e.target.value;
    setTime(e.target.value);
  };

  const format = (t) => {
    const min = Math.floor(t / 60);
    const sec = Math.floor(t % 60);
    return `${min}:${sec < 10 ? "0" + sec : sec}`;
  };

  return (
    <div className="player">

      <img
        src={track.cover}
        alt="cover"
        className="cover"
      />

      <h2>{track.title}</h2>
      <p className="artist">{track.artist}</p>

      <div className="progress">

        <span>{format(time)}</span>

        <input
          type="range"
          min="0"
          max={duration}
          value={time}
          onChange={seek}
        />

        <span>{format(duration)}</span>

      </div>

      <div className="controls">

        <button onClick={prev}>⏮</button>

        <button className="play" onClick={togglePlay}>
          {isPlaying ? "⏸" : "▶"}
        </button>

        <button onClick={next}>⏭</button>

      </div>

    </div>
  );
}