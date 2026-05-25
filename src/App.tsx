/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Swords, 
  Castle, 
  BarChart3, 
  Store, 
  User as UserIcon, 
  BookOpen, 
  Palette, 
  Wrench, 
  Timer, 
  Flame, 
  Diamond, 
  Shield, 
  Lock,
  Star,
  Zap,
  LayoutGrid,
  ChevronRight,
  TrendingUp,
  Trophy,
  Activity,
  Backpack,
  ArrowRight,
  LogOut,
  Plus,
  Trash2,
  RefreshCw,
  Sparkles,
  LogIn
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import RoyalOracle from './components/RoyalOracle';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc,
  setDoc, 
  updateDoc, 
  collection, 
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  getDocFromServer
} from 'firebase/firestore';

// --- Type Declarations ---

type Tab = 'arena' | 'districts' | 'stats' | 'shop' | 'profile';
type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

interface Quest {
  id: string;
  title: string;
  desc: string;
  xp: number;
  completed: boolean;
  color: string;
}

interface District {
  id: string;
  name: string;
  desc: string;
  level: number;
  xp: number;
  maxXp: number;
  pathName: string;
  perAction: string;
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
  createdAt: any;
  updatedAt: any;
}

interface InventoryItem {
  itemId: string;
  title: string;
  rarity: string;
  category: string;
  purchasedAt: any;
}

interface ShopItem {
  title: string;
  desc: string;
  cost: number;
  type: string;
  icon: React.ReactNode;
  rarity: Rarity;
}

// --- Graphical Assets Map ---

const IMAGES = {
  AVATAR_THUMB: "https://lh3.googleusercontent.com/aida-public/AB6AXuDXyIPIFR6R8BxKrU52h4--AfVKL28mUbFLZKHjVA9Nrhkl4yC28gnsKD8Ybi1D7OQ634_DlGbxN4_jobjx6zpude_17IXe506bQEh7BfJDJKJPM9gYunhAIuIoR-4kE4WUj45CGV75N493L17j0wgbVYzy26RLBGSMAV5pZZ1RiznXVkfvXbrEqIT9m-lxgvzNbaeFVIL52X6L00cMntnWxclKeu9qNGa7sx3Tr3CpAVYCGgTbU2H3nhu6UdDjK1L4oGAgqK2A4en6",
  WIZARD_HERO: "https://lh3.googleusercontent.com/aida-public/AB6AXuAXkYxpOOI8GMkZfxMMRtnCn33aakI31aNmBPU3TZHkL2EueHf_Ea2oiHImxFXsv_P2aBzFNSqy4wiPTYkmrNk2BJD0eiFtsHUzItAKnSHhUCWzhdok0nDRPlNPM9n5XXKODqdsf7hz25f5jAU4Xtxr_4iPuJxE3PtHLoT_kqnOrneqbzgOwVzu1icZxMLW5SefHC9nnCupgqkqXJB-I7fYIRDnD0I6ilJUOtcTO3XU2vUKiTzpOYzOkYk1ve0PXKWTj55YzMu7vnYd",
  FULL_HERO: "https://lh3.googleusercontent.com/aida-public/AB6AXuBGklJ9C3IwqK33CWI7L7-wQLTaRIkR4x3n0OZIH8PByj7pvP7XZ6yNA86zCTQCzFORtZAw1TznoBapr9lEozVvhbyoyzaKOzIR61AHFokGWst7sYW1bHn8UIh45ZvdqAY50V9piXyK9A1duw7yrQhcSWp8mxSn1CWf_TrxMSVUXvQm62t62zwChfPxdsTw59AYdwfFB2suTsd7VLMPrUCuqC5OplPIGvqMQSSUcnz-gvH3l75qA6tEg7c5I4COmmdKO6z48TI_TtOz",
  BOSS: "https://lh3.googleusercontent.com/aida-public/AB6AXuANbmjbhPY7Vb-6j6neFpJzqOVxVph8QBxVlSwBEeDyOktgTv9tjvvL76derO_MS-fNJLugSy3KBScu0oPuX26BXxzgC8mx_Y-xrr1FFYzcPaj3Mj8yU3pHweuYQKcy25lxOgUwtylV-KI-rs74KmLtB0K9Qjv4No4TsazsnZndVenlFXp43jzqCszpHwXkowpsPlCjOj0e_eCyphQ1Xs-6bE-ALtZXb7wJdoeZ7Sz7vNRpegJNLVI7K3MgVUzNZwduQR5EtK6aIXdN",
  HERO_BG: "https://lh3.googleusercontent.com/aida-public/AB6AXuBaMBRPq6mTCKg1uKRkPNugvwCWWr2Om99Ujd6wznWlUKdfNNrd4Myh6IRc4Q7kV8KSkWxZEgdk8Ykim1ZAGJR1QBFlNKeZhp9XTe3DjjhGYkged-AMEL4GS8nASQsxHKvZpoQ-RZAD3_L_FzS1M_VZaq1e_bk3EO2dbI6RkW2-Htapde65LE6pci1WKGDWT_231GZ8HFP4dmx2R6ohh-t-TCrkrc3b0FTPz_TbjJmgxksQDQbHGX0i1nmvNIK3PBcihn_GFdjIRuwh",
  DISTRICT_1: "https://lh3.googleusercontent.com/aida-public/AB6AXuCyw1K4zEIHGktLH2KU7bX-M5sk6TdTUEwp67Wg4V2uhLpKdLZOfOzeEElX9aVD0OsanOBvjiX_JzNbPrLUjg2ki-96OY9e7FQ1jVDCgI0gYu14SN9U1MEM6eXPGx6ngFPj1y0Gi4kezks0ZH8uf_2_-rwiIAKhpMaYRRCxEOsdu9EtMtIEe712bz5j41LsFG2FPZ96BscUjqqkI1-G3C9xHd7md8jH90Kriq9sxBjfwous4tFIUWY3rVVgu0Vpa3ZidBrE9W3TBFWr",
  DISTRICT_2: "https://lh3.googleusercontent.com/aida-public/AB6AXuAPwz5vl9edZNEoij1wjvFsOcsLp9KHv0NPR0qat0YHDEBDmxyRxOpcYQ70b_PnBSn-RtDsZ7nRnvpzIOluRgQ_xmiHiiJZNNbJFcYjcKtz66OGo_KAa9waqHw1tzBTjPFetOGbUabKRmgZP6kQoKzy6kTcqLy5JUx9QzWL6nmkAuxg4ooU2OqPctXyscXRPhJSmfNeOEvO5-diGPryGJN-gavPRQCxOH4PZC4GfcgqLM1EbHSNKhO7wVGophGck-K4v_wBJz2LgZxO",
  DISTRICT_3: "https://lh3.googleusercontent.com/aida-public/AB6AXuCr4qjYo-wPjvdeejEpX1qicoUCzne2hIrm_LHH2FJoesqP-8dumTdqXfdRC0RpEx-SIw4aOLjFaGDGV8mW_3We5fnNhcGkb9xzDAJqAlk_7VAdOdy4J16dKL0jkPtp1ypRwybdx8cEQ9PNF7MSfVJ8FOuk9OM7AHX-YqIOjG_wRefKFjRXtVueVLHUIYKD_9SRjMs6kku9R1wYuMbtM9ODC-8sxJSiqScHAGeGGMHN5d8QP09lqw1dFrgq6sMhj4btcCuD7tOXG_q4",
  PROFILE_BG: "https://lh3.googleusercontent.com/aida-public/AB6AXuD-eVZ7k6zd_TYJ8ZJmGIhDJm6aRXkBFM-AqBVpOuPHpKbrpTBKcOyO3FQaEyvcUkNgZKZWGWuX7j-pVM4zLeDWVxkRXAzKbjAgj-T2RVVvD8p8gDn1MGvVIVQE8a75yvUzopDRKntS9HCLrK-JzS_O6nuF9TnO2iXm0un8CSybkdCLOLw3BV4xSAszPljh1od3NV31y4UjXp80nw1Wqpac1I1OC9SWCOtO6f6iGevhXIDC6FTDEHjolIj-s8AIc-zQ20j_U8osDxte"
};

const DISTRICT_ASSETS: { [id: string]: { img: string, icon: React.ReactNode, themeColor: string } } = {
  'd1': { img: IMAGES.DISTRICT_1, icon: <BookOpen className="w-4 h-4 text-cyan-400" />, themeColor: 'cyan' },
  'd2': { img: IMAGES.DISTRICT_2, icon: <Palette className="w-4 h-4 text-amber-400" />, themeColor: 'amber' },
  'd3': { img: IMAGES.DISTRICT_3, icon: <Wrench className="w-4 h-4 text-emerald-400" />, themeColor: 'emerald' }
};

// --- Embedded Particle Effect ---

function FireParticles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden h-full w-full">
      {[...Array(20)].map((_, i) => {
        const size = Math.random() * 4 + 2;
        const duration = Math.random() * 2 + 2;
        const delay = Math.random() * 4;
        const left = Math.random() * 100;

        return (
          <motion.div
            key={i}
            initial={{ y: "100%", x: "0%", opacity: 0, scale: 1 }}
            animate={{ 
              y: "-100%", 
              x: `${Math.sin(i) * 20}px`,
              opacity: [0, 0.8, 0.4, 0],
              scale: [1, 1.5, 0.5]
            }}
            transition={{
              duration: duration,
              repeat: Infinity,
              delay: delay,
              ease: "easeOut"
            }}
            className="absolute bottom-0 rounded-full bg-tertiary"
            style={{
              width: size,
              height: size,
              left: `${left}%`,
              boxShadow: '0 0 8px #d6c595',
            }}
          />
        );
      })}
    </div>
  );
}

// --- Sub-components for Loading & Auth Portal ---

function LoadingPortal() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-[#131315] gap-4">
      <div className="relative flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
          className="w-16 h-16 border-t-2 border-b-2 border-tertiary rounded-full border-dashed"
        />
        <Castle className="absolute w-6 h-6 text-tertiary animate-pulse" />
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-on-surface-variant/80 animate-pulse">Summoning Civilization...</p>
    </div>
  );
}

function LoginScreen({ onLogin, onGuestLogin }: { onLogin: () => void; onGuestLogin: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full px-6 text-center bg-[#131315] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-0" />
      <div className="absolute top-[20%] w-72 h-72 rounded-full bg-tertiary/5 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[20%] w-72 h-72 rounded-full bg-primary/5 blur-[80px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1 }}
        className="relative z-10 mb-8 animate-float"
      >
        <img 
          src={IMAGES.WIZARD_HERO} 
          alt="Wizard Hero" 
          className="w-40 h-40 object-cover rounded-full border-2 border-tertiary shadow-[0_0_40px_rgba(214,197,149,0.3)]" 
        />
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-surface-container-high border border-tertiary/50 px-3 py-1 rounded-full text-[10px] font-mono font-bold text-tertiary uppercase tracking-wider">
          Obsidian Gate
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="z-10 max-w-sm mb-8"
      >
        <h1 className="font-serif text-3xl font-bold tracking-widest text-primary mb-3">KINGDOM OF MASTERY</h1>
        <p className="text-xs text-on-surface-variant leading-relaxed font-sans mb-1">
          Welcome, Traveler. Traditional goal boards are for mortals.
        </p>
        <p className="text-xs text-on-surface-variant/80 font-sans">
          Step across the ancient threshold to sync your habits, elevate districts of civilization, and strike the Chaos Titan securely with your actions.
        </p>
      </motion.div>

      <div className="flex flex-col gap-3 z-10 w-full max-w-xs">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onLogin}
          className="flex items-center justify-center gap-3 bg-gradient-to-r from-tertiary to-[#b1a273] text-background px-8 py-4 rounded-xl font-mono text-sm font-bold uppercase shadow-[0_0_20px_rgba(214,197,149,0.3)] border border-tertiary/50 transition-all cursor-pointer group hover:brightness-110 active:scale-95"
        >
          <LogIn className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          Let the Chronicles Begin
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onGuestLogin}
          className="flex items-center justify-center gap-2 bg-[#1e1e24] text-on-surface px-8 py-3 rounded-xl font-mono text-xs font-bold uppercase shadow-lg border border-outline-variant/30 transition-all cursor-pointer hover:bg-[#282830] active:scale-95"
        >
          <Sparkles className="w-4 h-4 text-tertiary" />
          Explore as Guest (Skip Login)
        </motion.button>
      </div>
    </div>
  );
}

// --- Main App Entry ---

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('arena');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Guest configuration state (default is true unless they have specifically requested to log out/sign in)
  const [isGuest, setIsGuest] = useState(() => {
    return localStorage.getItem('kom_logged_out') !== 'true';
  });

  const mockGuestUser = useMemo(() => {
    return {
      uid: 'guest_uid',
      displayName: 'Sir Alaric (Guest)',
      photoURL: IMAGES.AVATAR_THUMB,
    } as any;
  }, []);

  // Firestore Snapshot States
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [districts, setDistricts] = useState<District[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [oracleHistory, setOracleHistory] = useState<any[]>([]);

  const maxBossHp = 1000;

  const handleLogin = async () => {
    localStorage.removeItem('kom_logged_out');
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login Error:", err);
    }
  };

  const handleGuestLogin = () => {
    localStorage.removeItem('kom_logged_out');
    setIsGuest(true);
  };

  const handleLogout = async () => {
    try {
      localStorage.setItem('kom_logged_out', 'true');
      setIsGuest(false);
      setUser(null);
      setProfile(null);
      setDistricts([]);
      setQuests([]);
      setInventory([]);
      await signOut(auth);
    } catch (err) {
      console.error("Signout Error:", err);
    }
  };

  const initializeUserProfile = async (firebaseUser: FirebaseUser) => {
    const userRef = doc(db, 'profiles', firebaseUser.uid);
    try {
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        const initialProfile: UserProfile = {
          userId: firebaseUser.uid,
          name: firebaseUser.displayName || "Sir Alaric",
          xp: 14250,
          crystals: 750,
          streak: 14,
          bossHp: 650,
          level: 12,
          nextEvolution: "The Emperor",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        await setDoc(userRef, initialProfile);

        // Seed districts
        const defaultDistricts = [
          { 
            id: 'd1', 
            name: 'The Knowledge District', 
            desc: 'Great Library • Observatories', 
            level: 5, xp: 750, maxXp: 1000, 
            pathName: 'Scholar Path',
            perAction: '+5 XP / Read',
          },
          { 
            id: 'd2', 
            name: 'The Artisan District', 
            desc: 'Grand Theatre • Festival Grounds', 
            level: 3, xp: 225, maxXp: 500, 
            pathName: 'Creator Path',
            perAction: '+15 XP / Create',
          },
          { 
            id: 'd3', 
            name: 'The Engineering District', 
            desc: 'Titan Forges • Arcane Machinery', 
            level: 7, xp: 1700, maxXp: 2000, 
            pathName: 'Builder Path',
            perAction: '+25 XP / Deep Work',
          }
        ];
        for (const dist of defaultDistricts) {
          const distRef = doc(db, 'profiles', firebaseUser.uid, 'districts', dist.id);
          await setDoc(distRef, {
            ...dist,
            updatedAt: serverTimestamp()
          });
        }

        // Seed quests
        const defaultQuests = [
          { id: '1', title: 'Knowledge Harvest', desc: 'Read 20 pages', xp: 15, color: 'text-blue-400', completed: false },
          { id: '2', title: 'Original Creation', desc: 'Code for 1 hour', xp: 25, color: 'text-amber-400', completed: false }
        ];
        for (const q of defaultQuests) {
          const qRef = doc(db, 'profiles', firebaseUser.uid, 'quests', q.id);
          await setDoc(qRef, {
            ...q,
            updatedAt: serverTimestamp()
          });
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `profiles/${firebaseUser.uid}`);
    }
  };

  // Sync Guest Mode data locally
  useEffect(() => {
    if (isGuest) {
      const savedProfile = localStorage.getItem('kom_guest_profile');
      const savedDistricts = localStorage.getItem('kom_guest_districts');
      const savedQuests = localStorage.getItem('kom_guest_quests');
      const savedInventory = localStorage.getItem('kom_guest_inventory');

      if (savedProfile) {
        setProfile(JSON.parse(savedProfile));
      } else {
        const defaultProfile: UserProfile = {
          userId: 'guest_uid',
          name: "Sir Alaric (Guest)",
          xp: 14250,
          crystals: 750,
          streak: 14,
          bossHp: 650,
          level: 12,
          nextEvolution: "The Emperor",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setProfile(defaultProfile);
        localStorage.setItem('kom_guest_profile', JSON.stringify(defaultProfile));
      }

      if (savedDistricts) {
        setDistricts(JSON.parse(savedDistricts));
      } else {
        const defaultDistricts = [
          { 
            id: 'd1', 
            name: 'The Knowledge District', 
            desc: 'Great Library • Observatories', 
            level: 5, xp: 750, maxXp: 1000, 
            pathName: 'Scholar Path',
            perAction: '+5 XP / Read',
          },
          { 
            id: 'd2', 
            name: 'The Artisan District', 
            desc: 'Grand Theatre • Festival Grounds', 
            level: 3, xp: 225, maxXp: 500, 
            pathName: 'Creator Path',
            perAction: '+15 XP / Create',
          },
          { 
            id: 'd3', 
            name: 'The Engineering District', 
            desc: 'Titan Forges • Arcane Machinery', 
            level: 7, xp: 1700, maxXp: 2000, 
            pathName: 'Builder Path',
            perAction: '+25 XP / Deep Work',
          }
        ];
        setDistricts(defaultDistricts);
        localStorage.setItem('kom_guest_districts', JSON.stringify(defaultDistricts));
      }

      if (savedQuests) {
        setQuests(JSON.parse(savedQuests));
      } else {
        const defaultQuests = [
          { id: '1', title: 'Knowledge Harvest', desc: 'Read 20 pages', xp: 15, color: 'text-blue-400', completed: false },
          { id: '2', title: 'Original Creation', desc: 'Code for 1 hour', xp: 25, color: 'text-amber-400', completed: false }
        ];
        setQuests(defaultQuests);
        localStorage.setItem('kom_guest_quests', JSON.stringify(defaultQuests));
      }

      if (savedInventory) {
        setInventory(JSON.parse(savedInventory));
      } else {
        setInventory([]);
        localStorage.setItem('kom_guest_inventory', JSON.stringify([]));
      }

      const savedOracle = localStorage.getItem(`kom_guest_oracle_${mockGuestUser.uid}`);
      if (savedOracle) {
        setOracleHistory(JSON.parse(savedOracle));
      } else {
        setOracleHistory([]);
      }

      setUser(mockGuestUser);
    }
  }, [isGuest, mockGuestUser]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthLoading(true);
      if (firebaseUser) {
        try {
          await getDocFromServer(doc(db, 'test', 'connection')).catch(() => {});
        } catch (e) {}

        await initializeUserProfile(firebaseUser);
        setUser(firebaseUser);
        setIsGuest(false);
        localStorage.removeItem('kom_logged_out');
      } else {
        // If logged_out is explicitly set, we null out user so they see LoginScreen.
        // Otherwise, if Guest Mode is allowed to run, let the guest state live.
        const loggedOut = localStorage.getItem('kom_logged_out') === 'true';
        if (loggedOut) {
          setUser(null);
          setProfile(null);
          setDistricts([]);
          setQuests([]);
          setInventory([]);
        }
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [mockGuestUser]);

  useEffect(() => {
    if (!user) return;
    if (user.uid === 'guest_uid') return; // Do NOT subscribe to firestore if guest!

    const profileRef = doc(db, 'profiles', user.uid);
    const unsubProfile = onSnapshot(profileRef, (snap) => {
      if (snap.exists()) {
        setProfile(snap.data() as UserProfile);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `profiles/${user.uid}`);
    });

    const districtsCol = collection(db, 'profiles', user.uid, 'districts');
    const unsubDistricts = onSnapshot(districtsCol, (snap) => {
      const list: District[] = [];
      snap.forEach((dDoc) => {
        list.push(dDoc.data() as District);
      });
      list.sort((a, b) => a.id.localeCompare(b.id));
      setDistricts(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `profiles/${user.uid}/districts`);
    });

    const questsCol = collection(db, 'profiles', user.uid, 'quests');
    const unsubQuests = onSnapshot(questsCol, (snap) => {
      const list: Quest[] = [];
      snap.forEach((qDoc) => {
        list.push(qDoc.data() as Quest);
      });
      setQuests(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `profiles/${user.uid}/quests`);
    });

    const inventoryCol = collection(db, 'profiles', user.uid, 'inventory');
    const unsubInventory = onSnapshot(inventoryCol, (snap) => {
      const list: InventoryItem[] = [];
      snap.forEach((iDoc) => {
        list.push(iDoc.data() as InventoryItem);
      });
      setInventory(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `profiles/${user.uid}/inventory`);
    });

    const oracleCol = collection(db, 'profiles', user.uid, 'oracle');
    const unsubOracle = onSnapshot(oracleCol, (snap) => {
      const list: any[] = [];
      snap.forEach((oDoc) => {
        list.push(oDoc.data());
      });
      list.sort((a, b) => b.date.localeCompare(a.date));
      setOracleHistory(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `profiles/${user.uid}/oracle`);
    });

    return () => {
      unsubProfile();
      unsubDistricts();
      unsubQuests();
      unsubInventory();
      unsubOracle();
    };
  }, [user]);

  const handleCompleteQuest = async (questId: string, xp: number) => {
    if (!user || !profile) return;

    if (isGuest) {
      const updatedQuests = quests.map(q => q.id === questId ? { ...q, completed: true } : q);
      setQuests(updatedQuests);
      localStorage.setItem('kom_guest_quests', JSON.stringify(updatedQuests));

      const updatedProfile = {
        ...profile,
        xp: profile.xp + xp,
        bossHp: Math.max(0, profile.bossHp - Math.round(xp / 2)),
        crystals: profile.crystals + Math.round(xp * 0.5),
        updatedAt: new Date().toISOString()
      };
      setProfile(updatedProfile);
      localStorage.setItem('kom_guest_profile', JSON.stringify(updatedProfile));
      return;
    }

    const questRef = doc(db, 'profiles', user.uid, 'quests', questId);
    try {
      await updateDoc(questRef, {
        completed: true,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `profiles/${user.uid}/quests/${questId}`);
    }

    const userRef = doc(db, 'profiles', user.uid);
    try {
      await updateDoc(userRef, {
        xp: profile.xp + xp,
        bossHp: Math.max(0, profile.bossHp - Math.round(xp / 2)),
        crystals: profile.crystals + Math.round(xp * 0.5),
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `profiles/${user.uid}`);
    }
  };

  const handleAddQuest = async (title: string, desc: string, xp: number) => {
    if (!user) return;
    const qId = 'q_' + Date.now();
    const colors = ['text-blue-400', 'text-amber-400', 'text-emerald-400', 'text-purple-400'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    if (isGuest) {
      const newQuest = {
        id: qId,
        title,
        desc,
        xp,
        color,
        completed: false
      };
      const updatedQuests = [...quests, newQuest];
      setQuests(updatedQuests);
      localStorage.setItem('kom_guest_quests', JSON.stringify(updatedQuests));
      return;
    }

    const questRef = doc(db, 'profiles', user.uid, 'quests', qId);
    try {
      await setDoc(questRef, {
        id: qId,
        title,
        desc,
        xp,
        color,
        completed: false,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `profiles/${user.uid}/quests/${qId}`);
    }
  };

  const handleDeleteQuest = async (questId: string) => {
    if (!user) return;

    if (isGuest) {
      const updatedQuests = quests.filter(q => q.id !== questId);
      setQuests(updatedQuests);
      localStorage.setItem('kom_guest_quests', JSON.stringify(updatedQuests));
      return;
    }

    const questRef = doc(db, 'profiles', user.uid, 'quests', questId);
    try {
      await deleteDoc(questRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `profiles/${user.uid}/quests/${questId}`);
    }
  };

  const handleResetQuests = async () => {
    if (!user || quests.length === 0) return;

    if (isGuest) {
      const updatedQuests = quests.map(q => ({ ...q, completed: false }));
      setQuests(updatedQuests);
      localStorage.setItem('kom_guest_quests', JSON.stringify(updatedQuests));
      return;
    }

    for (const q of quests) {
      const qRef = doc(db, 'profiles', user.uid, 'quests', q.id);
      try {
        await updateDoc(qRef, {
          completed: false,
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `profiles/${user.uid}/quests/${q.id}`);
      }
    }
  };

  const handleTriggerDistrict = async (distId: string, xpGain: number) => {
    if (!user || !profile) return;
    const targetDist = districts.find(d => d.id === distId);
    if (!targetDist) return;

    if (isGuest) {
      let newXp = targetDist.xp + xpGain;
      let newLevel = targetDist.level;
      let newMaxXp = targetDist.maxXp;
      let rankLeveledUp = false;

      if (newXp >= targetDist.maxXp) {
        newXp = newXp - targetDist.maxXp;
        newLevel += 1;
        newMaxXp = Math.round(targetDist.maxXp * 1.5);
        rankLeveledUp = true;
      }

      const updatedDistricts = districts.map(d => d.id === distId ? {
        ...d,
        xp: newXp,
        level: newLevel,
        maxXp: newMaxXp
      } : d);
      setDistricts(updatedDistricts);
      localStorage.setItem('kom_guest_districts', JSON.stringify(updatedDistricts));

      const updatedProfile = {
        ...profile,
        xp: profile.xp + (rankLeveledUp ? 200 : xpGain),
        crystals: profile.crystals + (rankLeveledUp ? 100 : Math.round(xpGain * 0.2)),
        updatedAt: new Date().toISOString()
      };
      setProfile(updatedProfile);
      localStorage.setItem('kom_guest_profile', JSON.stringify(updatedProfile));
      return;
    }

    const dRef = doc(db, 'profiles', user.uid, 'districts', distId);

    let newXp = targetDist.xp + xpGain;
    let newLevel = targetDist.level;
    let newMaxXp = targetDist.maxXp;
    let rankLeveledUp = false;

    if (newXp >= targetDist.maxXp) {
      newXp = newXp - targetDist.maxXp;
      newLevel += 1;
      newMaxXp = Math.round(targetDist.maxXp * 1.5);
      rankLeveledUp = true;
    }

    try {
      await updateDoc(dRef, {
        xp: newXp,
        level: newLevel,
        maxXp: newMaxXp,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `profiles/${user.uid}/districts/${distId}`);
    }

    const userRef = doc(db, 'profiles', user.uid);
    try {
      await updateDoc(userRef, {
        xp: profile.xp + (rankLeveledUp ? 200 : xpGain),
        crystals: profile.crystals + (rankLeveledUp ? 100 : Math.round(xpGain * 0.2)),
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `profiles/${user.uid}`);
    }
  };

  const handleBuyItem = async (item: ShopItem) => {
    if (!user || !profile) return;
    if (profile.crystals < item.cost) {
      alert("You do not possess enough royal crystals inside your treasury!");
      return;
    }

    const itemId = item.title.toLowerCase().replace(/\s+/g, '_');

    if (isGuest) {
      const newItem = {
        itemId,
        title: item.title,
        rarity: item.rarity,
        category: item.type,
        purchasedAt: new Date().toISOString()
      };
      const updatedInventory = [...inventory, newItem];
      setInventory(updatedInventory);
      localStorage.setItem('kom_guest_inventory', JSON.stringify(updatedInventory));

      const updatedProfile = {
        ...profile,
        crystals: profile.crystals - item.cost,
        updatedAt: new Date().toISOString()
      };
      setProfile(updatedProfile);
      localStorage.setItem('kom_guest_profile', JSON.stringify(updatedProfile));
      return;
    }

    const itemRef = doc(db, 'profiles', user.uid, 'inventory', itemId);
    
    try {
      await setDoc(itemRef, {
        itemId,
        title: item.title,
        rarity: item.rarity,
        category: item.type,
        purchasedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `profiles/${user.uid}/inventory/${itemId}`);
    }

    const userRef = doc(db, 'profiles', user.uid);
    try {
      await updateDoc(userRef, {
        crystals: profile.crystals - item.cost,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `profiles/${user.uid}`);
    }
  };

  const handleAwardBonusXp = async (xp: number, crystals: number, message: string) => {
    if (!user || !profile) return;
    if (isGuest) {
      const updatedProfile = {
        ...profile,
        xp: profile.xp + xp,
        crystals: profile.crystals + crystals,
        updatedAt: new Date().toISOString()
      };
      setProfile(updatedProfile);
      localStorage.setItem('kom_guest_profile', JSON.stringify(updatedProfile));
      return;
    }
    const userRef = doc(db, 'profiles', user.uid);
    try {
      await updateDoc(userRef, {
        xp: profile.xp + xp,
        crystals: profile.crystals + crystals,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `profiles/${user.uid}`);
    }
  };

  const handleUnlockCosmetic = async (itemId: string, title: string, cost: number, rarity: string) => {
    if (!user) return;
    if (isGuest) {
      const newItem = {
        itemId,
        title,
        rarity,
        category: 'cosmetic',
        purchasedAt: new Date().toISOString()
      };
      const updatedInventory = [...inventory, newItem];
      setInventory(updatedInventory);
      localStorage.setItem('kom_guest_inventory', JSON.stringify(updatedInventory));
      return;
    }

    const itemRef = doc(db, 'profiles', user.uid, 'inventory', itemId);
    try {
      await setDoc(itemRef, {
        itemId,
        title,
        rarity,
        category: 'cosmetic',
        purchasedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `profiles/${user.uid}/inventory/${itemId}`);
    }
  };

  return (
    <div className="flex justify-center items-center bg-[#0d0d0e] min-h-screen md:p-6 select-none">
      {/* Responsive Phone Shell Container */}
      <div className="w-full h-[100dvh] md:h-[844px] md:max-h-[92dvh] md:max-w-[390px] md:aspect-[9/19.5] bg-surface-container-lowest relative flex flex-col md:rounded-[40px] md:shadow-[0_0_60px_rgba(0,0,0,0.8)] md:border-[6px] md:border-[#202025] overflow-hidden">
        


        {authLoading ? (
          <LoadingPortal />
        ) : !user || !profile ? (
          <LoginScreen onLogin={handleLogin} onGuestLogin={handleGuestLogin} />
        ) : (
          <div className="flex flex-col h-full w-full relative overflow-hidden">
            {/* Top App Bar (Nested & Styled responsive within the frame) */}
            <header className="bg-[#1a1a1d] flex justify-between items-center px-6 h-16 border-b border-outline-variant/30 shrink-0 w-full z-10 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-tertiary bg-surface-container-highest">
                  <img src={user.photoURL || IMAGES.AVATAR_THUMB} alt="Avatar" className="w-full h-full object-cover pixelated" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <h1 className="font-serif text-[11px] font-bold tracking-wider text-primary">Kingdom of Mastery</h1>
                  <p className="font-sans text-[8px] text-on-surface-variant/80 truncate max-w-[120px]">Account: {profile.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-[#26262b] px-3 py-1 rounded-full border border-outline-variant/50 shadow-inner">
                <span className="font-mono text-[10px] text-tertiary font-bold">LVL {profile.level}</span>
                <span className="text-on-surface-variant/30 text-[9px]">|</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-[10px] text-secondary font-bold">{profile.crystals}</span>
                  <Diamond className="w-2.5 h-2.5 text-cyan-400 fill-cyan-400" />
                </div>
              </div>
            </header>

            {/* Main Content Pane */}
            <main className="flex-1 overflow-x-hidden overflow-y-auto w-full">
              <AnimatePresence mode="wait">
                {activeTab === 'arena' && (
                  <ArenaScreen 
                    quests={quests} 
                    bossHp={profile.bossHp} 
                    maxBossHp={maxBossHp} 
                    onComplete={handleCompleteQuest} 
                    onAddQuest={handleAddQuest}
                    onDeleteQuest={handleDeleteQuest}
                    onResetQuests={handleResetQuests}
                    user={user}
                    profile={profile}
                    isGuest={isGuest}
                    oracleHistory={oracleHistory}
                    onCompleteQuest={handleCompleteQuest}
                    onAwardBonusXp={handleAwardBonusXp}
                    onUnlockCosmetic={handleUnlockCosmetic}
                    activeTab={activeTab}
                    key="arena" 
                  />
                )}
                {activeTab === 'districts' && (
                  <DistrictsScreen 
                    districts={districts} 
                    onTrigger={handleTriggerDistrict}
                    key="districts" 
                  />
                )}
                {activeTab === 'stats' && (
                  <StatsScreen 
                    profile={profile}
                    user={user}
                    quests={quests}
                    isGuest={isGuest}
                    oracleHistory={oracleHistory}
                    onCompleteQuest={handleCompleteQuest}
                    onAwardBonusXp={handleAwardBonusXp}
                    onUnlockCosmetic={handleUnlockCosmetic}
                    activeTab={activeTab}
                    key="stats" 
                  />
                )}
                {activeTab === 'shop' && (
                  <ShopScreen 
                    crystals={profile.crystals} 
                    inventory={inventory}
                    onBuy={handleBuyItem}
                    key="shop" 
                  />
                )}
                {activeTab === 'profile' && (
                  <ProfileScreen 
                    xp={profile.xp} 
                    crystals={profile.crystals} 
                    streak={profile.streak} 
                    level={profile.level}
                    name={profile.name}
                    avatarUrl={user.photoURL}
                    inventory={inventory}
                    onLogout={handleLogout}
                    key="profile" 
                  />
                )}
              </AnimatePresence>
            </main>

            {/* Bottom Navigation Navbar - Contained perfectly inside mock borders */}
            <nav className="h-16 bg-[#18181b] border-t border-primary/15 flex justify-around items-center px-2 shrink-0 w-full z-10 shadow-[0_-4px_25px_rgba(0,0,0,0.6)]">
              <NavButton icon={<Swords />} label="Arena" active={activeTab === 'arena'} onClick={() => setActiveTab('arena')} />
              <NavButton icon={<Castle />} label="Districts" active={activeTab === 'districts'} onClick={() => setActiveTab('districts')} />
              <NavButton icon={<BarChart3 />} label="Stats" active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} />
              <NavButton icon={<Store />} label="Shop" active={activeTab === 'shop'} onClick={() => setActiveTab('shop')} />
              <NavButton icon={<UserIcon />} label="Profile" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Sub-screens implementations ---

interface ArenaProps {
  quests: Quest[];
  bossHp: number;
  maxBossHp: number;
  onComplete: (id: string, xp: number) => void;
  onAddQuest: (title: string, desc: string, xp: number) => void;
  onDeleteQuest: (id: string) => void;
  onResetQuests: () => void;
  user: any;
  profile: any;
  isGuest: boolean;
  oracleHistory: any[];
  onCompleteQuest: (questId: string, xp: number) => Promise<void>;
  onAwardBonusXp: (xp: number, crystals: number, message: string) => Promise<void>;
  onUnlockCosmetic: (itemId: string, title: string, cost: number, rarity: string) => Promise<void>;
  activeTab: string;
  key?: React.Key;
}

function ArenaScreen({ 
  quests, 
  bossHp, 
  maxBossHp, 
  onComplete, 
  onAddQuest, 
  onDeleteQuest, 
  onResetQuests,
  user,
  profile,
  isGuest,
  oracleHistory,
  onCompleteQuest,
  onAwardBonusXp,
  onUnlockCosmetic,
  activeTab
}: ArenaProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newXp, setNewXp] = useState(15);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddQuest(newTitle, newDesc, newXp);
    setNewTitle('');
    setNewDesc('');
    setNewXp(15);
    setShowAddForm(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col w-full"
    >
      <section 
        className="relative w-full aspect-square flex flex-col items-center justify-center"
        style={{ backgroundImage: `url(${IMAGES.HERO_BG})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/60 to-transparent" />
        
        <div className="relative z-10 animate-float flex flex-col items-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-tertiary/20 blur-xl animate-pulse" />
            <img 
              src={IMAGES.WIZARD_HERO} 
              alt="Main Avatar" 
              className="w-44 h-44 object-cover rounded-full border-[3px] border-tertiary shadow-[0_0_30px_rgba(214,197,149,0.3)]" 
            />
          </div>
          <div className="mt-6 px-6 py-2 bg-surface-container/90 backdrop-blur-md border border-primary/30 rounded-full shadow-lg">
            <p className="font-mono text-sm text-primary tracking-[0.2em] font-bold uppercase">The Commander</p>
          </div>
        </div>
      </section>

      <div className="px-6 flex flex-col gap-8 mt-[-3rem] relative z-20 pb-8">
        {/* Boss Card */}
        <section className="bg-surface-container-high rounded-2xl p-6 flex flex-col items-center border border-outline-variant/30 shadow-xl overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-error/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center w-full">
            <h2 className="font-serif text-xl text-on-surface mb-1 font-bold">Current Enemy</h2>
            <p className="font-mono text-xs text-error uppercase tracking-widest mb-6">The Chaos Titan</p>
            
            <div className="w-full max-w-[220px] aspect-video bg-surface-container rounded-xl border border-outline-variant/50 mb-6 flex items-center justify-center overflow-hidden shadow-inner">
              <img src={IMAGES.BOSS} alt="Chaos Titan" className="w-full h-full object-cover mix-blend-luminosity opacity-80 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* HP Bar */}
            <div className="w-full h-5 bg-surface-container-highest rounded-full border border-outline-variant/50 overflow-hidden relative shadow-inner">
              <motion.div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-900 to-error shadow-[0_0_15px_rgba(255,180,171,0.4)]"
                initial={{ width: 0 }}
                animate={{ width: `${(bossHp / maxBossHp) * 100}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-on-surface drop-shadow-md">
                {Math.round(bossHp)} / {maxBossHp} HP
              </div>
            </div>
          </div>
        </section>

        {/* The Royal Oracle */}
        <RoyalOracle 
          user={user}
          profile={profile}
          quests={quests}
          isGuest={isGuest}
          oracleHistory={oracleHistory}
          onCompleteQuest={onCompleteQuest}
          onAwardBonusXp={onAwardBonusXp}
          onUnlockCosmetic={onUnlockCosmetic}
          activeTab={activeTab}
        />

        {/* Daily Quests */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2">
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-lg text-on-surface font-bold">Daily Quests</h3>
              <button 
                onClick={onResetQuests}
                title="Reset Completed Quests"
                className="p-1 rounded hover:bg-surface-container-highest text-on-surface-variant transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            <button 
              onClick={() => setShowAddForm(!showAddForm)}
              className="font-mono text-[9px] text-tertiary bg-tertiary/10 border border-tertiary/30 px-2 py-1 rounded inline-flex items-center gap-1 hover:bg-tertiary hover:text-background transition-colors"
            >
              <Plus className="w-2.5 h-2.5" />
              Add Quest
            </button>
          </div>

          <AnimatePresence>
            {showAddForm && (
              <motion.form 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleSubmit}
                className="bg-surface-container p-4 rounded-xl border border-tertiary/30 flex flex-col gap-3 overflow-hidden shadow-inner"
              >
                <div>
                  <label className="block text-[8px] font-mono uppercase tracking-widest text-on-surface-variant/80 mb-1">Quest Title</label>
                  <input 
                    type="text" 
                    placeholder="E.g., Read 30 mins"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-surface-container-highest px-3 py-1.5 rounded text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:border-tertiary"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-mono uppercase tracking-widest text-on-surface-variant/80 mb-1">Deliverable / Description</label>
                  <input 
                    type="text" 
                    placeholder="E.g., Chapters 3 and 4 in History Tome"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full bg-surface-container-highest px-3 py-1.5 rounded text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:border-tertiary"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-mono uppercase tracking-widest text-on-surface-variant/80 mb-1">Harvest XP Reward</label>
                  <select 
                    value={newXp}
                    onChange={(e) => setNewXp(Number(e.target.value))}
                    className="w-full bg-surface-container-highest px-3 py-1.5 rounded text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:border-tertiary"
                  >
                    <option value="10">10 XP (Easy Habit)</option>
                    <option value="15">15 XP (Medium Effort)</option>
                    <option value="25">25 XP (Intense Session)</option>
                    <option value="50">50 XP (Legendary Landmark)</option>
                  </select>
                </div>
                <button 
                  type="submit"
                  className="bg-tertiary text-background py-1.5 rounded font-mono text-[10px] font-bold uppercase hover:brightness-110 active:scale-95 transition-transform mt-1"
                >
                  Chronicle to Scroll
                </button>
              </motion.form>
            )}
          </AnimatePresence>
          
          <div className="grid gap-4">
            {quests.length === 0 ? (
              <p className="text-center text-xs text-on-surface-variant/70 py-6">Your quest scroll is currently empty. Summon custom daily habits!</p>
            ) : (
              quests.map(quest => (
                <motion.div 
                  key={quest.id}
                  whileHover={{ scale: 1.01 }}
                  className={`bg-surface-container rounded-xl p-4 flex items-center gap-4 border transition-colors relative ${quest.completed ? 'border-outline-variant/20 opacity-50' : 'border-outline-variant/30'}`}
                >
                  <div className="w-11 h-11 rounded-lg bg-surface-container-highest flex items-center justify-center text-tertiary shadow-inner border border-outline-variant/50">
                    <Sparkles className="w-5 h-5 text-tertiary/70" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className={`font-mono text-sm font-bold truncate ${quest.completed ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>{quest.title}</h4>
                      {quest.completed && <span className="text-[7px] font-mono bg-emerald-500/20 text-emerald-400 px-1 py-0.2 rounded">VICTORIOUS</span>}
                    </div>
                    <p className="text-xs text-on-surface-variant truncate">{quest.desc || "Daily habit tracking quest."}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!quest.completed ? (
                      <button 
                        onClick={() => onComplete(quest.id, quest.xp)}
                        className="bg-primary-container text-primary hover:bg-primary hover:text-background font-mono text-[10px] font-bold uppercase px-3 py-2 rounded border border-primary/40 transition-colors uppercase active:scale-95 cursor-pointer"
                      >
                        +{quest.xp} XP
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-400 font-bold font-mono">+{quest.xp} XP</span>
                    )}
                    <button 
                      onClick={() => onDeleteQuest(quest.id)}
                      className="p-2 text-on-surface-variant hover:text-error transition-colors text-on-surface-variant/40 hover:text-red-400"
                      title="Annihilate Quest"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </section>

        {/* Status Bar */}
        <div className="flex justify-between items-center bg-surface-container rounded-xl p-4 border border-outline-variant/20 mb-4 shadow-inner">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-950/30 flex items-center justify-center border border-red-500/30">
              <Flame className="w-4 h-4 text-error fill-error" />
            </div>
            <span className="font-mono text-sm text-on-surface font-bold">Involved Adventure</span>
          </div>
          <div className="flex items-center gap-2 text-on-surface-variant">
            <Timer className="w-4 h-4" />
            <span className="font-mono text-[9px] uppercase tracking-wider">Sync Active to Cloud</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface DistrictsProps {
  districts: District[];
  onTrigger: (id: string, xpGain: number) => void;
  key?: React.Key;
}

function DistrictsScreen({ districts, onTrigger }: DistrictsProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col gap-8 px-6 py-8"
    >
      <div className="text-center space-y-2">
        <h2 className="font-serif text-2xl text-tertiary tracking-widest uppercase flex items-center justify-center gap-4">
          <span className="h-[1px] w-8 bg-tertiary/40" />
          The Districts
          <span className="h-[1px] w-8 bg-tertiary/40" />
        </h2>
        <p className="text-xs text-on-surface-variant font-mono uppercase tracking-tighter">Expand your civilization through active practice</p>
      </div>

      <div className="flex flex-col gap-6">
        {districts.map(district => {
          const assets = DISTRICT_ASSETS[district.id] || { img: IMAGES.DISTRICT_1, icon: <BookOpen />, themeColor: 'cyan' };
          const xpGain = district.id === 'd1' ? 5 : district.id === 'd2' ? 15 : 25;

          return (
            <motion.div 
              key={district.id}
              whileHover={{ y: -4 }}
              onClick={() => onTrigger(district.id, xpGain)}
              className="relative w-full rounded-2xl overflow-hidden border border-white/5 shadow-2xl h-60 flex flex-col justify-end p-6 group cursor-pointer active:scale-98 transition-transform"
            >
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-60 transition-opacity duration-700" 
                style={{ backgroundImage: `url(${assets.img})` }} 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
              
              <div className="relative z-10 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2 bg-surface-container/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                    {assets.icon}
                    <span className="font-mono text-[10px] text-on-surface font-bold uppercase">Level {district.level}</span>
                  </div>
                  <div className="px-2 py-1 rounded-md text-[9px] font-mono font-bold bg-white/5 border border-white/10 text-primary uppercase">
                    Click to Train ({district.perAction})
                  </div>
                </div>

                <div>
                  <h3 className="font-serif text-2xl text-on-surface font-bold text-shadow-hero">{district.name}</h3>
                  <p className="text-xs text-on-surface-variant font-medium">{district.desc}</p>
                </div>

                <div className="space-y-2">
                  <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(district.xp / district.maxXp) * 100}%` }}
                      className="h-full bg-primary shadow-lg"
                    />
                  </div>
                  <div className="flex justify-between font-mono text-[9px] uppercase tracking-wider text-on-surface-variant">
                    <span>{district.pathName}</span>
                    <span>{district.xp} / {district.maxXp} XP</span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

interface StatsProps {
  profile: UserProfile;
  user: any;
  quests: Quest[];
  isGuest: boolean;
  oracleHistory: any[];
  onCompleteQuest: (questId: string, xp: number) => Promise<void>;
  onAwardBonusXp: (xp: number, crystals: number, message: string) => Promise<void>;
  onUnlockCosmetic: (itemId: string, title: string, cost: number, rarity: string) => Promise<void>;
  activeTab: string;
  key?: React.Key;
}

function StatsScreen({ 
  profile,
  user,
  quests,
  isGuest,
  oracleHistory,
  onCompleteQuest,
  onAwardBonusXp,
  onUnlockCosmetic,
  activeTab
}: StatsProps) {
  const chartData = [
    { name: 'M', xp: 40 },
    { name: 'T', xp: 60 },
    { name: 'W', xp: 30 },
    { name: 'T', xp: 80, active: true },
    { name: 'F', xp: 50 },
    { name: 'S', xp: 90, active: true },
    { name: 'S', xp: 75 },
  ];

  const currentLevelProgress = Math.round((profile.xp % 1500) / 1500 * 100);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col gap-8 px-6 py-8"
    >
      <section className="space-y-4">
        <h2 className="font-serif text-xl font-bold flex items-center gap-3">
          <Castle className="text-tertiary" />
          Civilization Level
        </h2>
        <div className="bg-surface-container p-6 rounded-2xl border border-outline-variant/30 flex flex-col gap-6 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full" />
          
          <div className="flex justify-between items-end relative z-10">
            <div className="space-y-1">
              <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest">Current Era</p>
              <h3 className="font-serif text-2xl text-tertiary">LVL {profile.level} - Iron Keep</h3>
            </div>
            <div className="text-right">
              <p className="font-mono text-[10px] text-primary uppercase">Progression</p>
              <p className="font-serif text-2xl font-bold">{currentLevelProgress}%</p>
            </div>
          </div>

          <div className="h-6 bg-surface-container-highest rounded-full border border-outline-variant/40 overflow-hidden relative">
            <motion.div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-tertiary to-primary shadow-[0_0_15px_rgba(214,197,149,0.3)]"
              initial={{ width: 0 }}
              animate={{ width: `${currentLevelProgress}%` }}
              transition={{ duration: 1 }}
            />
          </div>
          
          <p className="text-center text-[10px] text-on-surface-variant italic font-serif">
            {profile.xp.toLocaleString()} total experience logged in the archives
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-xl font-bold flex items-center gap-3">
          <Activity className="text-tertiary" />
          7-Day XP Yield
        </h2>
        <div className="bg-surface-container rounded-2xl p-6 border border-outline-variant/30 h-56 shadow-lg">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#c8c5ce', fontSize: 10, fontFamily: 'Space Grotesk' }} 
              />
              <Bar dataKey="xp" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.active ? '#d6c595' : '#22223b'} 
                    stroke={entry.active ? '#d6c595' : '#c5c3e4'}
                    strokeWidth={1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-xl font-bold flex items-center gap-3">
          <Star className="text-tertiary" />
          Heroic Feats
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <StatCard icon={<Star />} label="Total XP" value={profile.xp.toLocaleString()} accent="tertiary" />
          <StatCard icon={<Diamond />} label="Royal Treasury" value={`${profile.crystals} Crystals`} accent="primary" />
          <StatCard icon={<Flame />} label="Current Streak" value={`${profile.streak} Days`} accent="error" />
          <StatCard icon={<Trophy />} label="Level Tier" value="Sentinel" accent="primary" />
        </div>
      </section>

      {/* Oracle History Chronicle Ledger */}
      <RoyalOracle 
        user={user}
        profile={profile}
        quests={quests}
        isGuest={isGuest}
        oracleHistory={oracleHistory}
        onCompleteQuest={onCompleteQuest}
        onAwardBonusXp={onAwardBonusXp}
        onUnlockCosmetic={onUnlockCosmetic}
        activeTab={activeTab}
      />
    </motion.div>
  );
}

interface ShopProps {
  crystals: number;
  inventory: InventoryItem[];
  onBuy: (item: ShopItem) => void;
  key?: React.Key;
}

function ShopScreen({ crystals, inventory, onBuy }: ShopProps) {
  const shopItems: ShopItem[] = [
    { title: "Kingdom Skin Pack", desc: "Unlock deep obsidian theme", cost: 500, type: "cosmetic", icon: <LayoutGrid className="w-5 h-5" />, rarity: 'rare' },
    { title: "Double XP Scroll", desc: "2x progress for 24h", cost: 250, type: "booster", icon: <Zap className="w-5 h-5" />, rarity: 'uncommon' },
    { title: "Streak Shield", desc: "Forgive 1 missed day", cost: 150, type: "consumable", icon: <Shield className="w-5 h-5" />, rarity: 'common' },
    { title: "Dragon Familiar", desc: "Passive companion tracker", cost: 2000, type: "pet", icon: <Activity className="w-5 h-5" />, rarity: 'legendary' },
    { title: "Arcane Tome", desc: "+10% quest XP bonus", cost: 1200, type: "relic", icon: <BookOpen className="w-5 h-5" />, rarity: 'epic' },
    { title: "Seer's Lantern", desc: "Glowing lantern accessory for thy avatar", cost: 180, type: "cosmetic", icon: <Sparkles className="w-5 h-5 text-yellow-400" />, rarity: 'rare' },
  ];

  const getRarityStyles = (rarity: Rarity) => {
    switch (rarity) {
      case 'common': return 'border-outline-variant/30 text-on-surface-variant';
      case 'uncommon': return 'border-green-500/30 text-green-400 bg-green-500/5 shadow-[0_0_10px_rgba(34,197,94,0.1)] hover:border-green-500/50';
      case 'rare': return 'border-blue-500/30 text-blue-400 bg-blue-500/5 shadow-[0_0_10px_rgba(59,130,246,0.1)] hover:border-blue-500/50';
      case 'epic': return 'border-purple-500/30 text-purple-400 bg-purple-500/5 shadow-[0_0_10px_rgba(168,85,247,0.1)] hover:border-purple-500/50';
      case 'legendary': return 'border-tertiary/50 text-tertiary bg-tertiary/5 shadow-[0_0_15px_rgba(214,197,149,0.2)] hover:border-tertiary';
      default: return 'border-outline-variant/30';
    }
  };

  const getRarityLabelStyles = (rarity: Rarity) => {
    switch (rarity) {
      case 'common': return 'bg-outline-variant/20 text-on-surface-variant';
      case 'uncommon': return 'bg-green-500/20 text-green-400';
      case 'rare': return 'bg-blue-500/20 text-blue-400';
      case 'epic': return 'bg-purple-500/20 text-purple-400';
      case 'legendary': return 'bg-tertiary/20 text-tertiary';
      default: return 'bg-outline-variant/20';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.5, ease: "circOut" }}
      className="flex flex-col gap-8 px-6 py-8 relative min-h-all"
    >
      <FireParticles />
      
      <div className="text-center space-y-4 pb-4 relative z-10">
        <h2 className="font-serif text-3xl text-primary font-bold">The Royal Treasury</h2>
        <p className="text-xs text-on-surface-variant font-mono">Exchange hard-earned crystals for magical enhancements</p>
      </div>

      <div className="grid gap-6 relative z-10">
        {shopItems.map((item, i) => {
          const itemKey = item.title.toLowerCase().replace(/\s+/g, '_');
          const isPurchased = inventory.some(invItem => invItem.itemId === itemKey);

          return (
            <motion.div 
              key={i} 
              whileHover={{ scale: isPurchased ? 1 : 1.02 }}
              className={`bg-surface-container rounded-2xl p-6 border flex items-center justify-between group cursor-pointer transition-all ${getRarityStyles(item.rarity)} ${isPurchased ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-xl bg-surface-container-highest flex items-center justify-center shadow-inner border border-outline-variant/50 relative overflow-hidden">
                  <div className="z-10">{item.icon}</div>
                  <div className={`absolute inset-0 opacity-10 ${getRarityLabelStyles(item.rarity)}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-mono text-sm font-bold text-on-surface">{item.title}</h3>
                    <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded-full uppercase font-bold tracking-tighter ${getRarityLabelStyles(item.rarity)}`}>
                      {item.rarity}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant">{item.desc}</p>
                </div>
              </div>
              
              {isPurchased ? (
                <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 animate-pulse">
                  Acquired
                </span>
              ) : (
                <button 
                  onClick={() => onBuy(item)}
                  className="flex flex-col items-center gap-1 bg-surface-container-high px-4 py-2 rounded-xl border border-tertiary/20 group-hover:bg-tertiary group-hover:text-background transition-colors min-w-[70px] cursor-pointer"
                >
                  <span className="font-mono text-xs font-bold">{item.cost}</span>
                  <Diamond className="w-3 h-3 fill-current" />
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

interface ProfileProps {
  xp: number;
  crystals: number;
  streak: number;
  level: number;
  name: string;
  avatarUrl: string | null;
  inventory: InventoryItem[];
  onLogout: () => void;
  key?: React.Key;
}

function ProfileScreen({ xp, crystals, streak, level, name, avatarUrl, inventory, onLogout }: ProfileProps) {
  const hasWeapon = inventory.some(i => i.category === 'weapon');
  const hasArmor = inventory.some(i => i.itemId === 'kingdom_skin_pack' || i.category === 'armor' || i.category === 'cosmetic');
  const hasRelic = inventory.some(i => i.itemId === 'arcane_tome' || i.category === 'relic');
  const hasPet = inventory.some(i => i.itemId === 'dragon_familiar' || i.category === 'pet');

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col gap-8 w-full pb-8"
    >
      <section className="relative aspect-[4/5] mx-6 mt-4 rounded-[2rem] overflow-hidden border border-tertiary/40 shadow-2xl">
        <img src={IMAGES.PROFILE_BG} alt="Profile BG" className="absolute inset-0 w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        
        <div className="absolute inset-0 flex items-center justify-center py-12">
          <img src={IMAGES.FULL_HERO} alt="Hero" className="h-full object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] animate-float" />
        </div>

        <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-2 px-6 z-10">
          <span className="font-mono text-[10px] text-tertiary uppercase tracking-widest bg-background/80 px-4 py-1 rounded-full border border-tertiary/50 backdrop-blur-sm shadow-xl">
            LVL {level} Champion
          </span>
          <h2 className="font-serif text-3xl text-white font-bold drop-shadow-lg">{name}</h2>
          <div className="flex items-center gap-3 mt-4 bg-surface-container-high/80 px-6 py-3 rounded-2xl border border-white/10 backdrop-blur-md shadow-2xl">
            <span className="font-mono text-[10px] text-on-surface-variant font-bold uppercase">Rank Status:</span>
            <span className="font-mono text-[11px] text-primary font-bold uppercase flex items-center gap-2">
              The Emperor <Sparkles className="w-3.5 h-3.5 text-tertiary animate-pulse" />
            </span>
          </div>
        </div>
      </section>

      <section className="px-6 grid grid-cols-2 gap-4">
        <div className="col-span-2 bg-surface-container p-5 rounded-2xl border border-outline-variant/30 flex items-center justify-between shadow-lg">
          <div>
            <p className="font-mono text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">Total Experience</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-serif text-3xl font-bold text-tertiary">{xp.toLocaleString()}</span>
              <span className="text-xs text-on-surface-variant font-mono">XP</span>
            </div>
          </div>
          <div className="w-14 h-14 rounded-full bg-tertiary/10 border border-tertiary/40 flex items-center justify-center text-tertiary shadow-xl glow-tertiary">
            <Trophy className="w-7 h-7" />
          </div>
        </div>

        <div className="bg-surface-container p-5 rounded-2xl border border-outline-variant/30 shadow-lg relative overflow-hidden">
          <Diamond className="absolute top-[-10px] right-[-10px] w-16 h-16 opacity-5 rotate-12" />
          <p className="font-mono text-[10px] text-on-surface-variant uppercase font-bold">Crystals</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-serif text-3xl font-bold text-secondary">{crystals}</span>
            <Diamond className="w-4 h-4 fill-cyan-400 text-cyan-400" />
          </div>
        </div>

        <div className="bg-surface-container p-5 rounded-2xl border border-outline-variant/30 shadow-lg relative overflow-hidden">
          <Flame className="absolute top-[-10px] right-[-10px] w-16 h-16 opacity-5 rotate-12" />
          <p className="font-mono text-[10px] text-on-surface-variant uppercase font-bold">Streak</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-serif text-3xl font-bold text-error">{streak}</span>
            <span className="text-[10px] text-error font-bold uppercase font-mono">Days</span>
          </div>
        </div>
      </section>

      <section className="px-6 space-y-4">
        <h3 className="font-serif text-xl font-bold flex items-center gap-3">
          <Backpack className="text-tertiary" />
          Relics & Gear
        </h3>
        <div className="grid grid-cols-4 gap-4">
          <GearSlot icon={<Swords />} label="Weapon" quality={hasWeapon ? "rare" : "base"} />
          <GearSlot icon={<Shield />} label="Armor" quality={hasArmor ? "rare" : "base"} />
          <GearSlot icon={<BookOpen />} label="Relic" quality={hasRelic ? "epic" : "base"} />
          <GearSlot icon={<Star />} label="Pet" quality={hasPet ? "epic" : "base"} />
        </div>
      </section>

      <section className="px-6 mt-2 mb-8 flex justify-center">
        <button 
          onClick={onLogout}
          className="flex items-center gap-2 text-xs font-mono font-bold text-on-surface-variant text-center hover:text-red-400 hover:border-red-400/40 border border-outline-variant/40 px-5 py-2.5 rounded-xl bg-surface-container hover:bg-red-500/5 transition-all cursor-pointer active:scale-95"
        >
          <LogOut className="w-4 h-4" />
          Sign Out of Gates
        </button>
      </section>
    </motion.div>
  );
}

// --- Auxiliary Small Sub-Components ---

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 w-16 transition-all relative cursor-pointer ${active ? 'text-tertiary' : 'text-on-surface-variant/70 hover:text-primary'}`}
    >
      {active && (
        <motion.div 
          layoutId="nav-active"
          className="absolute -top-3 w-8 h-1 bg-tertiary rounded-full shadow-[0_0_15px_#d6c595]"
        />
      )}
      <div className={`transition-transform duration-200 ${active ? 'scale-110' : 'scale-100'}`}>
        {icon}
      </div>
      <span className="font-mono text-[9px] font-bold uppercase tracking-tighter">{label}</span>
    </button>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode, label: string, value: string, accent: 'primary' | 'tertiary' | 'error' }) {
  const colors = {
    primary: 'border-primary/20 hover:border-primary/50 text-secondary',
    tertiary: 'border-tertiary/20 hover:border-tertiary/50 text-tertiary',
    error: 'border-error/20 hover:border-error/50 text-error'
  };

  return (
    <div className={`bg-surface-container p-4 rounded-2xl border ${colors[accent]} transition-all cursor-default`}>
      <div className="opacity-40 mb-2">{icon}</div>
      <p className="font-serif text-xl font-bold">{value}</p>
      <p className="font-mono text-[9px] uppercase font-bold tracking-widest opacity-50">{label}</p>
    </div>
  );
}

function GearSlot({ icon, label, quality }: { icon: React.ReactNode, label: string, quality: 'base' | 'rare' | 'epic' }) {
  const qualityColors = {
    base: 'border-outline-variant/30 text-on-surface-variant/60 opacity-40 bg-surface-container-highest/20',
    rare: 'border-blue-400/40 text-blue-400 bg-blue-400/5 shadow-[0_0_8px_rgba(96,165,250,0.15)]',
    epic: 'border-tertiary text-tertiary bg-tertiary/5 shadow-[0_0_12px_rgba(214,197,149,0.25)]'
  };

  return (
    <div className={`aspect-square rounded-xl border flex flex-col items-center justify-center gap-1 shadow-inner relative overflow-hidden cursor-pointer transition-transform active:scale-95 ${qualityColors[quality]}`}>
      {icon}
      <span className="text-[8px] font-mono font-bold uppercase tracking-tighter">{label}</span>
      {quality !== 'base' && <div className="absolute top-0 right-0 w-4 h-4 bg-current opacity-10 rotate-45 translate-x-2 -translate-y-2" />}
    </div>
  );
}
