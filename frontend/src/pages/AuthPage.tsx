import { useState, useEffect, useRef } from 'react';
import { ArrowRight, Eye, EyeOff, Building2, Mail, Lock, CheckCircle2, Loader2, TrendingDown, Globe, Users, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { createCompany } from '@/lib/db';

// ── Animated Particle Node for the supply chain graph ─────────────────────────
type NodePos = { x: number; y: number; label: string; type: 'hub' | 'node' };

const nodes: NodePos[] = [
    { x: 50, y: 50, label: 'MFG', type: 'hub' },
    { x: 20, y: 25, label: 'RAW', type: 'node' },
    { x: 78, y: 22, label: 'LOG', type: 'node' },
    { x: 15, y: 72, label: 'SUP', type: 'node' },
    { x: 82, y: 75, label: 'DIST', type: 'node' },
    { x: 50, y: 85, label: 'RET', type: 'node' },
    { x: 35, y: 38, label: 'PKG', type: 'node' },
];
const edges = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [1, 6], [2, 4], [3, 5]];

function SupplyChainGraph() {
    const [activeEdge, setActiveEdge] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setActiveEdge(e => (e + 1) % edges.length), 900);
        return () => clearInterval(t);
    }, []);

    return (
        <svg viewBox="0 0 100 100" className="w-full h-full" style={{ overflow: 'visible' }}>
            <defs>
                <radialGradient id="nodeGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#40916C" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#1B4332" stopOpacity="0" />
                </radialGradient>
            </defs>
            {/* Edges */}
            {edges.map(([a, b], i) => (
                <line
                    key={i}
                    x1={nodes[a].x} y1={nodes[a].y}
                    x2={nodes[b].x} y2={nodes[b].y}
                    stroke={i === activeEdge ? '#40916C' : '#2D6A4F'}
                    strokeWidth={i === activeEdge ? 0.8 : 0.3}
                    strokeDasharray={i === activeEdge ? '0' : '2,2'}
                    style={{ transition: 'stroke 0.5s, stroke-width 0.5s' }}
                    opacity={i === activeEdge ? 0.9 : 0.4}
                />
            ))}
            {/* Nodes */}
            {nodes.map((n, i) => (
                <g key={i}>
                    <circle cx={n.x} cy={n.y} r={n.type === 'hub' ? 7 : 4.5}
                        fill={n.type === 'hub' ? '#40916C' : '#2D6A4F'}
                        opacity="0.9"
                        style={{ filter: n.type === 'hub' ? 'drop-shadow(0 0 4px #40916C)' : 'none' }}
                    />
                    <text x={n.x} y={n.y + 0.5} textAnchor="middle" dominantBaseline="middle"
                        fontSize={n.type === 'hub' ? '3.5' : '2.8'} fill="white" fontWeight="bold">
                        {n.label}
                    </text>
                    {/* Ping ring for hub */}
                    {n.type === 'hub' && (
                        <circle cx={n.x} cy={n.y} r="10" fill="none" stroke="#40916C"
                            strokeWidth="0.5" opacity="0.4"
                            style={{ animation: 'ping 2s cubic-bezier(0,0,0.2,1) infinite' }}
                        />
                    )}
                </g>
            ))}
        </svg>
    );
}

// ── Animated Counter ───────────────────────────────────────────────────────────
function AnimCounter({ to, suffix = '', prefix = '' }: { to: number; suffix?: string; prefix?: string }) {
    const [val, setVal] = useState(0);
    const frame = useRef<number | null>(null);
    useEffect(() => {
        const duration = 1800;
        const start = performance.now();
        const tick = (now: number) => {
            const p = Math.min((now - start) / duration, 1);
            setVal(Math.floor(p * p * (3 - 2 * p) * to)); // smoothstep easing
            if (p < 1) frame.current = requestAnimationFrame(tick);
        };
        frame.current = requestAnimationFrame(tick);
        return () => { if (frame.current) cancelAnimationFrame(frame.current); };
    }, [to]);
    return <span>{prefix}{val.toLocaleString('en-IN')}{suffix}</span>;
}

// ── Stat Card on Left Panel ────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, suffix, prefix, color }: {
    icon: React.ElementType; label: string; value: number;
    suffix?: string; prefix?: string; color: string;
}) {
    return (
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 backdrop-blur-sm">
            <div className={`p-2 rounded-lg ${color}`}>
                <Icon className="w-4 h-4 text-white" />
            </div>
            <div>
                <p className="text-xs text-white/50 leading-none mb-0.5">{label}</p>
                <p className="text-base font-bold text-white leading-none">
                    <AnimCounter to={value} suffix={suffix} prefix={prefix} />
                </p>
            </div>
        </div>
    );
}

// ── Main AuthPage ──────────────────────────────────────────────────────────────
type AuthMode = 'login' | 'signup';

export function AuthPage() {
    const [mode, setMode] = useState<AuthMode>('login');
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // form state
    const [company, setCompany] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            if (mode === 'signup') {
                const { error: err } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { company_name: company } },
                });
                if (err) throw err;
                // Immediately create the company row in Companies_and_Vendors
                await createCompany({ name: company || email.split('@')[0], industry: 'General', carbonCap: 10000 });
                setSuccess('Account created! Signing you in…');
            } else {
                const { error: err } = await supabase.auth.signInWithPassword({ email, password });
                if (err) throw err;
                // App.tsx listens to onAuthStateChange and will redirect
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full bg-eco-basegray border border-gray-200 text-eco-graphite rounded-xl px-4 py-3 pl-11 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-eco-mint/50 focus:border-eco-mint transition-all duration-200";

    return (
        <div className="min-h-screen flex font-['Inter',sans-serif]" style={{ background: '#F0F2F5' }}>

            {/* ── LEFT PANEL ── */}
            <div
                className="hidden lg:flex lg:w-[52%] flex-col justify-between p-10 relative overflow-hidden"
                style={{ background: 'linear-gradient(145deg, #1B4332 0%, #2D6A4F 55%, #1B4332 100%)' }}
            >
                {/* Noise texture overlay */}
                <div className="absolute inset-0 opacity-[0.03]"
                    style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }}
                />
                {/* Radial accent glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(64,145,108,0.18) 0%, transparent 70%)' }}
                />

                {/* Logo */}
                <div className="relative z-10 flex items-center gap-3">
                    <div className="bg-[#F0F2F5] rounded-xl p-1.5 shadow-lg flex items-center justify-center">
                        <img src="/logo.png" alt="EcoLedger Logo" className="w-10 h-10 object-contain drop-shadow-[0_4px_10px_rgba(64,145,108,0.4)]" />
                    </div>
                    <span className="text-white text-xl font-bold tracking-tight">
                        EcoLedger<span style={{ color: '#D9A06F' }}>.</span>
                    </span>
                    <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full border"
                        style={{ borderColor: 'rgba(217,160,111,0.4)', color: '#D9A06F', background: 'rgba(217,160,111,0.08)' }}>
                        INDIA CCTS
                    </span>
                </div>

                {/* Hero text */}
                <div className="relative z-10 space-y-6">
                    <div>
                        <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight tracking-tight">
                            India's Carbon<br />
                            <span style={{ color: '#40916C', textShadow: '0 0 30px rgba(64,145,108,0.6)' }}>
                                Intelligence
                            </span>{' '}
                            Network
                        </h1>
                        <p className="mt-4 text-white/60 text-base leading-relaxed max-w-sm">
                            Track, verify, and reduce Scope 1–3 emissions across your entire supply chain — aligned to India's Carbon Credit Trading Scheme (CCTS) and SEBI BRSR norms.
                        </p>
                    </div>

                    {/* Supply chain graph */}
                    <div className="relative w-full h-52 rounded-2xl overflow-hidden border border-white/10"
                        style={{ background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(8px)' }}>
                        <div className="absolute inset-0 p-4">
                            <SupplyChainGraph />
                        </div>
                        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                            <span className="text-white/40 text-xs">Live Supply Chain Graph</span>
                            <span className="flex items-center gap-1 text-xs font-semibold"
                                style={{ color: '#40916C' }}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse inline-block" />
                                Monitoring Active
                            </span>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard icon={Users} label="Companies Monitoring" value={847} suffix="+" color="bg-eco-mint/80" />
                        <StatCard icon={TrendingDown} label="CO₂e Tracked (tonnes)" value={12400} suffix=" t" color="bg-eco-teal/80" />
                        <StatCard icon={Globe} label="CCTS Credits Issued" value={23500} prefix="₹" suffix=" Cr" color="bg-eco-mint/80" />
                        <StatCard icon={Zap} label="AI Extractions Today" value={3241} suffix="" color="bg-eco-teal/80" />
                    </div>
                </div>

                {/* Footer */}
                <div className="relative z-10">
                    <p className="text-white/25 text-xs">
                        Aligned with BEE PAT Scheme · SEBI BRSR Core · India CCTS 2023
                    </p>
                </div>
            </div>

            {/* ── RIGHT PANEL ── */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative">
                {/* Mobile logo */}
                <div className="lg:hidden flex items-center gap-2 mb-8">
                    <img src="/logo.png" alt="EcoLedger Logo" className="w-10 h-10 object-contain drop-shadow-md" />
                    <span className="text-xl font-bold" style={{ color: '#1B4332' }}>EcoLedger.</span>
                </div>

                <div className="w-full max-w-md">
                    {/* Card */}
                    <div className="bg-white rounded-3xl shadow-2xl shadow-black/8 border border-gray-100 p-8 md:p-10">

                        {/* Tab Switcher */}
                        <div className="flex bg-eco-basegray rounded-xl p-1 mb-8">
                            {(['login', 'signup'] as AuthMode[]).map(m => (
                                <button key={m} onClick={() => { setMode(m); setError(''); setSuccess(''); }}
                                    className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200"
                                    style={mode === m
                                        ? { background: '#1B4332', color: 'white', boxShadow: '0 2px 8px rgba(27,67,50,0.3)' }
                                        : { color: '#6b7280' }}>
                                    {m === 'login' ? 'Sign In' : 'Register Company'}
                                </button>
                            ))}
                        </div>

                        {/* Heading */}
                        <div className="mb-7">
                            <h2 className="text-2xl font-black" style={{ color: '#1B4332' }}>
                                {mode === 'login' ? 'Welcome back' : 'Join EcoLedger'}
                            </h2>
                            <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
                                {mode === 'login'
                                    ? 'Sign in to your carbon intelligence dashboard.'
                                    : "Start tracking your supply chain's carbon footprint."}
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {mode === 'signup' && (
                                <div className="relative">
                                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input type="text" required placeholder="Company Name (e.g., Tata Steel Ltd)"
                                        value={company} onChange={e => setCompany(e.target.value)}
                                        className={inputClass} />
                                </div>
                            )}
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input type="email" required placeholder="Work Email Address"
                                    value={email} onChange={e => setEmail(e.target.value)}
                                    className={inputClass} />
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input type={showPwd ? 'text' : 'password'} required
                                    placeholder={mode === 'signup' ? 'Create Password (min 8 chars)' : 'Password'}
                                    minLength={8} value={password} onChange={e => setPassword(e.target.value)}
                                    className={inputClass} style={{ paddingRight: '2.75rem' }} />
                                <button type="button" onClick={() => setShowPwd(s => !s)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>

                            {/* Forgot password */}
                            {mode === 'login' && (
                                <div className="text-right">
                                    <button type="button" className="text-xs font-medium hover:underline"
                                        style={{ color: '#40916C' }}>
                                        Forgot password?
                                    </button>
                                </div>
                            )}

                            {/* Compliance notice for signup */}
                            {mode === 'signup' && (
                                <label className="flex items-start gap-2.5 cursor-pointer group">
                                    <input type="checkbox" required className="mt-0.5 w-4 h-4 rounded accent-eco-mint" />
                                    <span className="text-xs leading-relaxed" style={{ color: '#6b7280' }}>
                                        I agree to EcoLedger's{' '}
                                        <span className="underline cursor-pointer" style={{ color: '#40916C' }}>Terms</span>{' '}
                                        and confirm our data will be used for CCTS compliance reporting under India's carbon credit framework.
                                    </span>
                                </label>
                            )}

                            {/* Error / Success */}
                            {error && (
                                <div className="rounded-xl px-4 py-3 text-sm border"
                                    style={{ background: 'rgba(217,160,111,0.1)', borderColor: 'rgba(217,160,111,0.4)', color: '#92400e' }}>
                                    ⚠️ {error}
                                </div>
                            )}
                            {success && (
                                <div className="rounded-xl px-4 py-3 text-sm border flex items-center gap-2"
                                    style={{ background: 'rgba(45,106,79,0.08)', borderColor: 'rgba(64,145,108,0.3)', color: '#1B4332' }}>
                                    <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: '#40916C' }} />
                                    {success}
                                </div>
                            )}

                            {/* CTA Button */}
                            <button type="submit" disabled={loading}
                                className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                                style={{
                                    background: loading ? '#2D6A4F' : 'linear-gradient(135deg, #40916C 0%, #1B4332 100%)',
                                    boxShadow: loading ? 'none' : '0 4px 20px rgba(27,67,50,0.35)',
                                }}>
                                {loading
                                    ? <><Loader2 className="w-4 h-4 animate-spin" />{mode === 'login' ? 'Signing in...' : 'Creating account...'}</>
                                    : <>{mode === 'login' ? 'Sign In to Dashboard' : 'Register My Company'}<ArrowRight className="w-4 h-4" /></>
                                }
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="flex items-center gap-3 my-6">
                            <div className="flex-1 h-px bg-gray-100" />
                            <span className="text-xs text-gray-400">Trusted by Indian enterprises</span>
                            <div className="flex-1 h-px bg-gray-100" />
                        </div>

                        {/* Trust badges */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                            {[
                                { label: 'BEE PAT', sub: 'Aligned' },
                                { label: 'SEBI BRSR', sub: 'Ready' },
                                { label: 'CCTS 2023', sub: 'Compliant' },
                            ].map(b => (
                                <div key={b.label} className="rounded-xl py-2.5 px-2 border"
                                    style={{ background: '#F0F2F5', borderColor: '#e5e7eb' }}>
                                    <p className="text-xs font-bold" style={{ color: '#1B4332' }}>{b.label}</p>
                                    <p className="text-xs" style={{ color: '#9ca3af' }}>{b.sub}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Below card */}
                    <p className="text-center text-xs mt-6" style={{ color: '#9ca3af' }}>
                        By signing in you agree your data is stored securely on Supabase.<br />
                        EcoLedger does not sell or share emissions data.
                    </p>
                </div>
            </div>

            {/* Ping keyframe */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                @keyframes ping {
                    0%   { transform: scale(1); opacity: 0.6; }
                    70%  { transform: scale(1.8); opacity: 0; }
                    100% { transform: scale(1.8); opacity: 0; }
                }
            `}</style>
        </div>
    );
}
