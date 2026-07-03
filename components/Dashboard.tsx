
import React from 'react';
import { Cow, DashboardAlert, GeneralEvent } from '../types';
import { Bell, AlertTriangle, Calendar, CheckCircle, Sparkles } from 'lucide-react';
import { CalendarView } from './CalendarView';
import { getCalendarEvents, formatDateJP, parseDate, daysBetween, calculateBreedingScore } from '../utils/breedingService';

interface DashboardProps {
  cows: Cow[];
  alerts: DashboardAlert[];
  onCowClick: (cowId: string) => void;
  generalEvents: GeneralEvent[];
  onAddGeneralEvent: (event: Omit<GeneralEvent, 'id'>) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ cows, alerts, onCowClick, generalEvents, onAddGeneralEvent }) => {
  const urgentAlerts = alerts.filter(a => a.type === 'URGENT' && !a.id.startsWith('calving-'));
  const warningAlerts = alerts.filter(a => a.type === 'WARNING' && !a.id.startsWith('calving-'));
  const infoAlerts = alerts.filter(a => a.type === 'INFO');
  
  // Merge cow events and general events
  const cowEvents = getCalendarEvents(cows);
  const calendarEvents = [
      ...cowEvents,
      ...generalEvents.map(g => ({
          date: g.date,
          type: 'GENERAL' as const,
          title: g.title,
          color: g.color,
          cowId: undefined
      }))
  ];

  const { score, grade } = calculateBreedingScore(cows);
  const gradeColors: Record<string, string> = {
    S: 'text-yellow-300', A: 'text-wagyu-200', B: 'text-blue-200', C: 'text-orange-200', 'N/A': 'text-gray-300',
  };

  return (
    <div className="p-4 space-y-6 pb-28">
      <header className="hero-gradient rounded-3xl p-5 text-white shadow-glow">
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">和牛メイト</h1>
                <p className="text-sm text-wagyu-100 mt-0.5">{formatDateJP(new Date())}</p>
            </div>
            <div className="flex flex-col items-center bg-white/10 rounded-2xl px-4 py-2 backdrop-blur-sm border border-white/10">
                <div className="flex items-center gap-1 text-[10px] font-bold text-wagyu-100 uppercase tracking-wider">
                    <Sparkles size={12} /> 繁殖スコア
                </div>
                <div className={`text-3xl font-extrabold leading-tight ${gradeColors[grade] || 'text-white'}`}>
                    {grade}
                </div>
                <div className="text-[11px] text-wagyu-100">{score}点</div>
            </div>
        </div>
      </header>

      {/* Calendar Section */}
      <section>
          <CalendarView 
            events={calendarEvents} 
            onCowClick={onCowClick} 
            onAddGeneralEvent={onAddGeneralEvent}
          />
      </section>

      {/* Upcoming Calving Section */}
      {(() => {
        const today = new Date();
        const calvingCows = cows
          .filter(c => {
              if (!c.expectedCalvingDate || (c.status !== 'PREGNANT' && c.status !== 'CALVING_SOON' && c.status !== 'INSEMINATED')) return false;
              const due = parseDate(c.expectedCalvingDate);
              const diff = daysBetween(due, today);
              return diff >= -30 && diff <= 30; // Show cows due within 30 days (or overdue up to 30 days)
          })
          .sort((a, b) => a.expectedCalvingDate!.localeCompare(b.expectedCalvingDate!));
        
        if (calvingCows.length === 0) return null;

        return (
          <section>
            <h2 className="text-lg font-bold text-pink-600 mb-2 flex items-center">
              <Calendar className="mr-2" size={20} />
              分娩予定 ({calvingCows.length})
            </h2>
            <div className="space-y-3">
              {calvingCows.map(cow => {
                const displayId = cow.earTag.length >= 5 ? cow.earTag.slice(-5) : cow.earTag;
                const displayName = `${displayId} ${cow.name}`;
                const due = parseDate(cow.expectedCalvingDate!);
                const diff = daysBetween(due, today);
                
                let statusText = '';
                if (diff > 0) {
                    statusText = `あと${diff}日`;
                } else if (diff === 0) {
                    statusText = '本日予定';
                } else {
                    statusText = `${Math.abs(diff)}日超過`;
                }

                return (
                  <div 
                    key={cow.id} 
                    onClick={() => onCowClick(cow.id)}
                    className="bg-pink-50 border-l-4 border-pink-500 p-4 rounded-2xl shadow-soft tap-card"
                  >
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-bold text-pink-900">{displayName}</h3>
                            <p className="text-sm text-pink-700">予定日: {formatDateJP(cow.expectedCalvingDate!)} ({statusText})</p>
                        </div>
                        <span className="text-xs font-mono bg-white px-2 py-1 rounded border border-pink-100 text-pink-500">
                            {formatDateJP(cow.expectedCalvingDate!, 'short')}
                        </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })()}

      {/* Urgent Section */}
      {urgentAlerts.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-red-600 mb-2 flex items-center">
            <AlertTriangle className="mr-2" size={20} />
            至急対応 ({urgentAlerts.length})
          </h2>
          <div className="space-y-3">
            {urgentAlerts.map(alert => (
              <div 
                key={alert.id} 
                onClick={() => onCowClick(alert.cowId)}
                className="bg-red-50 border-l-4 border-red-500 p-4 rounded-2xl shadow-soft tap-card"
              >
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-red-900">{alert.cowName}</h3>
                        <p className="text-sm text-red-700">{alert.message}</p>
                    </div>
                    <span className="text-xs font-mono bg-white px-2 py-1 rounded border border-red-100 text-red-500">
                        {formatDateJP(alert.date, 'short')}
                    </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Warning/Suggestion Section */}
      {warningAlerts.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-amber-600 mb-2 flex items-center">
            <Calendar className="mr-2" size={20} />
            種付け誘導・注意 ({warningAlerts.length})
          </h2>
          <div className="space-y-3">
            {warningAlerts.map(alert => (
              <div 
                key={alert.id}
                onClick={() => onCowClick(alert.cowId)}
                className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-2xl shadow-soft tap-card"
              >
                 <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-amber-900">{alert.cowName}</h3>
                        <p className="text-sm text-amber-700">{alert.message}</p>
                    </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Info/Calendar Section (List view of daily tasks) */}
      <section>
         <h2 className="text-lg font-bold text-wagyu-700 mb-2 flex items-center">
            <CheckCircle className="mr-2" size={20} />
            本日の予定 ({infoAlerts.length})
          </h2>
          {infoAlerts.length === 0 ? (
              <div className="p-6 text-center text-gray-400 bg-white rounded-lg border border-dashed border-gray-300">
                  本日の予定はありません
              </div>
          ) : (
             <div className="space-y-2">
                {infoAlerts.map(alert => (
                <div 
                    key={alert.id}
                    onClick={() => onCowClick(alert.cowId)}
                    className="bg-white border border-gray-100 p-3 rounded-2xl shadow-soft flex items-center justify-between tap-card"
                >
                    <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-3">
                            {alert.cowName.substring(0,1)}
                        </div>
                        <div>
                            <div className="font-bold text-gray-800">{alert.cowName}</div>
                            <div className="text-xs text-gray-500">{alert.message}</div>
                        </div>
                    </div>
                </div>
                ))}
             </div>
          )}
      </section>

      {/* Quick Stats Grid */}
      <section className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-2xl shadow-soft border border-gray-100">
              <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">総頭数</span>
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm">🐄</div>
              </div>
              <div className="text-3xl font-extrabold text-gray-800 mt-1">{cows.filter(c => !c.isRemoved).length}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-soft border border-gray-100">
              <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">妊娠中</span>
                  <div className="w-8 h-8 rounded-full bg-wagyu-50 flex items-center justify-center text-sm">🤰</div>
              </div>
              <div className="text-3xl font-extrabold text-wagyu-600 mt-1">
                {cows.filter(c => c.status === 'PREGNANT' || c.status === 'CALVING_SOON').length}
              </div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-soft border border-gray-100">
              <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">種付済</span>
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-sm">💉</div>
              </div>
              <div className="text-3xl font-extrabold text-blue-600 mt-1">
                {cows.filter(c => c.status === 'INSEMINATED').length}
              </div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-soft border border-gray-100">
              <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">空胎</span>
                  <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-sm">⚠️</div>
              </div>
              <div className="text-3xl font-extrabold text-red-500 mt-1">
                {cows.filter(c => c.status === 'EMPTY' && !c.isRemoved).length}
              </div>
          </div>
      </section>
    </div>
  );
};
