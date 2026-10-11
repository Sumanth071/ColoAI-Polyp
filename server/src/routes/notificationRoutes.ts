import { Router } from 'express';
import {
  getNotifications,
  streamNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  createTestNotification,
} from '../controllers/notificationController';
import { authenticateJWT } from '../middleware/authMiddleware';

const router = Router();

// Live SSE Stream (Supports Authorization header or ?token= query parameter)
router.get('/stream', authenticateJWT, streamNotifications);

// Standard REST endpoints
router.get('/', authenticateJWT, getNotifications);
router.patch('/read-all', authenticateJWT, markAllAsRead);
router.patch('/:id/read', authenticateJWT, markAsRead);
router.delete('/clear-all', authenticateJWT, clearAllNotifications);
router.delete('/:id', authenticateJWT, deleteNotification);
router.post('/test', authenticateJWT, createTestNotification);

export default router;
