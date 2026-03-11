import { useState, useEffect } from 'react';
import { UploadForm } from '@/components/UploadForm';
import { Dashboard } from '@/components/Dashboard';
import { AuthPage } from '@/pages/AuthPage';
import { supabase } from '@/lib/supabase';
import { LogOut } from 'lucide-react';
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
          <img src="/logo.png" alt="EcoLedger Logo" className="w-14 h-14 object-contain animate-pulse drop-shadow-lg" />
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
    <div className="min-h-screen relative pt-8 pb-20">
      {/* Background radial blurs for premium look */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-eco-mint/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-eco-teal/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Navigation Layer */}
      <header className="fixed top-0 inset-x-0 h-16 bg-white/70 backdrop-blur-md border-b border-eco-graphite/10 z-50 flex items-center justify-between px-6 lg:px-12">
        <div className="flex items-center space-x-3">
          <img src="/logo.png" alt="EcoLedger Logo" className="w-10 h-10 object-contain drop-shadow-[0_2px_8px_rgba(64,145,108,0.3)]" />
          <h1 className="text-xl font-bold tracking-tight text-eco-deepgreen">EcoLedger<span className="text-eco-mint text-glow">.</span></h1>
          <span className="hidden sm:inline text-xs font-medium text-eco-graphite/70 border border-eco-graphite/20 rounded-full px-3 py-1 bg-eco-basegray truncate max-w-[180px]">
            {companyName}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <nav className="flex items-center bg-eco-basegray rounded-full p-1 border border-eco-graphite/10">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-6 py-1.5 rounded-full text-sm font-bold transition-all duration-300 ${activeTab === 'dashboard'
                ? 'bg-white text-eco-deepgreen shadow-sm border border-eco-graphite/5'
                : 'text-eco-graphite/60 hover:text-eco-deepgreen'
                }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-6 py-1.5 rounded-full text-sm font-bold transition-all duration-300 ${activeTab === 'upload'
                ? 'bg-white text-eco-deepgreen shadow-sm border border-eco-graphite/5'
                : 'text-eco-graphite/60 hover:text-eco-deepgreen'
                }`}
            >
              Data Portal
            </button>
          </nav>

          {/* Sign out */}
          <button
            onClick={() => supabase.auth.signOut()}
            title="Sign out"
            className="p-2 rounded-full border border-eco-graphite/20 text-eco-graphite/60 hover:text-eco-deepgreen hover:border-eco-graphite/40 bg-white transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 container pt-24">
        <div style={{ display: activeTab === 'dashboard' ? 'block' : 'none' }}>
          <Dashboard />
        </div>
        <div style={{ display: activeTab === 'upload' ? 'block' : 'none' }}>
          <UploadForm />
        </div>
      </main>
    </div>
  );
}
