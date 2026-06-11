import React, { useState } from 'react';
import { Product, Sale } from '../types';
import { generateBusinessInsight } from '../services/geminiService';
import { Sparkles, BrainCircuit, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AssistantProps {
  products: Product[];
  sales: Sale[];
  lowStockThreshold: number;
}

const Assistant: React.FC<AssistantProps> = ({ products, sales, lowStockThreshold }) => {
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    const result = await generateBusinessInsight(products, sales, lowStockThreshold);
    setInsight(result);
    setLoading(false);
    setHasLoaded(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <BrainCircuit size={32} /> Ağıllı Köməkçi
          </h2>
          <p className="text-violet-100 max-w-xl text-lg">
            Süni intellekt vasitəsilə mağazanızın satışlarını təhlil edin, anbar vəziyyətini yoxlayın və biznesinizi inkişaf etdirmək üçün məsləhətlər alın.
          </p>
          <button 
            onClick={handleGenerate}
            disabled={loading}
            className="mt-6 bg-white text-violet-700 px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-white/20 hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-70 disabled:scale-100"
          >
            {loading ? <RefreshCw className="animate-spin" size={20} /> : <Sparkles size={20} />}
            {loading ? 'Təhlil edilir...' : 'Təhlil Et'}
          </button>
        </div>
        {/* Abstract shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl transform -translate-x-1/3 translate-y-1/3"></div>
      </div>

      {hasLoaded && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 min-h-[300px]">
           <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 pb-4 border-b border-slate-100">
             <Sparkles className="text-violet-600" size={24} /> Nəticə:
           </h3>
           <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed">
             <ReactMarkdown>{insight}</ReactMarkdown>
           </div>
        </div>
      )}
      
      {!hasLoaded && (
        <div className="text-center py-20 text-slate-400">
          <BrainCircuit size={64} className="mx-auto mb-4 opacity-20" />
          <p>Təhlilə başlamaq üçün yuxarıdakı düyməni sıxın.</p>
        </div>
      )}
    </div>
  );
};

export default Assistant;