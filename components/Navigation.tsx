import React from 'react';
import { Home, List, BarChart2, Settings, Baby } from 'lucide-react';

interface NavigationProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentTab, onTabChange }) => {
  const tabs = [
    { id: 'dashboard', icon: Home, label: 'ホーム' },
    { id: 'list', icon: List, label: '母牛一覧' },
    { id: 'calves', icon: Baby, label: '子牛一覧' },
    { id: 'analytics', icon: BarChart2, label: '分析' },
    { id: 'settings', icon: Settings, label: '設定' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg pb-safe">
      <div className="flex justify-around items-center h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center w-full h-full transition-colors duration-200 ${
                isActive ? 'text-wagyu-700' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] mt-1 font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};