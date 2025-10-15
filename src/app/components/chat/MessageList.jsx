import React, { useEffect, useRef, useState } from 'react';
import { User, Clock, Edit2, Trash2, Check, X } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import BudgetMessage from './BudgetMessage';

const MessageBubble = ({ message, isCurrentUser, showSender = true, onEdit, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(message.body);
  const [showActions, setShowActions] = useState(false);
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { timeZone: 'UTC' });
  };

  const handleSaveEdit = () => {
    if (editedText.trim() && editedText !== message.body) {
      onEdit(message.id, editedText.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedText(message.body);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this message?')) {
      onDelete(message.id);
    }
  };

  return (
    <div
      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`flex max-w-xs lg:max-w-md ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 ${isCurrentUser ? 'ml-2' : 'mr-2'}`}>
          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
            isCurrentUser ? 'bg-blue-500' : 'bg-gray-400'
          }`}>
            <User className="h-4 w-4 text-white" />
          </div>
        </div>

        {/* Message Content */}
        <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'} relative`}>
          {/* Sender name (for group chats) */}
          {showSender && !isCurrentUser && (
            <div className="text-xs text-gray-600 mb-1 px-1">
              {message.sender_name}
            </div>
          )}

          {/* Message bubble */}
          {isEditing ? (
            <div className="flex flex-col gap-2 w-full">
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="px-4 py-2 rounded-2xl border border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 resize-none"
                rows={3}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleCancelEdit}
                  className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                  title="Cancel"
                >
                  <X className="h-4 w-4 text-gray-600" />
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="p-1 hover:bg-green-100 rounded-full transition-colors"
                  title="Save"
                >
                  <Check className="h-4 w-4 text-green-600" />
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className={`px-4 py-2 rounded-2xl break-words ${
                isCurrentUser
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{message.body}</p>
              </div>

              {/* Action buttons (edit/delete) - only show for current user's messages */}
              {isCurrentUser && showActions && !isEditing && (
                <div className="flex gap-1 mt-1 px-1">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                    title="Edit message"
                  >
                    <Edit2 className="h-3 w-3 text-gray-600" />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="p-1 hover:bg-red-100 rounded-full transition-colors"
                    title="Delete message"
                  >
                    <Trash2 className="h-3 w-3 text-red-600" />
                  </button>
                </div>
              )}
            </>
          )}

          {/* Timestamp */}
          {!isEditing && (
            <div className="flex items-center mt-1 px-1">
              <Clock className="h-3 w-3 text-gray-400 mr-1" />
              <span className="text-xs text-gray-500">
                {formatTime(message.created_at)}
              </span>
              {message.edited_at && (
                <span className="text-xs text-gray-400 ml-1">(edited)</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MessageList = ({
  messages = [],
  loading = false,
  error = null,
  conversationType = 'direct',
  onLoadMore = null,
  hasMore = false,
  onEditMessage = null,
  onDeleteMessage = null,
  onSaveBudget = null,
  onEditBudget = null
}) => {
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && messages.length > 0) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Determine if we should show sender names (group chats)
  const showSenderNames = conversationType === 'group';

  if (loading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <span className="text-gray-600">Loading messages...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-red-500 mb-2">Failed to load messages</div>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center text-gray-500">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 mx-auto">
            <User className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
          <p className="text-sm">Send the first message to start the conversation!</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto p-4 bg-gray-50"
      style={{ maxHeight: 'calc(100% - 120px)' }}
    >
      {/* Load More Button */}
      {hasMore && onLoadMore && (
        <div className="text-center mb-4">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
          >
            {loading ? 'Loading...' : 'Load older messages'}
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="space-y-1">
        {messages.map((message, index) => {
          const isCurrentUser = message.sender_id === user?.uid;
          const prevMessage = index > 0 ? messages[index - 1] : null;
          const shouldShowSender = showSenderNames && (
            !prevMessage ||
            prevMessage.sender_id !== message.sender_id ||
            (new Date(message.created_at) - new Date(prevMessage.created_at)) > 300000 // 5 minutes
          );

          // Render budget message if message type is 'budget'
          if (message.message_type === 'budget') {
            return (
              <BudgetMessage
                key={message.id}
                message={message}
                isCurrentUser={isCurrentUser}
                onSaveBudget={onSaveBudget}
                onEditBudget={onEditBudget}
              />
            );
          }

          // Render regular text message
          return (
            <MessageBubble
              key={message.id}
              message={message}
              isCurrentUser={isCurrentUser}
              showSender={shouldShowSender}
              onEdit={onEditMessage}
              onDelete={onDeleteMessage}
            />
          );
        })}
      </div>

      {/* Loading indicator for new messages */}
      {loading && messages.length > 0 && (
        <div className="flex justify-center py-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;