
import React, { useState, useEffect } from 'react';
import { Settings as SettingsType, Cow, BreedingStatus, EventType, BreedingEvent, Calf, GeneralEvent } from '../types';
import { Save, Download, Upload, FileText, Database, HelpCircle, AlertCircle, Share2, Wifi, RefreshCw, Palette, X, Lock, ListTodo, Trash2, Plus } from 'lucide-react';
import { calculateExpectedCalvingDate, recalculateCowStatus } from '../utils/breedingService';
import { initFirebase } from '../utils/firebaseService';

interface SettingsProps {
    settings: SettingsType;
    onSave: (s: SettingsType) => void;
    cows: Cow[];
    calves?: Calf[];
    generalEvents?: GeneralEvent[];
    bullList?: string[];
    onImportCows: (cows: Cow[]) => void;
    onRestoreBackup?: (cows: Cow[], calves: Calf[], settings: SettingsType, generalEvents: GeneralEvent[], bullList: string[]) => void;
}

export const Settings: React.FC<SettingsProps> = ({ settings, onSave, cows, calves = [], generalEvents = [], bullList = [], onImportCows, onRestoreBackup }) => {
    const [csvText, setCsvText] = useState('');
    const [showImportModal, setShowImportModal] = useState(false);
    const [showRulesModal, setShowRulesModal] = useState(false);
    
    // Sync States
    const [syncConfig, setSyncConfig] = useState(settings.sync?.firebaseConfigString || '');
    const [familyId, setFamilyId] = useState(settings.sync?.familyId || '');
    const [isSyncEnabled, setIsSyncEnabled] = useState(settings.sync?.enabled || false);

    // Local State for Form Inputs (Prevents direct mutation prop errors)
    const [localSettings, setLocalSettings] = useState<SettingsType>(settings);

    // Sync local state if props change (e.g. from remote sync)
    useEffect(() => {
        setLocalSettings(settings);
        setSyncConfig(settings.sync?.firebaseConfigString || '');
        setFamilyId(settings.sync?.familyId || '');
        setIsSyncEnabled(settings.sync?.enabled || false);
    }, [settings]);

    // Save Sync Settings
    const handleSaveSync = () => {
        if (!syncConfig || !familyId) {
            alert('「合言葉」と「Firebase設定情報」の両方を入力してください');
            return;
        }
        const success = initFirebase(syncConfig);
        
        if (success) {
            setIsSyncEnabled(true);
            onSave({
                ...localSettings,
                sync: {
                    enabled: true,
                    familyId: familyId,
                    firebaseConfigString: syncConfig
                }
            });
            alert('接続に成功しました！\n右上に緑色のアイコンが表示されます。\n\n奥様のスマホでも「同じ合言葉」と「同じ設定情報」を入力してください。');
        } else {
            alert('接続に失敗しました。\n貼り付けたコードが正しいか確認してください。\n余分な文字が入っていないか、または足りない文字がないか確認してください。');
        }
    };

    const handleDisableSync = () => {
        if(window.confirm('同期を停止しますか？\n（データは消えませんが、相手と共有されなくなります）')) {
            setIsSyncEnabled(false);
            onSave({
                ...localSettings,
                sync: {
                    ...localSettings.sync,
                    enabled: false
                }
            });
        }
    };

    // Export Data as JSON
    const handleExportBackup = () => {
        const backupData = {
            version: 2,
            data: {
                cows,
                calves,
                settings,
                generalEvents,
                bullList
            }
        };
        const dataStr = JSON.stringify(backupData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const exportFileDefaultName = `wagyumate_backup_${new Date().toISOString().slice(0,10)}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', url);
        linkElement.setAttribute('download', exportFileDefaultName);
        document.body.appendChild(linkElement);
        linkElement.click();
        document.body.removeChild(linkElement);
        URL.revokeObjectURL(url);
    };

    // Export Cows Data as CSV
    const handleExportCowCsv = () => {
        let cowCsvContent = "耳標番号,名号,生年月日,父牛,母の父,種付け年月日,種付け種雄牛,分娩年月日,メモ内容\n";
        
        cows.forEach(cow => {
            const lastInsemEvent = cow.events.filter(e => e.type === EventType.INSEMINATION).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            const bullName = lastInsemEvent?.relatedId || '';
            const notesText = (cow.notes || []).map(n => `[${n.isTodo ? (n.isDone ? '済' : '未') : 'メモ'}] ${n.text}`).join(' / ').replace(/"/g, '""');

            const row = [
                `"${cow.earTag}"`,
                `"${cow.name}"`,
                `"${cow.birthDate}"`,
                `"${cow.fatherName}"`,
                `"${cow.motherFatherName}"`,
                `"${cow.lastInseminationDate || ''}"`,
                `"${bullName}"`,
                `"${cow.lastCalvingDate || ''}"`,
                `"${notesText}"`
            ].join(",");
            cowCsvContent += row + "\n";
        });

        const cowBlob = new Blob([cowCsvContent], { type: 'text/csv;charset=utf-8;' });
        const cowUrl = URL.createObjectURL(cowBlob);
        const cowLink = document.createElement("a");
        cowLink.setAttribute("href", cowUrl);
        cowLink.setAttribute("download", `wagyumate_cows_${new Date().toISOString().slice(0,10)}.csv`);
        cowLink.style.visibility = 'hidden';
        document.body.appendChild(cowLink);
        cowLink.click();
        document.body.removeChild(cowLink);
        URL.revokeObjectURL(cowUrl);
    };

    // Export Calves Data as CSV
    const handleExportCalfCsv = () => {
        if (!calves || calves.length === 0) {
            alert('子牛のデータがありません');
            return;
        }
        let calfCsvContent = "耳標番号,名号,生年月日,性別,母牛ID,父牛,せり月,体重,販売額,状態,メモ内容\n";
        calves.forEach(calf => {
            const notesText = (calf.notes || []).map(n => `[${n.isTodo ? (n.isDone ? '済' : '未') : 'メモ'}] ${n.text}`).join(' / ').replace(/"/g, '""');
            const row = [
                `"${calf.earTag || ''}"`,
                `"${calf.name || ''}"`,
                `"${calf.birthDate}"`,
                `"${calf.sex === 'MALE' ? 'オス/去勢' : 'メス'}"`,
                `"${calf.motherId || ''}"`,
                `"${calf.fatherName || ''}"`,
                `"${calf.auctionDate || ''}"`,
                `"${calf.weight || ''}"`,
                `"${calf.price || ''}"`,
                `"${calf.isRemoved ? 'アーカイブ済' : '在籍'}"`,
                `"${notesText}"`
            ].join(",");
            calfCsvContent += row + "\n";
        });

        const calfBlob = new Blob([calfCsvContent], { type: 'text/csv;charset=utf-8;' });
        const calfUrl = URL.createObjectURL(calfBlob);
        const calfLink = document.createElement("a");
        calfLink.setAttribute("href", calfUrl);
        calfLink.setAttribute("download", `wagyumate_calves_${new Date().toISOString().slice(0,10)}.csv`);
        calfLink.style.visibility = 'hidden';
        document.body.appendChild(calfLink);
        calfLink.click();
        document.body.removeChild(calfLink);
        URL.revokeObjectURL(calfUrl);
    };

    // Import Data from JSON (Backup Restore)
    const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
        const fileReader = new FileReader();
        if (event.target.files && event.target.files.length > 0) {
            fileReader.readAsText(event.target.files[0], "UTF-8");
            fileReader.onload = e => {
                if (e.target && e.target.result) {
                    try {
                        const parsedData = JSON.parse(e.target.result as string);
                        
                        if (parsedData.version === 2 && parsedData.data) {
                             if(window.confirm('現在のデータを上書きしますか？この操作は取り消せません。')) {
                                 if (onRestoreBackup) {
                                     onRestoreBackup(
                                         parsedData.data.cows || [], 
                                         parsedData.data.calves || [], 
                                         parsedData.data.settings || settings,
                                         parsedData.data.generalEvents || [],
                                         parsedData.data.bullList || []
                                     );
                                 }
                                 alert('フルバックアップの復元が完了しました！');
                             }
                        } else if (Array.isArray(parsedData)) {
                             // Fallback for version 1 (Cows only array)
                             if(window.confirm('古い形式のバックアップです。母牛データのみを上書き復元しますか？')) {
                                 onImportCows(parsedData);
                                 alert('母牛データの復元が完了しました！');
                             }
                        } else {
                             alert('未対応のバックアップファイル形式です。');
                        }
                    } catch (error) {
                        alert('ファイルの読み込みに失敗しました');
                    }
                }
            };
        }
    };

    // Import CSV (Register Cows)
    const handleImportCsv = () => {
        if (!csvText) {
            alert('データが入力されていません');
            return;
        }
        
        const lines = csvText.trim().split('\n');
        const newCows: Cow[] = [];
        
        try {
            lines.forEach((line, idx) => {
                if (!line.trim()) return;
                
                // Format: earTag, name, birthDate, fatherName, motherFatherName, 種付け年月日, 種付け種雄牛, 分娩年月日
                const parts = line.split(',');
                // Skip header if it looks like one (simple check)
                if (idx === 0 && (parts[0].includes('耳標') || parts[0].includes('番号'))) return;

                if (parts.length >= 3) {
                   const lastInsem = parts[5]?.trim() || undefined;
                   const bullName = parts[6]?.trim() || undefined;
                   const lastCalving = parts[7]?.trim() || undefined;
                   
                   // Simple ID gen
                   const uniqueId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
                   const events: BreedingEvent[] = [];
                   if (lastInsem) {
                       events.push({
                           id: Date.now().toString() + Math.random().toString(36).substr(2, 5) + '1',
                           cowId: uniqueId,
                           type: EventType.INSEMINATION,
                           date: lastInsem,
                           details: 'CSVインポート',
                           relatedId: bullName
                       });
                   }
                   if (lastCalving) {
                       events.push({
                           id: Date.now().toString() + Math.random().toString(36).substr(2, 5) + '2',
                           cowId: uniqueId,
                           type: EventType.CALVING,
                           date: lastCalving,
                           details: 'CSVインポート'
                       });
                   }

                   const { status, expectedCalvingDate } = recalculateCowStatus(events);

                   const newCow: Cow = {
                       id: uniqueId,
                       earTag: parts[0].trim(),
                       name: parts[1].trim(),
                       birthDate: parts[2].trim(), // Expect YYYY-MM-DD or similar
                       fatherName: parts[3]?.trim() || '',
                       motherFatherName: parts[4]?.trim() || '',
                       lastInseminationDate: lastInsem,
                       lastCalvingDate: lastCalving,
                       status: status,
                       expectedCalvingDate: expectedCalvingDate,
                       events: events,
                       badges: []
                   };
                   newCows.push(newCow);
                }
            });
            
            if (newCows.length > 0) {
                 if(window.confirm(`${newCows.length}頭の牛を追加しますか？\n（既存のデータに追加されます）`)) {
                     onImportCows([...cows, ...newCows]);
                     setShowImportModal(false);
                     setCsvText('');
                     alert('登録が完了しました！');
                 }
            } else {
                alert('有効なデータが見つかりませんでした。\nフォーマットを確認してください。');
            }
        } catch (e) {
            alert('データの解析に失敗しました。カンマ区切りか確認してください。');
        }
    };

    const handleSaveSettings = () => {
        onSave(localSettings);
        alert('設定を保存しました');
    };

    return (
        <div className="p-4 space-y-6 pb-24">
             <h1 className="text-2xl font-bold text-gray-900">設定</h1>
             
             {/* List Display Settings */}
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                 <h2 className="font-bold text-lg border-b pb-2 flex items-center gap-2">
                     <Palette size={20} className="text-wagyu-600" />
                     母牛一覧の表示設定
                 </h2>
                 <p className="text-xs text-gray-500 mb-2">牛の状態に応じて、一覧リストの背景色を自動で変更します。</p>

                 <div className="space-y-4">
                     <div>
                         <label className="block text-sm font-bold text-cyan-600 mb-1">
                             空胎アラート (水色背景)
                         </label>
                         <div className="flex items-center gap-2">
                             <input 
                                type="number" 
                                value={localSettings.alertEmptyDays}
                                onChange={e => setLocalSettings({...localSettings, alertEmptyDays: Number(e.target.value)})}
                                className="w-20 p-2 border border-gray-300 rounded-lg text-center"
                             />
                             <span className="text-sm">日以上経過で警告</span>
                         </div>
                     </div>

                     <div>
                         <label className="block text-sm font-bold text-purple-600 mb-1">
                             経産牛の分娩間近アラート (紫色背景)
                         </label>
                         <div className="flex items-center gap-2">
                             <input 
                                type="number" 
                                value={localSettings.alertCalvingSoonDays}
                                onChange={e => setLocalSettings({...localSettings, alertCalvingSoonDays: Number(e.target.value)})}
                                className="w-20 p-2 border border-gray-300 rounded-lg text-center"
                             />
                             <span className="text-sm">日以内になったら強調</span>
                         </div>
                     </div>

                     <div>
                         <label className="block text-sm font-bold text-pink-500 mb-1">
                             育成牛(初産) 分娩間近アラート (ピンク色背景)
                         </label>
                         <div className="flex items-center gap-2">
                             <input 
                                type="number" 
                                value={localSettings.alertHeiferCalvingSoonDays}
                                onChange={e => setLocalSettings({...localSettings, alertHeiferCalvingSoonDays: Number(e.target.value)})}
                                className="w-20 p-2 border border-gray-300 rounded-lg text-center"
                             />
                             <span className="text-sm">日以内になったら強調</span>
                         </div>
                         <p className="text-[10px] text-gray-400 mt-1">※初産は事故防止のため早めの準備を推奨</p>
                     </div>
                 </div>
             </div>

             {/* Parameters */}
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                 <h2 className="font-bold text-lg border-b pb-2">目標設定</h2>
                 <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">目標空胎日数 (日)</label>
                     <input 
                        type="number" 
                        value={localSettings.targetEmptyDays} 
                        className="w-full p-3 border border-gray-300 rounded-lg outline-none" 
                        onChange={(e)=>setLocalSettings({...localSettings, targetEmptyDays: Number(e.target.value)})} 
                     />
                 </div>
                 <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">目標分娩間隔 (日)</label>
                     <input 
                        type="number" 
                        value={localSettings.targetCalvingInterval} 
                        className="w-full p-3 border border-gray-300 rounded-lg outline-none" 
                        onChange={(e)=>setLocalSettings({...localSettings, targetCalvingInterval: Number(e.target.value)})} 
                     />
                 </div>
                 <button onClick={handleSaveSettings} className="w-full bg-wagyu-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:bg-wagyu-700">
                    <Save size={20} /> 設定を保存する
                 </button>
             </div>

             {/* Calf Todo Settings */}
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                 <h2 className="font-bold text-lg border-b pb-2 flex items-center gap-2">
                     <ListTodo size={20} className="text-wagyu-600" />
                     子牛のデフォルトToDo設定
                 </h2>
                 <p className="text-xs text-gray-500 mb-2">
                     新しく子牛を登録した際に、自動的に追加されるToDoリストを設定します。
                 </p>
                 <div className="space-y-2">
                     {(localSettings.defaultCalfTodos || []).map((todo, idx) => (
                         <div key={idx} className="flex items-center gap-2">
                             <input
                                 type="text"
                                 value={todo}
                                 onChange={(e) => {
                                     const newTodos = [...(localSettings.defaultCalfTodos || [])];
                                     newTodos[idx] = e.target.value;
                                     setLocalSettings({...localSettings, defaultCalfTodos: newTodos});
                                 }}
                                 className="flex-1 border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-wagyu-300 focus:outline-none transition-colors"
                             />
                             <button
                                 onClick={() => {
                                     const newTodos = (localSettings.defaultCalfTodos || []).filter((_, i) => i !== idx);
                                     setLocalSettings({...localSettings, defaultCalfTodos: newTodos});
                                 }}
                                 className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 rounded-lg"
                             >
                                 <Trash2 size={16} />
                             </button>
                         </div>
                     ))}
                     <button
                         onClick={() => {
                             const newTodos = [...(localSettings.defaultCalfTodos || []), ""];
                             setLocalSettings({...localSettings, defaultCalfTodos: newTodos});
                         }}
                         className="mt-2 text-wagyu-600 font-bold text-sm flex items-center gap-1 hover:underline"
                     >
                         <Plus size={16} /> ToDo項目を追加
                     </button>
                 </div>
                 <button onClick={handleSaveSettings} className="w-full bg-wagyu-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:bg-wagyu-700 mt-4">
                    <Save size={20} /> 設定を保存する
                 </button>
             </div>
             
             {/* Data Sync Section */}
             <div className="bg-white rounded-xl shadow-lg border border-wagyu-200 p-6 space-y-4 relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-wagyu-400 to-wagyu-600"></div>
                 <h2 className="font-bold text-lg border-b pb-2 flex items-center gap-2 text-wagyu-700">
                     <Share2 size={20} />
                     夫婦でデータ共有 (同期)
                 </h2>
                 
                 {isSyncEnabled ? (
                     <div className="bg-green-50 p-6 rounded-xl border border-green-200 text-center">
                         <div className="flex items-center justify-center gap-2 text-green-700 font-bold mb-3 text-lg">
                             <Wifi size={28} className="animate-pulse" /> 接続完了
                         </div>
                         <p className="text-sm text-green-800 mb-6 leading-relaxed">
                             データはクラウド経由でリアルタイムに共有されています。<br/>
                             奥様のスマホでも同じ設定を行ってください。
                         </p>
                         
                         <div className="bg-white p-4 rounded-lg border border-green-100 mb-4 text-left">
                             <div className="text-xs text-gray-400 mb-1">現在の合言葉</div>
                             <div className="text-xl font-bold text-gray-800 tracking-wider">{familyId}</div>
                         </div>

                         <button 
                            onClick={handleDisableSync}
                            className="bg-white border border-gray-300 text-gray-600 px-6 py-2 rounded-full text-sm hover:bg-gray-50 transition-colors"
                         >
                             同期を停止する
                         </button>
                     </div>
                 ) : (
                     <div className="space-y-5">
                         <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800 leading-relaxed">
                             <div className="flex items-start gap-2">
                                <HelpCircle size={18} className="mt-0.5 flex-shrink-0" />
                                <div>
                                    <strong>設定手順:</strong><br/>
                                    1. <strong>合言葉</strong>を決めて入力（例: yamada2024）<br/>
                                    2. Firebaseから取得した<strong>コード</strong>を下に貼り付け<br/>
                                    3. <strong>保存</strong>を押す<br/>
                                    ※ご夫婦で全く同じ内容を入力してください。
                                </div>
                             </div>
                         </div>

                         <div>
                             <label className="block text-sm font-bold text-gray-700 mb-1">
                                 1. 合言葉 (家族ID)
                             </label>
                             <input 
                                type="text"
                                placeholder="例: tanaka-farm"
                                value={familyId}
                                onChange={e => setFamilyId(e.target.value)}
                                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-wagyu-500 focus:outline-none transition-colors"
                             />
                             <p className="text-xs text-gray-400 mt-1 pl-1">※半角英数推奨。他人と被らない名前にしてください。</p>
                         </div>

                         <div>
                             <label className="block text-sm font-bold text-gray-700 mb-1">
                                 2. Firebase設定情報 (コピーしたコード)
                             </label>
                             <textarea 
                                rows={6}
                                placeholder={`const firebaseConfig = {\n  apiKey: "AIzaSy...",\n  ...\n};`}
                                value={syncConfig}
                                onChange={e => setSyncConfig(e.target.value)}
                                className="w-full p-3 border-2 border-gray-200 rounded-xl font-mono text-xs focus:border-wagyu-500 focus:outline-none transition-colors"
                             />
                             <p className="text-xs text-gray-400 mt-1 pl-1">※「const firebaseConfig = ...」の部分も含めて全部貼り付けてOKです。</p>
                         </div>

                         <button 
                            onClick={handleSaveSync}
                            className="w-full bg-wagyu-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:bg-wagyu-700 shadow-md transition-transform active:scale-95"
                         >
                             <RefreshCw size={20} />
                             設定を保存して同期開始
                         </button>

                         <div className="text-center">
                             <button onClick={() => setShowRulesModal(true)} className="text-xs text-red-500 underline flex items-center justify-center gap-1 mx-auto">
                                 <AlertCircle size={12} />
                                 「書き込み拒否」エラーが出る場合はこちら
                             </button>
                         </div>
                     </div>
                 )}
             </div>

             {/* Useful Features / Data Management */}
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                 <h2 className="font-bold text-lg border-b pb-2 flex items-center gap-2">
                     <Database size={20} className="text-wagyu-600" />
                     データ管理・連携
                 </h2>

                 <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
                     <h3 className="font-bold flex items-center gap-2 mb-2">
                         <AlertCircle size={16} /> 推奨される運用方法
                     </h3>
                     <p className="mb-2">
                         データはGoogleスプレッドシート等でマスタ管理することをお勧めします。
                     </p>
                     <ol className="list-decimal pl-4 space-y-1">
                         <li>「CSV書き出し」で現在のデータを保存</li>
                         <li>スプレッドシートで開き、新しい牛を追加・編集</li>
                         <li>該当箇所をコピーして「一括登録」にペースト</li>
                     </ol>
                 </div>
                 
                 <div className="grid grid-cols-1 gap-3">
                     <div className="flex gap-2">
                         <button 
                            onClick={handleExportCowCsv}
                            className="flex-1 border border-green-600 text-green-700 bg-green-50 font-bold py-3 text-sm rounded-xl flex items-center justify-center gap-1 hover:bg-green-100"
                         >
                             <FileText size={18} />
                             母牛CSV
                         </button>
                         <button 
                            onClick={handleExportCalfCsv}
                            className="flex-1 border border-green-600 text-green-700 bg-green-50 font-bold py-3 text-sm rounded-xl flex items-center justify-center gap-1 hover:bg-green-100"
                         >
                             <FileText size={18} />
                             子牛CSV
                         </button>
                     </div>

                     <button 
                        onClick={() => setShowImportModal(true)}
                        className="w-full bg-wagyu-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-wagyu-700 shadow-md"
                     >
                         <Upload size={20} />
                         一括登録 (コピー＆ペースト)
                     </button>
                     
                     <div className="my-2 border-t border-gray-100"></div>

                     <button 
                        onClick={handleExportBackup}
                        className="w-full border border-gray-300 text-gray-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50"
                     >
                         <Download size={20} />
                         システムバックアップ保存 (JSON)
                     </button>
                     
                     <div className="relative">
                        <input 
                            type="file" 
                            accept=".json" 
                            onChange={handleImportBackup}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <button className="w-full border border-gray-300 text-gray-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 pointer-events-none">
                            <Upload size={20} />
                            バックアップ復元
                        </button>
                     </div>
                 </div>
                 
                 <div className="pt-4 border-t border-gray-100">
                    <button 
                        onClick={() => {
                            if(window.confirm('【警告】すべてのデータを削除しますか？')) {
                                if(window.confirm('本当に全て削除しますか？この操作は取り消せません。')) {
                                    onImportCows([]);
                                    alert('データをリセットしました');
                                }
                            }
                        }}
                        className="w-full text-red-500 text-sm py-2 hover:underline"
                    >
                        すべてのデータをリセット (初期化)
                    </button>
                 </div>
             </div>

             {/* CSV Import Modal */}
             {showImportModal && (
                 <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                     <div className="bg-white w-full max-w-lg rounded-xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                         <h3 className="text-xl font-bold mb-4">牛の一括登録</h3>
                         
                         <div className="text-sm text-gray-600 mb-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                             <p className="font-bold mb-2">Googleスプレッドシートから貼り付ける場合:</p>
                             <p className="mb-2">以下の列順でデータをコピーしてください（ヘッダー行は自動で無視されます）。</p>
                             <code className="block bg-white p-2 border border-gray-300 rounded text-xs mb-2 overflow-x-auto whitespace-nowrap">
                                 A列:耳標, B:名号, C:生年月日, D:父, E:母父, F:種付日, G:種雄牛, H:分娩日
                             </code>
                             <p className="text-xs text-gray-500">
                                 ※F列(種付け年月日)、G列(種付け種雄牛)、H列(分娩年月日)は空欄でも構いません。<br/>
                                 ※日付は 2023-01-01 または 2023/1/1 形式。
                             </p>
                         </div>

                         <textarea 
                            className="w-full h-48 border-2 border-wagyu-200 rounded-lg p-3 font-mono text-sm mb-4 focus:ring-2 focus:ring-wagyu-500 outline-none"
                            placeholder={`1234567890,はなこ,2020-01-01,福之姫,安福久,2023-01-01,百合白清,2022-01-01\n9876543210,ゆりこ,2021-05-05,百合白清,平茂勝,,,`}
                            value={csvText}
                            onChange={e => setCsvText(e.target.value)}
                         />
                         
                         <div className="flex flex-col gap-3">
                             <button 
                                onClick={handleImportCsv}
                                className="w-full bg-wagyu-500 text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
                             >
                                 <Save size={24} />
                                 登録を実行する
                             </button>
                             <button 
                                onClick={() => setShowImportModal(false)}
                                className="w-full bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200"
                             >
                                 キャンセル
                             </button>
                         </div>
                     </div>
                 </div>
             )}

             {/* Rules Help Modal */}
             {showRulesModal && (
                 <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
                     <div className="bg-white w-full max-w-lg rounded-xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                             <h3 className="text-lg font-bold flex items-center gap-2 text-red-600">
                                 <Lock size={20} /> 接続トラブルシューティング
                             </h3>
                             <button onClick={() => setShowRulesModal(false)}><X size={24} className="text-gray-400" /></button>
                         </div>

                         <div className="space-y-4 text-sm text-gray-700">
                             <p>
                                 「書き込みが拒否されました」と出る場合、Firebaseのセキュリティ設定（ルール）を変更する必要があります。
                             </p>
                             
                             <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                 <h4 className="font-bold mb-2">手順1. Firebaseコンソールを開く</h4>
                                 <p className="mb-2">Firebaseの管理画面に行き、左メニューの「構築 (Build)」→「Realtime Database」を選択します。</p>
                                 
                                 <h4 className="font-bold mb-2">手順2. 「ルール」タブを開く</h4>
                                 <p className="mb-2">画面上部の「ルール (Rules)」タブをクリックします。</p>
                                 
                                 <h4 className="font-bold mb-2">手順3. ルールを書き換える</h4>
                                 <p className="mb-2">表示されているコードを消して、以下を貼り付け、<strong>「公開」</strong>を押してください。</p>
                                 
                                 <div className="bg-gray-800 text-white p-3 rounded font-mono text-xs overflow-x-auto relative">
                                     <pre>{`{
  "rules": {
    ".read": true,
    ".write": true
  }
}`}</pre>
                                    <div className="absolute top-2 right-2 text-gray-400 text-[10px]">※テスト用設定</div>
                                 </div>
                             </div>

                             <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 text-yellow-800 text-xs">
                                 <strong>注意:</strong> これはテストモードの設定です。誰でも読み書き可能になるため、本格運用の際は適切な認証設定を行うことをお勧めします。
                             </div>

                             <button 
                                onClick={() => setShowRulesModal(false)}
                                className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-xl mt-2"
                             >
                                 閉じる
                             </button>
                         </div>
                     </div>
                 </div>
             )}

             <div className="text-center text-xs text-gray-400 mt-8">
                 WagyuMate v1.3.2
             </div>
        </div>
    )
}
