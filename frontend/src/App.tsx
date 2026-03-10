import React, { useState } from 'react';
import { UploadForm } from '@/components/UploadForm';
import { Dashboard } from '@/components/Dashboard';
import { Leaf } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'upload'>('dashboard');

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
        </div>

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
      </header>

      {/* Main Container */}
      <main className="relative z-10 container pt-24">
        {activeTab === 'dashboard' ? <Dashboard /> : <UploadForm />}
      </main>
    </div>
  );
}
