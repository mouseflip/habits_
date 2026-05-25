import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Mic, 
  MicOff, 
  Send, 
  X, 
  Scroll, 
  Clock, 
  FileText, 
  Flame, 
  Trophy, 
  Check, 
  AlertTriangle,
  History,
  HelpCircle,
  Play,
  CheckCircle,
  Bookmark
} from 'lucide-react';
import { doc, setDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

interface Quest {
  id: string;
  title: string;
  desc: string;
  xp: number;
  completed: boolean;
  color: string;
}

interface UserProfile {
  userId: string;
  name: string;
  xp: number;
  crystals: number;
  streak: number;
  bossHp: number;
  level: number;
  nextEvolution: string;
  oracleStreak?: number;
  lastOracleDate?: string;
  createdAt: any;
  updatedAt: any;
}

interface OracleRecord {
  date: string; // YYYY-MM-DD
  decrees: string[];
  stressor: string | null;
  blessing: string;
  transcription: string;
  completed: boolean;
  completedDecrees: boolean[];
  linkedQuests?: string[]; // array containing matching questId for each decree index
  updatedAt: any;
}

interface RoyalOracleProps {
  user: any;
  profile: UserProfile | null;
  quests: Quest[];
  isGuest: boolean;
  oracleHistory: OracleRecord[];
  onCompleteQuest: (questId: string, xp: number) => Promise<void>;
  onAwardBonusXp: (xp: number, crystals: number, message: string) => Promise<void>;
  onUnlockCosmetic: (itemId: string, title: string, cost: number, rarity: string) => Promise<void>;
  activeTab: string;
}

export default function RoyalOracle({
  user,
  profile,
  quests,
  isGuest,
  oracleHistory,
  onCompleteQuest,
  onAwardBonusXp,
  onUnlockCosmetic,
  activeTab
}: RoyalOracleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [inputText, setInputText] = useState('');
  const [useTextInput, setUseTextInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recordTimer, setRecordTimer] = useState(0);
  const [showBlessingAnimation, setShowBlessingAnimation] = useState(false);
  const [micStateMsg, setMicStateMsg] = useState('Tap the crystal to initiate morning proclamation');
  const [activeHistoryDate, setActiveHistoryDate] = useState<string | null>(null);
  
  // Timers and countdown state
  const [countdownStr, setCountdownStr] = useState('');

  const recognitionRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);

  const todayDate = new Date().toLocaleDateString('en-CA'); // 'YYYY-MM-DD'
  const todayOracle = oracleHistory.find(o => o.date === todayDate);

  // Countdown timer update
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const diffMs = tomorrow.getTime() - now.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      setCountdownStr(`${diffHours}h ${diffMins}m`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, []);

  // Update linked quest checking whenever quests completeness toggled
  useEffect(() => {
    if (!todayOracle || todayOracle.completed) return;

    // Check if all linked quests are completed now
    const checkLinkedQuestsAndAutoComplete = async () => {
      const currentLinkedQuests = todayOracle.linkedQuests || [];
      const updatedCompletedDecrees = [...(todayOracle.completedDecrees || [false, false, false])];
      let changes = false;

      todayOracle.decrees.forEach((_, index) => {
        const questId = currentLinkedQuests[index];
        if (questId) {
          const quest = quests.find(q => q.id === questId);
          if (quest && quest.completed && !updatedCompletedDecrees[index]) {
            updatedCompletedDecrees[index] = true;
            changes = true;
          }
        }
      });

      if (changes) {
        // Evaluate if completed fully
        const allDone = updatedCompletedDecrees.slice(0, todayOracle.decrees.length).every(v => v === true);
        await handleUpdateOracleState(updatedCompletedDecrees, currentLinkedQuests, allDone);
      }
    };

    checkLinkedQuestsAndAutoComplete();
  }, [quests, todayOracle]);

  // Handle SpeechRecognition Setup
  const startRecording = () => {
    try {
      setErrorMessage(null);
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setUseTextInput(true);
        setMicStateMsg("Web Speech API not supported on this device. Speak using the scroll option below.");
        return;
      }

      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      let silenceTimeout: any;

      rec.onstart = () => {
        setIsRecording(true);
        setRecordTimer(0);
        setTranscription('');
        setMicStateMsg("Listening to morning vocalizations... Speak with royal authority!");
        
        intervalRef.current = setInterval(() => {
          setRecordTimer(prev => {
            if (prev >= 60) {
              stopRecording();
              return 60;
            }
            return prev + 1;
          });
        }, 1000);
      };

      rec.onresult = (e: any) => {
        clearTimeout(silenceTimeout);
        let currentText = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          currentText += e.results[i][0].transcript;
        }
        if (currentText.trim()) {
          setTranscription(currentText);
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech Recognition Error:", e.error);
        if (e.error === 'not-allowed') {
          setErrorMessage("Microphone access denied. Enable recording permissions or Proclaim in Writing.");
          setUseTextInput(true);
        } else {
          setErrorMessage(`Vision clouded during sound-link: ${e.error}`);
        }
        stopRecording();
      };

      rec.onend = () => {
        setIsRecording(false);
        clearInterval(intervalRef.current);
      };

      rec.start();
      recognitionRef.current = rec;
    } catch (err) {
      console.error(err);
      setUseTextInput(true);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    clearInterval(intervalRef.current);
    setIsRecording(false);
  };

  // Submit proclamation of thoughts to backend API
  const handleSubmitProclamation = async (text: string) => {
    if (!text || !text.trim()) {
      setErrorMessage("Thy Proclamation is empty, traveler. Speak or write thy mind!");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/oracle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speechText: text })
      });

      if (!response.ok) {
        throw new Error("Clouded channels. Vision failure.");
      }

      const parsedJson = await response.json();
      if (!parsedJson.decrees || !Array.isArray(parsedJson.decrees)) {
        throw new Error("Royal Decrees parsing invalid.");
      }

      // Proclamation acquired successfully.
      const initialCompletedArr = new Array(parsedJson.decrees.length).fill(false);
      const initialLinkedQuests = new Array(parsedJson.decrees.length).fill('');

      // Calculate new Oracle streak
      let currentOracleStreak = profile ? (profile.oracleStreak || 0) : 0;
      const lastOracleDate = profile ? profile.lastOracleDate : undefined;

      if (!lastOracleDate) {
        currentOracleStreak = 1;
      } else {
        const lastDateObj = new Date(lastOracleDate + 'T12:00:00');
        const todayDateObj = new Date(todayDate + 'T12:00:00');
        const diffDays = Math.round((todayDateObj.getTime() - lastDateObj.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          currentOracleStreak += 1;
        } else if (diffDays > 1) {
          currentOracleStreak = 1;
        }
      }

      // Oracle record model
      const newOracleRecord: OracleRecord = {
        date: todayDate,
        decrees: parsedJson.decrees,
        stressor: parsedJson.stressor || null,
        blessing: parsedJson.blessing || "May thy focus shield thee.",
        transcription: text,
        completed: false,
        completedDecrees: initialCompletedArr,
        linkedQuests: initialLinkedQuests,
        updatedAt: new Date().toISOString()
      };

      // 1. Update Oracle Document 
      if (isGuest) {
        const updatedHistory = [newOracleRecord, ...oracleHistory.filter(o => o.date !== todayDate)];
        localStorage.setItem(`kom_guest_oracle_${user?.uid || 'guest'}`, JSON.stringify(updatedHistory));
        localStorage.setItem('kom_guest_profile', JSON.stringify({
          ...profile,
          oracleStreak: currentOracleStreak,
          lastOracleDate: todayDate,
          updatedAt: new Date().toISOString()
        }));
        // Fire external callbacks safely (will update state)
        window.location.reload(); // Force immediate re-sync for guest simple structure
      } else {
        const docRef = doc(db, 'profiles', user.uid, 'oracle', todayDate);
        await setDoc(docRef, {
          ...newOracleRecord,
          updatedAt: serverTimestamp()
        });

        const userRef = doc(db, 'profiles', user.uid);
        await updateDoc(userRef, {
          oracleStreak: currentOracleStreak,
          lastOracleDate: todayDate,
          updatedAt: serverTimestamp()
        });
      }

      // Check if Oracle Streak unlocks Seer's Lantern accessory
      if (currentOracleStreak === 7) {
        await onUnlockCosmetic('seer_s_lantern', "Seer's Lantern", 180, 'rare');
        alert("✨ LEGENDARY ACHIEVEMENT UNLOCKED! A 7-day Seer's Streak has granted thee the 'Seer's Lantern' accessory inside thy profile inventory! (Worth 180 Crystals)");
      }

      // Reset states
      setTranscription('');
      setInputText('');
      setIsOpen(false);
    } catch (err) {
      console.error(err);
      setErrorMessage("The Oracle's vision is clouded today. Return tomorrow.");
    } finally {
      setIsLoading(false);
    }
  };

  // Update specific decree completions and links in Firestore / Local
  const handleUpdateOracleState = async (completedDecrees: boolean[], linkedQuests: string[], completed: boolean) => {
    if (!todayOracle) return;

    if (isGuest) {
      const updatedRecord: OracleRecord = {
        ...todayOracle,
        completedDecrees,
        linkedQuests,
        completed,
        updatedAt: new Date().toISOString()
      };
      const updatedHistory = oracleHistory.map(o => o.date === todayDate ? updatedRecord : o);
      localStorage.setItem(`kom_guest_oracle_${user?.uid || 'guest'}`, JSON.stringify(updatedHistory));
      
      if (completed && !todayOracle.completed) {
        // Trigger blessing logic
        setShowBlessingAnimation(true);
        await onAwardBonusXp(20, 10, "Oracle's Blessing achieved. Completing all decrees!");
        setTimeout(() => setShowBlessingAnimation(false), 5000);
      }
      // Reload is simplest for instant sync in simple Guest lists
      window.location.reload();
    } else {
      const docRef = doc(db, 'profiles', user.uid, 'oracle', todayDate);
      try {
        await updateDoc(docRef, {
          completedDecrees,
          linkedQuests,
          completed,
          updatedAt: serverTimestamp()
        });

        if (completed && !todayOracle.completed) {
          setShowBlessingAnimation(true);
          await onAwardBonusXp(20, 10, "All daily royal decrees completed!");
          setTimeout(() => setShowBlessingAnimation(false), 5000);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `profiles/${user.uid}/oracle/${todayDate}`);
      }
    }
  };

  const handleToggleDecree = async (index: number) => {
    if (!todayOracle) return;

    const currentCompleted = [...(todayOracle.completedDecrees || [])];
    const currentLinked = [...(todayOracle.linkedQuests || [])];
    
    const newVal = !currentCompleted[index];
    currentCompleted[index] = newVal;

    // Link triggering: If checking manually, complete the linked daily quest too!
    const linkedQuestId = currentLinked[index];
    if (newVal && linkedQuestId) {
      const targetQuest = quests.find(q => q.id === linkedQuestId);
      if (targetQuest && !targetQuest.completed) {
        await onCompleteQuest(targetQuest.id, targetQuest.xp);
      }
    }

    const allFinished = currentCompleted.slice(0, todayOracle.decrees.length).every(v => v === true);
    await handleUpdateOracleState(currentCompleted, currentLinked, allFinished);
  };

  const handleMapQuestLink = async (decreeIndex: number, questId: string) => {
    if (!todayOracle) return;

    const currentCompleted = [...(todayOracle.completedDecrees || [])];
    const currentLinked = [...(todayOracle.linkedQuests || [])];

    currentLinked[decreeIndex] = questId;

    // Check if the newly linked quest is already complete
    if (questId) {
      const quest = quests.find(q => q.id === questId);
      if (quest && quest.completed) {
        currentCompleted[decreeIndex] = true;
      }
    }

    const allFinished = currentCompleted.slice(0, todayOracle.decrees.length).every(v => v === true);
    await handleUpdateOracleState(currentCompleted, currentLinked, allFinished);
  };

  return (
    <div id="royal_oracle_parent" className="w-full flex flex-col gap-4">
      {/* 1. Golden Blessing Sparks Animation */}
      <AnimatePresence>
        {showBlessingAnimation && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-yellow-400/10 pointer-events-none flex flex-col items-center justify-center p-8 text-center"
          >
            {/* Sparkling star emitters */}
            {[...Array(40)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: Math.random() * window.innerWidth - window.innerWidth/2, 
                  y: window.innerHeight, 
                  scale: Math.random() * 1.5 + 0.5,
                  opacity: 1 
                }}
                animate={{ 
                  y: -100, 
                  rotate: Math.random() * 360,
                  opacity: 0 
                }}
                transition={{ 
                  duration: Math.random() * 3 + 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute w-3 h-3 text-yellow-300 pointer-events-none"
              >
                ✦
              </motion.div>
            ))}
            <motion.div 
              initial={{ scale: 0.5, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8 }}
              className="bg-surface-container-highest border-2 border-yellow-400 p-8 rounded-2xl shadow-[0_0_50px_rgba(234,179,8,0.5)] max-w-sm space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center mx-auto shadow-inner border border-yellow-400/40 animate-pulse">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="font-serif text-2xl text-yellow-400 font-bold">Oracle's Blessing</h3>
              <p className="text-xs text-on-surface-variant font-mono">
                Thou hast successfully satisfied all Morning Daily Decrees!
              </p>
              <div className="py-2 inline-block px-4 rounded bg-yellow-500/15 border border-yellow-500/30 font-mono text-sm text-yellow-300 font-bold">
                +20 XP REWARD HARVESTED
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Crystal Ball Widget Entry */}
      <section className="bg-surface-container rounded-2xl p-6 border border-outline-variant/30 shadow-xl overflow-hidden relative flex flex-col items-center justify-center text-center">
        {/* Mystic energy lines gradient background */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#3b0764]/10 via-transparent to-[#0f172a]/20 pointer-events-none" />
        
        {!todayOracle ? (
          <div className="relative z-10 flex flex-col items-center">
            {/* Glowing crystal orb */}
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsOpen(true)}
              className="relative w-32 h-32 rounded-full flex items-center justify-center group focus:outline-none cursor-pointer"
            >
              {/* Pulsing visual halo rings */}
              <div className="absolute inset-0 rounded-full bg-indigo-500/10 border-2 border-indigo-400/20 animate-ping" />
              <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-xl group-hover:opacity-100 opacity-60 transition-opacity" />
              
              <div className="relative w-28 h-28 rounded-full bg-gradient-to-b from-indigo-900 via-purple-950 to-stone-900 border-2 border-indigo-300/40 shadow-[0_0_30px_rgba(129,140,248,0.4)] overflow-hidden flex flex-col items-center justify-center">
                {/* Rotating nebulae stars */}
                <div className="absolute inset-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(216,180,254,0.15)_0,transparent_60%)] animate-pulse" />
                <Sparkles className="w-8 h-8 text-indigo-300 animate-spin" style={{ animationDuration: '20s' }} />
                <span className="font-mono text-[9px] uppercase tracking-widest text-indigo-200 mt-2 font-bold group-hover:text-white transition-colors">THE ORACLE</span>
              </div>
            </motion.button>

            <h3 className="font-serif text-lg text-on-surface font-semibold mt-4">The Royal Oracle</h3>
            <p className="text-xs text-on-surface-variant/80 max-w-[280px] mt-1">
              Reveal the scrolls. Tap to speak user's morning worries, plans, and thoughts.
            </p>

            {profile?.oracleStreak && profile.oracleStreak > 0 ? (
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 border border-purple-500/25 rounded-full font-mono text-[9px] text-purple-300 font-bold uppercase">
                <Flame className="w-3 h-3 fill-current text-purple-400 animate-bounce" />
                Foresight Streak: {profile.oracleStreak} Days
              </div>
            ) : null}
          </div>
        ) : (
          /* Today's reading already exists - Show Parchment Roll details instead! */
          <div className="w-full relative z-10 text-left">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3 mb-4">
              <span className="font-mono text-[10px] text-indigo-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
                <Scroll className="w-4 h-4 animate-pulse" />
                Foresight Active
              </span>
              <span className="font-mono text-[9px] text-on-surface-variant/80 flex items-center gap-1.5 bg-surface-container-high px-2 py-0.5 rounded border border-outline-variant/30">
                <Clock className="w-3 h-3" />
                Next Proclamation In {countdownStr}
              </span>
            </div>

            {/* The Pergamin Card Scroll */}
            <div className="bg-[#f5ebd2] text-[#2a1b10] rounded-xl p-5 border-2 border-[#8b6e32]/45 shadow-lg relative overflow-hidden font-serif">
              {/* Wax seal watermark effect */}
              <div className="absolute right-3 bottom-3 text-[#b49866]/15 text-7xl select-none pointer-events-none">
                📜
              </div>

              <h4 className="font-serif text-sm font-bold uppercase tracking-wide border-b border-[#8b6e32]/25 pb-2 mb-3 text-[#5c3e10] flex items-center gap-2">
                <span>⚔️</span>
                Today's Royal Decrees
              </h4>

              {/* Decrees checklist */}
              <div className="space-y-3.5 mb-5 relative z-10">
                {todayOracle.decrees.map((decree, i) => {
                  const isCompleted = todayOracle.completedDecrees?.[i] || false;
                  const currentLinkedQuest = todayOracle.linkedQuests?.[i] || '';

                  return (
                    <div key={i} className="flex flex-col gap-1 border-b border-[#8b6e32]/10 pb-2.5 last:border-0 last:pb-0">
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleToggleDecree(i)}
                          className={`w-5 h-5 mt-0.5 rounded cursor-pointer border flex items-center justify-center transition-colors ${
                            isCompleted 
                              ? 'bg-amber-800 text-[#f5ebd2] border-amber-800' 
                              : 'border-amber-900/40 hover:bg-amber-950/10'
                          }`}
                        >
                          {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                        <span className={`text-stone-800 text-xs leading-relaxed flex-1 ${isCompleted ? 'line-through text-stone-500/80 italic' : ''}`}>
                          {decree}
                        </span>
                      </div>

                      {/* Quest link picker */}
                      <div className="pl-8 flex items-center gap-1.5 mt-1 text-[10px] font-sans">
                        <Bookmark className="w-3 h-3 text-[#8b6e32]/60" />
                        <span className="text-stone-600 font-mono text-[9px]">MAPPED TO:</span>
                        <select
                          value={currentLinkedQuest}
                          onChange={(e) => handleMapQuestLink(i, e.target.value)}
                          className="bg-transparent text-[#5c3e10] border-b border-[#8b6e32]/30 text-[10px] py-0.5 max-w-[140px] focus:outline-none focus:border-amber-800 truncate cursor-pointer font-medium"
                        >
                          <option value="">-- No Link --</option>
                          {quests.map(q => (
                            <option key={q.id} value={q.id}>
                              {q.title} {q.completed ? '⚔️' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Distraction identified */}
              {todayOracle.stressor && (
                <div className="flex items-start gap-2 bg-[#ecdcb3] p-3 rounded border border-[#8b6e32]/25 mb-4 text-[#5c3e10] text-[11px] leading-relaxed">
                  <AlertTriangle className="w-4 h-4 text-[#8b5a1b] shrink-0 mt-0.5" />
                  <div className="font-sans">
                    <span className="font-bold uppercase tracking-wider text-[10px] block text-[#8b5a1b] font-mono mb-0.5">Stressor Alert:</span>
                    {todayOracle.stressor}
                  </div>
                </div>
              )}

              {/* Royal Blessing */}
              <div className="text-[11px] italic text-[#4a3518] leading-relaxed border-t border-[#8b6e32]/20 pt-3 relative pl-4">
                <span className="absolute left-0 top-3 text-lg font-bold text-[#8b6e32]/65">“</span>
                {todayOracle.blessing}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 3. The Oracle Portal Portal Recording Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-sm bg-surface-container rounded-3xl border border-outline-variant/50 p-6 shadow-2xl relative flex flex-col items-center gap-6 overflow-hidden"
            >
              {/* Background glows */}
              <div className="absolute top-0 w-44 h-44 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

              <button 
                onClick={() => {
                  stopRecording();
                  setIsOpen(false);
                }}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-surface-container-highest text-on-surface-variant transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center">
                <h3 className="font-serif text-xl font-bold text-on-surface">The Oracle Portal</h3>
                <p className="text-[10px] text-on-surface-variant/85 font-mono uppercase tracking-wider mt-1">Receive thy Daily Decrees</p>
              </div>

              {isLoading ? (
                /* Glowing Loading Chamber Animation */
                <div className="w-full py-12 flex flex-col items-center justify-center gap-6 text-center">
                  <div className="relative">
                    {/* Concentric mystical orbs */}
                    <div className="w-24 h-24 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 blur-xl opacity-40 animate-pulse absolute inset-0" />
                    <div className="w-24 h-24 rounded-full border-4 border-dashed border-indigo-400/50 animate-spin flex items-center justify-center relative bg-indigo-950/20">
                      <Sparkles className="w-8 h-8 text-indigo-300 animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="font-mono text-xs text-indigo-300 font-bold uppercase tracking-widest animate-pulse">Channeling the Oracle...</p>
                    <p className="text-[10px] text-on-surface-variant italic">Reading cosmic paths and compiling royal decrees...</p>
                  </div>
                </div>
              ) : (
                /* Proclamation Input Controls */
                <div className="w-full flex flex-col items-center gap-5">
                  {!useTextInput ? (
                    /* Vocal Recording Panel */
                    <div className="w-full flex flex-col items-center gap-4">
                      <div className="relative w-32 h-32 flex items-center justify-center">
                        {isRecording && (
                          <motion.div 
                            animate={{ scale: [1, 1.3, 1] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="absolute inset-0 bg-red-500/15 rounded-full blur-md"
                          />
                        )}
                        <button
                          onClick={isRecording ? stopRecording : startRecording}
                          className={`w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all ${
                            isRecording 
                              ? 'bg-red-500 text-white shadow-[0_0_25px_rgba(239,68,68,0.5)] border-red-400/40' 
                              : 'bg-indigo-600/90 text-white hover:bg-indigo-600 border-indigo-500/30'
                          } border-2 shadow-lg cursor-pointer`}
                        >
                          {isRecording ? (
                            <MicOff className="w-8 h-8 animate-pulse" />
                          ) : (
                            <Mic className="w-10 h-10" />
                          )}
                          <span className="font-mono text-[8px] font-bold mt-1.5 uppercase tracking-wide">
                            {isRecording ? `${recordTimer}s / 60s` : "START"}
                          </span>
                        </button>
                      </div>

                      <p className="font-mono text-[10px] text-center text-on-surface-variant font-medium max-w-[240px]">
                        {micStateMsg}
                      </p>

                      {transcription && (
                        <div className="w-full text-center bg-surface-container-highest/60 border border-[#8b6e32]/10 p-4 rounded-xl max-h-[140px] overflow-y-auto">
                          <p className="text-[9px] text-[#b49866] font-mono uppercase tracking-wider font-bold mb-1">LIVE TRANSLATION</p>
                          <p className="text-xs text-on-surface italic leading-relaxed">"{transcription}"</p>
                        </div>
                      )}

                      {errorMessage && (
                        <p className="text-[10px] text-red-400 font-mono text-center px-4 leading-normal">{errorMessage}</p>
                      )}

                      <div className="w-full flex flex-col gap-2 border-t border-outline-variant/30 pt-4 mt-2">
                        {transcription.trim() && (
                          <button
                            onClick={() => handleSubmitProclamation(transcription)}
                            className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-mono text-[10px] font-bold uppercase tracking-wider shadow-lg hover:bg-indigo-500 transition-all cursor-pointer flex items-center justify-center gap-2"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Seal & Transcribe Proclamation
                          </button>
                        )}
                        <button
                          onClick={() => setUseTextInput(true)}
                          className="text-[9px] font-mono text-indigo-400/90 hover:text-indigo-300 transition-colors mx-auto underline cursor-pointer"
                        >
                          Proclaim via Scrollwriting (Keyboard fallback)
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Written Proclamation Fallback Scroll */
                    <div className="w-full flex flex-col gap-4">
                      <div className="space-y-1">
                        <label className="block text-[8px] font-mono uppercase tracking-widest text-[#b49866] font-bold">Thoughts and worries scroll</label>
                        <textarea
                          rows={4}
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          placeholder="Speak your mind, worries, or habits for today freely... (e.g., 'I am worried about my history test, but I plan to read 30 minutes in my history tome.')"
                          className="w-full bg-surface-container-highest rounded-xl p-3.5 text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:border-indigo-400 placeholder:text-on-surface-variant/40 leading-relaxed font-sans focus:ring-1 focus:ring-indigo-400"
                        />
                      </div>

                      {errorMessage && (
                        <p className="text-[10px] text-red-500 font-mono text-center pt-1 leading-normal">{errorMessage}</p>
                      )}

                      <div className="flex flex-col gap-2 pt-2">
                        <button
                          onClick={() => handleSubmitProclamation(inputText)}
                          className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-500 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Receive Foresight
                        </button>
                        <button
                          onClick={() => {
                            setUseTextInput(false);
                            setErrorMessage(null);
                          }}
                          className="text-[9px] font-mono text-on-surface-variant hover:text-on-surface transition-colors mx-auto underline cursor-pointer"
                        >
                          Return to Vocal Microphone capture
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. History Chronicle Ledger (Render in Stats subscreen or tab) */}
      {activeTab === 'stats' && (
        <section className="space-y-4 mt-8" id="oracle_history_chronicle">
          <h2 className="font-serif text-xl font-bold flex items-center gap-3">
            <History className="text-tertiary" />
            Oracle History Chronicle
          </h2>
          
          <div className="bg-surface-container rounded-2xl p-4 border border-outline-variant/30 shadow-lg space-y-3">
            {oracleHistory.length === 0 ? (
              <p className="text-center font-mono text-[10px] text-on-surface-variant/70 py-6 italic">
                The Ledger of Foresight is empty. Initiate thy daily morning proclamations to populate the history scroll.
              </p>
            ) : (
              oracleHistory.map((record, index) => {
                const isOpenHist = activeHistoryDate === record.date;
                const formattedDate = new Date(record.date + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                });

                return (
                  <div key={record.date} className="border border-outline-variant/25 rounded-xl overflow-hidden bg-surface-container-low transition-colors">
                    <button
                      onClick={() => setActiveHistoryDate(isOpenHist ? null : record.date)}
                      className="w-full px-4 py-3 bg-surface-container-high/40 hover:bg-surface-container-high flex items-center justify-between text-left cursor-pointer"
                    >
                      <div>
                        <p className="font-serif text-xs font-bold text-on-surface leading-normal">{formattedDate}</p>
                        <p className="text-[9px] font-mono text-on-surface-variant/80 mt-0.5">
                          {record.completed 
                            ? "✅ Victorious: Tumbled all decrees!" 
                            : "⚠️ Decrees incomplete"
                          }
                        </p>
                      </div>
                      <span className="text-stone-500 text-xs">
                        {isOpenHist ? "▲" : "▼"}
                      </span>
                    </button>

                    <AnimatePresence>
                      {isOpenHist && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="border-t border-outline-variant/20 bg-[#fbf6e7] text-[#2c1b10] px-4 py-3 font-serif overflow-hidden"
                        >
                          <div className="text-[11px] leading-relaxed mb-3 space-y-1 bg-[#f4ecca] p-3 rounded border border-amber-900/10 italic text-[#4a3518]">
                            <span className="font-bold block tracking-wider font-mono text-[8px] uppercase text-[#8b5a1b]">Morning thought archive:</span>
                            "{record.transcription}"
                          </div>

                          <div className="space-y-2.5">
                            {record.decrees.map((decree, dI) => (
                              <div key={dI} className="flex items-start gap-2.5 text-xs text-stone-800">
                                <span className={record.completedDecrees?.[dI] ? "text-emerald-700 font-bold" : "text-stone-400"}>
                                  {record.completedDecrees?.[dI] ? "✓" : "◦"}
                                </span>
                                <span className={record.completedDecrees?.[dI] ? "line-through text-stone-500/70" : ""}>
                                  {decree}
                                </span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>
        </section>
      )}
    </div>
  );
}
