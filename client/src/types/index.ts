export type UserRole = 'Admin' | 'Researcher' | 'Clinician';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: string[];
  status: 'active' | 'inactive' | 'pending';
  lastLogin?: string;
}

export interface ClassProbability {
  className: string;
  probability: number;
}

export interface FeatureContribution {
  featureId: string;
  name: string;
  contribution: number;
  description?: string;
}

export interface Prediction {
  _id: string;
  analysisId: string;
  userId: { _id: string; name: string; email: string };
  imageId: {
    _id: string;
    fileName: string;
    originalName: string;
    storageKey: string;
    fileSize: number;
  };
  modelVersionId?: {
    _id: string;
    name: string;
    version: string;
    backbone: string;
    classifier: string;
  };
  predictedClass: 'Adenomatous Polyp' | 'Hyperplastic Polyp' | 'Serrated Polyp' | 'Other / Non-polyp';
  confidence: number;
  probabilities: ClassProbability[];
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  reviewStatus: 'PENDING' | 'REVIEWED' | 'REQUIRES_FURTHER_REVIEW';
  reviewNotes?: string;
  reviewerId?: { _id: string; name: string; email: string };
  reviewedAt?: string;
  explanationId?: {
    _id: string;
    method: string;
    featureContributions: FeatureContribution[];
    heatmapBase64?: string;
    summaryNote?: string;
  };
  reportId?: string;
  processingTimeMs?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ModelRegistryItem {
  _id: string;
  name: string;
  version: string;
  backbone: string;
  classifier: string;
  datasetVersion: string;
  metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    rocAuc: number;
    sensitivity: number;
    specificity: number;
    confusionMatrix?: {
      labels: string[];
      matrix: number[][];
    };
  };
  status: 'Experimental' | 'Validation' | 'Production' | 'Archived';
  createdAt: string;
}

export interface DatasetItem {
  _id: string;
  name: string;
  version: string;
  description: string;
  totalImages: number;
  classes: { name: string; count: number }[];
  metadata: {
    source: string;
    resolution: string;
    colorSpace: string;
    splits: { train: number; val: number; test: number };
  };
  createdAt: string;
}

export interface ReportItem {
  _id: string;
  reportId: string;
  predictionId: {
    _id: string;
    analysisId: string;
    predictedClass: string;
    confidence: number;
    reviewStatus: string;
    createdAt: string;
  };
  generatedBy: { _id: string; name: string; email: string };
  filePath: string;
  fileSize: number;
  status: string;
  createdAt: string;
}

export interface AuditLogItem {
  _id: string;
  userId?: { _id: string; name: string; email: string };
  userName?: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  ip?: string;
  status: 'SUCCESS' | 'FAILURE' | 'WARNING';
  createdAt: string;
}

export type NotificationType = 'ANALYSIS' | 'REVIEW' | 'CASE' | 'REPORT' | 'MODEL' | 'SYSTEM';
export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error';

export interface SystemNotification {
  _id: string;
  title: string;
  message: string;
  type: NotificationType;
  severity: NotificationSeverity;
  link?: string;
  metadata?: Record<string, any>;
  read: boolean;
  createdAt: string;
  updatedAt?: string;
}

