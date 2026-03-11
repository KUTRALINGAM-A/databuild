import { useState, useEffect } from 'react';
import { UploadForm } from '@/components/UploadForm';
import { Dashboard } from '@/components/Dashboard';
import { AuthPage } from '@/pages/AuthPage';
import { supabase } from '@/lib/supabase';
import { Leaf, LogOut } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'upload'>('dashboard');

  useEffect(() => {
    // Get current session on mount
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Still loading initial session
  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F0F2F5' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #40916C, #1B4332)' }}>
            <Leaf className="w-6 h-6 text-white animate-pulse" />
          </div>
          <p className="text-sm font-medium" style={{ color: '#2D6A4F' }}>Loading EcoLedger…</p>
        </div>
      </div>
    );
  }

  // Not authenticated → show auth page
  if (!session) return <AuthPage />;

  // Authenticated → show main app
  const companyName = session.user.user_metadata?.company_name || session.user.email;

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden pt-8 pb-20">
      {/* Background radial blurs for premium look */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-900/20 blur-[120px] rounded-full point-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-green-900/10 blur-[120px] rounded-full point-events-none" />

      {/* Navigation Layer */}
      <header className="fixed top-0 inset-x-0 h-16 bg-zinc-950/50 backdrop-blur-md border-b border-white/5 z-50 flex items-center justify-between px-6 lg:px-12">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">EcoLedger<span className="text-green-500 text-glow">.</span></h1>
          <span className="hidden sm:inline text-xs text-zinc-500 border border-zinc-700 rounded-full px-2 py-0.5 truncate max-w-[180px]">
            {companyName}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <nav className="flex items-center bg-zinc-900/50 rounded-full p-1 border border-zinc-800">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-6 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${activeTab === 'dashboard'
                ? 'bg-zinc-800 text-white shadow-md border border-zinc-700/50'
                : 'text-zinc-400 hover:text-white'
                }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-6 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${activeTab === 'upload'
                ? 'bg-zinc-800 text-white shadow-md border border-zinc-700/50'
                : 'text-zinc-400 hover:text-white'
                }`}
            >
              Data Portal
            </button>
          </nav>

          {/* Sign out */}
          <button
            onClick={() => supabase.auth.signOut()}
            title="Sign out"
            className="p-2 rounded-full border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 container pt-24">
        {activeTab === 'dashboard' ? <Dashboard /> : <UploadForm />}
      </main>
    </div>
  );
}
