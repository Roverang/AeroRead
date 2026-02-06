import { useState, useEffect, useCallback, useRef } from 'react';
import { Music2, Play, Pause, SkipForward, SkipBack, Link2, Volume2, VolumeX } from 'lucide-react';

interface SpotifyPlayer {
  addListener: (event: string, callback: (data: any) => void) => void;
  removeListener: (event: string) => void;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  togglePlay: () => Promise<void>;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  getCurrentState: () => Promise<any>;
}

interface SonicModuleProps {
  isStealthActive: boolean;
}

// Spotify Client ID - Replace with your own from Spotify Developer Dashboard
const SPOTIFY_CLIENT_ID = 'YOUR_CLIENT_ID_HERE';
const REDIRECT_URI = window.location.origin;
const SCOPES = 'streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state';

export function SonicModule({ isStealthActive }: SonicModuleProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  
  const playerRef = useRef<SpotifyPlayer | null>(null);
  const previousVolumeRef = useRef(0.5);

  // Check for existing token on mount
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('access_token');
      if (token) {
        sessionStorage.setItem('spotify_token', token);
        window.location.hash = '';
        setIsConnected(true);
      }
    } else {
      const existingToken = sessionStorage.getItem('spotify_token');
      if (existingToken) {
        setIsConnected(true);
      }
    }
  }, []);

  // Initialize Spotify SDK
  useEffect(() => {
    if (!isConnected) return;

    const token = sessionStorage.getItem('spotify_token');
    if (!token) return;

    // Load Spotify SDK
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);

    (window as any).onSpotifyWebPlaybackSDKReady = () => {
      const player = new (window as any).Spotify.Player({
        name: 'AeroRead System',
        getOAuthToken: (cb: (token: string) => void) => {
          cb(token);
        },
        volume: 0.5,
      });

      player.addListener('ready', ({ device_id }: { device_id: string }) => {
        console.log('Sonic Module ready with Device ID:', device_id);
        setDeviceId(device_id);
        setIsReady(true);
      });

      player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
        console.log('Device ID has gone offline:', device_id);
        setIsReady(false);
      });

      player.addListener('player_state_changed', (state: any) => {
        if (!state) return;
        
        setCurrentTrack(state.track_window.current_track);
        setIsPaused(state.paused);
      });

      player.addListener('initialization_error', ({ message }: { message: string }) => {
        console.error('Initialization error:', message);
      });

      player.addListener('authentication_error', ({ message }: { message: string }) => {
        console.error('Authentication error:', message);
        sessionStorage.removeItem('spotify_token');
        setIsConnected(false);
      });

      player.connect();
      playerRef.current = player;
    };

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect();
      }
    };
  }, [isConnected]);

  const handleConnect = () => {
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}&response_type=token&show_dialog=true`;
    window.location.href = authUrl;
  };

  const handlePlayPause = async () => {
    if (playerRef.current) {
      await playerRef.current.togglePlay();
    }
  };

  const handleNext = async () => {
    if (playerRef.current) {
      await playerRef.current.nextTrack();
    }
  };

  const handlePrevious = async () => {
    if (playerRef.current) {
      await playerRef.current.previousTrack();
    }
  };

  const handleVolumeToggle = async () => {
    if (playerRef.current) {
      if (isMuted) {
        await playerRef.current.setVolume(previousVolumeRef.current);
        setVolume(previousVolumeRef.current);
      } else {
        previousVolumeRef.current = volume;
        await playerRef.current.setVolume(0);
        setVolume(0);
      }
      setIsMuted(!isMuted);
    }
  };

  // Stealth mode classes
  const stealthClasses = `transition-opacity duration-500 ${
    isStealthActive ? 'opacity-0 pointer-events-none' : 'opacity-100'
  }`;

  return (
    <div className={`fixed bottom-20 right-4 z-50 ${stealthClasses}`}>
      <div className="w-72 bg-[#0f172a]/90 backdrop-blur-md border border-primary rounded-none p-3 shadow-lg">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <Music2 className="w-4 h-4 text-primary" />
          <span className="ui-label text-primary text-xs">[ SONIC MODULE ]</span>
        </div>

        {!isConnected ? (
          // Connect Button
          <button
            onClick={handleConnect}
            className="w-full flex items-center justify-center gap-2 py-2 literary-panel hover:literary-panel-active transition-all duration-200 rounded-none"
          >
            <Link2 className="w-4 h-4 text-primary" />
            <span className="ui-label text-primary text-xs">[ LINK STREAM ]</span>
          </button>
        ) : !isReady ? (
          // Connecting state
          <div className="text-center py-3">
            <span className="ui-label text-dust text-xs animate-pulse-soft">
              [ INITIALIZING AUDIO STREAM... ]
            </span>
          </div>
        ) : (
          // Player Controls
          <div className="space-y-3">
            {/* Track Info */}
            <div className="overflow-hidden">
              {currentTrack ? (
                <div className="space-y-1">
                  <div className="overflow-hidden whitespace-nowrap">
                    <p className="font-reader text-sm text-foreground animate-marquee inline-block">
                      {currentTrack.name}
                    </p>
                  </div>
                  <p className="text-dust text-xs font-ui truncate">
                    {currentTrack.artists.map((a: any) => a.name).join(', ')}
                  </p>
                </div>
              ) : (
                <p className="text-dust text-xs font-ui text-center">
                  Select "AeroRead System" in Spotify
                </p>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handlePrevious}
                className="p-2 hover:bg-primary/10 transition-colors rounded-none"
                disabled={!currentTrack}
              >
                <SkipBack className="w-4 h-4 text-primary" />
              </button>
              
              <button
                onClick={handlePlayPause}
                className="p-3 literary-panel hover:literary-panel-active transition-all rounded-none"
                disabled={!currentTrack}
              >
                {isPaused ? (
                  <Play className="w-5 h-5 text-primary" />
                ) : (
                  <Pause className="w-5 h-5 text-primary" />
                )}
              </button>
              
              <button
                onClick={handleNext}
                className="p-2 hover:bg-primary/10 transition-colors rounded-none"
                disabled={!currentTrack}
              >
                <SkipForward className="w-4 h-4 text-primary" />
              </button>

              <button
                onClick={handleVolumeToggle}
                className="p-2 hover:bg-primary/10 transition-colors rounded-none ml-2"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-dust" />
                ) : (
                  <Volume2 className="w-4 h-4 text-primary" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
