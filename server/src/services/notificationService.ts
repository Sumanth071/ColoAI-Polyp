import { Response } from 'express';
import { Types } from 'mongoose';
import { Notification, INotification, NotificationType, NotificationSeverity, NotificationTargetRole } from '../models/Notification';

export interface CreateNotificationDTO {
  userId?: string | Types.ObjectId;
  targetRole?: NotificationTargetRole;
  title: string;
  message: string;
  type: NotificationType;
  severity?: NotificationSeverity;
  link?: string;
  metadata?: Record<string, any>;
}

interface SSEClient {
  id: string;
  userId?: string;
  userRole?: string;
  res: Response;
}

class NotificationService {
  private static instance: NotificationService;
  private clients: Map<string, SSEClient> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startHeartbeat();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private startHeartbeat(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    // Send SSE comment ping every 25 seconds to keep connection open
    this.pingInterval = setInterval(() => {
      this.clients.forEach((client, id) => {
        try {
          client.res.write(': ping\n\n');
        } catch (err) {
          console.warn(`[NotificationService] Error sending ping to client ${id}, removing.`);
          this.removeClient(id);
        }
      });
    }, 25000);
  }

  public addClient(id: string, res: Response, userId?: string, userRole?: string): void {
    this.clients.set(id, { id, res, userId, userRole });
    console.log(`[NotificationService] Client ${id} connected to live stream. Total active: ${this.clients.size}`);

    // Send initial connection event
    res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', timestamp: new Date().toISOString() })}\n\n`);
  }

  public removeClient(id: string): void {
    if (this.clients.has(id)) {
      this.clients.delete(id);
      console.log(`[NotificationService] Client ${id} disconnected. Total active: ${this.clients.size}`);
    }
  }

  public async createAndBroadcast(dto: CreateNotificationDTO): Promise<INotification> {
    const notification = await Notification.create({
      userId: dto.userId ? new Types.ObjectId(String(dto.userId)) : undefined,
      targetRole: dto.targetRole || 'All',
      title: dto.title,
      message: dto.message,
      type: dto.type,
      severity: dto.severity || 'info',
      link: dto.link,
      metadata: dto.metadata,
      read: false,
    });

    this.broadcast(notification);
    return notification;
  }

  public broadcast(notification: INotification): void {
    const payload = JSON.stringify(notification.toJSON());
    const eventPayload = `event: notification\ndata: ${payload}\n\n`;

    const targetUserId = notification.userId ? notification.userId.toString() : null;
    const targetRole = notification.targetRole || 'All';

    this.clients.forEach((client, id) => {
      try {
        let shouldSend = false;

        if (targetUserId) {
          // Specific user targeted
          if (client.userId === targetUserId) {
            shouldSend = true;
          }
        } else if (targetRole === 'All') {
          // Broadcast to everyone
          shouldSend = true;
        } else if (client.userRole === targetRole || client.userRole === 'Admin') {
          // Role targeted (Admins also receive notifications)
          shouldSend = true;
        }

        if (shouldSend) {
          client.res.write(eventPayload);
        }
      } catch (err) {
        console.warn(`[NotificationService] Failed to push to client ${id}:`, err);
        this.removeClient(id);
      }
    });
  }

  public async seedInitialNotifications(): Promise<void> {
    const count = await Notification.countDocuments();
    if (count >= 4) return;

    const initialNotifications: Partial<INotification>[] = [
      {
        title: 'AI Diagnostic Pipeline Online',
        message: 'ResNet50-SHAP Explainable Inference Engine v1.0 calibrated and active for clinical operations.',
        type: 'SYSTEM',
        severity: 'info',
        link: '/analyze',
        targetRole: 'All',
        read: false,
      },
      {
        title: 'Priority Case Flagged: CP-2026-1042',
        message: 'High-confidence Adenomatous Polyp detected (96.4%). Pending clinical specialist review.',
        type: 'ANALYSIS',
        severity: 'warning',
        link: '/reviews',
        targetRole: 'All',
        read: false,
      },
      {
        title: 'Diagnostic PDF Report Ready',
        message: 'Comprehensive SHAP & Clinical report for Case CASE-2026-8921 is available for download.',
        type: 'REPORT',
        severity: 'success',
        link: '/reports',
        targetRole: 'All',
        read: true,
      },
      {
        title: 'Clinical Review Validated',
        message: 'Dr. Elena Rostova validated explanation heatmap for case CP-2026-5519.',
        type: 'REVIEW',
        severity: 'success',
        link: '/history',
        targetRole: 'All',
        read: true,
      },
    ];

    for (const notif of initialNotifications) {
      await Notification.create(notif);
    }

    console.log('[NotificationService] Seeded initial system notifications.');
  }
}

export const notificationService = NotificationService.getInstance();
