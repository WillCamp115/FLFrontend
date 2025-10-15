import React, { useState, useRef } from 'react';
import { Send, Smile, Plus } from 'lucide-react';
import BudgetSelector from './BudgetSelector';

const MessageInput = ({ onSendMessage, onSendBudget, disabled = false, placeholder = "Type a message..." }) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showBudgetSelector, setShowBudgetSelector] = useState(false);
  const textareaRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim() || sending || disabled) {
      return;
    }

    try {
      setSending(true);
      await onSendMessage(message.trim());
      setMessage('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Message stays in input on error so user can retry
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleTextareaChange = (e) => {
    setMessage(e.target.value);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleBudgetSelect = async (budget) => {
    if (onSendBudget) {
      try {
        setSending(true);
        await onSendBudget(budget);
      } catch (error) {
        console.error('Error sending budget:', error);
      } finally {
        setSending(false);
      }
    }
  };

  return (
    <div className="border-t border-gray-200 p-4 bg-white">
      <form onSubmit={handleSubmit} className="flex items-end space-x-2">
        <button
          type="button"
          onClick={() => setShowBudgetSelector(true)}
          disabled={disabled || sending}
          className="flex items-center justify-center w-10 h-10 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Share a budget"
        >
          <Plus className="h-5 w-5" />
        </button>
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyPress={handleKeyPress}
            placeholder={disabled ? "Select a conversation to start messaging" : placeholder}
            disabled={disabled || sending}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none overflow-hidden min-h-[40px] max-h-[120px] disabled:bg-gray-50 disabled:text-gray-500"
            rows={1}
            style={{ height: 'auto' }}
          />
        </div>
        
        <button
          type="submit"
          disabled={!message.trim() || sending || disabled}
          className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {sending ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>
      
      {!disabled && (
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span className={`transition-opacity ${message.length > 0 ? 'opacity-100' : 'opacity-0'}`}>
            {message.length} characters
          </span>
        </div>
      )}

      <BudgetSelector
        isOpen={showBudgetSelector}
        onClose={() => setShowBudgetSelector(false)}
        onSelectBudget={handleBudgetSelect}
      />
    </div>
  );
};

export default MessageInput;