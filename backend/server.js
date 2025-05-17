import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

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

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.post('/generate', async (req, res) => {
  const prompt = req.body.prompt || "Hi";
  const userId = req.body.userId || "anonymous";

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

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
      } catch (dbError) {
        console.error('Database error:', dbError);
      }
    }

    res.json({ text: responseText });
  } catch (error) {
    console.error('Error generating content:', error);
    res.status(500).json({ error: 'Failed to generate content' });
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
