
import { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ConnectionState, AIConfig } from '../types';
import { decode, decodeAudioData, createPcmBlob } from '../utils/audioUtils';

const SAMPLE_RATE_INPUT = 16000;
const SAMPLE_RATE_OUTPUT = 24000;

export const useGeminiLive = () => {
  const [status, setStatus] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [outputAnalyser, setOutputAnalyser] = useState<AnalyserNode | null>(null);
  const [groundingMetadata, setGroundingMetadata] = useState<any>(null);

  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const activeSessionRef = useRef<Promise<any> | null>(null); 
  
  const currentInputRef = useRef<string>('');
  const currentOutputRef = useRef<string>('');

  const cleanup = useCallback((keepErrorStatus = false) => {
    sourcesRef.current.forEach((source) => {
      try { source.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();

    if (inputContextRef.current) {
      inputContextRef.current.close().catch(() => {});
    }
    if (outputContextRef.current) {
      outputContextRef.current.close().catch(() => {});
    }
    
    inputContextRef.current = null;
    outputContextRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (activeSessionRef.current) {
      activeSessionRef.current.then((session) => {
        try { session.close(); } catch (e) {}
      }).catch(() => {});
    }
    activeSessionRef.current = null;

    setOutputAnalyser(null);
    setGroundingMetadata(null);
    if (!keepErrorStatus) {
      setStatus(ConnectionState.DISCONNECTED);
    }
    nextStartTimeRef.current = 0;
  }, []);

  const connectGemini = async (config: AIConfig) => {
    try {
      setStatus(ConnectionState.CONNECTING);
      console.log('[SYSTEM] Initializing F.R.I.D.A.Y. Core...');

      // Check for Secure Context (Microphone requires HTTPS or localhost)
      if (!window.isSecureContext) {
        throw new Error("Neural link requires a secure connection (HTTPS).");
      }

      // Check for MediaDevices support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Your browser environment does not support neural audio linking.");
      }

      // Get User Location for Maps Grounding
      let locationConfig = {};
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        locationConfig = {
          retrievalConfig: {
            latLng: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            }
          }
        };
        console.log('[SYSTEM] Location acquired for tactical support.');
      } catch (e) {
        console.log('[SYSTEM] Location unavailable. Tactical map support limited.');
      }

      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      inputContextRef.current = new AudioContextClass({ sampleRate: SAMPLE_RATE_INPUT });
      outputContextRef.current = new AudioContextClass({ sampleRate: SAMPLE_RATE_OUTPUT });

      // Ensure contexts are resumed (critical for modern browser policies)
      await inputContextRef.current.resume();
      await outputContextRef.current.resume();

      const analyser = outputContextRef.current.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;
      setOutputAnalyser(analyser);

      try {
        console.log('[SYSTEM] Requesting microphone authorization...');
        streamRef.current = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: SAMPLE_RATE_INPUT
          } 
        });
      } catch (err: any) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          throw new Error("Access Denied: Please enable microphone permissions in your browser.");
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          throw new Error("Hardware Failure: No microphone detected on this system.");
        } else {
          throw new Error(`Neural link failed: ${err.message || "Microphone access denied."}`);
        }
      }

      const apiKey = process.env.API_KEY as string;
      const ai = new GoogleGenAI({ apiKey });
      
      const sessionPromise = ai.live.connect({
        model: config.modelId,
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voiceName } },
          },
          systemInstruction: config.systemInstruction,
          tools: [{ googleMaps: {} }, { googleSearch: {} }],
          toolConfig: locationConfig
        },
        callbacks: {
          onopen: () => {
            console.log('[SYSTEM] Neural Link established. Systems online.');
            setStatus(ConnectionState.CONNECTED);
            
            if (!inputContextRef.current || !streamRef.current) return;
            
            const source = inputContextRef.current.createMediaStreamSource(streamRef.current);
            const scriptProcessor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
            processorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              }).catch(() => {});
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription?.text) {
                currentInputRef.current += message.serverContent.inputTranscription.text;
            }
            if (message.serverContent?.outputTranscription?.text) {
                currentOutputRef.current += message.serverContent.outputTranscription.text;
            }

            // Handle Grounding Metadata (Maps)
            const serverContent = message.serverContent as any;
            if (serverContent?.groundingMetadata) {
              console.log('[SYSTEM] Received tactical map data.');
              setGroundingMetadata(serverContent.groundingMetadata);
            }

            if (message.serverContent?.turnComplete) {
                const fullInput = currentInputRef.current.trim();
                const fullOutput = currentOutputRef.current.trim();
                if (fullInput) console.log(`[USER] ${fullInput}`);
                if (fullOutput) console.log(`[AI] ${fullOutput}`);
                currentInputRef.current = '';
                currentOutputRef.current = '';
            }

            const parts = message.serverContent?.modelTurn?.parts || [];
            for (const part of parts) {
              if (part.inlineData?.data && outputContextRef.current) {
                const ctx = outputContextRef.current;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                
                try {
                  const audioBuffer = await decodeAudioData(decode(part.inlineData.data), ctx, SAMPLE_RATE_OUTPUT, 1);
                  const source = ctx.createBufferSource();
                  source.buffer = audioBuffer;
                  
                  source.connect(analyser);
                  analyser.connect(ctx.destination);

                  source.start(nextStartTimeRef.current);
                  nextStartTimeRef.current += audioBuffer.duration;
                  sourcesRef.current.add(source);
                  source.onended = () => sourcesRef.current.delete(source);
                } catch (err) {
                  console.error("Audio decode error:", err);
                }
              }
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(src => {
                try { src.stop(); } catch(e) {}
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: (e) => {
            if (e.reason) console.log(`[SYSTEM] Uplink terminated: ${e.reason}`);
            setStatus(ConnectionState.DISCONNECTED);
          },
          onerror: (err: any) => {
            console.error("Live API Error:", err);
            console.log('[SYSTEM] Neural Link failure.');
            if (err.message && err.message.includes("Requested entity was not found.")) {
              (window as any).aistudio?.openSelectKey();
            }
            setStatus(ConnectionState.ERROR);
          }
        }
      });
      activeSessionRef.current = sessionPromise;
    } catch (error: any) {
      console.error("Connection error:", error);
      if (error.message && error.message.includes("Requested entity was not found.")) {
        (window as any).aistudio?.openSelectKey();
      }
      console.log(`[SYSTEM] Error: ${error.message}`);
      setStatus(ConnectionState.ERROR);
      cleanup(true);
    }
  };

  const connect = useCallback(async (config: AIConfig) => {
    await connectGemini(config);
  }, [cleanup]);

  const disconnect = useCallback(() => {
    console.log('[SYSTEM] Shutting down protocols...');
    cleanup();
  }, [cleanup]);

  return { status, connect, disconnect, outputAnalyser, groundingMetadata };
};
