import React, { useState, useRef, useEffect, useCallback } from 'react';
import { sound } from '../utils/audio';
import {
  Camera,
  SwitchCamera,
  Upload,
  Sparkles,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  Zap,
  Scan,
  Crosshair
} from 'lucide-react';

interface CameraViewProps {
  onAnalyzeImage: (imageDataUrl: string, userPrompt?: string) => Promise<void>;
  isAnalyzing: boolean;
  error: string | null;
  clearError: () => void;
}

export const CameraView: React.FC<CameraViewProps> = ({
  onAnalyzeImage,
  isAnalyzing,
  error,
  clearError,
}) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [userPrompt, setUserPrompt] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<number>(0);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Cycling loading message phrases
  const loadingMessages = [
    'กำลังวิเคราะห์พิกเซลและลักษณะของขยะ...',
    'กำลังตรวจสอบประเภทวัสดุและรหัสรีไซเคิล...',
    'กำลังระบุสีถังขยะตามมาตรฐานประเทศไทย...',
    'กำลังสร้างขั้นตอนการคัดแยกขยะที่ถูกต้อง...'
  ];

  useEffect(() => {
    let interval: any;
    if (isAnalyzing) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % loadingMessages.length);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  // Start Camera
  const startCamera = useCallback(async () => {
    try {
      sound.playPop();
      setCameraError(null);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('ไม่สามารถเข้าถึงกล้องถ่ายรูปได้ โปรดตรวจสอบการอนุญาตใช้งานกล้อง หรือใช้การอัปโหลดรูปภาพแทน');
      setCameraActive(false);
    }
  }, [facingMode]);

  // Stop Camera
  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // Toggle Facing Mode
  const toggleFacingMode = () => {
    sound.playPop();
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  useEffect(() => {
    if (cameraActive) {
      startCamera();
    }
  }, [facingMode, cameraActive, startCamera]);

  // Capture Photo from Camera
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    sound.playShutter();

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      setSelectedImage(dataUrl);
      stopCamera();
    }
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('โปรดเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, WEBP)');
      return;
    }

    sound.playPop();
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setSelectedImage(dataUrl);
      stopCamera();
      clearError();
    };
    reader.readAsDataURL(file);
  };

  // Handle Drag & Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    sound.playPop();
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setSelectedImage(dataUrl);
      stopCamera();
      clearError();
    };
    reader.readAsDataURL(file);
  };

  // Trigger Analysis
  const handleAnalyze = async () => {
    if (!selectedImage) return;
    sound.playPop();
    await onAnalyzeImage(selectedImage, userPrompt.trim() || undefined);
    sound.playSuccess();
  };

  // Reset Image Selection
  const handleReset = () => {
    sound.playPop();
    setSelectedImage(null);
    clearError();
  };

  return (
    <div className="space-y-6">
      {/* Hidden canvas & file input */}
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Main Scanner Section */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-xl border border-slate-200/80 overflow-hidden relative">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <Scan className="w-3.5 h-3.5 text-emerald-600" />
              AI Waste Vision Scanner
            </span>
          </div>
          {cameraActive && (
            <button
              type="button"
              onClick={toggleFacingMode}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              <SwitchCamera className="w-3.5 h-3.5" />
              <span>สลับกล้อง</span>
            </button>
          )}
        </div>

        {/* Display Area: Video Feed OR Selected Image OR Camera Prompt */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`relative aspect-4/3 sm:aspect-16/9 bg-slate-950 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center transition-all ${
            isDragOver ? 'ring-4 ring-emerald-500/50 bg-slate-900' : ''
          }`}
        >
          {/* 1. Camera Active View */}
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
          />

          {/* Camera Scanning Laser Overlay when active */}
          {cameraActive && (
            <div className="absolute inset-0 pointer-events-none border-2 border-emerald-400/40 rounded-2xl overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] animate-bounce" />
              <div className="absolute inset-8 border border-white/20 rounded-xl pointer-events-none flex items-center justify-center">
                <div className="w-12 h-12 border-t-2 border-l-2 border-emerald-400 absolute top-0 left-0 rounded-tl-lg" />
                <div className="w-12 h-12 border-t-2 border-r-2 border-emerald-400 absolute top-0 right-0 rounded-tr-lg" />
                <div className="w-12 h-12 border-b-2 border-l-2 border-emerald-400 absolute bottom-0 left-0 rounded-bl-lg" />
                <div className="w-12 h-12 border-b-2 border-r-2 border-emerald-400 absolute bottom-0 right-0 rounded-br-lg" />
                <span className="text-xs font-medium text-white/90 bg-black/60 px-3.5 py-1 rounded-full backdrop-blur-xs flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5 text-emerald-400 animate-spin" /> วางขยะไว้ตรงกลางกรอบ
                </span>
              </div>
            </div>
          )}

          {/* 2. Selected Captured / Uploaded Image View */}
          {!cameraActive && selectedImage && (
            <div className="relative w-full h-full group">
              <img
                src={selectedImage}
                alt="Selected waste item"
                className="w-full h-full object-contain bg-slate-950/90"
              />
              <button
                type="button"
                onClick={handleReset}
                disabled={isAnalyzing}
                className="absolute top-3 right-3 bg-black/70 hover:bg-black/90 text-white p-2 rounded-xl backdrop-blur-md transition-all text-xs flex items-center gap-1.5 px-3 border border-white/10"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>เปลี่ยนรูป</span>
              </button>

              {/* Scanning Animation Overlay when analyzing */}
              {isAnalyzing && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white">
                  <div className="relative w-20 h-20 mb-4 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-ping" />
                    <div className="w-16 h-16 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
                    <Sparkles className="w-8 h-8 text-emerald-400 absolute" />
                  </div>
                  <h3 className="text-lg font-bold text-emerald-300 mb-1">
                    AI กำลังวิเคราะห์ขยะ...
                  </h3>
                  <p className="text-xs text-slate-300 font-medium h-6 transition-all duration-300">
                    {loadingMessages[loadingStep]}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 3. Initial Empty State View */}
          {!cameraActive && !selectedImage && (
            <div className="p-6 text-center text-slate-300 flex flex-col items-center justify-center max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3 shadow-inner">
                <Camera className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">
                ถ่ายภาพหรือลากรูปขยะมาวางที่นี่
              </h3>
              <p className="text-xs text-slate-400 mb-6 max-w-sm leading-relaxed">
                ระบบ AI จะวิเคราะห์ประเภทวัสดุ สีถังขยะตามมาตรฐานไทย 5 สี พร้อมประเมินคาร์บอนและวิธีคัดแยก
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  id="btn-open-camera"
                  type="button"
                  onClick={startCamera}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/30 transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>เปิดกล้องถ่ายรูป</span>
                </button>

                <button
                  id="btn-upload-image"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs rounded-xl border border-white/20 transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>เลือกรูปในเครื่อง</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls for Active Camera */}
        {cameraActive && (
          <div className="mt-4 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={stopCamera}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              id="btn-capture-photo"
              type="button"
              onClick={capturePhoto}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-500/30 active:scale-95 transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-white text-emerald-600" />
              <span>ถ่ายภาพวิเคราะห์ทันที</span>
            </button>
          </div>
        )}

        {/* Camera Access Error Alert */}
        {cameraError && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>{cameraError}</p>
          </div>
        )}

        {/* Selected Image Analysis Bar */}
        {selectedImage && !isAnalyzing && (
          <div className="mt-4 space-y-3 pt-3 border-t border-slate-100">
            {/* Optional Custom Question */}
            <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <input
                type="text"
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="มีคำถามหรือข้อสงสัยเพิ่มเติม? (เช่น ชิ้นนี้ขายได้กี่บาท? ฝาต้องแกะไหม?)"
                className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                เลือกรูปใหม่
              </button>
              <button
                id="btn-start-analyze"
                type="button"
                onClick={handleAnalyze}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>วิเคราะห์ด้วย AI</span>
              </button>
            </div>
          </div>
        )}

        {/* General Error Banner */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start justify-between gap-3 text-xs text-red-700">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={clearError}
              className="text-red-500 hover:text-red-700 font-bold shrink-0 underline cursor-pointer"
            >
              ปิด
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
