import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FaPaperPlane, FaPlus, FaSearch, FaEllipsisV, FaPhone, FaVideo } from 'react-icons/fa';
import './Messages.css';

const Messages = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [newConversationData, setNewConversationData] = useState({
    title: '',
    type: 'private',
    participant_ids: []
  });
  const [users, setUsers] = useState([]);
  const messagesEndRef = useRef(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (token) {
      fetchConversations();
      fetchUsers();
    }
  }, [token]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/messages/conversations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(response.data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/auth/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const response = await axios.get(`/api/messages/conversations/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const response = await axios.post(
        `/api/messages/conversations/${selectedConversation.id}/messages`,
        { content: newMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMessages(prev => [...prev, response.data]);
      setNewMessage('');
      
      // Update conversation list with new message
      setConversations(prev => 
        prev.map(conv => 
          conv.id === selectedConversation.id 
            ? { ...conv, updated_at: new Date().toISOString() }
            : conv
        )
      );
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const createConversation = async () => {
    if (!newConversationData.title || newConversationData.participant_ids.length === 0) return;

    try {
      const response = await axios.post(
        '/api/messages/conversations',
        newConversationData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setShowNewConversation(false);
      setNewConversationData({ title: '', type: 'private', participant_ids: [] });
      fetchConversations();
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="messages-container">
      {/* Sidebar */}
      <div className="messages-sidebar">
        <div className="sidebar-header">
          <h2>Messages</h2>
          <button 
            className="new-conversation-btn"
            onClick={() => setShowNewConversation(true)}
          >
            <FaPlus />
          </button>
        </div>

        <div className="search-container">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="conversations-list">
          {loading ? (
            <div className="loading">Loading conversations...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="no-conversations">No conversations found</div>
          ) : (
            filteredConversations.map(conversation => (
              <div
                key={conversation.id}
                className={`conversation-item ${selectedConversation?.id === conversation.id ? 'active' : ''}`}
                onClick={() => setSelectedConversation(conversation)}
              >
                <div className="conversation-info">
                  <h4>{conversation.title}</h4>
                  <p className="last-message">
                    {conversation.last_message || 'No messages yet'}
                  </p>
                  <span className="conversation-time">
                    {conversation.last_message_time ? formatDate(conversation.last_message_time) : ''}
                  </span>
                </div>
                {conversation.unread_count > 0 && (
                  <div className="unread-badge">{conversation.unread_count}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="chat-area">
        {selectedConversation ? (
          <>
            <div className="chat-header">
              <div className="chat-header-info">
                <h3>{selectedConversation.title}</h3>
                <span className="conversation-type">{selectedConversation.type}</span>
              </div>
              <div className="chat-header-actions">
                <button className="action-btn">
                  <FaPhone />
                </button>
                <button className="action-btn">
                  <FaVideo />
                </button>
                <button className="action-btn">
                  <FaEllipsisV />
                </button>
              </div>
            </div>

            <div className="messages-list">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`message ${message.sender_id === JSON.parse(localStorage.getItem('user'))?.id ? 'sent' : 'received'}`}
                >
                  <div className="message-content">
                    <p>{message.content}</p>
                    <span className="message-time">{formatTime(message.created_at)}</span>
                  </div>
                  <div className="message-sender">
                    {message.sender_name} ({message.sender_role})
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="message-input-container">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="message-input"
                rows="3"
              />
              <button 
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="send-btn"
              >
                <FaPaperPlane />
              </button>
            </div>
          </>
        ) : (
          <div className="no-conversation-selected">
            <div className="no-conversation-content">
              <h3>Select a conversation</h3>
              <p>Choose a conversation from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* New Conversation Modal */}
      {showNewConversation && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>New Conversation</h3>
              <button 
                onClick={() => setShowNewConversation(false)}
                className="close-btn"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={newConversationData.title}
                  onChange={(e) => setNewConversationData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Conversation title"
                />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select
                  value={newConversationData.type}
                  onChange={(e) => setNewConversationData(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option value="private">Private</option>
                  <option value="group">Group</option>
                </select>
              </div>
              <div className="form-group">
                <label>Participants</label>
                <select
                  multiple
                  value={newConversationData.participant_ids}
                  onChange={(e) => {
                    const selectedOptions = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                    setNewConversationData(prev => ({ ...prev, participant_ids: selectedOptions }));
                  }}
                >
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                onClick={() => setShowNewConversation(false)}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button 
                onClick={createConversation}
                disabled={!newConversationData.title || newConversationData.participant_ids.length === 0}
                className="create-btn"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
