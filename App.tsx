import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sword, 
  Map as MapIcon, 
  Backpack, 
  ChevronRight, 
  Loader2, 
  Sparkles, 
  Image as ImageIcon,
  Key,
  RefreshCw
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';
import { GameState, HistoryItem } from './types';
import { generateStoryStep, generateImage } from './services/geminiService';

// Extend window for AI Studio API
declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const INITIAL_STATE: GameState = {
  story: "# Welcome to Infinite Odyssey\n\nYour journey begins here. Choose your starting path...",
  choices: ["A mysterious forest", "A bustling medieval city", "A desolate mountain peak"],
  inventory: [],
  currentQuest: "Choose your origin",
  visualContext: "A cinematic landscape representing the start of an epic adventure."
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [apiKeySelected, setApiKeySelected] = useState(false);
  const [imageSize, setImageSize] = useState<"1K" | "2K" | "4K">("1K");

  // Check for API key on mount
  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setApiKeySelected(hasKey);
      }
    };
    checkKey();
  }, []);

  const handleOpenKeyDialog = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setApiKeySelected(true); // Assume success as per guidelines
    }
  };

  const updateStory = useCallback(async (choice: string) => {
    setIsLoading(true);
    setIsImageLoading(true);
    
    try {
      // 1. Generate new story step
      const { newState, rawResponse } = await generateStoryStep(
        process.env.GEMINI_API_KEY || "",
        history,
        choice,
        gameState
      );

      setGameState(newState);
      setHistory(prev => [
        ...prev,
        { role: 'user', parts: [{ text: choice }] },
        { role: 'model', parts: [{ text: rawResponse }] }
      ]);

      // 2. Generate image for the new scene
      const imageUrl = await generateImage(
        process.env.GEMINI_API_KEY || "",
        newState.visualContext,
        imageSize
      );
      setCurrentImage(imageUrl);
    } catch (error) {
      console.error("Failed to update story:", error);
    } finally {
      setIsLoading(false);
      setIsImageLoading(false);
    }
  }, [history, gameState, imageSize]);

  const handleChoice = (choice: string) => {
    if (!apiKeySelected) {
      handleOpenKeyDialog();
      return;
    }
    updateStory(choice);
  };

  const resetGame = () => {
    setGameState(INITIAL_STATE);
    setHistory([]);
    setCurrentImage(null);
  };

  if (!apiKeySelected) {
    return (
      <div className="min-h-screen bg-[#0a0502] flex items-center justify-center p-6 text-white font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl text-center"
        >
          <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Key className="w-8 h-8 text-orange-500" />
          </div>
          <h1 className="text-3xl font-light tracking-tight mb-4">Infinite Odyssey</h1>
          <p className="text-white/60 mb-8 leading-relaxed">
            To generate cinematic visuals and dynamic stories, you need to select a Gemini API key.
          </p>
          <button 
            onClick={handleOpenKeyDialog}
            className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-medium transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            Select API Key
          </button>
          <p className="mt-4 text-xs text-white/40">
            Requires a paid Google Cloud project. <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline">Learn more</a>
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0502] text-white font-sans selection:bg-orange-500/30">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-orange-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 border-r border-white/10 bg-black/40 backdrop-blur-2xl flex flex-col p-6 overflow-y-auto">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-medium tracking-tight">Odyssey</h1>
          </div>

          <div className="space-y-8">
            <section>
              <div className="flex items-center gap-2 text-white/40 text-xs uppercase tracking-widest mb-4">
                <MapIcon className="w-4 h-4" />
                Current Quest
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                <p className="text-sm leading-relaxed text-white/90">
                  {gameState.currentQuest}
                </p>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 text-white/40 text-xs uppercase tracking-widest mb-4">
                <Backpack className="w-4 h-4" />
                Inventory
              </div>
              <div className="space-y-2">
                {gameState.inventory.length > 0 ? (
                  gameState.inventory.map((item, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-xl text-sm text-white/70"
                    >
                      <Sword className="w-4 h-4 text-orange-500" />
                      {item}
                    </motion.div>
                  ))
                ) : (
                  <p className="text-sm text-white/20 italic">Empty...</p>
                )}
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 text-white/40 text-xs uppercase tracking-widest mb-4">
                <ImageIcon className="w-4 h-4" />
                Visual Quality
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(["1K", "2K", "4K"] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setImageSize(size)}
                    className={cn(
                      "py-2 rounded-lg text-xs font-medium transition-all border",
                      imageSize === size 
                        ? "bg-orange-500 border-orange-500 text-white" 
                        : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-auto pt-8">
            <button 
              onClick={resetGame}
              className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-white/60 flex items-center justify-center gap-2 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Reset Journey
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto relative">
          <div className="max-w-4xl mx-auto p-12 pb-32">
            {/* Image Section */}
            <div className="aspect-video w-full bg-white/5 rounded-[32px] overflow-hidden border border-white/10 mb-12 relative shadow-2xl">
              <AnimatePresence mode="wait">
                {isImageLoading ? (
                  <motion.div 
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md"
                  >
                    <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
                    <p className="text-white/40 text-sm font-medium tracking-widest uppercase">Visualizing Scene...</p>
                  </motion.div>
                ) : currentImage ? (
                  <motion.img 
                    key="image"
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    src={currentImage}
                    alt="Scene"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20">
                    <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-sm uppercase tracking-widest">No visual generated yet</p>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Story Section */}
            <div className="space-y-12">
              <motion.div 
                key={gameState.story}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="prose prose-invert prose-orange max-w-none"
              >
                <div className="text-2xl font-light leading-relaxed text-white/90 tracking-tight">
                  <ReactMarkdown>{gameState.story}</ReactMarkdown>
                </div>
              </motion.div>

              {/* Choices */}
              <div className="grid grid-cols-1 gap-4">
                {gameState.choices.map((choice, i) => (
                  <motion.button
                    key={choice}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => handleChoice(choice)}
                    disabled={isLoading}
                    className={cn(
                      "group relative p-6 rounded-2xl text-left transition-all border overflow-hidden",
                      isLoading 
                        ? "bg-white/5 border-white/5 cursor-not-allowed" 
                        : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-orange-500/50 active:scale-[0.98]"
                    )}
                  >
                    <div className="flex items-center justify-between relative z-10">
                      <span className="text-lg font-light text-white/80 group-hover:text-white transition-colors">
                        {choice}
                      </span>
                      <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-orange-500 transition-colors" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/5 to-orange-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          {/* Loading Overlay */}
          <AnimatePresence>
            {isLoading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed bottom-12 right-12 bg-orange-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 font-medium"
              >
                <Loader2 className="w-5 h-5 animate-spin" />
                Weaving Fate...
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
