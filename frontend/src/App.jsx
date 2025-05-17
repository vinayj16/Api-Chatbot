import { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState('light');
  const chatBoxRef = useRef(null);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  const handleInputChange = (e) => {
    setPrompt(e.target.value);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const handleSend = async () => {
    if (!prompt.trim()) return;
    
    const userMessage = { text: prompt, isUser: true };
    setMessages([...messages, userMessage]);
    setIsLoading(true);
    setPrompt('');
    
    try {
      const response = await fetch('http://localhost:3000/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });
      
      const data = await response.json();
      
      setMessages(prev => [...prev, { text: data.text, isUser: false }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        text: 'Sorry, I encountered an error. Please try again.', 
        isUser: false 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className={`app-container ${theme}`}>
      <header className="app-header">
        <h1>AI Assistant</h1>
        <div className="header-controls">
          <button onClick={toggleTheme} className="theme-btn">
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
                  <button onClick={() => setPrompt("What can you help me with?")}>
                    What can you help me with?
                  </button>
                  <button onClick={() => setPrompt("Tell me a fun fact")}>
                    Tell me a fun fact
                  </button>
                  <button onClick={() => setPrompt("Write a short poem")}>
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
                      <pre className="code-block">{message.text}</pre>
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
          </div>
          <div className="input-area">
            <input
              type="text"
              value={prompt}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type your message and press Enter..."
              className="input-box"
              disabled={isLoading}
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