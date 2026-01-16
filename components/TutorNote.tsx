
import React from 'react';

interface TutorNoteProps {
  note: string;
}

const TutorNote: React.FC<TutorNoteProps> = ({ note }) => {
  if (!note) return null;

  return (
    <div className="mt-4 bg-blue-900/30 border-l-4 border-blue-500 p-4 rounded-r-lg">
      <div className="flex items-center space-x-2 mb-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10.394 2.827a1 1 0 00-.788 0l-7 3a1 1 0 000 1.848l7 3a1 1 0 00.788 0l7-3a1 1 0 000-1.848l-7-3z" />
          <path d="M4.293 10.707a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0l5-5a1 1 0 00-1.414-1.414L10 14.293 4.293 10.707z" />
        </svg>
        <h4 className="text-blue-400 font-bold text-sm uppercase tracking-wider">Tutor Note</h4>
      </div>
      <blockquote className="text-blue-100 text-sm italic italic-block whitespace-pre-wrap leading-relaxed">
        {note}
      </blockquote>
    </div>
  );
};

export default TutorNote;
