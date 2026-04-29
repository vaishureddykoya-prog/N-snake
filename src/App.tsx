import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, AlertTriangle, RefreshCw } from 'lucide-react';

const GRID_SIZE = 20;
const INITIAL_SNAKE = [{ x: 5, y: 10 }, { x: 4, y: 10 }, { x: 3, y: 10 }];
const INITIAL_DIRECTION = { x: 1, y: 0 };
const GAME_SPEED = 120; // ms per tick

const TRACKS = [
  { id: 1, title: 'Cybernetic Pulse', artist: 'Neon Network', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
  { id: 2, title: 'Night Runner', artist: 'Synthcore Protocol', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3' },
  { id: 3, title: 'Data Stream', artist: 'Analog Ghost', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3' }
];

type Point = { x: number, y: number };

export default function App() {
  // Game State
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [direction, setDirection] = useState<Point>(INITIAL_DIRECTION);
  const [food, setFood] = useState<Point>({ x: 15, y: 10 });
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isGamePlaying, setIsGamePlaying] = useState(false);

  // Use refs to avoid stale closures in event listeners and game loop
  const directionRef = useRef(direction);
  const lastProcessedDirection = useRef(direction);
  const isGamePlayingRef = useRef(isGamePlaying);

  // Music State
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Sync refs safely
  useEffect(() => { directionRef.current = direction; }, [direction]);
  useEffect(() => { isGamePlayingRef.current = isGamePlaying; }, [isGamePlaying]);

  // Audio Effects
  useEffect(() => {
    if (audioRef.current) {
      if (isPlayingAudio) {
        audioRef.current.play().catch(e => console.error("Audio playback failed:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlayingAudio, currentTrackIndex]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const handleAudioEnded = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
  };

  const handlePlayPauseMusic = () => {
    setIsPlayingAudio(!isPlayingAudio);
  };

  const handleSkipNext = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
    setIsPlayingAudio(true);
  };

  const handleSkipPrev = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
    setIsPlayingAudio(true);
  };

  const generateFood = useCallback((currentSnake: Point[]) => {
    let newFood: Point;
    let isOccupied = true;
    while (isOccupied) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      // eslint-disable-next-line no-loop-func
      isOccupied = currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
    }
    return newFood!;
  }, []);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    directionRef.current = INITIAL_DIRECTION;
    lastProcessedDirection.current = INITIAL_DIRECTION;
    setScore(0);
    setGameOver(false);
    setFood({ x: 15, y: 10 });
    setIsGamePlaying(true);
    // Start music on first interaction
    if (!isPlayingAudio) setIsPlayingAudio(true);
  };

  // Game Loop
  useEffect(() => {
    if (gameOver || !isGamePlayingRef.current) return;

    const gameLoop = setInterval(() => {
      setSnake(prevSnake => {
        const head = prevSnake[0];
        const newHead = {
          x: head.x + directionRef.current.x,
          y: head.y + directionRef.current.y
        };

        // Wall Collision
        if (
          newHead.x < 0 || newHead.x >= GRID_SIZE ||
          newHead.y < 0 || newHead.y >= GRID_SIZE
        ) {
          setGameOver(true);
          return prevSnake;
        }

        // Self Collision
        if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
          setGameOver(true);
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        // Food Collision
        setFood(prevFood => {
          if (newHead.x === prevFood.x && newHead.y === prevFood.y) {
            setScore(s => {
              const newScore = s + 10;
              if (newScore > highScore) setHighScore(newScore);
              return newScore;
            });
            return generateFood(newSnake);
          }
          newSnake.pop(); // Remove tail if no food eaten
          return prevFood;
        });

        // Update processed direction only after we have moved
        lastProcessedDirection.current = directionRef.current;
        return newSnake;
      });
    }, GAME_SPEED);

    return () => clearInterval(gameLoop);
  }, [gameOver, generateFood, highScore]);

  // Keyboard Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent scrolling handles when playing
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (gameOver && e.key === ' ') {
        resetGame();
        return;
      }

      if (!isGamePlayingRef.current && e.key === ' ') {
        resetGame();
        return;
      }

      const cd = lastProcessedDirection.current;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (cd.y !== 1) setDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (cd.y !== -1) setDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (cd.x !== 1) setDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (cd.x !== -1) setDirection({ x: 1, y: 0 });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver]);

  const currentTrack = TRACKS[currentTrackIndex];

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-mono flex flex-col md:flex-row overflow-hidden selection:bg-cyan-500/30">
      <audio
        ref={audioRef}
        src={currentTrack.url}
        onEnded={handleAudioEnded}
        preload="auto"
      />

      {/* Sidebar Music Player */}
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-zinc-800 bg-zinc-900/50 p-6 flex flex-col justify-between backdrop-blur-md shrink-0 z-10 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
        <div>
          <div className="flex items-center space-x-3 mb-10">
            <div className="w-8 h-8 rounded bg-gradient-to-tr from-cyan-400 to-fuchsia-500 animate-pulse shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
            <h1 className="text-xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400 uppercase">Neon<br/>Serpent</h1>
          </div>

          <div className="mb-8 relative group">
            <div className="aspect-square rounded-2xl bg-zinc-800 border-2 border-zinc-700/50 overflow-hidden relative shadow-[0_0_30px_rgba(217,70,239,0.15)] group-hover:shadow-[0_0_40px_rgba(217,70,239,0.3)] transition-all duration-500 flex items-center justify-center">
               {isPlayingAudio ? (
                 <div className="absolute inset-0 flex items-center justify-center gap-1.5 opacity-50">
                   {[1, 2, 3, 4, 5].map((i) => (
                     <div key={i} className="w-1.5 bg-fuchsia-500 rounded-full animate-pulse" 
                          style={{height: `${Math.random() * 50 + 20}%`, animationDelay: `${i * 0.1}s`, animationDuration: '0.5s' }}></div>
                   ))}
                 </div>
               ) : (
                 <div className="text-zinc-600">
                    <Pause size={48} />
                 </div>
               )}
               {/* Overlay disc */}
               <div className={`absolute w-3/4 h-3/4 inset-0 m-auto rounded-full border border-zinc-700 bg-gradient-to-bl from-zinc-800 to-zinc-900 shadow-inner flex items-center justify-center ${isPlayingAudio ? 'animate-[spin_4s_linear_infinite]' : ''}`}>
                  <div className="w-1/4 h-1/4 rounded-full bg-zinc-950 border border-zinc-800"></div>
               </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs text-cyan-400 font-semibold tracking-widest uppercase mb-1 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">Now Playing</p>
              <h2 className="text-xl font-bold truncate">{currentTrack.title}</h2>
              <p className="text-zinc-400 text-sm truncate">{currentTrack.artist}</p>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button onClick={handleSkipPrev} className="p-3 text-zinc-400 hover:text-white transition-colors">
                <SkipBack size={24} />
              </button>
              
              <button 
                onClick={handlePlayPauseMusic} 
                className="p-4 rounded-full bg-zinc-100 text-zinc-950 hover:bg-cyan-400 hover:shadow-[0_0_20px_rgba(34,211,238,0.6)] transition-all"
              >
                {isPlayingAudio ? <Pause fill="currentColor" size={24} /> : <Play fill="currentColor" size={24} className="ml-1" />}
              </button>
              
              <button onClick={handleSkipNext} className="p-3 text-zinc-400 hover:text-white transition-colors">
                <SkipForward size={24} />
              </button>
            </div>
            
            <div className="flex items-center justify-end pt-4">
              <button onClick={() => setIsMuted(!isMuted)} className="text-zinc-500 hover:text-cyan-400 transition-colors">
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-8 space-y-2">
           <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Up Next</p>
           {TRACKS.map((track, idx) => (
             <div 
                key={track.id} 
                onClick={() => { setCurrentTrackIndex(idx); setIsPlayingAudio(true); }}
                className={`text-sm p-2 rounded cursor-pointer transition-colors flex items-center justify-between group ${idx === currentTrackIndex ? 'bg-zinc-800/50 text-cyan-400 border border-cyan-900/30' : 'text-zinc-400 hover:bg-zinc-800/30 hover:text-zinc-200'}`}
              >
                <span className="truncate pr-2">{track.title}</span>
                {idx === currentTrackIndex && isPlayingAudio && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>}
             </div>
           ))}
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 lg:p-8 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900/50 via-zinc-950 to-zinc-950 relative">
        {/* Background Grid Decoration */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

        <div className="w-full max-w-2xl relative z-10">
          <div className="flex justify-between items-end mb-6 px-2">
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Score</p>
              <div className="text-4xl font-black text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]">{score}</div>
            </div>
            <div className="text-right">
              <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">High Score</p>
              <div className="text-2xl font-bold text-fuchsia-400 drop-shadow-[0_0_8px_rgba(217,70,239,0.5)]">{highScore}</div>
            </div>
          </div>

          <div 
            className="aspect-square w-full bg-black border-2 border-zinc-800 rounded-xl relative overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.8)] before:absolute before:inset-0 before:shadow-[inset_0_0_30px_rgba(34,211,238,0.1)] pointer-events-none"
            style={{ 
              display: 'grid', 
              gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
              gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)` 
            }}
          >
            {/* Grid Overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-20" style={{ 
              backgroundImage: 'linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)',
              backgroundSize: `${100/GRID_SIZE}% ${100/GRID_SIZE}%`
             }}></div>

            {/* Snake */}
            {snake.map((segment, index) => {
              const isHead = index === 0;
              return (
                <div 
                  key={`${segment.x}-${segment.y}-${index}`}
                  className="relative flex items-center justify-center p-[1px]"
                  style={{ gridColumn: segment.x + 1, gridRow: segment.y + 1, zIndex: isHead ? 10 : 5 }}
                >
                  <div className={`w-full h-full rounded-[4px] ${isHead ? 'bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)]' : 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.6)] opacity-90'}`}></div>
                </div>
              );
            })}

            {/* Food */}
            <div 
              className="relative flex items-center justify-center p-[2px]"
              style={{ gridColumn: food.x + 1, gridRow: food.y + 1 }}
            >
              <div className="w-full h-full rounded-full bg-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.8)] animate-pulse"></div>
            </div>

            {/* Overlays (Start/Game Over) pointer-events-auto to capture clicks if needed */}
            {!isGamePlaying && !gameOver && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-20 pointer-events-auto">
                <button 
                  onClick={resetGame}
                  className="px-8 py-4 bg-cyan-500 text-black font-bold uppercase tracking-widest rounded hover:bg-cyan-400 hover:shadow-[0_0_30px_rgba(34,211,238,0.6)] transition-all transform hover:scale-105 active:scale-95"
                >
                  Initialize Protocol
                </button>
                <p className="mt-6 text-zinc-400 text-sm flex gap-4">
                  <span><kbd className="bg-zinc-800 px-2 py-1 rounded text-zinc-300 mx-1 border border-zinc-700">W</kbd><kbd className="bg-zinc-800 px-2 py-1 rounded text-zinc-300 mx-1 border border-zinc-700">A</kbd><kbd className="bg-zinc-800 px-2 py-1 rounded text-zinc-300 mx-1 border border-zinc-700">S</kbd><kbd className="bg-zinc-800 px-2 py-1 rounded text-zinc-300 mx-1 border border-zinc-700">D</kbd> to move</span>
                </p>
              </div>
            )}

            {gameOver && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-20 pointer-events-auto">
                <AlertTriangle className="w-16 h-16 text-fuchsia-500 mb-4 drop-shadow-[0_0_15px_rgba(217,70,239,0.8)]" />
                <h2 className="text-3xl font-black text-white uppercase tracking-widest mb-2 shadow-black drop-shadow-md">System Failure</h2>
                <p className="text-fuchsia-400 mb-8 font-semibold tracking-wide">Score: {score}</p>
                <button 
                  onClick={resetGame}
                  className="flex items-center gap-3 px-8 py-4 border-2 border-cyan-500 text-cyan-400 font-bold uppercase tracking-widest rounded hover:bg-cyan-500 hover:text-black hover:shadow-[0_0_30px_rgba(34,211,238,0.6)] transition-all transform hover:scale-105 active:scale-95"
                >
                  <RefreshCw size={20} />
                  Reboot System
                </button>
              </div>
            )}
          </div>
          
          {/* Mobile controls hint / optional simple D-pad if needed, but keyboard is fine. */}
          <div className="mt-8 text-center md:hidden pointer-events-auto">
            <p className="text-zinc-500 text-sm">Please connect a keyboard for movement controls.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

