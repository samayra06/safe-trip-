
import { useState, useEffect, useRef } from 'react';

export type VoiceStatus = 'NORMAL' | 'HIGH_RISK' | 'LISTENING' | 'UNAVAILABLE';

const VOLUME_THRESHOLD = 128; // Average volume threshold (0-255) to indicate a loud noise/scream.
const ANALYSIS_INTERVAL = 100; // ms

// Fix: Add a specific interface for the Speech Recognition instance to avoid type errors.
interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: any) => void) | null;
  start: () => void;
  stop: () => void;
}

// Compatibility check for Web Speech API
// Fix: Cast window to `any` to access non-standard `SpeechRecognition` and rename to avoid name collision with the type.
const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const useVoiceDetection = (enabled: boolean, safeWord: string) => {
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('NORMAL');
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  // Fix: Use the newly created interface for the ref's type.
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    if (!enabled || !safeWord) {
      setVoiceStatus('UNAVAILABLE');
      return;
    }

    // A function to clean up all resources
    const cleanup = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (recognitionRef.current) {
            recognitionRef.current.onresult = null;
            recognitionRef.current.onend = null;
            recognitionRef.current.onerror = null;
            try {
              recognitionRef.current.stop();
            } catch(e) {
              // Can throw an error if not started, ignore.
            }
            recognitionRef.current = null;
        }
        streamRef.current?.getTracks().forEach(track => track.stop());
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(console.error);
        }
    };

    const setupAudioAndSpeech = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        
        // --- Volume Detection Setup ---
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;
        
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        // --- Speech Recognition Setup ---
        if (SpeechRecognitionAPI) {
            const recognition: SpeechRecognitionInstance = new SpeechRecognitionAPI();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map(result => result[0])
                    .map(result => result.transcript)
                    .join('')
                    .toLowerCase();
                
                if (safeWord && transcript.includes(safeWord.toLowerCase())) {
                    setVoiceStatus('HIGH_RISK');
                }
            };
            
            // Restart recognition if it stops for any reason
            recognition.onend = () => {
                if (recognitionRef.current) { // Only restart if not in cleanup phase
                    try {
                      recognition.start();
                    } catch(e) {
                      console.error("Could not restart speech recognition", e);
                    }
                }
            };
            
            recognition.onerror = (event) => {
                console.error('Speech recognition error', event.error);
            };

            recognitionRef.current = recognition;
            recognition.start();
        }

        setVoiceStatus('LISTENING');
      } catch (err) {
        console.error("Microphone access denied:", err);
        setVoiceStatus('UNAVAILABLE');
      }
    };

    setupAudioAndSpeech();

    return cleanup;
  }, [enabled, safeWord]);

  // Effect for volume analysis
  useEffect(() => {
    // Don't run volume analysis if an alert has already been triggered
    if (voiceStatus !== 'LISTENING') {
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
    }

    const analyser = analyserRef.current;
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    intervalRef.current = window.setInterval(() => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;

      if (average > VOLUME_THRESHOLD) {
        setVoiceStatus('HIGH_RISK');
      }
    }, ANALYSIS_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [voiceStatus]);

  return { voiceStatus };
};
