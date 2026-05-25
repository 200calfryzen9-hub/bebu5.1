import React, { useState, useRef, useEffect } from 'react';
import { Note } from '../types';
import { Send, Trash2, CheckCircle2, Circle, ListTodo } from 'lucide-react';
import { formatDateJP } from '../utils/breedingService';

interface MemoLineProps {
    notes: Note[];
    onAddNote: (note: Omit<Note, 'id'>) => void;
    onDeleteNote: (noteId: string) => void;
    onUpdateNote?: (note: Note) => void; // Added for marking todo as done
    hideNotesList?: boolean;
}

export const MemoLine: React.FC<MemoLineProps> = ({ notes = [], onAddNote, onDeleteNote, onUpdateNote, hideNotesList = false }) => {
    const [inputText, setInputText] = useState('');
    const [isTodoMode, setIsTodoMode] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleSend = () => {
        if (!inputText.trim()) return;
        
        const now = new Date();
        onAddNote({
            date: now.toISOString(),
            text: inputText.trim(),
            isTodo: isTodoMode,
            isDone: false
        });
        setInputText('');
    };

    // Auto scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [notes]);

    // Group notes by date
    const groupedNotes = [...notes]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .reduce((acc, note) => {
        // extract YYYY-MM-DD
        const dateKey = note.date.split('T')[0];
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(note);
        return acc;
    }, {} as Record<string, Note[]>);

    return (
        <div className={`flex flex-col bg-white ${!hideNotesList ? 'h-[60vh] border border-gray-200 rounded-xl overflow-hidden shadow-sm' : ''}`}>
            {/* List Area */}
            {!hideNotesList && (
                <div className="flex-1 p-4 overflow-y-auto bg-white" ref={scrollRef}>
                    {Object.keys(groupedNotes).length === 0 ? (
                        <div className="text-center text-gray-400 text-sm mt-10">
                            メモがありません。<br/>下から入力してください。
                        </div>
                    ) : (
                        Object.entries(groupedNotes).map(([date, dayNotes]) => (
                            <div key={date} className="flex flex-col mb-4">
                                <div className="flex justify-start mb-2 mt-1 border-b pb-1">
                                    <span className="text-gray-500 font-bold text-xs">
                                        {formatDateJP(date)}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    {dayNotes.map((note) => {
                                        const noteDate = new Date(note.date);
                                        const timeString = isNaN(noteDate.getTime()) ? '' : noteDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
                                        
                                        return (
                                            <div key={note.id} className="flex flex-col group items-start border-b border-gray-50 last:border-0 py-1">
                                                <div className="flex items-center gap-2 w-full">
                                                    {note.isTodo && onUpdateNote && (
                                                        <button 
                                                            onClick={() => onUpdateNote({ ...note, isDone: !note.isDone })}
                                                            className="mt-1 flex-shrink-0"
                                                        >
                                                            {note.isDone ? (
                                                                <CheckCircle2 size={18} className="text-green-500" />
                                                            ) : (
                                                                <Circle size={18} className="text-gray-300 hover:text-gray-400" />
                                                            )}
                                                        </button>
                                                    )}
                                                    <div className={`flex-1 py-1 px-2 rounded break-words text-sm relative ${note.isTodo ? (note.isDone ? 'text-gray-400 line-through' : 'font-medium text-gray-900') : 'text-gray-800'}`}>
                                                        <div className="whitespace-pre-wrap">{note.text}</div>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                         <span className="text-[10px] text-gray-400 shrink-0 select-none block">{timeString}</span>
                                                         <button 
                                                            onClick={() => window.confirm('削除しますか？') && onDeleteNote(note.id)}
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500 p-1 block"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Input Area */}
            <div className={`bg-white p-3 flex items-end gap-2 ${!hideNotesList ? 'border-t border-gray-200' : ''}`}>
                <button 
                    onClick={() => setIsTodoMode(!isTodoMode)}
                    className={`p-2.5 rounded-full flex-shrink-0 transition-colors ${isTodoMode ? 'bg-red-100 text-red-600 shadow-inner' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                    title="ToDoとして記録"
                >
                    <ListTodo size={20} />
                </button>
                <textarea 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={isTodoMode ? "ToDoを入力..." : "メモを入力..."}
                    className={`flex-1 max-h-24 min-h-[40px] rounded-xl border ${isTodoMode ? 'border-red-300 bg-red-50 placeholder-red-300' : 'border-gray-300 bg-gray-50 placeholder-gray-400'} px-4 py-2.5 outline-none resize-none text-sm focus:ring-2 focus:ring-wagyu-300 transition-colors`}
                    rows={1}
                />
                <button 
                    onClick={handleSend}
                    disabled={!inputText.trim()}
                    className="bg-wagyu-600 text-white p-2.5 rounded-full flex-shrink-0 disabled:opacity-50 disabled:bg-gray-400 transition-colors shadow-sm"
                >
                    <Send size={18} className="translate-x-[1px]" />
                </button>
            </div>
        </div>
    );
};
