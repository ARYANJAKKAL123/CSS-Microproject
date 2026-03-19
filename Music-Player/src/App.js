import { useState } from "react";
import Player from "./Player";
import "./App.css";

const tracks = [
  {
    title: "Dreams",
    artist: "Artist One",
    src: "/music/song1.mp3",
    cover: "/covers/cover1.jpg"
  },
  {
    title: "Night Drive",
    artist: "Artist Two",
    src: "/music/song2.mp3",
    cover: "/covers/cover2.jpg"
  },
  {
    title : "Nights like this",
    artist: "Neighbourhood",
    src: "/music/song3.mp3",
    cover: "/covers/cover3.jpg"
  }
];

export default function App() {
  const [index, setIndex] = useState(0);

  const next = () => {
    setIndex((prev) => (prev + 1) % tracks.length);
  };

  const prev = () => {
    setIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
  };

  return (
    <div className="app">
      <Player
        track={tracks[index]}
        next={next}
        prev={prev}
      />
    </div>
  );
}
