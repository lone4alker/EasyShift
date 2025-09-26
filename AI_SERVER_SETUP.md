# EasyShift AI Services - Unified Server

## 🚀 Quick Start

### Option 1: Using the startup script (Recommended)
```bash
python python/start_server.py
```

### Option 2: Using the batch file (Windows)
```bash
start_ai_server.bat
```

### Option 3: Direct execution
```bash
cd python
python main.py
```

## 📡 API Endpoints

The unified server provides all AI services on **port 5000**:

- **`/api/recommendations`** - Generate comprehensive business recommendations
- **`/api/insights`** - Generate detailed weekly insights
- **`/api/insights/quick`** - Quick dashboard alerts and insights
- **`/api/health`** - Server health check

## 🔧 Environment Variables

Make sure you have these environment variables set:

```bash
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
GEMINI_API_KEY=your_gemini_api_key
```

## 🌐 Frontend Configuration

The frontend automatically uses the unified server. No additional configuration needed!

## 🛑 Stopping the Server

Press `Ctrl+C` in the terminal where the server is running.

## 🔍 Troubleshooting

1. **Port 5000 already in use**: Change the port in `main.py` or `start_server.py`
2. **Import errors**: Make sure you're in the project root directory
3. **Environment variables**: Check that all required API keys are set

## 📊 Server Status

Visit `http://127.0.0.1:5000/api/health` to check if the server is running properly.
