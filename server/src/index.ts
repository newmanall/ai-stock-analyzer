import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { analysisRouter } from './routes/analysis.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS配置
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 解析JSON
app.use(express.json());

// 健康检查
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API路由
app.use('/api', analysisRouter);

// 404处理
app.use((_req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'NOT_FOUND',
    message: '接口不存在' 
  });
});

// 全局错误处理
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
