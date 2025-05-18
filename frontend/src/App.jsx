import { useState, useEffect, useRef } from 'react';
import './App.css';

const API_BASE_URL = 'https://api-chatbot-hg8g.onrender.com';

function App() {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState('light');
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState('');
  const chatBoxRef = useRef(null);
  const inputRef = useRef(null);

  // Generate or retrieve userId on component mount
  useEffect(() => {
    let id = localStorage.getItem('userId');
    if (!id) {
      id = 'user_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('userId', id);
    }
    setUserId(id);
    
    // Load theme from localStorage if available
    const savedTheme = localStorage.getItem('chatTheme');
    if (savedTheme) {
      setTheme(savedTheme);
    }
    
    // Focus input on load
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Load chat history when userId is available
  useEffect(() => {
    if (userId) {
      fetchChatHistory();
    }
  }, [userId]);

  // Save theme to localStorage
  useEffect(() => {
    localStorage.setItem('chatTheme', theme);
  }, [theme]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchChatHistory = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/history/${userId}`);
      if (response.ok) {
        const history = await response.json();
        setMessages(history);
      } else {
        console.error('Failed to fetch chat history');
      }
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setPrompt(e.target.value);
    setError(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    if (!prompt.trim()) return;

    const userMessage = { text: prompt, isUser: true };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setPrompt('');
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt,
          userId
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server error');
      }
      
      const data = await response.json();

      setMessages(prev => [...prev, { text: data.text, isUser: false }]);
    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
      setMessages(prev => [...prev, { 
        text: `Sorry, I encountered an error: ${error.message}. Please try again.`, 
        isUser: false 
      }]);
    } finally {
      setIsLoading(false);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const clearChat = async () => {
    try {
      await fetch(`${API_BASE_URL}/history/${userId}`, {
        method: 'DELETE'
      });
      setMessages([]);
    } catch (err) {
      console.error('Failed to clear history on server:', err);
      setError('Failed to clear chat history');
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setPrompt(suggestion);
    // Auto-send after a short delay
    setTimeout(() => {
      handleSend();
    }, 100);
  };

  return (
    <div className={`app-container ${theme}`}>
      <header className="app-header">
        <h1>AI Assistant</h1>
        <div className="header-controls">
          <button onClick={toggleTheme} className="theme-btn" aria-label="Toggle theme">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button onClick={clearChat} className="clear-btn">
            Clear Chat
          </button>
        </div>
      </header>

      <div className="main-content">
        <div className="chat-container">
          <div className="chat-box" ref={chatBoxRef}>
            {messages.length === 0 ? (
              <div className="welcome-message">
                <h2>Welcome to AI Assistant!</h2>
                <p>Ask me anything to get started.</p>
                <div className="suggestion-chips">
                  <button onClick={() => handleSuggestionClick("What can you help me with?")}>
                    What can you help me with?
                  </button>
                  <button onClick={() => handleSuggestionClick("Tell me a fun fact")}>
                    Tell me a fun fact
                  </button>
                  <button onClick={() => handleSuggestionClick("Write a short poem")}>
                    Write a short poem
                  </button>
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`message ${message.isUser ? 'user-message' : 'bot-message'}`}
                >
                  <div className="message-avatar">
                    {message.isUser ? '👤' : '🤖'}
                  </div>
                  <div className="message-content">
                    {message.isUser ? (
                      message.text
                    ) : (
                      <div className="bot-response">
                        {message.text.split('```').map((part, i) => {
                          if (i % 2 === 0) {
                            return <span key={i}>{part}</span>;
                          } else {
                            return <pre key={i} className="code-block">{part}</pre>;
                          }
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="message bot-message">
                <div className="message-avatar">🤖</div>
                <div className="message-content loading">
                  <span>.</span><span>.</span><span>.</span>
                </div>
              </div>
            )}
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
          </div>
          <div className="input-area">
            <input
              type="text"
              value={prompt}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type your message and press Enter..."
              className="input-box"
              disabled={isLoading}
              ref={inputRef}
            />
            <button
              onClick={handleSend}
              className="send-btn"
              disabled={isLoading || !prompt.trim()}
            >
              {isLoading ? '...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
