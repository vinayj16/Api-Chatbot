import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

async function testGeminiAPI() {
  console.log('Starting Gemini API test...');
  
  if (!process.env.GEMINI_API_KEY) {
    console.error('Error: GEMINI_API_KEY is not set in environment variables');
    return;
  }
  
  console.log('API Key found, length:', process.env.GEMINI_API_KEY.length);
  console.log('First 5 characters of API key:', process.env.GEMINI_API_KEY.substring(0, 5) + '...');
  
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log('Initialized GoogleGenerativeAI instance');
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log('Got generative model: gemini-1.5-flash');
    
    const prompt = "Hello, please respond with a short greeting.";
    console.log('Sending prompt to API:', prompt);
    
    const result = await model.generateContent(prompt);
    console.log('Received response from API');
    
    const text = result.response.text();
    console.log('Response text:', text);
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Error during API test:');
    console.error(error);
    
    if (error.response) {
      try {
        console.error('Response data:', await error.response.text());
      } catch (e) {
        console.error('Could not read response data');
      }
    }
  }
}

testGeminiAPI();