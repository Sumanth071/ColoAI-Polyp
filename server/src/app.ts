import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { config } from './config/config';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import roleRoutes from './routes/roleRoutes';
import predictionRoutes from './routes/predictionRoutes';
import modelRoutes from './routes/modelRoutes';
import datasetRoutes from './routes/datasetRoutes';
import reportRoutes from './routes/reportRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import auditLogRoutes from './routes/auditLogRoutes';
import caseRoutes from './routes/caseRoutes';
import imageRoutes from './routes/imageRoutes';
import ttsRoutes from './routes/ttsRoutes';
import notificationRoutes from './routes/notificationRoutes';
import { authenticateJWT } from './middleware/authMiddleware';
import { predictExistingImage } from './controllers/predictionController';

const app = express();

// Security and utility middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({
  origin: (_origin, callback) => {
    // Allow any origin (Vercel, custom domain, localhost, mobile, preview URLs)
    callback(null, true);
  },
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static file serving for uploads and generated reports
const sampleImagesDir = path.resolve(process.cwd(), '../client/public/sample_images');
app.use('/uploads', express.static(config.uploadDir));
app.use('/uploads', express.static(sampleImagesDir));
app.use('/uploads', (req, res, next) => {
  const serverFallback = path.resolve(config.uploadDir, 'colon_001.jpg');
  if (fs.existsSync(serverFallback)) {
    return res.sendFile(serverFallback);
  }
  const clientFallback = path.resolve(sampleImagesDir, 'colon_001.jpg');
  if (fs.existsSync(clientFallback)) {
    return res.sendFile(clientFallback);
  }
  next();
});
app.use('/reports', express.static(config.reportsDir));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'ColoAI-Polyp Express API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: config.env,
  });
});

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/datasets', datasetRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/tts', ttsRoutes);
app.use('/api/notifications', notificationRoutes);
app.post('/api/predict', authenticateJWT, predictExistingImage);

// Global Error Handler
app.use(errorHandler);

export default app;
