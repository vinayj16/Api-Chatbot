import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();
console.log('Environment loaded');
console.log('API Key available:', !!process.env.GEMINI_API_KEY);
console.log('MongoDB URI available:', !!process.env.MONGODB_URI);

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const chatSchema = new mongoose.Schema({
  userId: String,
  messages: [{
    text: String,
    isUser: Boolean,
    timestamp: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

const Chat = mongoose.model('Chat', chatSchema);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
console.log('Gemini API client initialized');

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.post('/generate', async (req, res) => {
  const prompt = req.body.prompt || "Hi";
  const userId = req.body.userId || "anonymous";
  
  console.log(`Received prompt: "${prompt}" from user: ${userId}`);
  
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error('API key not configured');
      return res.status(500).json({ 
        error: 'API key not configured', 
        details: 'GEMINI_API_KEY is missing in environment variables' 
      });
    }
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log('Gemini API client initialized');
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log('Model initialized');
    
    console.log('Sending request to Gemini API...');
    const result = await model.generateContent(prompt);
    console.log('Received response from Gemini API');
    
    const responseText = result.response.text();
    console.log('Response text length:', responseText.length);
    
    if (mongoose.connection.readyState === 1) {
      try {
        await Chat.updateOne(
          { userId },
          { 
            $push: { 
              messages: [
                { text: prompt, isUser: true },
                { text: responseText, isUser: false }
              ] 
            }
          },
          { upsert: true }
        );
        console.log('Chat history updated in database');
      } catch (dbError) {
        console.error('Database error:', dbError);
      }
    }
    
    console.log('Sending response to client');
    res.json({ text: responseText });
  } catch (error) {
    console.error('Error generating content:', error);
    
    if (error.response) {
      try {
        console.error('Response data:', await error.response.text());
      } catch (e) {
        console.error('Could not read response data');
      }
    }
    
    res.status(500).json({ 
      error: 'Failed to generate content', 
      details: error.message || 'Unknown error occurred'
    });
  }
});

app.get('/history/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const chat = await Chat.findOne({ userId });
    res.json(chat ? chat.messages : []);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

app.delete('/history/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    await Chat.updateOne({ userId }, { $set: { messages: [] } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing chat history:', error);
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
});

app.get('/test-api', async (req, res) => {
  try {
    console.log('Testing API connection...');
    
    if (!process.env.GEMINI_API_KEY) {
      console.error('API key not configured');
      return res.status(500).json({ 
        status: 'error', 
        message: 'API key not configured' 
      });
    }
    
    console.log('API Key available, length:', process.env.GEMINI_API_KEY.length);
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log('Model initialized');
    
    const testPrompt = {
      contents: [{ parts: [{ text: "Hello, can you respond with just the word 'OK' to test the connection?" }] }]
    };
    
    console.log('Sending test request to Gemini API...');
    const result = await model.generateContent(testPrompt);
    console.log('Received test response from Gemini API');
    
    const responseText = result.response.text();
    console.log('Test response text:', responseText);
    
    res.json({ 
      status: 'success', 
      message: 'API connection successful', 
      response: responseText,
      apiKeyLength: process.env.GEMINI_API_KEY.length,
      apiKeyFirstFive: process.env.GEMINI_API_KEY.substring(0, 5) + '...'
    });
  } catch (error) {
    console.error('API test error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'API connection failed', 
      error: error.message,
      stack: error.stack
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
