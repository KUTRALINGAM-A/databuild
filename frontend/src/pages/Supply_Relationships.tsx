import { useState, useEffect } from 'react';
import { ArrowRight, Loader2, Package, Building2, Hash, Weight, ToggleLeft, ToggleRight, ChevronDown } from 'lucide-react';
import { getMyCompany } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

type CompanyOption = { id: string; name: string };
type ProductOption = { id: string; name: string };

export function SupplyRelationships() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [initialising, setInitialising] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Auto-filled
    const [buyer_company_id, setBuyerCompanyId] = useState('');
    const [buyerName, setBuyerName] = useState('');

    // Supplier dropdown
    const [companies, setCompanies] = useState<CompanyOption[]>([]);
    const [supplier_company_id, setSupplierCompanyId] = useState('');
    const [supplierOtherName, setSupplierOtherName] = useState('');
    const isOthers = supplier_company_id === '__others__';

    // Product dropdown
    const [products, setProducts] = useState<ProductOption[]>([]);
    const [product_id, setProductId] = useState('');
    const [productOtherName, setProductOtherName] = useState('');
    const isProductOthers = product_id === '__product_others__';

    // Other fields
    const [quantity_per_year, setQuantityPerYear] = useState('');
    const [co2e_per_unit, setCo2ePerUnit] = useState('');
    const [is_active, setIsActive] = useState(true);

    useEffect(() => {
        const init = async () => {
            // Fetch logged-in user's company
            const co = await getMyCompany();
            if (co) {
                setBuyerCompanyId(co.id);
                setBuyerName(co.name);
            }

            // Fetch all companies for supplier dropdown
            const { data } = await supabase
                .from('Companies_and_Vendors')
                .select('id, name')
                .order('name');
            setCompanies(data ?? []);

            // Fetch all products for product dropdown
            const { data: productData } = await supabase
                .from('Products')
                .select('id, name')
                .order('name');
            setProducts(productData ?? []);
            setInitialising(false);
        };
        init();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            if (!buyer_company_id) throw new Error('Could not determine your company ID. Please set up your company profile first.');
            if (!supplier_company_id) throw new Error('Please select a supplier.');
            if (isOthers && !supplierOtherName.trim()) throw new Error('Please enter the supplier name.');
            if (!product_id) throw new Error('Please select a product.');
            if (isProductOthers && !productOtherName.trim()) throw new Error('Please enter the product name.');

            // ── Step 1: If supplier is "Others", insert a new company row and get its UUID ──
            let finalSupplierId = supplier_company_id;
            if (isOthers) {
                const { data: newCompany, error: companyInsertError } = await supabase
                    .from('Companies_and_Vendors')
                    .insert({
                        name: supplierOtherName.trim(),
                        role: 'Supplier',
                        industry: 'General',
                        carbon_cap: 10000,
                        total_co2e: 0,
                        status: 'Green',
                        user_id: null,
                    })
                    .select('id')
                    .single();
                if (companyInsertError) throw new Error(`Failed to create supplier: ${companyInsertError.message}`);
                finalSupplierId = newCompany.id;
            }

            // ── Step 2: If product is "Others", insert a new product row and get its UUID ──
            let finalProductId = product_id;
            if (isProductOthers) {
                const { data: newProduct, error: productInsertError } = await supabase
                    .from('Products')
                    .insert({
                        name: productOtherName.trim(),
                        category: 'General',
                        unit: 'unit',
                    })
                    .select('id')
                    .single();
                if (productInsertError) throw new Error(`Failed to create product: ${productInsertError.message}`);
                finalProductId = newProduct.id;
            }

            // ── Step 3: Insert the supply relationship with real UUIDs ──
            const { error: insertError } = await supabase
                .from('Supply_Relationships')
                .insert({
                    buyer_company_id,
                    supplier_company_id: finalSupplierId,
                    product_id: finalProductId,
                    quantity_per_year: quantity_per_year ? Number(quantity_per_year) : 0,
                    co2e_per_unit: co2e_per_unit ? Number(co2e_per_unit) : 0,
                    is_active,
                    created_at: new Date().toISOString(),
                });

            if (insertError) throw new Error(insertError.message);

            setSuccess('Supply relationship saved successfully!');
            setTimeout(() => navigate('/'), 1500);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full bg-eco-basegray border border-gray-200 text-eco-graphite rounded-xl px-4 py-3 pl-11 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-eco-mint/50 focus:border-eco-mint transition-all duration-200";

    if (initialising) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: '#F0F2F5' }}>
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-2 border-eco-mint/30 border-t-eco-mint rounded-full animate-spin" />
                    <p className="text-sm font-medium" style={{ color: '#2D6A4F' }}>Loading…</p>
                </div>
            </div>
        );
    }

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
                            Supply Chain<br />
                            <span style={{ color: '#40916C', textShadow: '0 0 30px rgba(64,145,108,0.6)' }}>
                                Relationships
                            </span>
                        </h1>
                        <p className="mt-4 text-white/60 text-base leading-relaxed max-w-sm">
                            Link your company to its suppliers and track Scope 3 carbon emissions across your entire supply chain.
                        </p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-5 backdrop-blur-sm space-y-4">
                        <div className="flex items-start gap-3">
                            <Building2 className="w-5 h-5 text-eco-mint shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-white font-semibold text-sm">Buyer Company</h3>
                                <p className="text-white/60 text-xs mt-1 leading-relaxed">
                                    Automatically set to your logged-in company.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Weight className="w-5 h-5 text-eco-mint shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-white font-semibold text-sm">CO₂e Per Unit</h3>
                                <p className="text-white/60 text-xs mt-1 leading-relaxed">
                                    Carbon emission per unit from this supplier — used to calculate your Scope 3 footprint.
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
                            <h2 className="text-2xl font-black" style={{ color: '#1B4332' }}>Supply Relationship</h2>
                            <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
                                Link a supplier to track your Scope 3 carbon impact.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">

                            {/* Buyer (auto-filled, read-only) */}
                            <div>
                                <label className="block text-xs font-semibold text-eco-graphite/60 uppercase tracking-wider mb-1.5">
                                    Buyer Company (You)
                                </label>
                                <div className="relative flex items-center bg-eco-mint/5 border border-eco-mint/30 rounded-xl px-4 py-3 pl-11">
                                    <Building2 className="absolute left-3.5 w-4 h-4 text-eco-mint" />
                                    <span className="text-sm font-semibold text-eco-deepgreen">
                                        {buyerName || 'Fetching your company…'}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400 mt-1 ml-1">Auto-filled from your company profile</p>
                            </div>

                            {/* Supplier Dropdown */}
                            <div>
                                <label className="block text-xs font-semibold text-eco-graphite/60 uppercase tracking-wider mb-1.5">
                                    Supplier Company
                                </label>
                                <div className="relative">
                                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                    <select
                                        value={supplier_company_id}
                                        onChange={e => setSupplierCompanyId(e.target.value)}
                                        required
                                        className={`${inputClass} appearance-none pr-10 cursor-pointer`}
                                    >
                                        <option value="">— Select a supplier —</option>
                                        {companies.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                        <option value="__others__">Others (enter manually)</option>
                                    </select>
                                </div>

                                {/* "Others" free-text input */}
                                {isOthers && (
                                    <div className="relative mt-2">
                                        <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Enter supplier name manually"
                                            value={supplierOtherName}
                                            onChange={e => setSupplierOtherName(e.target.value)}
                                            required
                                            className={inputClass}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Product Dropdown */}
                            <div>
                                <label className="block text-xs font-semibold text-eco-graphite/60 uppercase tracking-wider mb-1.5">
                                    Product
                                </label>
                                <div className="relative">
                                    <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                    <select
                                        value={product_id}
                                        onChange={e => setProductId(e.target.value)}
                                        required
                                        className={`${inputClass} appearance-none pr-10 cursor-pointer`}
                                    >
                                        <option value="">— Select a product —</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                        <option value="__product_others__">Others (enter manually)</option>
                                    </select>
                                </div>
                                {isProductOthers && (
                                    <div className="relative mt-2">
                                        <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Enter product name manually"
                                            value={productOtherName}
                                            onChange={e => setProductOtherName(e.target.value)}
                                            required
                                            className={inputClass}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative">
                                    <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="Qty / Year"
                                        value={quantity_per_year}
                                        onChange={e => setQuantityPerYear(e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                                <div className="relative">
                                    <Weight className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="number"
                                        step="0.001"
                                        placeholder="CO₂e / Unit (kg)"
                                        value={co2e_per_unit}
                                        onChange={e => setCo2ePerUnit(e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                            </div>

                            {/* Is Active toggle */}
                            <div className="flex items-center justify-between bg-eco-basegray border border-gray-200 rounded-xl px-4 py-3">
                                <div>
                                    <p className="text-sm font-semibold text-eco-graphite">Active Relationship</p>
                                    <p className="text-xs text-gray-400 mt-0.5">Include in Scope 3 calculations</p>
                                </div>
                                <button type="button" onClick={() => setIsActive(prev => !prev)} className="transition-all">
                                    {is_active
                                        ? <ToggleRight className="w-9 h-9 text-eco-mint" />
                                        : <ToggleLeft className="w-9 h-9 text-gray-300" />
                                    }
                                </button>
                            </div>

                            {/* Timestamp display */}
                            <p className="text-xs text-gray-400 ml-1">
                                <span className="font-semibold text-eco-graphite/50">Timestamp: </span>
                                {new Date().toLocaleString()} (auto-set on submit)
                            </p>

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

                            <button type="submit" disabled={loading || !buyer_company_id}
                                className="w-full py-4 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-4"
                                style={{
                                    background: loading ? '#2D6A4F' : 'linear-gradient(135deg, #40916C 0%, #1B4332 100%)',
                                    boxShadow: loading ? 'none' : '0 4px 20px rgba(27,67,50,0.35)',
                                }}>
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Relationship'}
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
