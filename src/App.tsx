import React, { useState, useEffect } from 'react';
import { Navbar, TabType } from './components/Navbar';
import { CameraView } from './components/CameraView';
import { AnalysisResult } from './components/AnalysisResult';
import { BinGuideView } from './components/BinGuideView';
import { HistoryLog } from './components/HistoryLog';
import { EcoQuiz } from './components/EcoQuiz';
import { RecycleCalculator } from './components/RecycleCalculator';
import { EcoAdvisorModal } from './components/EcoAdvisorModal';
import { WasteAnalysisResult, ScanHistoryItem } from './types';
import { sound } from './utils/audio';
import { Leaf, Bot } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('scan');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdvisorOpen, setIsAdvisorOpen] = useState<boolean>(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<{
    result: WasteAnalysisResult;
    image: string;
  } | null>(null);

  // LocalStorage state for scan history
  const [history, setHistory] = useState<ScanHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('ecoscan_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [savedScanIds, setSavedScanIds] = useState<Set<string>>(new Set());

  // Save history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ecoscan_history', JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save history to localStorage', e);
    }
  }, [history]);

  // Handle Analyze Image via Server Endpoint
  const handleAnalyzeImage = async (imageDataUrl: string, userPrompt?: string) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze-waste', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageDataUrl,
          userPrompt,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการวิเคราะห์รูปภาพขยะ');
      }

      setCurrentAnalysis({
        result: data.data,
        image: imageDataUrl,
      });
      sound.playSuccess();
    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.message || 'ไม่สามารถติดต่อระบบวิเคราะห์ได้ โปรดลองอีกครั้ง');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Save current scan to history
  const handleSaveHistory = (result: WasteAnalysisResult, image: string) => {
    const newId = `scan-${Date.now()}`;
    const newHistoryItem: ScanHistoryItem = {
      id: newId,
      timestamp: new Date().toISOString(),
      imageDataUrl: image,
      result,
    };

    sound.playSuccess();
    setHistory((prev) => [newHistoryItem, ...prev]);
    setSavedScanIds((prev) => new Set(prev).add(newId));
  };

  // Delete history item
  const handleDeleteHistoryItem = (id: string) => {
    sound.playPop();
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  // Clear all history
  const handleClearAllHistory = () => {
    if (window.confirm('คุณต้องการลบประวัติการสแกนทั้งหมดใช่หรือไม่?')) {
      sound.playPop();
      setHistory([]);
    }
  };

  // Select scan from history
  const handleSelectHistoryItem = (item: ScanHistoryItem) => {
    sound.playPop();
    setCurrentAnalysis({
      result: item.result,
      image: item.imageDataUrl,
    });
    setActiveTab('scan');
  };

  // Rescan / Reset current view
  const handleRescan = () => {
    sound.playPop();
    setCurrentAnalysis(null);
    setError(null);
    setActiveTab('scan');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-20">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
        }}
        scanCount={history.length}
        onOpenEcoBot={() => setIsAdvisorOpen(true)}
      />

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        {/* Tab 1: Camera Scan & Analysis */}
        {activeTab === 'scan' && (
          <div className="space-y-6">
            {currentAnalysis ? (
              <AnalysisResult
                result={currentAnalysis.result}
                capturedImage={currentAnalysis.image}
                onRescan={handleRescan}
                onSaveHistory={handleSaveHistory}
                isSaved={false}
                onOpenCalculator={() => setActiveTab('calculator')}
              />
            ) : (
              <CameraView
                onAnalyzeImage={handleAnalyzeImage}
                isAnalyzing={isAnalyzing}
                error={error}
                clearError={() => setError(null)}
              />
            )}
          </div>
        )}

        {/* Tab 2: Bin Guide 5 Colors */}
        {activeTab === 'guide' && <BinGuideView />}

        {/* Tab 3: Recycling Price Calculator */}
        {activeTab === 'calculator' && <RecycleCalculator />}

        {/* Tab 4: Eco Quiz */}
        {activeTab === 'quiz' && <EcoQuiz />}

        {/* Tab 5: History Log */}
        {activeTab === 'history' && (
          <HistoryLog
            history={history}
            onDeleteHistoryItem={handleDeleteHistoryItem}
            onClearAllHistory={handleClearAllHistory}
            onSelectScan={handleSelectHistoryItem}
          />
        )}
      </main>

      {/* Floating EcoBot Quick Access Button */}
      <button
        type="button"
        onClick={() => setIsAdvisorOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl shadow-xl shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all text-xs font-bold border border-white/20 cursor-pointer"
      >
        <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
          <Bot className="w-4 h-4" />
        </div>
        <span className="hidden sm:inline">ถาม EcoBot AI</span>
      </button>

      {/* Persistent EcoBot Advisor Modal */}
      <EcoAdvisorModal
        isOpen={isAdvisorOpen}
        onClose={() => setIsAdvisorOpen(false)}
        contextWaste={currentAnalysis?.result || null}
      />

      {/* Persistent Eco Footer */}
      <footer className="mt-16 border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Leaf className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-slate-700">SMART WASTE 3D GUIDE</span>
            <span>— ร่วมสร้างประเทศไทยไร้ขยะ เริ่มต้นที่การแยกขยะถูกถัง</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>มาตรฐานถังขยะประเทศไทย 5 สี</span>
            <span>•</span>
            <span>Gemini 3.6 Flash Vision</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
