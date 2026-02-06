import { useState, useEffect, useRef } from 'react';
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

const SPOTIFY_CLIENT_ID = '40a608d1ec784be9bd338f532815903c';
const REDIRECT_URI = 'http://127.0.0.1:8080/'; 
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

  // --- OAUTH: HANDLES REDIRECT & TOKEN EXCHANGE ---
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    const fetchToken = async (authCode: string) => {
      const codeVerifier = sessionStorage.getItem('spotify_code_verifier');
      
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: SPOTIFY_CLIENT_ID,
          grant_type: 'authorization_code',
          code: authCode,
          redirect_uri: REDIRECT_URI,
          code_verifier: codeVerifier || '',
        }),
      });

      const data = await response.json();
      if (data.access_token) {
        sessionStorage.setItem('spotify_token', data.access_token);
        window.history.replaceState({}, document.title, "/");
        setIsConnected(true);
      }
    };

    if (code) {
      fetchToken(code);
    } else {
      const existingToken = sessionStorage.getItem('spotify_token');
      if (existingToken) {
        setIsConnected(true);
      }
    }
  }, []);

  // --- SDK INITIALIZATION (FULL ORIGINAL LOGIC) ---
  useEffect(() => {
    if (!isConnected) return;

    const token = sessionStorage.getItem('spotify_token');
    if (!token) return;

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

      // Restoration of all listeners
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

  // --- CONNECT HANDLER (PKCE UPGRADE) ---
  const handleConnect = async () => {
    const generateRandomString = (length: number) => {
      const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      const values = crypto.getRandomValues(new Uint8Array(length));
      return values.reduce((acc, x) => acc + possible[x % possible.length], "");
    };

    const codeVerifier = generateRandomString(64);
    
    const sha256 = async (plain: string) => {
      const encoder = new TextEncoder();
      const data = encoder.encode(plain);
      return window.crypto.subtle.digest('SHA-256', data);
    };

    const base64encode = (input: ArrayBuffer) => {
      return btoa(String.fromCharCode(...new Uint8Array(input)))
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    };

    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64encode(hashed);

    window.sessionStorage.setItem('spotify_code_verifier', codeVerifier);

    const params = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      scope: SCOPES,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
    });

    window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
  };

  const handlePlayPause = async () => {
    if (playerRef.current) await playerRef.current.togglePlay();
  };

  const handleNext = async () => {
    if (playerRef.current) await playerRef.current.nextTrack();
  };

  const handlePrevious = async () => {
    if (playerRef.current) await playerRef.current.previousTrack();
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

  const stealthClasses = `transition-opacity duration-500 ${
    isStealthActive ? 'opacity-0 pointer-events-none' : 'opacity-100'
  }`;

  const transferPlayback = async (token: string, deviceId: string) => {
  await fetch('https://api.spotify.com/v1/artists/4Z8W4fKeB5YxbusRsdQVPb', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      device_ids: [deviceId],
      play: true, // This starts the music immediately
    }),
  });
};
  return (
    <div className={`fixed bottom-20 right-4 z-50 ${stealthClasses}`}>
      <div className="w-72 bg-[#0f172a]/90 backdrop-blur-md border border-primary rounded-none p-3 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <Music2 className="w-4 h-4 text-primary" />
          <span className="ui-label text-primary text-xs">[ SONIC MODULE ]</span>
        </div>

        {!isConnected ? (
          <button
            onClick={handleConnect}
            className="w-full flex items-center justify-center gap-2 py-2 literary-panel hover:literary-panel-active transition-all duration-200 rounded-none"
          >
            <Link2 className="w-4 h-4 text-primary" />
            <span className="ui-label text-primary text-xs">[ LINK STREAM ]</span>
          </button>
        ) : !isReady ? (
          <div className="text-center py-3">
            <span className="ui-label text-dust text-xs animate-pulse-soft">
              [ INITIALIZING AUDIO STREAM... ]
            </span>
          </div>
        ) : (
          <div className="space-y-3">
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

            <div className="flex items-center justify-center gap-3">
              <button onClick={handlePrevious} className="p-2 hover:bg-primary/10 transition-colors rounded-none" disabled={!currentTrack}>
                <SkipBack className="w-4 h-4 text-primary" />
              </button>
              
              <button onClick={handlePlayPause} className="p-3 literary-panel hover:literary-panel-active transition-all rounded-none" disabled={!currentTrack}>
                {isPaused ? <Play className="w-5 h-5 text-primary" /> : <Pause className="w-5 h-5 text-primary" />}
              </button>
              
              <button onClick={handleNext} className="p-2 hover:bg-primary/10 transition-colors rounded-none" disabled={!currentTrack}>
                <SkipForward className="w-4 h-4 text-primary" />
              </button>

              <button onClick={handleVolumeToggle} className="p-2 hover:bg-primary/10 transition-colors rounded-none ml-2">
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-dust" /> : <Volume2 className="w-4 h-4 text-primary" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}