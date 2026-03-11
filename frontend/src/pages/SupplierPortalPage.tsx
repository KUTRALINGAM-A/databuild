import { useState, useRef, useEffect, DragEvent } from 'react';
import { UploadCloud, CheckCircle2, ShieldCheck, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

export function SupplierPortalPage() {
    const [searchParams] = useSearchParams();
    
    // Extract parameters from the Magic Link
    const buyerId = searchParams.get('buyer_id');
    const vendorId = searchParams.get('vendor_id');
    const buyerName = searchParams.get('buyer_name');

    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [complete, setComplete] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // If critical magic link params are missing, show an error.
    if (!buyerId || !vendorId || !buyerName) {
        return (
            <div className="min-h-screen bg-[#F0F2F5] flex flex-col items-center justify-center p-6">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-red-100">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShieldCheck className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Access Link</h2>
                    <p className="text-sm text-gray-500">
                        This data request link appears to be broken or malformed. Please request a new secure link from your buyer entity.
                    </p>
                </div>
            </div>
        );
    }

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFiles = e.dataTransfer.files;
        handleFiles(droppedFiles);
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            handleFiles(e.target.files);
        }
    };

    const handleFiles = (files: FileList) => {
        if (files.length > 0) {
            const selected = files[0];
            if (selected.type === 'application/pdf') {
                setFile(selected);
                setError(null);
            } else {
                setFile(null);
                setError('Please upload a valid PDF document.');
            }
        }
    };

    const handleSubmit = async () => {
        if (!file) {
            setError('Please attach a file before submitting.');
            return;
        }

        setUploading(true);
        setError(null);

        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
            const formData = new FormData();
            formData.append('file', file);
            
            // CRITICAL: We pass the vendor auth bypass identifiers to the backend
            formData.append('document_type', 'Energy_Bill');
            formData.append('buyer_id', buyerId);
            formData.append('vendor_id', vendorId);
            formData.append('is_magic_link', 'true'); // Flag to bypass normal auth tokens

            const response = await fetch(`${backendUrl}/api/upload/supplier`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Failed to process document');
            }

            setComplete(true);
        } catch (err: any) {
            console.error('Upload error:', err);
            setError(err.message || 'An unexpected error occurred during upload.');
        } finally {
            setUploading(false);
        }
    };

    if (complete) {
        return (
            <div className="min-h-screen bg-[#F0F2F5] flex flex-col items-center justify-center p-6 font-['Inter',sans-serif]">
                <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-lg w-full text-center border border-green-100">
                    <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-3">Transmission Successful</h2>
                    <p className="text-gray-500 leading-relaxed mb-8">
                        Your energy data has been securely processed and transmitted to <strong>{decodeURIComponent(buyerName)}</strong>'s compliance ledger. No further action is required.
                    </p>
                    <p className="text-xs text-center text-gray-400">
                        Powered by EcoLedger Automated Scope 3 Engine
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F0F2F5] flex flex-col items-center justify-center p-6 font-['Inter',sans-serif] relative overflow-hidden">
            {/* Background elements to make it look premium but lightweight */}
            <div className="absolute top-0 w-full h-1/3 bg-gradient-to-b from-[#1B4332] to-[#F0F2F5] z-0 opacity-90" />
            
            <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl z-10 overflow-hidden flex flex-col">
                <div className="p-8 border-b border-gray-100 bg-[#FAFAFA]">
                    <div className="flex items-center justify-center gap-3 mb-6">
                        <img src="/logo.png" alt="EcoLedger Logo" className="w-8 h-8 object-contain opacity-80" />
                        <span className="text-[#1B4332] text-lg font-bold tracking-tight opacity-80">
                            EcoLedger<span style={{ color: '#D9A06F' }}>.</span>
                        </span>
                    </div>

                    <h1 className="text-2xl font-black text-center text-gray-900 leading-tight">
                        Scope 3 Data Request
                    </h1>
                    <p className="text-center text-gray-500 mt-3 text-sm leading-relaxed max-w-md mx-auto">
                        <strong>{decodeURIComponent(buyerName)}</strong> is requesting your current energy consumption data for their mandatory environmental compliance reporting.
                    </p>
                </div>

                <div className="p-8">
                    <p className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-eco-mint" /> 
                        Please upload your latest Electricity or Utility Bill (PDF).
                    </p>

                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`w-full h-48 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 relative overflow-hidden group ${
                            isDragging 
                                ? 'border-eco-mint bg-eco-mint/5 shadow-inner' 
                                : file 
                                    ? 'border-green-400 bg-green-50/50' 
                                    : 'border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-eco-mint/30'
                        }`}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileInput}
                            accept="application/pdf"
                            className="hidden"
                        />
                        
                        {file ? (
                            <div className="flex flex-col items-center text-center px-4">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                                </div>
                                <p className="text-green-800 font-semibold truncate max-w-[200px]">{file.name}</p>
                                <p className="text-green-600/70 text-xs mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center text-center pointer-events-none px-4">
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-all duration-300 ${isDragging ? 'bg-eco-mint text-white scale-110 shadow-lg' : 'bg-gray-100 text-gray-400 group-hover:bg-white group-hover:text-eco-mint group-hover:shadow-md'}`}>
                                    <UploadCloud className="w-6 h-6" />
                                </div>
                                <p className="text-sm font-semibold text-gray-700">Drag & drop your PDF bill here</p>
                                <p className="text-xs text-gray-400 mt-1.5">or click to browse from your device</p>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm font-medium rounded-xl border border-red-100 flex items-center gap-2">
                            ⚠️ {error}
                        </div>
                    )}
                </div>

                <div className="p-8 pt-0 mt-auto">
                     <button 
                        onClick={handleSubmit} 
                        disabled={!file || uploading}
                        className="w-full py-4 rounded-xl font-bold text-[15px] text-white flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                        style={{
                            background: uploading ? '#2D6A4F' : 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
                            boxShadow: uploading ? 'none' : '0 10px 25px -5px rgba(27,67,50,0.4)',
                        }}
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Extracting Data & Calculating Emissions...</span>
                            </>
                        ) : (
                            <>
                                <span>Securely Submit Data</span>
                                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                    
                    <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-gray-400 font-medium pb-2">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Data is end-to-end encrypted and used strictly for compliance reporting.</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
