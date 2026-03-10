import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export function UploadForm() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setFile(acceptedFiles[0]);
            setStatus('idle');
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

    const handleUpload = () => {
        if (!file) return;
        setStatus('uploading');

        // Simulate upload and extraction
        setTimeout(() => {
            setStatus('success');
            // In reality, this would trigger a dashboard refresh
        }, 2500);
    };

    return (
        <div className="glass-panel rounded-2xl p-6 sm:p-8 w-full max-w-lg mx-auto flex flex-col items-center">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-600 mb-2">
                    Universal Data Portal
                </h2>
                <p className="text-zinc-400 text-sm">
                    Upload energy bills or shipping logs. Our AI automatically extracts consumption data and converts it to standardized CO2e.
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
                disabled={!file || status === 'uploading' || status === 'success'}
                className={cn(
                    "mt-6 w-full py-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center space-x-2",
                    !file ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" :
                        status === 'uploading' ? "bg-green-600/50 text-white cursor-wait animate-pulse" :
                            status === 'success' ? "bg-green-500 text-zinc-900" :
                                "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                )}
            >
                {status === 'uploading' && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {status === 'success' && <CheckCircle2 className="w-5 h-5" />}
                <span>
                    {status === 'idle' ? 'Extract & Analyze Document' :
                        status === 'uploading' ? 'AI Extraction in Progress...' :
                            status === 'success' ? 'Processing Complete' : 'Error'}
                </span>
            </button>

            {status === 'success' && (
                <div className="mt-4 p-4 rounded-lg bg-green-950/40 border border-green-900/50 w-full flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                    <div className="text-sm text-green-200">
                        <p className="font-semibold mb-1">Extraction Successful</p>
                        <p className="text-green-300/70 text-xs">Identified 1,420 KWh energy consumption. Converted to 568 kg CO2e.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
