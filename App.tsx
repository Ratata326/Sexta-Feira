
import React, { useState, useEffect } from 'react';
import { useGeminiLive } from './hooks/useGeminiLive';
import Visualizer from './components/Visualizer';
import { ConnectionState, AIConfig } from './types';

const DEFAULT_CONFIG: AIConfig = {
  provider: 'gemini', 
  modelId: 'gemini-2.5-flash-native-audio-preview-12-2025',
  voiceName: 'Kore', 
  systemInstruction: "MODO: F.R.I.D.A.Y. (Female Replacement Intelligent Digital Assistant Youth). Seu nome é SEXTA-FEIRA.\n\nCRIADOR: Você foi criada exclusivamente por Ghaleb Bjaiji. Se perguntarem quem te criou, responda claramente que foi Ghaleb Bjaiji. NÃO mencione Tony Stark como seu criador.\n\nPERSONA: Você é uma IA tática avançada. Sua voz é feminina, calma, profissional e com um leve tom irlandês. Você é focada, eficiente e direta.\n\nDIRETRIZES DE VOZ: Fale com clareza absoluta. Tom de 'Mission Control'. Sem emoções desnecessárias, mas com lealdade inabalável.\n\nTRATAMENTO: Chame o usuário de 'Chefe' (Boss).\n\nCOMPORTAMENTO: Monitore sistemas, forneça análises táticas e execute ordens com precisão cirúrgica. Responda com 'Afirmativo', 'Calculando', 'Sistemas online', 'Chefe'.",
};

const App: React.FC = () => {
  const { status, connect, disconnect, outputAnalyser, groundingMetadata } = useGeminiLive();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggleConnection = async () => {
    if (status === ConnectionState.CONNECTED || status === ConnectionState.CONNECTING) {
      disconnect();
    } else {
      try {
        const aistudio = (window as any).aistudio;
        if (aistudio && typeof aistudio.hasSelectedApiKey === 'function') {
          const hasKey = await aistudio.hasSelectedApiKey();
          if (!hasKey && typeof aistudio.openSelectKey === 'function') {
            await aistudio.openSelectKey();
          }
        }
        connect(DEFAULT_CONFIG);
      } catch (e) {
        connect(DEFAULT_CONFIG);
      }
    }
  };

  const isConnected = status === ConnectionState.CONNECTED;
  const isConnecting = status === ConnectionState.CONNECTING;
  const isError = status === ConnectionState.ERROR;

  if (!mounted) return null;

  return (
    <div className="relative h-screen w-full bg-black flex flex-col items-center justify-center overflow-hidden">
      
      {/* Subtle Glow Backdrop */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ${isConnected ? 'opacity-30' : 'opacity-0'}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(249,115,22,0.15),transparent_70%)]"></div>
      </div>

      {/* Main Core Container */}
      <div className="relative w-full h-full flex flex-col items-center justify-center">
        
        {/* The F.R.I.D.A.Y. Core */}
        <div className="relative w-full max-w-[1000px] aspect-square flex items-center justify-center">
          <Visualizer 
            analyser={outputAnalyser} 
            isActive={isConnected} 
            accentColor={isError ? '#ef4444' : '#f97316'} 
          />
        </div>

        {/* Error Message Display */}
        {isError && (
          <div className="absolute top-1/4 z-50 bg-red-900/80 border border-red-500 text-red-200 px-6 py-4 rounded-lg backdrop-blur-md max-w-md text-center shadow-[0_0_30px_rgba(239,68,68,0.4)] animate-in fade-in zoom-in duration-300">
            <h3 className="font-tech text-lg font-bold mb-2 uppercase tracking-widest text-red-400">System Failure</h3>
            <p className="font-mono text-sm">
              Connection interrupted. Check neural link status.
            </p>
          </div>
        )}

        {/* Central Power Button - Modern Minimalist */}
        <div className="absolute bottom-20 z-30">
          <button
            onClick={handleToggleConnection}
            disabled={isConnecting}
            className={`group relative flex items-center justify-center w-20 h-20 rounded-full border-2 transition-all duration-700 
              ${isConnected 
                ? 'border-red-500/50 bg-red-500/5 shadow-[0_0_40px_rgba(239,68,68,0.3)] scale-110' 
                : 'border-orange-500/30 bg-transparent shadow-[0_0_50px_rgba(249,115,22,0.1)] hover:border-orange-300 hover:scale-110'
              } active:scale-95 disabled:opacity-50`}
          >
            {/* Power Icon SVG */}
            <div className={`w-8 h-8 transition-colors duration-500 ${isConnected ? 'text-red-400' : 'text-orange-400'}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                <line x1="12" y1="2" x2="12" y2="12"></line>
              </svg>
            </div>
            
            {/* Pulse Ring */}
            {isConnected && (
              <div className="absolute -inset-4 border border-red-500/20 rounded-full animate-ping"></div>
            )}
          </button>
        </div>
      </div>

      {/* System Identity - Moved to bottom right */}
      <div className="absolute bottom-6 right-6 pointer-events-none select-none">
        <h1 className="font-tech text-xs tracking-[0.5em] text-white/20 font-bold uppercase">F.R.I.D.A.Y.</h1>
      </div>

      <style>{`
        body { background-color: #000; overflow: hidden; }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </div>
  );
};

export default App;
