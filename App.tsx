
import React, { useState, useRef, useEffect } from 'react';
import { GameMode, GameStats, Message } from './types';
import { geminiService } from './services/geminiService';
import StatBar from './components/StatBar';
import TutorNote from './components/TutorNote';

const INITIAL_STATS: GameStats = {
  mode: null,
  confidence: 0, 
  inventory: [],
  location: 'City Entrance',
  level: 1,
};

const App: React.FC = () => {
  const [stats, setStats] = useState<GameStats>({ ...INITIAL_STATS });
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [cityImageUrl, setCityImageUrl] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchImage = async () => {
      setIsLoadingImage(true);
      const url = await geminiService.generateCityImage();
      setCityImageUrl(url);
      setIsLoadingImage(false);
    };
    fetchImage();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const selectMode = async (mode: GameMode) => {
    setError(null);
    setStats({ ...INITIAL_STATS, mode });
    setMessages([]);
    setIsTyping(true);
    try {
      const startData = await geminiService.startNewGame(mode);
      setMessages([{ 
        role: 'assistant', 
        content: startData.narrative 
      }]);
      updateStats(startData.statsUpdate, false);
    } catch (err: any) {
      console.error("Failed to start game:", err);
      setError(err.message || "Could not connect to the city. Please try again.");
    } finally {
      setIsTyping(false);
    }
  };

  const updateStats = (update: any, levelCompleted: boolean = false) => {
    setStats(prev => {
      const rawDelta = update.confidenceDelta || 0;
      const dampedDelta = rawDelta > 0 ? Math.min(rawDelta, 6) : rawDelta;
      
      const newConfidence = Math.max(0, Math.min(100, prev.confidence + dampedDelta));
      const newInventory = [...prev.inventory];
      if (update.newInventoryItem) newInventory.push(update.newInventoryItem);
      if (update.removedInventoryItem) {
        const idx = newInventory.indexOf(update.removedInventoryItem);
        if (idx > -1) newInventory.splice(idx, 1);
      }
      return {
        ...prev,
        confidence: newConfidence,
        inventory: newInventory,
        location: update.newLocation || prev.location,
        level: levelCompleted ? prev.level + 1 : prev.level
      };
    });

    if (levelCompleted) {
      setShowLevelUp(true);
      setTimeout(() => setShowLevelUp(false), 3000);
    }
  };

  const exitToMenu = () => {
    setStats({ ...INITIAL_STATS });
    setMessages([]);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !stats.mode || isTyping) return;

    setError(null);
    const userText = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setIsTyping(true);

    try {
      const response = await geminiService.processTurn(
        stats.mode,
        stats,
        messages.map(m => ({ role: m.role, content: m.content })),
        userText
      );

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.narrative,
        tutorNote: response.tutorNote
      }]);
      updateStats(response.statsUpdate, response.isLevelComplete);
    } catch (err: any) {
      console.error("Turn processing failed:", err);
      setError(err.message || "Something went wrong in the city. Try again.");
    } finally {
      setIsTyping(false);
    }
  };

  if (!stats.mode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gray-950">
        {cityImageUrl ? (
          <div 
            className="absolute inset-0 bg-cover bg-center animate-fade-in opacity-40 transition-opacity duration-1000"
            style={{ backgroundImage: `url(${cityImageUrl})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
            {isLoadingImage && <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>}
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950/20 via-gray-950/70 to-gray-950"></div>

        <div className="max-w-4xl w-full glass rounded-[3rem] shadow-2xl p-8 md:p-14 border border-white/10 text-center relative z-10 animate-fade-in">
          <div className="mb-14">
            <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tighter uppercase italic leading-none">
              Talk of the <span className="text-indigo-400">Town</span>
            </h1>
            <p className="text-indigo-100 text-lg md:text-xl font-light tracking-wide max-w-2xl mx-auto opacity-90">
              Your immersive English journey starts in Polyglot City.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.values(GameMode).map((mode) => (
              <button
                key={mode}
                onClick={() => selectMode(mode)}
                className="group relative bg-white/5 hover:bg-indigo-600/30 transition-all duration-500 p-8 rounded-[2rem] border border-white/10 text-left overflow-hidden hover:-translate-y-2 hover:border-indigo-400/50 hover:shadow-2xl"
              >
                <div className="relative z-10">
                  <h3 className="text-2xl font-black text-white mb-3 tracking-tight group-hover:text-indigo-200 transition-colors uppercase italic">{mode}</h3>
                  <p className="text-sm text-gray-300 group-hover:text-white leading-relaxed font-medium">
                    {mode === GameMode.TOURIST && "Essential survival. From ordering coffee to finding the metro, every word counts."}
                    {mode === GameMode.SOCIALITE && "Social mastery. Navigate parties, master sarcasm, and build connections."}
                    {mode === GameMode.PROFESSIONAL && "High stakes. Deliver the pitch of your life and negotiate global contracts."}
                    {mode === GameMode.CRISIS && "Absolute precision. Clear communication in life-or-death urban scenarios."}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-8 p-4 bg-rose-950/50 border border-rose-500/30 rounded-xl text-rose-300 text-sm animate-fade-in">
              {error}
            </div>
          )}

          <div className="mt-14 pt-10 border-t border-white/10 flex flex-col items-center">
            <p className="text-xs text-indigo-400 font-bold uppercase tracking-[0.3em] mb-6">Choose your destiny</p>
            <div className="group relative">
               <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
               <div className="relative text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-widest bg-black/60 px-8 py-3 rounded-full border border-white/10 flex items-center space-x-2">
                 <span>Created by</span>
                 <span className="text-white font-black">Shalaka Kashikar</span>
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-950 text-gray-100 font-sans antialiased">
      <StatBar stats={stats} onExit={exitToMenu} />

      {showLevelUp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
          <div className="bg-amber-500 text-gray-950 px-12 py-8 rounded-full font-black text-4xl md:text-5xl shadow-[0_0_100px_rgba(245,158,11,0.7)] animate-bounce border-8 border-white uppercase italic">
            LEVEL UP! 🚀
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto p-4 md:p-12 scroll-smooth bg-[radial-gradient(circle_at_top,rgba(30,30,80,0.2)_0%,rgba(10,10,15,1)_70%)]">
        <div className="max-w-4xl mx-auto space-y-12 pb-12">
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start animate-fade-in'}`}
            >
              <div 
                className={`max-w-[92%] md:max-w-[85%] rounded-[2.5rem] p-6 md:p-10 shadow-2xl transition-all ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none border-b-[8px] border-indigo-800' 
                    : 'bg-gray-800/60 glass text-gray-100 border border-white/5 rounded-tl-none border-b-[8px] border-gray-900/50'
                }`}
              >
                <div className="prose prose-invert max-w-none whitespace-pre-wrap leading-relaxed text-base md:text-xl font-medium tracking-tight">
                  {msg.content}
                </div>
                {msg.tutorNote && <TutorNote note={msg.tutorNote} />}
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex items-center space-x-4 text-indigo-400 bg-indigo-950/30 px-6 py-3 rounded-full w-fit border border-indigo-500/20 shadow-xl backdrop-blur-sm">
              <div className="flex space-x-2">
                <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
                <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
              </div>
              <span className="text-xs font-black uppercase tracking-[0.3em]">Processing Response</span>
            </div>
          )}

          {error && (
            <div className="bg-rose-950/30 border border-rose-500/20 p-6 rounded-2xl text-rose-300 text-sm flex items-center space-x-4 animate-fade-in">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="bg-gray-950 border-t border-white/5 p-4 md:p-8 relative z-20 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-5">
            <input
              type="text"
              autoFocus
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your dialogue..."
              className="flex-1 bg-gray-900/80 border-2 border-white/10 rounded-[1.2rem] px-8 py-4 focus:outline-none focus:border-indigo-500 text-white text-xl transition-all placeholder-gray-700 font-medium"
              disabled={isTyping}
            />
            <button
              type="submit"
              disabled={isTyping || !inputValue.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black py-4 px-12 rounded-[1.2rem] transition-all shadow-indigo-900/20 active:scale-95 uppercase tracking-tighter text-lg border-b-4 border-indigo-800"
            >
              Speak
            </button>
          </form>
          <div className="mt-6 flex flex-wrap justify-between items-center gap-4 px-4">
             <div className="flex items-center space-x-5 text-[10px] text-gray-500 uppercase font-black tracking-[0.2em]">
                <span className="bg-gray-900 px-3 py-1 rounded border border-white/5 shadow-sm">Level {stats.level} Challenge</span>
                <span className="opacity-40 hidden sm:block">Press Enter to Communicate</span>
             </div>
             <div className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] opacity-80 group">
                Created by <span className="text-gray-300 group-hover:text-indigo-400 transition-colors">Shalaka Kashikar</span>
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
