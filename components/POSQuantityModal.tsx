import React, { useState, useEffect } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import { allowsDecimalQuantity, clampQuantity, parseQuantity } from '../utils/units';

interface POSQuantityModalProps {
  productName: string;
  currentQty: number;
  maxStock: number;
  unit: string;
  onConfirm: (qty: number) => void;
  onCancel: () => void;
}

const POSQuantityModal: React.FC<POSQuantityModalProps> = ({
  productName,
  currentQty,
  maxStock,
  unit,
  onConfirm,
  onCancel,
}) => {
  const decimal = allowsDecimalQuantity(unit);
  const [qty, setQty] = useState(currentQty);
  const step = decimal ? 0.5 : 1;

  useEffect(() => {
    setQty(currentQty);
  }, [currentQty]);

  const clamp = (n: number) => clampQuantity(n, maxStock, unit);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-sm overflow-hidden animate-slide-up">
        <div className="p-5 border-b border-slate-100 flex justify-between items-start">
          <div>
            <h3 className="font-bold text-slate-800">Miqdarı dəyiş</h3>
            <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{productName}</p>
            <p className="text-xs text-slate-400 mt-1">Maks: {maxStock} {unit}</p>
          </div>
          <button onClick={onCancel} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex items-center justify-center gap-4">
          <button
            onClick={() => setQty((q) => clamp(q - step))}
            className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700"
          >
            <Minus size={22} />
          </button>
          <input
            type="number"
            min={decimal ? 0.01 : 1}
            max={maxStock}
            step={decimal ? 0.01 : 1}
            value={qty}
            onChange={(e) => {
              const n = parseQuantity(e.target.value, unit);
              if (n > 0) setQty(clamp(n));
            }}
            className="w-28 text-center text-3xl font-bold text-slate-900 border border-slate-200 rounded-xl py-2 outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setQty((q) => clamp(q + step))}
            className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700"
          >
            <Plus size={22} />
          </button>
        </div>

        <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50 pb-safe">
          <button onClick={onCancel} className="flex-1 py-3 text-slate-600 font-medium rounded-xl hover:bg-slate-200">
            Ləğv et
          </button>
          <button
            onClick={() => onConfirm(clamp(qty))}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
          >
            Təsdiqlə
          </button>
        </div>
      </div>
    </div>
  );
};

export default POSQuantityModal;
