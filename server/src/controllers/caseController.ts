import { Response } from 'express';
import { PatientCase } from '../models/PatientCase';
import { AuthRequest } from '../middleware/authMiddleware';
import { logAudit } from '../middleware/auditLogger';
import { notificationService } from '../services/notificationService';

export const getCases = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, status, riskLevel, startDate, endDate } = req.query;
    const query: any = {};

    if (search) {
      const s = { $regex: String(search).trim(), $options: 'i' };
      query.$or = [
        { caseId: s },
        { patientName: s },
        { endoscopist: s },
        { anatomicalLocation: s },
        { polypFindings: s },
        { indication: s },
      ];
    }
    if (status) query.status = status;
    if (riskLevel) query.riskLevel = riskLevel;

    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) {
        dateFilter.$gte = new Date(startDate as string);
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        dateFilter.$lte = end;
      }

      const dateOr = [{ procedureDate: dateFilter }, { createdAt: dateFilter }];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: dateOr }];
        delete query.$or;
      } else {
        query.$or = dateOr;
      }
    }

    const cases = await PatientCase.find(query).sort({ procedureDate: -1, createdAt: -1 });
    res.json({ success: true, count: cases.length, cases });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCaseById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const patientCase = await PatientCase.findById(id);
    if (!patientCase) {
      res.status(404).json({ success: false, message: 'Case record not found.' });
      return;
    }
    res.json({ success: true, case: patientCase });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCase = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      patientName,
      patientAge,
      patientGender,
      procedureDate,
      endoscopist,
      indication,
      anatomicalLocation,
      polypFindings,
      riskLevel,
      status,
      notes,
    } = req.body;

    // Generate automatic caseId e.g. CASE-2026-XXXX
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const caseId = req.body.caseId || `CASE-2026-${randomSuffix}`;

    const newCase = await PatientCase.create({
      caseId,
      patientName,
      patientAge: Number(patientAge) || 45,
      patientGender: patientGender || 'Male',
      procedureDate: procedureDate || new Date(),
      endoscopist: endoscopist || req.user?.name || 'Dr. John Smith',
      indication: indication || 'Screening',
      anatomicalLocation: anatomicalLocation || 'Sigmoid Colon',
      polypFindings: polypFindings || 'Adenomatous Polyp',
      riskLevel: riskLevel || 'Moderate',
      status: status || 'Completed',
      notes: notes || '',
    });

    await logAudit({
      userId: req.user?._id,
      userName: req.user?.name,
      action: 'CASE_CREATE',
      resource: 'PatientCase',
      resourceId: newCase._id.toString(),
      metadata: { caseId: newCase.caseId, patientName: newCase.patientName },
      ip: req.ip,
    });

    try {
      await notificationService.createAndBroadcast({
        targetRole: 'All',
        title: `New Patient Case: ${newCase.caseId}`,
        message: `Case for ${newCase.patientName} (${newCase.polypFindings || 'Findings recorded'}) added by ${newCase.endoscopist}.`,
        type: 'CASE',
        severity: 'info',
        link: `/cases`,
        metadata: { caseId: newCase.caseId },
      });
    } catch (notifErr) {
      console.warn('[CaseController] Notification broadcast error:', notifErr);
    }

    res.status(201).json({ success: true, message: 'Case created successfully.', case: newCase });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCase = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updatedCase = await PatientCase.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedCase) {
      res.status(404).json({ success: false, message: 'Case record not found.' });
      return;
    }

    await logAudit({
      userId: req.user?._id,
      userName: req.user?.name,
      action: 'CASE_UPDATE',
      resource: 'PatientCase',
      resourceId: id,
      metadata: { caseId: updatedCase.caseId },
      ip: req.ip,
    });

    res.json({ success: true, message: 'Case record updated successfully.', case: updatedCase });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCase = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const deletedCase = await PatientCase.findByIdAndDelete(id);

    if (!deletedCase) {
      res.status(404).json({ success: false, message: 'Case record not found.' });
      return;
    }

    await logAudit({
      userId: req.user?._id,
      userName: req.user?.name,
      action: 'CASE_DELETE',
      resource: 'PatientCase',
      resourceId: id,
      metadata: { caseId: deletedCase.caseId },
      ip: req.ip,
    });

    res.json({ success: true, message: 'Case record removed successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
