
import React from 'react';

interface TutorNoteProps {
  note: string;
}

const TutorNote: React.FC<TutorNoteProps> = ({ note }) => {
  if (!note) return null;

  return (
    <div className="mt-8 bg-indigo-950/40 border-l-4 border-indigo-400 p-6 rounded-2xl shadow-lg backdrop-blur-md animate-fade-in group hover:bg-indigo-900/40 transition-colors border border-white/5">
      <div className="flex items-center space-x-4 mb-3">
        <div className="bg-indigo-500/20 p-2 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M12 14l9-5-9-5-9 5 9 5z" />
            <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
          </svg>
        </div>
        <h4 className="text-indigo-300 font-black text-[10px] uppercase tracking-[0.3em] group-hover:text-indigo-200 transition-colors">Linguistic Feedback</h4>
      </div>
      <blockquote className="text-gray-200 text-base md:text-lg italic font-medium leading-relaxed border-l-2 border-white/10 pl-5 py-1 whitespace-pre-wrap">
        {note}
      </blockquote>
      <div className="mt-4 flex items-center justify-end">
        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-500 opacity-40">Polyglot City Tutoring Core</span>
      </div>
    </div>
  );
};

export default TutorNote;
