import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { Prediction } from '../models/Prediction';
import { Image } from '../models/Image';
import { Explanation } from '../models/Explanation';
import { ModelRegistry } from '../models/Model';
import { AIServiceClient } from '../services/aiServiceClient';
import { logAudit } from '../middleware/auditLogger';
import { AuthRequest } from '../middleware/authMiddleware';
import { notificationService } from '../services/notificationService';

export const createPrediction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'Please provide a valid colonoscopy image file.' });
      return;
    }

    const user = req.user!;
    const file = req.file;

    // 1. Create Image Record
    const image = await Image.create({
      storageKey: file.path,
      fileName: file.filename,
      originalName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      uploadedBy: user._id,
    });

    // 2. Fetch Active Production Model
    let activeModel = await ModelRegistry.findOne({ status: 'Production' });
    if (!activeModel) {
      activeModel = await ModelRegistry.findOne().sort({ createdAt: -1 });
    }

    // 3. Call AI Service (Deep Learning + SHAP)
    const aiClient = AIServiceClient.getInstance();
    const aiResult = await aiClient.predict(file.path, activeModel?.version);

    // 4. Generate Unique Analysis ID
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const analysisId = `CP-${new Date().getFullYear()}-${randomDigits}`;

    // 5. Create Prediction Record
    const prediction = new Prediction({
      analysisId,
      userId: user._id,
      imageId: image._id,
      modelVersionId: activeModel?._id,
      predictedClass: aiResult.predictedClass,
      confidence: aiResult.confidence,
      probabilities: aiResult.probabilities,
      status: 'COMPLETED',
      reviewStatus: 'PENDING',
      processingTimeMs: aiResult.processingTimeMs,
    });

    // 6. Create Explanation Record
    const explanation = await Explanation.create({
      predictionId: prediction._id,
      method: 'SHAP (TreeExplainer) + GradCAM Attention Heatmap',
      featureContributions: aiResult.featureContributions,
      heatmapBase64: aiResult.heatmapBase64,
      summaryNote: `Inference completed in ${aiResult.processingTimeMs}ms using ${aiResult.backbone} and ${aiResult.classifier}.`,
    });

    prediction.explanationId = explanation._id as any;
    await prediction.save();

    // 7. Audit Log
    await logAudit({
      userId: user._id,
      userName: user.name,
      action: 'PREDICTION_RUN',
      resource: 'Prediction',
      resourceId: prediction._id.toString(),
      metadata: {
        analysisId: prediction.analysisId,
        predictedClass: prediction.predictedClass,
        confidence: prediction.confidence,
        isSimulatedDemo: aiResult.isSimulatedDemo,
      },
      ip: req.ip,
    });

    // 8. Broadcast Live Notification
    try {
      await notificationService.createAndBroadcast({
        userId: user._id,
        targetRole: 'All',
        title: `AI Analysis Complete: ${prediction.analysisId}`,
        message: `Polyp classified as ${aiResult.predictedClass} (${(aiResult.confidence * 100).toFixed(1)}% confidence). Review pending.`,
        type: 'ANALYSIS',
        severity: aiResult.predictedClass === 'Adenomatous Polyp' ? 'warning' : 'info',
        link: `/analysis/${prediction._id}`,
        metadata: { analysisId: prediction.analysisId, predictedClass: aiResult.predictedClass },
      });
    } catch (notifErr) {
      console.warn('[PredictionController] Notification broadcast error:', notifErr);
    }

    const populatedPrediction = await Prediction.findById(prediction._id)
      .populate('imageId')
      .populate('explanationId')
      .populate('modelVersionId')
      .populate('userId', 'name email');

    res.status(201).json({
      success: true,
      message: 'Colorectal polyp analysis completed successfully.',
      prediction: populatedPrediction,
    });
  } catch (error: any) {
    console.error('[PredictionController] Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Analysis processing failed.' });
  }
};

export const getPredictions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      predictedClass,
      reviewStatus,
      minConfidence,
      modelVersion,
      startDate,
      endDate,
      scope,
    } = req.query;

    const query: any = {};

    // Scope check: Researchers only see their own unless admin/clinician
    const userRole = req.user?.role?.name;
    if (userRole === 'Researcher' || scope === 'own') {
      query.userId = req.user?._id;
    }

    if (search) {
      const searchRegex = { $regex: String(search).trim(), $options: 'i' };
      query.$or = [
        { analysisId: searchRegex },
        { predictedClass: searchRegex },
        { reviewNotes: searchRegex },
      ];
    }
    if (predictedClass) {
      query.predictedClass = predictedClass;
    }
    if (reviewStatus) {
      query.reviewStatus = reviewStatus;
    }
    if (minConfidence) {
      query.confidence = { $gte: parseFloat(minConfidence as string) };
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate as string);
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Prediction.countDocuments(query);

    const predictions = await Prediction.find(query)
      .populate('imageId')
      .populate('explanationId')
      .populate('modelVersionId', 'name version backbone classifier')
      .populate('userId', 'name email')
      .populate('reviewerId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      predictions,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPredictionById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const prediction = await Prediction.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { analysisId: id }].filter(Boolean),
    })
      .populate('imageId')
      .populate('explanationId')
      .populate('modelVersionId')
      .populate('userId', 'name email')
      .populate('reviewerId', 'name email')
      .populate('reportId');

    if (!prediction) {
      res.status(404).json({ success: false, message: 'Prediction record not found.' });
      return;
    }

    res.json({ success: true, prediction });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reviewStatus, reviewNotes } = req.body;

    const prediction = await Prediction.findById(id);
    if (!prediction) {
      res.status(404).json({ success: false, message: 'Prediction not found.' });
      return;
    }

    if (reviewStatus) prediction.reviewStatus = reviewStatus;
    if (reviewNotes !== undefined) prediction.reviewNotes = reviewNotes;
    prediction.reviewerId = req.user?._id;
    prediction.reviewedAt = new Date();

    await prediction.save();

    await logAudit({
      userId: req.user?._id,
      userName: req.user?.name,
      action: 'CLINICAL_REVIEW_SUBMITTED',
      resource: 'Prediction',
      resourceId: prediction._id.toString(),
      metadata: { analysisId: prediction.analysisId, reviewStatus, notesLength: reviewNotes?.length },
      ip: req.ip,
    });

    // Broadcast Live Review Notification
    try {
      await notificationService.createAndBroadcast({
        targetRole: 'All',
        title: `Clinical Review Completed: ${prediction.analysisId}`,
        message: `Reviewer ${req.user?.name || 'Clinician'} updated diagnostic status to "${reviewStatus}".`,
        type: 'REVIEW',
        severity: 'success',
        link: `/reviews`,
        metadata: { analysisId: prediction.analysisId, reviewStatus },
      });
    } catch (notifErr) {
      console.warn('[PredictionController] Notification broadcast error:', notifErr);
    }

    const updated = await Prediction.findById(id)
      .populate('imageId')
      .populate('explanationId')
      .populate('modelVersionId')
      .populate('userId', 'name email')
      .populate('reviewerId', 'name email');

    res.json({
      success: true,
      message: 'Clinical review recorded successfully.',
      prediction: updated,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deletePrediction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const prediction = await Prediction.findByIdAndDelete(id);
    if (!prediction) {
      res.status(404).json({ success: false, message: 'Prediction not found.' });
      return;
    }

    await logAudit({
      userId: req.user?._id,
      userName: req.user?.name,
      action: 'PREDICTION_DELETE',
      resource: 'Prediction',
      resourceId: id,
      metadata: { analysisId: prediction.analysisId },
      ip: req.ip,
    });

    res.json({ success: true, message: 'Prediction record deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const predictExistingImage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { imageId, clinicalMetadata } = req.body;
    if (!imageId) {
      res.status(400).json({ success: false, message: 'Image ID is required.' });
      return;
    }

    const image = await Image.findById(imageId);
    if (!image) {
      res.status(404).json({ success: false, message: 'Image record not found.' });
      return;
    }

    const user = req.user!;
    let activeModel = await ModelRegistry.findOne({ status: 'Production' });
    if (!activeModel) {
      activeModel = await ModelRegistry.findOne().sort({ createdAt: -1 });
    }

    const aiClient = AIServiceClient.getInstance();
    const aiResult = await aiClient.predict(image.storageKey, activeModel?.version);

    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const analysisId = `CP-${new Date().getFullYear()}-${randomDigits}`;

    const prediction = new Prediction({
      analysisId,
      userId: user._id,
      imageId: image._id,
      modelVersionId: activeModel?._id,
      predictedClass: aiResult.predictedClass,
      confidence: aiResult.confidence,
      probabilities: aiResult.probabilities,
      status: 'COMPLETED',
      reviewStatus: 'PENDING',
      processingTimeMs: aiResult.processingTimeMs,
      clinicalMetadata,
    });

    const explanation = await Explanation.create({
      predictionId: prediction._id,
      method: 'SHAP (TreeExplainer) + GradCAM Attention Heatmap',
      featureContributions: aiResult.featureContributions,
      heatmapBase64: aiResult.heatmapBase64,
      summaryNote: `Inference completed in ${aiResult.processingTimeMs}ms using ${aiResult.backbone} and ${aiResult.classifier}.`,
    });

    prediction.explanationId = explanation._id as any;
    await prediction.save();

    await logAudit({
      userId: user._id,
      userName: user.name,
      action: 'PREDICTION_RUN',
      resource: 'Prediction',
      resourceId: prediction._id.toString(),
      metadata: {
        analysisId: prediction.analysisId,
        predictedClass: prediction.predictedClass,
        confidence: prediction.confidence,
        isSimulatedDemo: aiResult.isSimulatedDemo,
      },
      ip: req.ip,
    });

    // Broadcast Live Notification
    try {
      await notificationService.createAndBroadcast({
        userId: user._id,
        targetRole: 'All',
        title: `AI Analysis Complete: ${prediction.analysisId}`,
        message: `Polyp classified as ${aiResult.predictedClass} (${(aiResult.confidence * 100).toFixed(1)}% confidence). Review pending.`,
        type: 'ANALYSIS',
        severity: aiResult.predictedClass === 'Adenomatous Polyp' ? 'warning' : 'info',
        link: `/analysis/${prediction._id}`,
        metadata: { analysisId: prediction.analysisId, predictedClass: aiResult.predictedClass },
      });
    } catch (notifErr) {
      console.warn('[PredictionController] Notification broadcast error:', notifErr);
    }

    const populatedPrediction = await Prediction.findById(prediction._id)
      .populate('imageId')
      .populate('explanationId')
      .populate('modelVersionId')
      .populate('userId', 'name email');

    res.status(201).json({
      success: true,
      message: 'Colorectal polyp analysis completed successfully.',
      prediction: populatedPrediction,
      explanation,
    });
  } catch (error: any) {
    console.error('[PredictionController] Predict existing image error:', error);
    res.status(500).json({ success: false, message: error.message || 'Analysis processing failed.' });
  }
};

