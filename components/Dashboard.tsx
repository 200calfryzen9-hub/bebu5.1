
import React from 'react';
import { Cow, DashboardAlert, GeneralEvent } from '../types';
import { Bell, AlertTriangle, Calendar, CheckCircle } from 'lucide-react';
import { CalendarView } from './CalendarView';
import { getCalendarEvents, formatDateJP, parseDate, daysBetween } from '../utils/breedingService';

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

  return (
    <div className="p-4 space-y-6 pb-24">
      <header className="flex justify-between items-center mb-2">
        <div>
            <h1 className="text-2xl font-bold text-gray-900">和牛メイト</h1>
            <p className="text-sm text-gray-500">{formatDateJP(new Date())} の作業</p>
        </div>
        {/* Bell icon removed as requested */}
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
                    className="bg-pink-50 border-l-4 border-pink-500 p-4 rounded-r-lg shadow-sm active:scale-95 transition-transform"
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
                className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm active:scale-95 transition-transform"
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
                className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm active:scale-95 transition-transform"
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
                    className="bg-white border border-gray-100 p-3 rounded-lg shadow-sm flex items-center justify-between active:bg-gray-50"
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
      <section className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
              <div className="text-2xl font-bold text-gray-800">{cows.length}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">総頭数</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
              <div className="text-2xl font-bold text-wagyu-600">
                {cows.filter(c => c.status === 'PREGNANT').length}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">妊娠中</div>
          </div>
      </section>
    </div>
  );
};
