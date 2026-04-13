/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  Target, 
  Lightbulb, 
  ListChecks, 
  PenTool, 
  Download, 
  Save, 
  Plus, 
  Trash2,
  CheckCircle2,
  Loader2,
  Edit3,
  ArrowRight,
  Eye,
  Copy,
  FileText,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';
import { asBlob } from 'html-docx-js-typescript';
import { marked } from 'marked';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

import { 
  generateStep1Problems, 
  generateStep2TargetMarket, 
  generateStep3Solution, 
  generateStep4Outline, 
  generateChapterContent 
} from '@/src/services/ai';

// Types
interface Problem {
  id: string;
  problem: string;
  reason_cuan: string;
  potential_solution_brief: string;
}

interface TargetMarket {
  demographics: string;
  psychographics: string;
  pain_points: string;
  buying_power: string;
}

interface Solution {
  core_solution: string;
  key_benefits: string;
  unique_selling_point: string;
}

interface EbookData {
  niche: string;
  expertise: string;
  selectedProblem: Problem | null;
  targetMarket: TargetMarket | null;
  solution: Solution | null;
  title: string;
  description: string;
  outline: string[];
  chapters: Record<string, string>;
  writingStyle: string;
  writingNotes: string;
}

const STEPS = [
  { id: 'intro', title: 'Mulai', icon: BookOpen },
  { id: 'step1', title: 'Masalah', icon: Sparkles },
  { id: 'step2', title: 'Market', icon: Target },
  { id: 'step3', title: 'Solusi', icon: Lightbulb },
  { id: 'step4', title: 'Outline', icon: ListChecks },
  { id: 'step5', title: 'Menulis', icon: PenTool },
  { id: 'step6', title: 'Selesai', icon: Eye },
];

const WRITING_STYLES = [
  { value: 'profesional', label: 'Profesional & Formal' },
  { value: 'santai', label: 'Santai & Akrab' },
  { value: 'inspiratif', label: 'Inspiratif & Motivasi' },
  { value: 'teknis', label: 'Teknis & Detail' },
  { value: 'bercerita', label: 'Storytelling (Bercerita)' },
];

// Error Boundary Component
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full border-red-200 shadow-xl">
            <CardHeader className="bg-red-50 border-b border-red-100">
              <CardTitle className="text-red-700 flex items-center gap-2">
                <X className="h-5 w-5" />
                Terjadi Kesalahan
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-slate-600 mb-4">
                Aplikasi mengalami kendala saat memuat. Ini biasanya disebabkan oleh konfigurasi API Key yang belum lengkap.
              </p>
              <div className="bg-slate-100 p-3 rounded text-xs font-mono text-slate-800 overflow-auto max-h-32">
                {this.state.error?.message}
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                onClick={() => window.location.reload()}
              >
                Muat Ulang Halaman
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<EbookData>({
    niche: '',
    expertise: '',
    selectedProblem: null,
    targetMarket: null,
    solution: null,
    title: '',
    description: '',
    outline: [],
    chapters: {},
    writingStyle: 'santai',
    writingNotes: '',
  });

  const [problems, setProblems] = useState<Problem[]>([]);
  const [activeChapter, setActiveChapter] = useState('');
  const [isFullPreviewOpen, setIsFullPreviewOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAutoWriting, setIsAutoWriting] = useState(false);
  const [writingProgress, setWritingProgress] = useState({ current: 0, total: 0 });

  // Step 1: Generate Problems
  const handleGenerateProblems = async () => {
    if (!data.niche || !data.expertise) {
      alert("Silakan isi niche dan keahlian Anda terlebih dahulu.");
      return;
    }
    setIsLoading(true);
    try {
      const result = await generateStep1Problems(data.niche, data.expertise);
      if (!result || !Array.isArray(result) || result.length === 0) {
        throw new Error("AI tidak memberikan hasil masalah. Silakan coba lagi.");
      }
      setProblems(result);
      setCurrentStep(1); // Move to step 1 explicitly
    } catch (error) {
      console.error("Error generating problems:", error);
      let message = "Terjadi kesalahan saat mencari masalah. Silakan cek koneksi atau API Key Anda.";
      if (error instanceof Error) {
        console.log("Error details:", {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        if (error.message.includes("404")) {
          message = "Error 404: Model AI tidak ditemukan. Pastikan API Gemini sudah aktif di Google AI Studio (aistudio.google.com) untuk API Key Anda.";
        } else if (error.message.includes("fetch")) {
          message = "Gagal menghubungi server Google (Fetch Error). Cek koneksi internet Anda atau pastikan API Key valid.";
        } else {
          message = error.message;
        }
      }
      alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Generate Target Market
  const handleGenerateTargetMarket = async () => {
    if (!data.selectedProblem) return;
    setIsLoading(true);
    try {
      const result = await generateStep2TargetMarket(data.selectedProblem.problem);
      setData(prev => ({ ...prev, targetMarket: result }));
      setCurrentStep(2);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Generate Solution
  const handleGenerateSolution = async () => {
    if (!data.selectedProblem || !data.targetMarket) return;
    setIsLoading(true);
    try {
      const result = await generateStep3Solution(
        data.selectedProblem.problem, 
        `${data.targetMarket.demographics} - ${data.targetMarket.psychographics}`
      );
      setData(prev => ({ ...prev, solution: result }));
      setCurrentStep(3);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 4: Generate Outline
  const handleGenerateOutline = async () => {
    if (!data.selectedProblem || !data.targetMarket || !data.solution) return;
    setIsLoading(true);
    try {
      const result = await generateStep4Outline(
        data.selectedProblem.problem,
        data.targetMarket.demographics,
        data.solution.core_solution
      );
      setData(prev => ({ 
        ...prev, 
        title: result.title, 
        description: result.description, 
        outline: result.outline 
      }));
      setCurrentStep(4);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateChapter = async (chapterTitle: string) => {
    setIsLoading(true);
    try {
      const content = await generateChapterContent(
        data.title,
        chapterTitle,
        data.outline,
        data.writingStyle,
        data.writingNotes
      );
      setData(prev => ({
        ...prev,
        chapters: { ...prev.chapters, [chapterTitle]: content }
      }));
      setActiveChapter(chapterTitle);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateAllChapters = async () => {
    setIsAutoWriting(true);
    setWritingProgress({ current: 0, total: data.outline.length });
    
    try {
      const newChapters = { ...data.chapters };
      for (let i = 0; i < data.outline.length; i++) {
        const chapterTitle = data.outline[i];
        if (newChapters[chapterTitle]) {
          setWritingProgress(prev => ({ ...prev, current: i + 1 }));
          continue;
        }
        
        const content = await generateChapterContent(
          data.title,
          chapterTitle,
          data.outline,
          data.writingStyle,
          data.writingNotes
        );
        newChapters[chapterTitle] = content;
        setData(prev => ({ ...prev, chapters: { ...newChapters } }));
        setWritingProgress(prev => ({ ...prev, current: i + 1 }));
      }
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan saat menulis otomatis. Silakan coba lagi.");
    } finally {
      setIsAutoWriting(false);
    }
  };

  const downloadWord = async () => {
    const chaptersHtml = await Promise.all(data.outline.map(async (chapter, idx) => {
      let content = data.chapters[chapter] || '_Materi belum ditulis_';
      
      const cleanTitle = chapter.replace(/^Bab\s*\d+[:\-\s]*/i, '').trim();
      content = content.trim();
      
      const escapedTitle = cleanTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const patterns = [
        new RegExp(`^#+\\s*(Bab\\s*\\d+[:\\-\\s]*)?${escapedTitle}.*?\\n+`, 'i'),
        new RegExp(`^#+\\s*Bab\\s*\\d+[:\\-\\s]*.*?\\n+`, 'i'),
        /^#+.*?\n+/
      ];
      
      patterns.forEach(p => {
        content = content.replace(p, '');
      });
      
      const htmlContent = await marked.parse(content.trim());
      
      // Use a more standard Word page break approach
      // We use a div with page-break-after for chapters except the last one
      return `
        <div class="chapter-container">
          <h1 style="font-size: 20pt; font-weight: bold; color: #000; border-bottom: 2pt solid #FF6B00; padding-bottom: 8pt; margin-bottom: 20pt; font-family: Arial, sans-serif;">
            Bab ${idx + 1}: ${cleanTitle}
          </h1>
          <div style="font-size: 12pt; text-align: justify; line-height: 1.5; font-family: 'Times New Roman', serif;">
            ${htmlContent}
          </div>
          ${idx < data.outline.length - 1 ? '<br style="page-break-before: always; clear: both;" />' : ''}
        </div>
      `;
    }));

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            @page {
              margin: 1in;
            }
            body { 
              font-family: 'Times New Roman', serif; 
              line-height: 1.5; 
              color: #333; 
            }
            h1 { font-family: Arial, sans-serif; margin-top: 0; }
            h2, h3, h4 { font-family: Arial, sans-serif; margin-top: 15pt; margin-bottom: 10pt; }
            p { margin-bottom: 10pt; text-align: justify; line-height: 1.5; }
            ul, ol { margin-bottom: 10pt; }
            li { margin-bottom: 5pt; }
            .chapter-container {
              margin-bottom: 20pt;
            }
          </style>
        </head>
        <body>
          ${chaptersHtml.join('')}
        </body>
      </html>
    `;

    const blob = await asBlob(htmlContent);
    const url = URL.createObjectURL(blob as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.title || 'ebook'}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadStepResults = () => {
    const content = `
EBOOK PLANNING - SERBUIN
-------------------------
JUDUL: ${data.title}
DESKRIPSI: ${data.description}

1. MASALAH:
${data.selectedProblem?.problem}
Alasan Cuan: ${data.selectedProblem?.reason_cuan}

2. TARGET MARKET:
Demografis: ${data.targetMarket?.demographics}
Psikografis: ${data.targetMarket?.psychographics}
Pain Points: ${data.targetMarket?.pain_points}

3. SOLUSI:
Core Solution: ${data.solution?.core_solution}
Key Benefits: ${data.solution?.key_benefits}
USP: ${data.solution?.unique_selling_point}

4. OUTLINE:
${data.outline.map((o, i) => `${i+1}. ${o}`).join('\n')}
    `;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planning-${data.title || 'ebook'}.txt`;
    a.click();
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="bg-brand p-2 rounded-lg">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-display font-bold text-slate-900 tracking-tight">
              serbuin<span className="text-brand">.ebook</span>
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <Badge variant="outline" className="hidden sm:flex">
                Step {currentStep} of {STEPS.length - 1}
              </Badge>
            )}
            {currentStep === 6 && (
              <Button variant="outline" size="sm" onClick={downloadWord} className="gap-2">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Download Word</span>
              </Button>
            )}
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="h-1 w-full bg-slate-100">
          <motion.div 
            className="h-full bg-brand"
            initial={{ width: 0 }}
            animate={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
      </header>

      <main className="flex-1 container max-w-2xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* INTRO STEP */}
          {currentStep === 0 && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center space-y-4 py-8">
                <h1 className="text-4xl sm:text-5xl font-display font-black text-slate-900 leading-tight">
                  Buat Ebook <span className="text-brand">Cuan</span> Dalam Hitungan Menit
                </h1>
                <p className="text-lg text-slate-600 max-w-md mx-auto">
                  Bantu orang lain menyelesaikan masalah mereka dan hasilkan pendapatan dari keahlian Anda.
                </p>
              </div>

              <Card className="border-2 border-slate-200 shadow-xl overflow-hidden">
                <CardHeader className="bg-slate-50 border-b">
                  <CardTitle>Apa Niche Anda?</CardTitle>
                  <CardDescription>Tentukan topik dan keahlian yang ingin Anda bagikan.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="niche">Niche / Topik Pilihan</Label>
                    <Input 
                      id="niche" 
                      placeholder="Contoh: Digital Marketing, Memasak, Parenting..." 
                      value={data.niche}
                      onChange={(e) => setData(prev => ({ ...prev, niche: e.target.value }))}
                      className="text-lg py-6"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expertise">Keahlian / Pengalaman Anda</Label>
                    <Textarea 
                      id="expertise" 
                      placeholder="Contoh: Saya punya pengalaman 5 tahun jualan online di Shopee..." 
                      value={data.expertise}
                      onChange={(e) => setData(prev => ({ ...prev, expertise: e.target.value }))}
                      className="min-h-[100px]"
                    />
                  </div>
                </CardContent>
                <CardFooter className="bg-slate-50 border-t p-6">
                  <Button 
                    className="w-full py-6 text-lg font-bold bg-brand hover:bg-brand/90" 
                    disabled={!data.niche || !data.expertise || isLoading}
                    onClick={handleGenerateProblems}
                  >
                    {isLoading ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Sedang Mencari...</>
                    ) : (
                      <>Mulai Cari Masalah <ArrowRight className="ml-2 h-5 w-5" /></>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          )}

          {/* STEP 1: PROBLEM SELECTION */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Sparkles className="text-brand h-6 w-6" />
                  Pilih Masalah Utama
                </h2>
                <Button variant="ghost" size="sm" onClick={prevStep}>Kembali</Button>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-brand" />
                  <p className="text-slate-500 font-medium">Menganalisa peluang cuan...</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {problems.map((p) => (
                    <Card 
                      key={p.id} 
                      className={`cursor-pointer transition-all hover:border-brand ${data.selectedProblem?.id === p.id ? 'border-brand ring-2 ring-brand/20' : ''}`}
                      onClick={() => setData(prev => ({ ...prev, selectedProblem: p }))}
                    >
                      <CardHeader className="p-4 pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{p.problem}</CardTitle>
                          {data.selectedProblem?.id === p.id && <CheckCircle2 className="text-brand h-5 w-5" />}
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 space-y-2">
                        <p className="text-sm text-slate-600 italic">"{p.reason_cuan}"</p>
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                          <Badge variant="secondary" className="text-[10px]">Potensi Tinggi</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  <Button 
                    className="w-full mt-4 py-6 bg-brand" 
                    disabled={!data.selectedProblem}
                    onClick={handleGenerateTargetMarket}
                  >
                    Lanjut ke Target Market <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 2: TARGET MARKET */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Target className="text-brand h-6 w-6" />
                  Siapa Target Marketnya?
                </h2>
                <Button variant="ghost" size="sm" onClick={prevStep}>Kembali</Button>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-brand" />
                  <p className="text-slate-500 font-medium">Memetakan audiens ideal...</p>
                </div>
              ) : (
                <Card className="border-2">
                  <CardContent className="pt-6 space-y-6">
                    <div className="grid gap-4">
                      <div className="space-y-1">
                        <Label className="text-slate-500 uppercase text-[10px] font-bold tracking-wider">Demografis</Label>
                        <p className="text-slate-900 font-medium">{data.targetMarket?.demographics}</p>
                      </div>
                      <Separator />
                      <div className="space-y-1">
                        <Label className="text-slate-500 uppercase text-[10px] font-bold tracking-wider">Psikografis</Label>
                        <p className="text-slate-900 font-medium">{data.targetMarket?.psychographics}</p>
                      </div>
                      <Separator />
                      <div className="space-y-1">
                        <Label className="text-slate-500 uppercase text-[10px] font-bold tracking-wider">Pain Points</Label>
                        <p className="text-slate-900 font-medium">{data.targetMarket?.pain_points}</p>
                      </div>
                      <Separator />
                      <div className="space-y-1">
                        <Label className="text-slate-500 uppercase text-[10px] font-bold tracking-wider">Daya Beli</Label>
                        <p className="text-slate-900 font-medium">{data.targetMarket?.buying_power}</p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-slate-50 border-t p-6">
                    <Button className="w-full py-6 bg-brand" onClick={handleGenerateSolution}>
                      Rumuskan Solusi <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                  </CardFooter>
                </Card>
              )}
            </motion.div>
          )}

          {/* STEP 3: SOLUTION */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Lightbulb className="text-brand h-6 w-6" />
                  Rumusan Solusi
                </h2>
                <Button variant="ghost" size="sm" onClick={prevStep}>Kembali</Button>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-brand" />
                  <p className="text-slate-500 font-medium">Merumuskan solusi terbaik...</p>
                </div>
              ) : (
                <Card className="border-2">
                  <CardHeader className="bg-brand/5">
                    <CardTitle className="text-brand">Core Solution</CardTitle>
                    <p className="text-slate-700 font-medium">{data.solution?.core_solution}</p>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-slate-500 uppercase text-[10px] font-bold tracking-wider">Manfaat Utama</Label>
                        <p className="text-slate-900">{data.solution?.key_benefits}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-500 uppercase text-[10px] font-bold tracking-wider">Unique Selling Point</Label>
                        <Badge variant="outline" className="text-sm py-1 px-3 border-brand text-brand bg-brand/5">
                          {data.solution?.unique_selling_point}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-slate-50 border-t p-6">
                    <Button className="w-full py-6 bg-brand" onClick={handleGenerateOutline}>
                      Buat Judul & Outline <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                  </CardFooter>
                </Card>
              )}
            </motion.div>
          )}

          {/* STEP 4: OUTLINE */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <ListChecks className="text-brand h-6 w-6" />
                  Nama & Outline Ebook
                </h2>
                <Button variant="ghost" size="sm" onClick={prevStep}>Kembali</Button>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-brand" />
                  <p className="text-slate-500 font-medium">Menyusun struktur ebook...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Card className="border-2">
                    <CardContent className="pt-6 space-y-4">
                      <div className="space-y-2">
                        <Label>Judul Ebook</Label>
                        <Input 
                          value={data.title} 
                          onChange={(e) => setData(prev => ({ ...prev, title: e.target.value }))}
                          className="font-bold text-lg"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Deskripsi Singkat</Label>
                        <Textarea 
                          value={data.description} 
                          onChange={(e) => setData(prev => ({ ...prev, description: e.target.value }))}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm uppercase tracking-wider text-slate-500">Daftar Isi (Outline)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {data.outline.map((chapter, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border">
                          <span className="font-bold text-brand w-6">{idx + 1}.</span>
                          <Input 
                            value={chapter} 
                            onChange={(e) => {
                              const newOutline = [...data.outline];
                              newOutline[idx] = e.target.value;
                              setData(prev => ({ ...prev, outline: newOutline }));
                            }}
                            className="bg-transparent border-none p-0 h-auto focus-visible:ring-0"
                          />
                        </div>
                      ))}
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                      <Button variant="outline" className="w-full" onClick={downloadStepResults}>
                        <Download className="h-4 w-4 mr-2" /> Download Planning (Step 1-4)
                      </Button>
                      <Button className="w-full py-6 bg-brand" onClick={nextStep}>
                        Lanjut ke Penulisan <ChevronRight className="ml-2 h-5 w-5" />
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 5: WRITING & EDITOR */}
          {currentStep === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6 pb-20"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <PenTool className="text-brand h-6 w-6" />
                  Tulis Materi
                </h2>
                <Button variant="ghost" size="sm" onClick={prevStep}>Kembali</Button>
              </div>

              <Card className="border-2">
                <CardHeader className="pb-4">
                  <CardTitle>Pengaturan Penulisan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Gaya Penulisan</Label>
                      <Select 
                        value={data.writingStyle} 
                        onValueChange={(val) => setData(prev => ({ ...prev, writingStyle: val }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih gaya" />
                        </SelectTrigger>
                        <SelectContent>
                          {WRITING_STYLES.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Catatan Tambahan</Label>
                      <Input 
                        placeholder="Contoh: Gunakan banyak emoji..." 
                        value={data.writingNotes}
                        onChange={(e) => setData(prev => ({ ...prev, writingNotes: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="pt-2">
                    <Button 
                      className="w-full py-6 bg-brand hover:bg-brand/90 font-bold"
                      onClick={handleGenerateAllChapters}
                      disabled={isAutoWriting}
                    >
                      {isAutoWriting ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Menulis Bab {writingProgress.current} dari {writingProgress.total}...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-5 w-5" />
                          Tulis Semua Bab Otomatis
                        </div>
                      )}
                    </Button>
                    {isAutoWriting && (
                      <div className="mt-3 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-brand"
                          initial={{ width: 0 }}
                          animate={{ width: `${(writingProgress.current / writingProgress.total) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Label className="text-sm uppercase tracking-wider text-slate-500">Pilih Bab Untuk Ditulis</Label>
                <div className="grid gap-2">
                  {data.outline.map((chapter, idx) => (
                    <div key={idx} className="flex flex-col gap-2">
                      <div className="flex items-center justify-between p-4 bg-white border rounded-xl shadow-sm">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-400">{idx + 1}</span>
                          <span className="font-medium text-slate-700">{chapter}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {data.chapters[chapter] ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200">Selesai</Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-400">Belum Ada Isi</Badge>
                          )}
                          <Button 
                            size="sm" 
                            variant={data.chapters[chapter] ? "outline" : "default"}
                            className={!data.chapters[chapter] ? "bg-brand" : ""}
                            onClick={() => {
                              if (data.chapters[chapter]) {
                                setActiveChapter(chapter);
                              } else {
                                handleGenerateChapter(chapter);
                              }
                            }}
                            disabled={isLoading}
                          >
                            {isLoading && activeChapter === chapter ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : data.chapters[chapter] ? (
                              <Edit3 className="h-4 w-4" />
                            ) : (
                              "Tulis"
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      {activeChapter === chapter && data.chapters[chapter] && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="p-4 bg-white border rounded-xl shadow-inner"
                        >
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-900">Editor: {chapter}</h3>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => setActiveChapter('')}>Tutup</Button>
                            </div>
                          </div>
                          <Textarea 
                            className="min-h-[300px] font-mono text-sm mb-4"
                            value={data.chapters[chapter]}
                            onChange={(e) => setData(prev => ({
                              ...prev,
                              chapters: { ...prev.chapters, [chapter]: e.target.value }
                            }))}
                          />
                        </motion.div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Final Actions */}
              <div className="pt-10 space-y-6">
                <Separator />
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold">Semua Bab Selesai?</h3>
                  <p className="text-slate-500">Lanjut ke tahap akhir untuk melihat ebook secara utuh.</p>
                </div>
                
                <Button 
                  className="w-full py-8 text-xl font-black bg-brand hover:bg-brand/90 shadow-lg shadow-brand/20"
                  onClick={nextStep}
                >
                  LIHAT EBOOK FULL <ChevronRight className="ml-2 h-6 w-6" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 6: FULL VIEW & EXPORT */}
          {currentStep === 6 && (
            <motion.div
              key="step6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8 pb-24"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Eye className="text-brand h-6 w-6" />
                  Ebook Selesai!
                </h2>
                <Button variant="ghost" size="sm" onClick={prevStep}>Kembali Edit</Button>
              </div>

              <div className="flex flex-col gap-6">
                <div className="bg-slate-200 p-4 sm:p-8 rounded-xl overflow-hidden shadow-inner flex justify-center">
                  <ScrollArea className="h-[70vh] w-full max-w-[210mm]">
                    <div className="bg-white shadow-2xl mx-auto min-h-[297mm] w-full p-[20mm] sm:p-[30mm] space-y-16 text-slate-900 font-serif">
                      {/* Chapters Content Only */}
                      {data.outline.map((chapter, idx) => {
                        let content = data.chapters[chapter] || '_Materi belum ditulis_';
                        
                        // Strip "Bab X:" from the chapter title for the heading
                        const cleanTitle = chapter.replace(/^Bab\s*\d+[:\-\s]*/i, '').trim();
                        
                        // Clean up potential duplicate titles for preview too
                        content = content.trim();
                        const escapedTitle = cleanTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const patterns = [
                          new RegExp(`^#+\\s*(Bab\\s*\\d+[:\\-\\s]*)?${escapedTitle}.*?\\n+`, 'i'),
                          new RegExp(`^#+\\s*Bab\\s*\\d+[:\\-\\s]*.*?\\n+`, 'i'),
                          /^#+.*?\n+/
                        ];
                        patterns.forEach(p => {
                          content = content.replace(p, '');
                        });

                        return (
                          <div key={idx} className="space-y-8">
                            <h2 className="text-3xl font-display font-bold text-slate-900 border-b-2 border-brand pb-2">
                              Bab {idx + 1}: {cleanTitle}
                            </h2>
                            <div className="markdown-body prose prose-slate prose-lg max-w-none prose-p:leading-relaxed prose-p:text-justify">
                              <ReactMarkdown>{content.trim()}</ReactMarkdown>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>

                <div className="space-y-4">
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold">Ebook Anda Sudah Sempurna?</h3>
                    <p className="text-slate-500">Unduh dalam format Word untuk hasil cetak terbaik.</p>
                  </div>
                  
                  <Button 
                    className="w-full py-10 text-2xl font-black bg-brand hover:bg-brand/90 shadow-xl shadow-brand/20 rounded-2xl"
                    onClick={downloadWord}
                  >
                    <Download className="mr-3 h-8 w-8" /> DOWNLOAD WORD (.DOCX)
                  </Button>
                  
                  <p className="text-xs text-center text-slate-400 font-medium">
                    File Word berisi materi lengkap dengan format rapi.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Navigation Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t sm:hidden z-50">
        <div className="flex justify-around items-center h-16 px-2">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isActive = currentStep === idx;
            return (
              <button
                key={step.id}
                onClick={() => {
                  if (idx <= currentStep || (idx === 1 && data.niche && data.expertise)) {
                    setCurrentStep(idx);
                  }
                }}
                className={`flex flex-col items-center justify-center w-full gap-1 transition-colors ${isActive ? 'text-brand' : 'text-slate-400'}`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
                <span className="text-[10px] font-bold uppercase tracking-tighter">{step.title}</span>
              </button>
            );
          })}
        </div>
      </footer>
    </div>
  );
}
