import mongoose, { Schema, Document, Types } from 'mongoose';

export type NotificationType = 'ANALYSIS' | 'REVIEW' | 'CASE' | 'REPORT' | 'MODEL' | 'SYSTEM';
export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error';
export type NotificationTargetRole = 'Admin' | 'Researcher' | 'Clinician' | 'All';

export interface INotification extends Document {
  userId?: Types.ObjectId;
  targetRole?: NotificationTargetRole;
  title: string;
  message: string;
  type: NotificationType;
  severity: NotificationSeverity;
  link?: string;
  metadata?: Record<string, any>;
  read: boolean;
  readBy: {
    userId: Types.ObjectId;
    readAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    targetRole: {
      type: String,
      enum: ['Admin', 'Researcher', 'Clinician', 'All'],
      default: 'All',
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['ANALYSIS', 'REVIEW', 'CASE', 'REPORT', 'MODEL', 'SYSTEM'],
      default: 'SYSTEM',
      index: true,
    },
    severity: {
      type: String,
      enum: ['info', 'success', 'warning', 'error'],
      default: 'info',
    },
    link: {
      type: String,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    readBy: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        readAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

NotificationSchema.index({ createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
