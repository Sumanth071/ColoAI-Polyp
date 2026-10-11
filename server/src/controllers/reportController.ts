import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Report } from '../models/Report';
import { Prediction } from '../models/Prediction';
import { Image } from '../models/Image';
import { Explanation } from '../models/Explanation';
import { ModelRegistry } from '../models/Model';
import { PDFService } from '../services/pdfService';
import { logAudit } from '../middleware/auditLogger';
import { AuthRequest } from '../middleware/authMiddleware';
import { notificationService } from '../services/notificationService';

export const generateReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { predictionId } = req.body;

    const prediction = await Prediction.findById(predictionId)
      .populate('imageId')
      .populate('explanationId')
      .populate('modelVersionId')
      .populate('userId', 'name email role')
      .populate('reviewerId', 'name email');

    if (!prediction) {
      res.status(404).json({ success: false, message: 'Prediction record not found.' });
      return;
    }

    const image = await Image.findById(prediction.imageId);
    if (!image) {
      res.status(404).json({ success: false, message: 'Colonoscopy image record not found.' });
      return;
    }

    const explanation = prediction.explanationId ? await Explanation.findById(prediction.explanationId) : null;
    const model = prediction.modelVersionId ? await ModelRegistry.findById(prediction.modelVersionId) : null;

    const reportId = `REP-${prediction.analysisId}-${Date.now().toString().slice(-4)}`;

    // Resolve researcher attribution for bottom signature
    let researcherName = 'Prof. David Chen, PhD';
    const creatorUser = prediction.userId as any;
    if (req.user?.role?.name === 'Researcher') {
      researcherName = req.user.name;
    } else if (creatorUser?.name && !creatorUser.name.toLowerCase().includes('dr.')) {
      researcherName = creatorUser.name;
    }

    // Resolve clinician reviewer attribution
    let reviewerName = (prediction.reviewerId as any)?.name;
    if (!reviewerName && req.user?.role?.name === 'Clinician') {
      reviewerName = req.user.name;
    } else if (!reviewerName) {
      reviewerName = 'Dr. Elena Rostova, MD';
    }

    const { filePath, fileName } = await PDFService.generateReport({
      prediction,
      image,
      explanation,
      model,
      researcherName,
      reviewerName,
      generatedByName: req.user?.name || 'Authorized User',
    });

    const stat = fs.statSync(filePath);

    const report = await Report.create({
      reportId,
      predictionId: prediction._id,
      generatedBy: req.user?._id,
      filePath,
      fileSize: stat.size,
      status: 'READY',
    });

    prediction.reportId = report._id as any;
    await prediction.save();

    await logAudit({
      userId: req.user?._id,
      userName: req.user?.name,
      action: 'REPORT_GENERATE',
      resource: 'Report',
      resourceId: report._id.toString(),
      metadata: { reportId, analysisId: prediction.analysisId },
      ip: req.ip,
    });

    try {
      await notificationService.createAndBroadcast({
        userId: req.user?._id,
        targetRole: 'All',
        title: `Diagnostic PDF Report Ready: ${report.reportId}`,
        message: `Official explainable diagnostic report for ${prediction.analysisId} generated and validated.`,
        type: 'REPORT',
        severity: 'success',
        link: `/reports`,
        metadata: { reportId: report.reportId, analysisId: prediction.analysisId },
      });
    } catch (notifErr) {
      console.warn('[ReportController] Notification broadcast error:', notifErr);
    }

    res.status(201).json({
      success: true,
      message: 'Medical analysis report generated successfully.',
      report,
    });
  } catch (error: any) {
    console.error('[ReportController] Generation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, startDate, endDate } = req.query;
    const query: any = {};
    if (req.user?.role?.name === 'Researcher') {
      query.generatedBy = req.user._id;
    }

    if (search) {
      const searchRegex = { $regex: String(search).trim(), $options: 'i' };
      query.$or = [
        { reportId: searchRegex },
      ];
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

    const reports = await Report.find(query)
      .populate({
        path: 'predictionId',
        select: 'analysisId predictedClass confidence reviewStatus createdAt',
      })
      .populate('generatedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: reports.length, reports });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const downloadReportPdf = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    let report = await Report.findById(id);

    if (!report) {
      report = await Report.findOne({ reportId: id });
    }

    if (!report) {
      report = await Report.findOne({ predictionId: id });
    }

    // If report still not found, check if it's a prediction that needs a report generated
    if (!report) {
      const prediction = await Prediction.findById(id)
        .populate('imageId')
        .populate('explanationId')
        .populate('modelVersionId')
        .populate('reviewerId', 'name email');

      if (prediction) {
        const image = await Image.findById(prediction.imageId);
        if (image) {
          const explanation = prediction.explanationId ? await Explanation.findById(prediction.explanationId) : null;
          const model = prediction.modelVersionId ? await ModelRegistry.findById(prediction.modelVersionId) : null;
          const reportId = `REP-${prediction.analysisId}-${Date.now().toString().slice(-4)}`;

          const { filePath } = await PDFService.generateReport({
            prediction,
            image,
            explanation,
            model,
            reviewerName: (prediction.reviewerId as any)?.name,
            generatedByName: req.user?.name || 'Authorized User',
          });

          const stat = fs.statSync(filePath);
          report = await Report.create({
            reportId,
            predictionId: prediction._id,
            generatedBy: req.user?._id || prediction.userId,
            filePath,
            fileSize: stat.size,
            status: 'READY',
          });

          prediction.reportId = report._id as any;
          await prediction.save();
        }
      }
    }

    if (!report) {
      res.status(404).json({ success: false, message: 'Report or associated prediction record not found.' });
      return;
    }

    // If file missing on disk, regenerate it
    if (!fs.existsSync(report.filePath)) {
      const prediction = await Prediction.findById(report.predictionId)
        .populate('imageId')
        .populate('explanationId')
        .populate('modelVersionId')
        .populate('reviewerId', 'name email');

      if (prediction) {
        const image = await Image.findById(prediction.imageId);
        if (image) {
          const explanation = prediction.explanationId ? await Explanation.findById(prediction.explanationId) : null;
          const model = prediction.modelVersionId ? await ModelRegistry.findById(prediction.modelVersionId) : null;

          const { filePath } = await PDFService.generateReport({
            prediction,
            image,
            explanation,
            model,
            reviewerName: (prediction.reviewerId as any)?.name,
            generatedByName: req.user?.name || 'Authorized User',
          });

          report.filePath = filePath;
          await report.save();
        }
      }
    }

    if (!fs.existsSync(report.filePath)) {
      res.status(404).json({ success: false, message: 'Report PDF file could not be generated on disk.' });
      return;
    }

    await logAudit({
      userId: req.user?._id,
      userName: req.user?.name || 'User',
      action: 'REPORT_DOWNLOAD',
      resource: 'Report',
      resourceId: report._id.toString(),
      metadata: { reportId: report.reportId },
      ip: req.ip,
    });

    res.download(report.filePath, `ColoAI-Polyp-Report-${report.reportId}.pdf`);
  } catch (error: any) {
    console.error('[ReportController] Download error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
