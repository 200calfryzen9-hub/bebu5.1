
import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Calf, Cow } from '../types';
import { formatDateJP, calculateBreedingScore, daysBetween, parseDate } from '../utils/breedingService';
import { GitFork, RotateCcw, Activity } from 'lucide-react';

interface AnalyticsProps {
  cows: Cow[];
  calves: Calf[];
  onResetData: () => void;
}

export const Analytics: React.FC<AnalyticsProps> = ({ cows, calves, onResetData }) => {
  // Sales Data Processing
  const salesData = calves.filter(c => c.price && c.price > 0).map(c => {
        const dateStr = c.auctionDate || c.birthDate;
        const jpYear = formatDateJP(new Date(dateStr), 'year_only'); 
        return { name: jpYear, price: c.price ? c.price / 10000 : 0 };
    });
  const groupedSalesData: {name: string, price: number, count: number}[] = [];
  salesData.forEach(item => {
      const existing = groupedSalesData.find(i => i.name === item.name);
      if (existing) { existing.price += item.price; existing.count += 1; } 
      else { groupedSalesData.push({ name: item.name, price: item.price, count: 1 }); }
  });
  const chartData = groupedSalesData.map(d => ({ name: d.name, price: Math.round(d.price / d.count) })).sort((a,b) => a.name.localeCompare(b.name)).slice(-5);
  const soldCalves = calves.filter(c => c.price && c.price > 0);
  const maxPrice = Math.max(...(soldCalves.map(c => c.price || 0))) || 0;
  const avgPrice = soldCalves.length > 0 ? Math.round(soldCalves.reduce((sum, c) => sum + (c.price || 0), 0) / soldCalves.length) : 0;

  // --- NEW METRICS ---
  const inseminatedCount = cows.filter(c => c.status === 'INSEMINATED').length;
  const emptyCount = cows.filter(c => c.status === 'EMPTY').length;
  
  // Avg Empty Days
  const emptyCowsWithHistory = cows.filter(c => c.status === 'EMPTY' && c.lastCalvingDate);
  const totalEmptyDays = emptyCowsWithHistory.reduce((sum, c) => sum + daysBetween(new Date(), parseDate(c.lastCalvingDate!)), 0);
  const avgEmptyDays = emptyCowsWithHistory.length > 0 ? Math.round(totalEmptyDays / emptyCowsWithHistory.length) : 0;

  // Pre-calving (1 month)
  const preCalvingCount = cows.filter(c => {
      if (!c.expectedCalvingDate) return false;
      const days = daysBetween(parseDate(c.expectedCalvingDate), new Date());
      return days >= 0 && days <= 30;
  }).length;

  // Real-time Breeding Score
  const { score, grade, details } = calculateBreedingScore(cows);

  const calculateBloodlineStats = (key: 'fatherName' | 'motherFatherName') => {
      const stats: Record<string, { total: number, count: number }> = {};
      calves.forEach(calf => {
          if (!calf.price) return;
          const mother = cows.find(c => c.id === calf.motherId);
          if (!mother) return;
          // Fix: Type-safe access to cow property
          const bullName = mother[key as keyof Cow] as string;
          if (!bullName) return;
          if (!stats[bullName]) stats[bullName] = { total: 0, count: 0 };
          stats[bullName].total += calf.price;
          stats[bullName].count += 1;
      });
      return Object.entries(stats).map(([name, data]) => ({ name, avg: Math.round(data.total / data.count) })).sort((a, b) => b.avg - a.avg);
  };
  const fatherStats = calculateBloodlineStats('fatherName'); 
  const grandFatherStats = calculateBloodlineStats('motherFatherName'); 

  // --- SALES FORECAST ---
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

  let currentYearExpectedCount = 0;
  let nextYearExpectedCount = 0;
  const expectedAuctionMonths: Record<string, number> = {};

  const unsoldCalves = calves.filter(c => !c.price || c.price === 0);
  
  unsoldCalves.forEach(calf => {
      const birthDate = new Date(calf.birthDate);
      // Expected auction is approx 9 months (270 days) after birth
      const expectedAuctionDate = new Date(birthDate.getTime() + 270 * 24 * 60 * 60 * 1000);
      const auctionYear = expectedAuctionDate.getFullYear();
      const auctionMonth = expectedAuctionDate.getMonth() + 1;

      if (auctionYear === currentYear) {
          currentYearExpectedCount++;
      } else if (auctionYear === nextYear) {
          nextYearExpectedCount++;
      }

      const monthKey = `${auctionYear}年${auctionMonth}月`;
      expectedAuctionMonths[monthKey] = (expectedAuctionMonths[monthKey] || 0) + 1;
  });

  const currentYearExpectedSales = currentYearExpectedCount * avgPrice;
  const nextYearExpectedSales = nextYearExpectedCount * avgPrice;

  const sortedExpectedMonths = Object.entries(expectedAuctionMonths)
      .sort((a, b) => {
          const [aYear, aMonth] = a[0].replace('月', '').split('年').map(Number);
          const [bYear, bMonth] = b[0].replace('月', '').split('年').map(Number);
          if (aYear !== bYear) return aYear - bYear;
          return aMonth - bMonth;
      });

  const handleReset = () => { if(window.confirm('販売データをリセットしますか？')) onResetData(); };

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">経営分析</h1>
          <button onClick={handleReset} className="text-xs text-gray-500 flex items-center gap-1 border border-gray-200 px-2 py-1 rounded hover:bg-gray-100"><RotateCcw size={12} /> リセット</button>
      </div>

      {/* New Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm">
              <div className="text-xs font-bold text-blue-600 mb-1">種付け済み</div>
              <div className="text-2xl font-black text-gray-800">{inseminatedCount}<span className="text-sm font-normal text-gray-500 ml-1">頭</span></div>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm">
              <div className="text-xs font-bold text-gray-500 mb-1">空胎牛</div>
              <div className="text-2xl font-black text-gray-800">{emptyCount}<span className="text-sm font-normal text-gray-500 ml-1">頭</span></div>
          </div>
          <div className="bg-red-50 p-4 rounded-xl border border-red-100 shadow-sm">
              <div className="text-xs font-bold text-red-600 mb-1">平均空胎日数</div>
              <div className="text-2xl font-black text-gray-800">{avgEmptyDays}<span className="text-sm font-normal text-gray-500 ml-1">日</span></div>
          </div>
          <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 shadow-sm">
              <div className="text-xs font-bold text-purple-600 mb-1">出産前1ヶ月</div>
              <div className="text-2xl font-black text-gray-800">{preCalvingCount}<span className="text-sm font-normal text-gray-500 ml-1">頭</span></div>
          </div>
      </div>

      {/* Breeding Score Card (New) */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 text-white shadow-xl">
          <div className="flex justify-between items-start mb-4">
              <div>
                  <h2 className="font-bold text-lg flex items-center gap-2"><Activity /> 繁殖効率スコア</h2>
                  <p className="text-xs text-gray-400">1年1産を目指すリアルタイム評価</p>
              </div>
              <div className="text-right">
                  <div className={`text-4xl font-black italic ${grade === 'S' ? 'text-yellow-400' : grade === 'A' ? 'text-green-400' : 'text-gray-300'}`}>
                      {grade} <span className="text-lg not-italic">判定</span>
                  </div>
              </div>
          </div>
          
          <div className="flex items-end gap-2 mb-6">
              <span className="text-5xl font-bold">{score}</span>
              <span className="text-gray-400 mb-1">/ 100点</span>
          </div>

          <div className="space-y-2 bg-white/10 p-3 rounded-lg">
              {details.length === 0 && <span className="text-sm text-gray-300">評価データが不足しています</span>}
              {details.map((d, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                      <span className="text-gray-300">{d.label}</span>
                      <span className={`font-bold ${d.type === 'good' ? 'text-green-400' : d.type === 'bad' ? 'text-red-400' : 'text-yellow-400'}`}>
                          {d.value}
                      </span>
                  </div>
              ))}
          </div>
      </div>

      {/* Sales Stats */}
      <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <div className="text-xs text-gray-500 mb-1">平均せり価格</div>
              <div className="text-2xl font-bold text-gray-800">¥{(avgPrice/10000).toFixed(0)}万</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <div className="text-xs text-gray-500 mb-1">最高販売額</div>
              <div className="text-2xl font-bold text-wagyu-600">¥{(maxPrice/10000).toFixed(0)}万</div>
          </div>
      </div>

      {/* Sales Forecast */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-700 text-sm border-b pb-2">売上予測 (生まれている牛のみ)</h3>
          
          <div className="grid grid-cols-2 gap-4">
              <div>
                  <div className="text-xs text-gray-500 mb-1">{currentYear}年 (1月〜12月)</div>
                  <div className="text-xl font-bold text-blue-600">¥{(currentYearExpectedSales/10000).toFixed(0)}万</div>
                  <div className="text-xs text-gray-400 mt-1">予定頭数: {currentYearExpectedCount}頭</div>
              </div>
              <div>
                  <div className="text-xs text-gray-500 mb-1">{nextYear}年 (1月〜12月)</div>
                  <div className="text-xl font-bold text-green-600">¥{(nextYearExpectedSales/10000).toFixed(0)}万</div>
                  <div className="text-xs text-gray-400 mt-1">予定頭数: {nextYearExpectedCount}頭</div>
              </div>
          </div>

          {sortedExpectedMonths.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="text-xs font-bold text-gray-500 mb-2">上場予定月 (生後9ヶ月想定)</div>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      {sortedExpectedMonths.map(([month, count], idx) => (
                          <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-2 min-w-[80px] text-center flex-shrink-0">
                              <div className="text-xs text-gray-500">{month}</div>
                              <div className="font-bold text-gray-800">{count}頭</div>
                          </div>
                      ))}
                  </div>
              </div>
          )}
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm h-72">
          <h3 className="font-bold text-gray-700 mb-4 text-sm">平均販売価格推移 (万円)</h3>
          {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} />
                    <Bar dataKey="price" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
          ) : <div className="h-full flex items-center justify-center text-gray-400 text-xs">データなし</div>}
      </div>

      {/* Bloodline Stats (Simplified visual) */}
      <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center"><GitFork className="mr-2" size={18} /> 血統分析</h2>
          {/* Father Stats */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
             <div className="p-3 bg-gray-50 border-b border-gray-100 font-bold text-gray-700 text-xs">父牛別 (母牛の父)</div>
             <div className="divide-y divide-gray-100">
                 {fatherStats.slice(0, 5).map((stat, idx) => (
                     <div key={idx} className="p-3 flex justify-between items-center text-sm">
                         <div className="flex items-center gap-2"><span className="text-gray-400 w-4">{idx + 1}</span><span className="font-bold">{stat.name}</span></div>
                         <div className="text-wagyu-700 font-bold">¥{stat.avg.toLocaleString()}</div>
                     </div>
                 ))}
             </div>
          </div>
      </div>
    </div>
  );
};
