import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Types } from 'mongoose';
import { Notification } from '../models/Notification';
import { notificationService } from '../services/notificationService';
import { AuthRequest } from '../middleware/authMiddleware';

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    const userId = user?._id;
    const userRole = user?.role?.name || 'Researcher';

    const filter: any = {
      $or: [
        { userId: userId },
        { targetRole: 'All' },
        { targetRole: userRole },
      ],
    };

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);

    // Determine read status for current user
    const processedNotifications = notifications.map((n) => {
      const isReadByMe =
        n.read ||
        (userId && n.readBy?.some((r) => r.userId?.toString() === userId.toString()));

      return {
        ...n.toJSON(),
        read: Boolean(isReadByMe),
      };
    });

    const unreadCount = processedNotifications.filter((n) => !n.read).length;

    res.json({
      success: true,
      count: processedNotifications.length,
      unreadCount,
      notifications: processedNotifications,
    });
  } catch (error: any) {
    console.error('[NotificationController] Error in getNotifications:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const streamNotifications = (req: AuthRequest, res: Response): void => {
  try {
    const user = req.user;
    const clientId = uuidv4();
    const userId = user?._id?.toString();
    const userRole = user?.role?.name;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // Send connection established event
    notificationService.addClient(clientId, res, userId, userRole);

    req.on('close', () => {
      notificationService.removeClient(clientId);
    });
  } catch (error: any) {
    console.error('[NotificationController] Stream error:', error);
    res.status(500).end();
  }
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    const notification = await Notification.findById(id);
    if (!notification) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }

    notification.read = true;
    if (userId && !notification.readBy?.some((r) => r.userId?.toString() === userId.toString())) {
      notification.readBy.push({ userId, readAt: new Date() });
    }

    await notification.save();

    res.json({
      success: true,
      message: 'Notification marked as read',
      notification,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    const userId = user?._id;
    const userRole = user?.role?.name || 'Researcher';

    const filter = {
      $or: [
        { userId: userId },
        { targetRole: 'All' },
        { targetRole: userRole },
      ],
    };

    const notifications = await Notification.find(filter);

    for (const notif of notifications) {
      notif.read = true;
      if (userId && !notif.readBy?.some((r) => r.userId?.toString() === userId.toString())) {
        notif.readBy.push({ userId, readAt: new Date() });
      }
      await notif.save();
    }

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await Notification.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Notification removed successfully',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const clearAllNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    const userId = user?._id;
    const userRole = user?.role?.name || 'Researcher';

    await Notification.deleteMany({
      $or: [
        { userId: userId },
        { targetRole: 'All' },
        { targetRole: userRole },
      ],
    });

    res.json({
      success: true,
      message: 'All notifications cleared',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createTestNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const samples = [
      {
        title: 'Live Inference Complete: CP-2026-' + Math.floor(1000 + Math.random() * 9000),
        message: `Deep learning classified polyp with 97.2% confidence (Hyperplastic Polyp) at ${timeStr}.`,
        type: 'ANALYSIS' as const,
        severity: 'info' as const,
        link: '/history',
      },
      {
        title: 'Clinical Review Requested',
        message: `High risk adenoma detected in Sigmoid Colon. Immediate specialist verification needed (${timeStr}).`,
        type: 'REVIEW' as const,
        severity: 'warning' as const,
        link: '/reviews',
      },
      {
        title: 'New Patient Case Registered',
        message: `Case CASE-2026-${Math.floor(1000 + Math.random() * 9000)} registered by ${user?.name || 'Staff'} at ${timeStr}.`,
        type: 'CASE' as const,
        severity: 'success' as const,
        link: '/cases',
      },
      {
        title: 'SHAP Diagnostic Report Generated',
        message: `Medical PDF documentation finalized and signed at ${timeStr}. Ready for export.`,
        type: 'REPORT' as const,
        severity: 'success' as const,
        link: '/reports',
      },
    ];

    const randomSample = samples[Math.floor(Math.random() * samples.length)];

    const notification = await notificationService.createAndBroadcast({
      title: randomSample.title,
      message: randomSample.message,
      type: randomSample.type,
      severity: randomSample.severity,
      link: randomSample.link,
      targetRole: 'All',
    });

    res.status(201).json({
      success: true,
      message: 'Test notification broadcasted via Live Sync',
      notification,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
