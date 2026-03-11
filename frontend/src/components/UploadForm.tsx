import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, CheckCircle2, FileText, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { getMyCompany, saveUploadRecord, saveCarbonRecord } from '@/lib/db';

type ExtractionResult = {
    document_type: 'Energy_Bill' | 'Shipping_Log';
    metric: number;
    unit: string;
    calculated_co2e: number;
    confidence?: number;
    emission_factor?: number;
    factor_source?: string;
    mock?: boolean;
};

export function UploadForm() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'idle' | 'uploading' | 'saving' | 'success' | 'error'>('idle');
    const [result, setResult] = useState<ExtractionResult | null>(null);
    const [errorMsg, setErrorMsg] = useState('');

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setFile(acceptedFiles[0]);
            setStatus('idle');
            setResult(null);
            setErrorMsg('');
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        maxFiles: 1,
        accept: {
            'application/pdf': ['.pdf'],
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
        }
    });

    const handleUpload = async () => {
        if (!file) return;
        setStatus('uploading');
        setErrorMsg('');

        try {
            // 1. Get the current user's company
            const company = await getMyCompany();
            if (!company) throw new Error('Company not found. Please complete your profile.');

            // 2. Call FastAPI backend for AI extraction
            const formData = new FormData();
            formData.append('file', file);

            const response = await axios.post(
                `${import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000'}/api/upload`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );

            const extraction: ExtractionResult = response.data.data;
            setResult(extraction);
            setStatus('saving');

            // 3. Save to Raw_Uploads
            const uploadId = await saveUploadRecord({
                company_id: company.id,
                file_url: file.name,   // In prod: upload to Supabase Storage first
                document_type: extraction.document_type,
                status: 'Processed',
            });

            // 4. Save to Carbon_Ledger with full audit trail
            const scopeType = extraction.document_type === 'Energy_Bill' ? 2 : 3;
            await saveCarbonRecord({
                company_id: company.id,
                upload_id: uploadId ?? undefined,
                scope_type: scopeType,
                scope3_category: scopeType === 3 ? 4 : undefined,  // Cat 4 = upstream transport
                raw_metric: extraction.metric,
                metric_unit: extraction.unit,
                calculated_co2e: extraction.calculated_co2e,
                emission_factor: extraction.emission_factor,
                factor_source: extraction.factor_source,
            });

            setStatus('success');
        } catch (err) {
            console.error(err);
            setErrorMsg(err instanceof Error ? err.message : 'Upload failed. Is the backend running?');
            setStatus('error');
        }
    };

    return (
        <div className="glass-panel rounded-2xl p-6 sm:p-8 w-full max-w-lg mx-auto flex flex-col items-center">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-600 mb-2">
                    Universal Data Portal
                </h2>
                <p className="text-zinc-400 text-sm">
                    Upload energy bills or shipping logs. Our AI automatically extracts consumption data and converts it to standardized CO₂e.
                </p>
            </div>

            <div
                {...getRootProps()}
                className={cn(
                    "w-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all duration-300 cursor-pointer",
                    isDragActive ? "border-green-500 bg-green-500/10" : "border-zinc-700 bg-zinc-800/20 hover:border-green-500/50 hover:bg-zinc-800/50"
                )}
            >
                <input {...getInputProps()} />

                {file ? (
                    <div className="flex flex-col items-center space-y-3">
                        <div className="p-3 bg-green-500/20 rounded-full">
                            <FileText className="w-8 h-8 text-green-400" />
                        </div>
                        <p className="text-zinc-200 font-medium text-center truncate max-w-[200px]">{file.name}</p>
                        <p className="text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center space-y-4">
                        <div className="p-4 bg-zinc-800/50 rounded-full shadow-inner">
                            <UploadCloud className="w-10 h-10 text-zinc-400" />
                        </div>
                        <p className="text-zinc-300 font-medium text-center">Drag & drop your document here</p>
                        <p className="text-zinc-500 text-xs text-center">Supports PDF, JPG, PNG up to 10MB</p>
                    </div>
                )}
            </div>

            <button
                onClick={handleUpload}
                disabled={!file || status === 'uploading' || status === 'saving' || status === 'success'}
                className={cn(
                    "mt-6 w-full py-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center space-x-2",
                    !file ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" :
                        status === 'uploading' ? "bg-green-600/50 text-white cursor-wait animate-pulse" :
                            status === 'saving' ? "bg-blue-600/50 text-white cursor-wait animate-pulse" :
                                status === 'success' ? "bg-green-500 text-zinc-900" :
                                    status === 'error' ? "bg-red-600/50 text-white" :
                                        "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                )}
            >
                {(status === 'uploading' || status === 'saving') && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {status === 'success' && <CheckCircle2 className="w-5 h-5" />}
                {status === 'error' && <AlertCircle className="w-5 h-5" />}
                <span>
                    {status === 'idle' ? 'Extract & Analyze Document' :
                        status === 'uploading' ? 'AI Extraction in Progress…' :
                            status === 'saving' ? 'Saving to Ledger…' :
                                status === 'success' ? 'Saved to Carbon Ledger' :
                                    'Retry Upload'}
                </span>
            </button>

            {/* Error */}
            {status === 'error' && errorMsg && (
                <div className="mt-4 p-4 rounded-lg bg-red-950/40 border border-red-900/50 w-full flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-200">{errorMsg}</p>
                </div>
            )}

            {/* Success result */}
            {status === 'success' && result && (
                <div className="mt-4 p-4 rounded-lg bg-green-950/40 border border-green-900/50 w-full space-y-2">
                    <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                        <p className="font-semibold text-green-200 text-sm">Extraction Successful — Saved to Ledger</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
                            <p className="text-xs text-zinc-500">Document Type</p>
                            <p className="text-sm font-bold text-white">{result.document_type.replace('_', ' ')}</p>
                        </div>
                        <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
                            <p className="text-xs text-zinc-500">Scope</p>
                            <p className="text-sm font-bold text-white">Scope {result.document_type === 'Energy_Bill' ? '2' : '3'}</p>
                        </div>
                        <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
                            <p className="text-xs text-zinc-500">Raw Metric</p>
                            <p className="text-sm font-bold text-white">{result.metric.toLocaleString()} {result.unit}</p>
                        </div>
                        <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
                            <p className="text-xs text-zinc-500">CO₂e</p>
                            <p className="text-sm font-bold text-green-400">{result.calculated_co2e.toLocaleString()} kg</p>
                        </div>
                    </div>
                    {result.mock && (
                        <p className="text-xs text-zinc-500 text-center mt-1">
                            ⚠️ Mock data — add OpenAI API key for real extraction
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
