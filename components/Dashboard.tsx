import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DashboardStats, Sale, Expense } from '../types';
import { TrendingUp, AlertTriangle, Package, DollarSign, Calendar, Star, Wallet, ArrowUpRight } from 'lucide-react';
import { getSaleNetProfit, getSaleNetTotal } from '../utils/erpMath';

interface DashboardProps {
  stats: DashboardStats;
  sales: Sale[];
  expenses: Expense[];
  onNavigate?: (target: 'sales' | 'expenses' | 'inventory') => void;
}

const StatCard: React.FC<{
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
}> = ({ title, value, subtitle, icon, color, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between text-left transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 group"
  >
    <div className="min-w-0">
      <p className="text-sm text-slate-500 font-medium mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800 tracking-tight leading-tight">{value}</h3>
      {subtitle && <p className="text-xs text-emerald-600 font-medium mt-1">{subtitle}</p>}
      <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
        Bax <ArrowUpRight size={12} />
      </span>
    </div>
    <div className={`p-3.5 rounded-2xl ${color} text-white shadow-md group-hover:rotate-6 transition-transform`}>
      {icon}
    </div>
  </button>
);

const Dashboard: React.FC<DashboardProps> = ({ stats, sales, expenses, onNavigate }) => {
  const [sortOrder, setSortOrder] = useState<'date' | 'amount-desc' | 'amount-asc'>('date');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('today');

  const isInSelectedDateRange = (date: string) => {
    const now = new Date();
    const d = new Date(date);
    if (dateRange === 'today') return d.toDateString() === now.toDateString();
    if (dateRange === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      return d >= weekAgo;
    }
    if (dateRange === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  };

  // Filter sales completely by selected date range
  const filteredSales = useMemo(() => {
    return sales.filter(s => s.status !== 'REFUNDED' && isInSelectedDateRange(s.date));
  }, [sales, dateRange]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => isInSelectedDateRange(expense.date));
  }, [expenses, dateRange]);

  const filteredExpenseTotal = useMemo(
    () => filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    [filteredExpenses]
  );

  // Compute Global Stats Based on Filtered Sales
  const filteredStats = useMemo(() => {
    return {
      revenue: filteredSales.reduce((acc, s) => acc + getSaleNetTotal(s), 0),
      profit: filteredSales.reduce((acc, s) => acc + getSaleNetProfit(s), 0),
      count: filteredSales.length
    }
  }, [filteredSales]);

  // Compute Today's Stats (always for today)
  const { todayRevenue, todayProfit, todayCount } = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaysSales = sales.filter(s => s.date.startsWith(today) && s.status !== 'REFUNDED');
    return {
      todayRevenue: todaysSales.reduce((acc, s) => acc + getSaleNetTotal(s), 0),
      todayProfit: todaysSales.reduce((acc, s) => acc + getSaleNetProfit(s), 0),
      todayCount: todaysSales.length
    };
  }, [sales]);

  // Compute Top Selling Products
  const topProducts = useMemo(() => {
    const productSales = filteredSales.flatMap(s => s.items).reduce((acc, item) => {
      if (!acc[item.id]) acc[item.id] = { name: item.name, qty: 0, revenue: 0 };
      acc[item.id].qty += item.quantity;
      acc[item.id].revenue += item.price * item.quantity;
      return acc;
    }, {} as Record<string, {name: string, qty: number, revenue: number}>);
    
    return Object.values(productSales).sort((a,b) => b.qty - a.qty).slice(0, 5);
  }, [filteredSales]);

  // Compute Payment Methods for Pie Chart
  const paymentMethodsData = useMemo(() => {
    const counts = filteredSales.reduce((acc, s) => {
      const pm = s.paymentMethod || 'NAGD';
      acc[pm] = (acc[pm] || 0) + getSaleNetTotal(s);
      return acc;
    }, {} as Record<string, number>);
    
    return [
      { name: 'Nəğd', value: counts['NAGD'] || 0, color: '#10b981' },
      { name: 'Kart', value: counts['KART'] || 0, color: '#3b82f6' },
      { name: 'Borc', value: counts['BORC'] || 0, color: '#f59e0b' }
    ].filter(d => d.value > 0);
  }, [filteredSales]);

  // Prepare chart data (Last 10 sales from filtered list)
  const chartData = filteredSales.slice(-10).map((s) => ({
    name: `#${s.id.slice(0, 4)}`,
    amount: getSaleNetTotal(s),
    profit: getSaleNetProfit(s)
  }));

  const getDisplayedSales = () => {
    const data = [...filteredSales];
    switch (sortOrder) {
      case 'amount-desc':
        return data.sort((a, b) => getSaleNetTotal(b) - getSaleNetTotal(a)).slice(0, 5);
      case 'amount-asc':
        return data.sort((a, b) => getSaleNetTotal(a) - getSaleNetTotal(b)).slice(0, 5);
      case 'date':
      default:
        return data.slice(-5).reverse();
    }
  };

  const displayedSales = getDisplayedSales();

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-slate-800 hidden sm:block">Fəaliyyət Xülasəsi</h2>
        <div className="flex bg-white rounded-lg p-1 shadow-sm border border-slate-200 w-fit">
          <button onClick={() => setDateRange('today')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${dateRange === 'today' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>Bugün</button>
          <button onClick={() => setDateRange('week')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${dateRange === 'week' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>Bu həftə</button>
          <button onClick={() => setDateRange('month')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${dateRange === 'month' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>Bu ay</button>
          <button onClick={() => setDateRange('all')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${dateRange === 'all' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>Bütün dövr</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 md:gap-6">
        <StatCard 
          title="Ümumi Gəlir" 
          value={`${filteredStats.revenue.toFixed(2)} ₼`} 
          subtitle={dateRange !== 'today' ? `Bugün: +${todayRevenue.toFixed(2)} ₼` : undefined}
          icon={<TrendingUp size={24} />} 
          color="bg-emerald-500" 
          onClick={() => onNavigate?.('sales')}
        />
        <StatCard 
          title="Xalis Mənfəət" 
          value={`${filteredStats.profit.toFixed(2)} ₼`} 
          subtitle={dateRange !== 'today' ? `Bugün: +${todayProfit.toFixed(2)} ₼` : undefined}
          icon={<DollarSign size={24} />} 
          color="bg-blue-500" 
          onClick={() => onNavigate?.('sales')}
        />
        <StatCard 
          title="Ümumi Xərclər" 
          value={`${filteredExpenseTotal.toFixed(2)} ₼`} 
          subtitle={`${filteredExpenses.length} xərc qeydi`}
          icon={<Wallet size={24} />} 
          color="bg-rose-500" 
          onClick={() => onNavigate?.('expenses')}
        />
        <StatCard 
          title="Satış Sayı" 
          value={`${filteredStats.count}`} 
          subtitle={dateRange !== 'today' ? `Bugün: ${todayCount} satış` : undefined}
          icon={<Package size={24} />} 
          color="bg-indigo-500" 
          onClick={() => onNavigate?.('sales')}
        />
        <StatCard 
          title="Azalan Məhsul" 
          value={`${stats.lowStockCount}`} 
          subtitle={stats.lowStockCount > 0 ? "Əlavə edilməlidir" : "Hər şey qaydasındadır"}
          icon={<AlertTriangle size={24} />} 
          color={stats.lowStockCount > 0 ? "bg-red-500" : "bg-amber-500"} 
          onClick={() => onNavigate?.('inventory')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white px-6 py-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <TrendingUp className="text-indigo-500" size={20} /> Satış Dinamikası (Son 10 satış)
          </h3>
          <div className="h-72 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} dy={10} />
                <YAxis tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} dx={-10} tickFormatter={(v) => `${v} ₼`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{fill: '#f8fafc'}}
                />
                <Bar dataKey="amount" fill="#6366f1" name="Gəlir" radius={[6, 6, 0, 0]} barSize={24} />
                <Bar dataKey="profit" fill="#10b981" name="Mənfəət" radius={[6, 6, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white px-6 py-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
             <DollarSign className="text-emerald-500" size={20} /> Ödəniş Metodları
          </h3>
          <div className="flex-1 flex flex-col justify-center">
             {paymentMethodsData.length > 0 ? (
               <div className="h-48 w-full relative">
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie
                       data={paymentMethodsData}
                       cx="50%"
                       cy="50%"
                       innerRadius={60}
                       outerRadius={80}
                       paddingAngle={5}
                       dataKey="value"
                     >
                       {paymentMethodsData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={entry.color} />
                       ))}
                     </Pie>
                     <Tooltip 
                       formatter={(value: number) => `${value.toFixed(2)} ₼`} 
                       contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                     />
                   </PieChart>
                 </ResponsiveContainer>
               </div>
             ) : (
                <div className="text-center text-slate-400 py-8 text-sm">Hələ məlumat yoxdur</div>
             )}
             
             <div className="flex justify-center gap-4 mt-2">
                {paymentMethodsData.map((pm, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                     <span className="w-3 h-3 rounded-full" style={{backgroundColor: pm.color}}></span>
                     {pm.name}
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
        <div className="bg-white px-6 py-5 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
               <Calendar className="text-blue-500" size={20} /> Son Satışlar
            </h3>
            <select 
              className="text-sm font-medium border border-slate-200 bg-slate-50 text-slate-700 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 cursor-pointer outline-none hover:bg-slate-100 transition-colors"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
            >
              <option value="date">Tarix üzrə</option>
              <option value="amount-desc">Məbləğ (Çox)</option>
              <option value="amount-asc">Məbləğ (Az)</option>
            </select>
          </div>
          <div className="space-y-3">
            {displayedSales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors border border-slate-100/50 group">
                <div>
                  <p className="text-sm font-bold text-slate-800">Qaimə #{sale.id.slice(0,6)}</p>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    {new Date(sale.date).toLocaleDateString('az-AZ')} {new Date(sale.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    <span className="inline-block w-1 h-1 rounded-full bg-slate-300 mx-1"></span>
                    <span className="font-medium text-slate-600">{sale.paymentMethod || 'NAGD'}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="block font-bold text-emerald-600 group-hover:scale-105 transition-transform origin-right">+{getSaleNetTotal(sale).toFixed(2)} ₼</span>
                  <span className="block text-xs text-slate-400 mt-1">{sale.items.length} məhsul</span>
                </div>
              </div>
            ))}
            {displayedSales.length === 0 && (
               <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                 Hələ satış yoxdur
               </div>
            )}
          </div>
        </div>

        <div className="bg-white px-6 py-5 rounded-2xl shadow-sm border border-slate-100">
           <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
             <Star className="text-amber-500 fill-amber-500/20" size={20} /> Çox Satılan Məhsullar (Top 5)
           </h3>
           <div className="space-y-3">
             {topProducts.map((p, index) => (
               <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100/50">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{p.qty} ədəd satılıb</p>
                    </div>
                 </div>
                 <div className="font-bold text-slate-700 text-sm">
                    {p.revenue.toFixed(2)} ₼
                 </div>
               </div>
             ))}
             {topProducts.length === 0 && (
               <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                 Hələ satış yoxdur
               </div>
            )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
