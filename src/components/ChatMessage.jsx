import React from 'react';

export const ChatMessage = ({ message, isUser }) => {
  const LoadingSpinner = () => (
    <div className="flex items-center space-x-2">
      <div className="animate-spin w-4 h-4 text-blue-400">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
      </div>
      <span className="text-slate-400 text-sm">Thinking...</span>
    </div>
  );

  const TypingIndicator = () => (
    <div className="flex items-center space-x-1">
      <span className="text-slate-400 text-sm">StackBot is typing</span>
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      </div>
    </div>
  );

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {/* Avatar for bot messages */}
      {!isUser && (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mr-3 flex-shrink-0 shadow-lg shadow-blue-500/25 border border-blue-400/20">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
      )}

      <div
        className={`max-w-[80%] rounded-2xl p-4 ${
          isUser 
            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25 border border-blue-400/20' 
            : 'bg-slate-800/80 backdrop-blur-sm text-slate-100 shadow-lg border border-slate-700/50'
        } transition-all duration-200 hover:shadow-xl relative`}
      >
        {/* Message content */}
        <div className={`text-sm leading-relaxed ${isUser ? 'text-white' : 'text-slate-100'}`}>
          {message.isProcessing ? <TypingIndicator /> : (message.text || <LoadingSpinner />)}
        </div>
        
        {/* Subtle message tail */}
        <div className={`absolute top-4 ${
          isUser 
            ? '-right-1 border-l-8 border-l-blue-500 border-t-4 border-b-4 border-t-transparent border-b-transparent' 
            : '-left-1 border-r-8 border-r-slate-800 border-t-4 border-b-4 border-t-transparent border-b-transparent'
        }`}></div>
      </div>

      {/* Avatar for user messages */}
      {isUser && (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center ml-3 flex-shrink-0 shadow-lg border border-slate-500/30">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </div>
      )}
    </div>
  );
};
