import { useState } from 'react';
import { ArrowRight, Loader2, Package, Tag, Ruler, Barcode } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

export function Products() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [name, setName] = useState('');
    const [category, setCategory] = useState('');
    const [unit, setUnit] = useState('');
    const [hscode, setHscode] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const { error: insertError } = await supabase
                .from('Products')
                .insert({
                    name: name.trim(),
                    category: category.trim(),
                    unit: unit.trim(),
                    hscode: hscode.trim() || null,
                });

            if (insertError) throw new Error(insertError.message);

            setSuccess('Product added successfully!');
            setTimeout(() => navigate('/'), 1500);
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
                className="hidden lg:flex lg:w-[45%] flex-col justify-between p-10 relative overflow-hidden"
                style={{ background: 'linear-gradient(145deg, #1B4332 0%, #2D6A4F 55%, #1B4332 100%)' }}
            >
                <div className="absolute inset-0 opacity-[0.03]"
                    style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }}
                />

                <div className="relative z-10 flex items-center gap-3">
                    <div className="bg-[#F0F2F5] rounded-xl p-1.5 shadow-lg flex items-center justify-center">
                        <img src="/logo.png" alt="EcoLedger Logo" className="w-10 h-10 object-contain drop-shadow-[0_4px_10px_rgba(64,145,108,0.4)]" />
                    </div>
                    <span className="text-white text-xl font-bold tracking-tight">
                        EcoLedger<span style={{ color: '#D9A06F' }}>.</span>
                    </span>
                </div>

                <div className="relative z-10 space-y-6">
                    <div>
                        <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight tracking-tight">
                            Add a<br />
                            <span style={{ color: '#40916C', textShadow: '0 0 30px rgba(64,145,108,0.6)' }}>
                                Product
                            </span>
                        </h1>
                        <p className="mt-4 text-white/60 text-base leading-relaxed max-w-sm">
                            Register products in your catalogue so they can be linked to supply chain relationships and tracked for carbon impact.
                        </p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-5 backdrop-blur-sm space-y-4">
                        <div className="flex items-start gap-3">
                            <Tag className="w-5 h-5 text-eco-mint shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-white font-semibold text-sm">Category</h3>
                                <p className="text-white/60 text-xs mt-1 leading-relaxed">
                                    E.g. Raw Material, Finished Good, Packaging. Used to group products in reporting.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Barcode className="w-5 h-5 text-eco-mint shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-white font-semibold text-sm">HS Code</h3>
                                <p className="text-white/60 text-xs mt-1 leading-relaxed">
                                    Optional Harmonized System code for trade and customs classification.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative z-10">
                    <p className="text-white/25 text-xs">Aligned with GHG Protocol Scope 3</p>
                </div>
            </div>

            {/* ── RIGHT PANEL ── */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative overflow-y-auto">
                <div className="w-full max-w-lg">
                    <div className="bg-white rounded-3xl shadow-2xl shadow-black/8 border border-gray-100 p-8 md:p-10">
                        <div className="mb-8">
                            <h2 className="text-2xl font-black" style={{ color: '#1B4332' }}>New Product</h2>
                            <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
                                Add a product to your catalogue. The ID is auto-generated by Supabase.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">

                            {/* Name */}
                            <div className="relative">
                                <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Product Name *"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    required
                                    className={inputClass}
                                />
                            </div>

                            {/* Category */}
                            <div className="relative">
                                <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Category * (e.g. Raw Material)"
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                    required
                                    className={inputClass}
                                />
                            </div>

                            {/* Unit */}
                            <div className="relative">
                                <Ruler className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Unit * (e.g. kg, tonnes, litres)"
                                    value={unit}
                                    onChange={e => setUnit(e.target.value)}
                                    required
                                    className={inputClass}
                                />
                            </div>

                            {/* HS Code (optional) */}
                            <div className="relative">
                                <Barcode className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="HS Code (optional)"
                                    value={hscode}
                                    onChange={e => setHscode(e.target.value)}
                                    className={inputClass}
                                />
                            </div>

                            {error && (
                                <div className="rounded-xl px-4 py-3 text-sm border"
                                    style={{ background: 'rgba(217,160,111,0.1)', borderColor: 'rgba(217,160,111,0.4)', color: '#92400e' }}>
                                    ⚠️ {error}
                                </div>
                            )}
                            {success && (
                                <div className="rounded-xl px-4 py-3 text-sm border flex items-center gap-2"
                                    style={{ background: 'rgba(45,106,79,0.08)', borderColor: 'rgba(64,145,108,0.3)', color: '#1B4332' }}>
                                    <ArrowRight className="w-4 h-4 shrink-0" style={{ color: '#40916C' }} />
                                    {success}
                                </div>
                            )}

                            <button type="submit" disabled={loading}
                                className="w-full py-4 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-4"
                                style={{
                                    background: loading ? '#2D6A4F' : 'linear-gradient(135deg, #40916C 0%, #1B4332 100%)',
                                    boxShadow: loading ? 'none' : '0 4px 20px rgba(27,67,50,0.35)',
                                }}>
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Product'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
            `}</style>
        </div>
    );
}
