import React, { useState } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import { Product } from '../types';
import { allowsDecimalQuantity, clampQuantity, parseQuantity } from '../utils/units';

interface POSAddProductModalProps {
  product: Product;
  onConfirm: (qty: number) => void;
  onCancel: () => void;
}

const QUICK_AMOUNTS = [1, 5, 10, 25, 50];

const POSAddProductModal: React.FC<POSAddProductModalProps> = ({ product, onConfirm, onCancel }) => {
  const decimal = allowsDecimalQuantity(product.unit);
  const [qty, setQty] = useState(decimal ? 1 : 1);

  const clamp = (n: number) => clampQuantity(n, product.stock, product.unit);

  const setFromInput = (value: string) => {
    const n = parseQuantity(value, product.unit);
    if (n > 0) setQty(clamp(n));
  };

  const step = decimal ? 0.5 : 1;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md overflow-hidden animate-slide-up">
        <div className="p-5 border-b border-slate-100 flex justify-between items-start gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-slate-800">Məhsul əlavə et</h3>
            <p className="text-sm text-slate-600 mt-1 line-clamp-2">{product.name}</p>
            <p className="text-sm font-bold text-blue-600 mt-1">{product.price.toFixed(2)} ₼ / {product.unit}</p>
            <p className="text-xs text-slate-400 mt-1">Anbarda: {product.stock} {product.unit}</p>
          </div>
          {product.imageUrl && (
            <img src={product.imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover border border-slate-100 shrink-0" />
          )}
          <button onClick={onCancel} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg shrink-0">
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Tez seçim</p>
          <div className="flex flex-wrap gap-2 mb-5">
            {QUICK_AMOUNTS.filter((n) => n <= product.stock).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setQty(clamp(n))}
                className={`min-w-[52px] h-11 px-3 rounded-xl font-bold text-sm border-2 transition-colors ${
                  qty === n ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-700 hover:border-blue-300'
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setQty((q) => clamp(q - step))}
              className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
            >
              <Minus size={22} />
            </button>
            <input
              type="number"
              min={decimal ? 0.01 : 1}
              max={product.stock}
              step={decimal ? 0.01 : 1}
              value={qty}
              onChange={(e) => setFromInput(e.target.value)}
              className="w-28 text-center text-3xl font-bold border border-slate-200 rounded-xl py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setQty((q) => clamp(q + step))}
              className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
            >
              <Plus size={22} />
            </button>
          </div>
          <p className="text-center text-sm text-slate-500 mt-3">
            Cəm: <span className="font-bold text-slate-800">{(product.price * qty).toFixed(2)} ₼</span>
          </p>
        </div>

        <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50 pb-safe">
          <button onClick={onCancel} className="flex-1 py-3.5 text-slate-600 font-medium rounded-xl hover:bg-slate-200">
            Ləğv et
          </button>
          <button
            onClick={() => onConfirm(clamp(qty))}
            className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
          >
            Səbətə əlavə et
          </button>
        </div>
      </div>
    </div>
  );
};

export default POSAddProductModal;
