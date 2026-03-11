/**
 * EcoLedger — Supabase Database Service Layer
 * Maps to the existing schema:
 *   Companies_and_Vendors, Carbon_Ledger, Raw_Uploads, Industry_Averages
 */
import { supabase } from './supabase';

// ─── Types matching your DB schema ───────────────────────────────────────────

export type CompanyRow = {
    id: string;
    name: string;
    role: 'Enterprise' | 'Supplier';
    industry: string;
    status: 'Green' | 'Red';
    total_co2e: number;
    carbon_cap: number;
    user_id: string | null;
    created_at: string;
    baseline_co2e?: number;
    target_co2e?: number;
    target_year?: number;
    employee_count?: number;
    annual_revenue_cr?: number;
    production_volume?: number;
    production_unit?: string;
    industry_emission_factor?: number;
};

export type CarbonLedgerRow = {
    id: string;
    company_id: string;
    upload_id: string | null;
    scope_type: 1 | 2 | 3;
    scope3_category: number | null;
    raw_metric: number;
    metric_unit: string;
    calculated_co2e: number;
    emission_factor: number;
    factor_source: string;
    period_start: string | null;
    period_end: string | null;
    date_recorded: string;
};

export type ProductRow = {
    id: string;
    name: string;
    category: string;
    unit: string;
    hscode?: string;
};

export type SupplyRelationshipRow = {
    id: string;
    buyer_company_id: string;
    supplier_company_id: string;
    product_id: string;
    quantity_per_year: number;
    co2e_per_unit: number;
    is_active: boolean;
    created_at?: string;
};

export type CarbonCreditRow = {
    id: string;
    company_id: string;
    credit_type: string;
    tonnes_offset: number;
    cost_inr: number;
    certificate_url?: string;
    purchased_at: string;
};

export type IndustryAverageRow = {
    id: string;
    industry: string;
    avg_co2e: number;
};

// ─── Company helpers ──────────────────────────────────────────────────────────

/** Get the logged-in user's company row. Returns null if not yet created. */
export async function getMyCompany(): Promise<CompanyRow | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('Companies_and_Vendors')
        .select('*')
        .eq('user_id', user.id)
        .eq('role', 'Enterprise')
        .maybeSingle();

    if (error) { console.error('getMyCompany error:', error); return null; }
    return data;
}

/** Create a company row after signup. */
export async function createCompany(params: {
    name: string;
    industry?: string;
    carbonCap?: number;
}): Promise<CompanyRow | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('Companies_and_Vendors')
        .insert({
            name: params.name,
            role: 'Enterprise',
            industry: params.industry ?? 'General',
            carbon_cap: params.carbonCap ?? 10000,
            total_co2e: 0,
            status: 'Green',
            user_id: user.id,
        })
        .select()
        .single();

    if (error) { console.error('createCompany error:', error); return null; }
    return data;
}

// ─── Carbon Ledger helpers ────────────────────────────────────────────────────

/** Fetch all carbon ledger rows for the current user's company. */
export async function getMyCarbonLedger(optionalCompanyId?: string): Promise<CarbonLedgerRow[]> {
    let companyId = optionalCompanyId;
    if (!companyId) {
        const company = await getMyCompany();
        if (!company) return [];
        companyId = company.id;
    }

    const { data, error } = await supabase
        .from('Carbon_Ledger')
        .select('*')
        .eq('company_id', companyId)
        .order('date_recorded', { ascending: false });

    if (error) { console.error('getMyCarbonLedger error:', error); return []; }
    return data ?? [];
}

/** Save a new extraction result into Carbon_Ledger (and update total_co2e). */
export async function saveCarbonRecord(params: {
    company_id: string;
    upload_id?: string;
    scope_type: 1 | 2 | 3;
    scope3_category?: number;
    raw_metric: number;
    metric_unit: string;
    calculated_co2e: number;
    emission_factor?: number;
    factor_source?: string;
    period_start?: string;
    period_end?: string;
}): Promise<CarbonLedgerRow | null> {
    const { data, error } = await supabase
        .from('Carbon_Ledger')
        .insert({
            company_id: params.company_id,
            upload_id: params.upload_id ?? null,
            scope_type: params.scope_type,
            scope3_category: params.scope3_category ?? null,
            raw_metric: params.raw_metric,
            metric_unit: params.metric_unit,
            calculated_co2e: params.calculated_co2e,
            emission_factor: params.emission_factor ?? 0.82,
            factor_source: params.factor_source ?? 'CEA_CO2_Baseline_v18_2023_India_National',
            period_start: params.period_start ?? null,
            period_end: params.period_end ?? null,
            date_recorded: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

    if (error) { console.error('saveCarbonRecord error:', error); return null; }

    // Re-sum co2e and compare against company's actual carbon_cap (not hardcoded 10000)
    try {
        const { data: company } = await supabase
            .from('Companies_and_Vendors')
            .select('carbon_cap')
            .eq('id', params.company_id)
            .single();
        const { data: ledger } = await supabase
            .from('Carbon_Ledger')
            .select('calculated_co2e')
            .eq('company_id', params.company_id);
        const total = (ledger ?? []).reduce((sum, r) => sum + (r.calculated_co2e ?? 0), 0);
        const cap = company?.carbon_cap ?? 10000;
        const newStatus = total > cap ? 'Red' : 'Green';
        await supabase
            .from('Companies_and_Vendors')
            .update({ total_co2e: total, status: newStatus })
            .eq('id', params.company_id);
    } catch (e) {
        console.warn('Could not update total_co2e:', e);
    }

    return data;
}

/** Record an upload in Raw_Uploads table. */
export async function saveUploadRecord(params: {
    company_id: string;
    file_url: string;
    document_type: 'Energy_Bill' | 'Shipping_Log';
    status?: 'Pending' | 'Processed' | 'Failed';
}): Promise<string | null> {
    const { data, error } = await supabase
        .from('Raw_Uploads')
        .insert({
            company_id: params.company_id,
            file_url: params.file_url,
            document_type: params.document_type,
            extraction_status: params.status ?? 'Pending',
        })
        .select('id')
        .single();

    if (error) { console.error('saveUploadRecord error:', error); return null; }
    return data?.id ?? null;
}

/** Get all vendors for the current user's company. */
export async function getMyVendors(optionalCompanyId?: string): Promise<CompanyRow[]> {
    let companyId = optionalCompanyId;
    if (!companyId) {
        const company = await getMyCompany();
        if (!company) return [];
        companyId = company.id;
    }

    // Correct Supabase Join syntax for foreign keys
    const { data, error } = await supabase
        .from('Supply_Relationships')
        .select(`
            supplier_company_id,
            Companies_and_Vendors:supplier_company_id (*)
        `)
        .eq('buyer_company_id', companyId)
        .eq('is_active', true);

    if (error) { console.error('getMyVendors error:', error); return []; }
    
    // Extract the actual company rows from the join
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vendors = (data ?? []).map((r: any) => r.Companies_and_Vendors).filter(Boolean);
    return vendors;
}

/** Get industry averages for Smart Switch. */
export async function getIndustryAverages(): Promise<IndustryAverageRow[]> {
    const { data, error } = await supabase
        .from('Industry_Averages')
        .select('*');
    if (error) return [];
    return data ?? [];
}

// ─── Products & Supply Chain helpers ─────────────────────────────────────────

/** Fetch the products catalogue (public). */
export async function getProducts(): Promise<ProductRow[]> {
    const { data, error } = await supabase
        .from('Products')
        .select('*')
        .order('category');
    if (error) return [];
    return data ?? [];
}

/** Get all supply relationships where the current company is the BUYER. */
export async function getMySupplyRelationships(): Promise<SupplyRelationshipRow[]> {
    const company = await getMyCompany();
    if (!company) return [];
    const { data, error } = await supabase
        .from('Supply_Relationships')
        .select('*, supplier:supplier_company_id(*), product:product_id(*)')
        .eq('buyer_company_id', company.id)
        .eq('is_active', true);
    if (error) return [];
    return data ?? [];
}

/** Add a supplier relationship (buyer = current company, supplier = chosen company). */
export async function saveSupplyRelationship(params: {
    supplier_company_id: string;
    product_id: string;
    quantity_per_year?: number;
    co2e_per_unit?: number;
}): Promise<SupplyRelationshipRow | null> {
    const company = await getMyCompany();
    if (!company) return null;
    const { data, error } = await supabase
        .from('Supply_Relationships')
        .insert({
            buyer_company_id: company.id,
            supplier_company_id: params.supplier_company_id,
            product_id: params.product_id,
            quantity_per_year: params.quantity_per_year ?? 0,
            co2e_per_unit: params.co2e_per_unit ?? 0,
            is_active: true,
        })
        .select()
        .single();
    if (error) { console.error('saveSupplyRelationship error:', error); return null; }
    return data;
}

/** Find Green companies that produce the same product as a Red supplier. */
export async function getGreenAlternatives(productId: string, excludeSupplierId: string): Promise<CompanyRow[]> {
    const { data, error } = await supabase
        .from('Supply_Relationships')
        .select('supplier_company_id, Companies_and_Vendors!supplier_company_id(*)')
        .eq('product_id', productId)
        .neq('supplier_company_id', excludeSupplierId);
    if (error) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const companies: CompanyRow[] = (data ?? []).map((r: any) => r['Companies_and_Vendors']).filter(Boolean);
    return companies.filter((c: CompanyRow) => c.status === 'Green');
}
