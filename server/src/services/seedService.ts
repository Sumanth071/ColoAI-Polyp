import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { Role } from '../models/Role';
import { User } from '../models/User';
import { ModelRegistry } from '../models/Model';
import { Dataset } from '../models/Dataset';
import { AuditLog } from '../models/AuditLog';
import { Image } from '../models/Image';
import { Explanation } from '../models/Explanation';
import { Prediction } from '../models/Prediction';
import { Report } from '../models/Report';
import { PatientCase } from '../models/PatientCase';
import { PDFService } from './pdfService';
import { notificationService } from './notificationService';

export const seedDatabase = async (): Promise<void> => {
  try {
    // 1. Roles
    const adminRoleData = {
      name: 'Admin',
      description: 'System Administrator with full access to user, model, dataset, and system management.',
      permissions: [
        'user:*',
        'role:*',
        'model:*',
        'dataset:*',
        'prediction:*',
        'report:*',
        'analytics:*',
        'audit:*',
        'system:*',
      ],
    };

    const researcherRoleData = {
      name: 'Researcher',
      description: 'Medical AI Researcher with capabilities to upload images, run inference, view explanations, and generate reports.',
      permissions: [
        'prediction:create',
        'prediction:read',
        'report:create',
        'report:read',
        'model:read',
        'dataset:read',
        'analytics:own',
      ],
    };

    const clinicianRoleData = {
      name: 'Clinician',
      description: 'Clinical Reviewer with permissions to review predictions, add clinical notes, and validate model explanations.',
      permissions: [
        'prediction:read',
        'prediction:review',
        'report:create',
        'report:read',
        'model:read',
        'analytics:clinical',
      ],
    };

    let adminRole = await Role.findOne({ name: 'Admin' });
    if (!adminRole) adminRole = await Role.create(adminRoleData);

    let researcherRole = await Role.findOne({ name: 'Researcher' });
    if (!researcherRole) researcherRole = await Role.create(researcherRoleData);

    let clinicianRole = await Role.findOne({ name: 'Clinician' });
    if (!clinicianRole) clinicianRole = await Role.create(clinicianRoleData);

    // 2. Users
    const passwordHash = await bcrypt.hash('Password123!', 10);

    const usersToSeed = [
      {
        name: 'Dr. Sarah Mitchell, MD',
        email: 'admin@coloaipoly.org',
        passwordHash,
        roleId: adminRole._id,
        status: 'active',
      },
      {
        name: 'Prof. David Chen, PhD',
        email: 'researcher@coloaipoly.org',
        passwordHash,
        roleId: researcherRole._id,
        status: 'active',
      },
      {
        name: 'Dr. Elena Rostova, MD',
        email: 'clinician@coloaipoly.org',
        passwordHash,
        roleId: clinicianRole._id,
        status: 'active',
      },
      {
        name: 'Dr. Marcus Vance, MD',
        email: 'vance.pathology@coloaipoly.org',
        passwordHash,
        roleId: clinicianRole._id,
        status: 'active',
      },
      {
        name: 'Dr. Priya Sharma, MBBS',
        email: 'sharma.fellow@coloaipoly.org',
        passwordHash,
        roleId: clinicianRole._id,
        status: 'active',
      },
    ];

    let adminUser: any = null;
    let researcherUser: any = null;
    let clinicianUser: any = null;

    for (const userData of usersToSeed) {
      let u = await User.findOne({ email: userData.email });
      if (!u) {
        u = await User.create(userData);
      } else {
        u.name = userData.name;
        await u.save();
      }
      if (userData.email === 'admin@coloaipoly.org') adminUser = u;
      if (userData.email === 'researcher@coloaipoly.org') researcherUser = u;
      if (userData.email === 'clinician@coloaipoly.org') clinicianUser = u;
    }

    // 3. Models
    let activeModel = await ModelRegistry.findOne({ version: 'v1.0.0-prod' });
    if (!activeModel) {
      activeModel = await ModelRegistry.create({
        name: 'Deep Hybrid Architecture + SHAP Production Pipeline',
        version: 'v1.0.0-prod',
        backbone: 'Deep Neural Backbone (768d feature embeddings)',
        classifier: 'Multi-Class Gradient Boosted Classifier',
        datasetVersion: 'ColoPolyp-Benchmark-DB-v1.0',
        metrics: {
          accuracy: 0.946,
          precision: 0.938,
          recall: 0.942,
          f1Score: 0.940,
          rocAuc: 0.981,
          sensitivity: 0.951,
          specificity: 0.938,
          confusionMatrix: {
            labels: ['Adenomatous', 'Hyperplastic', 'Serrated', 'Other'],
            matrix: [
              [482, 18, 14, 6],
              [16, 420, 10, 4],
              [12, 14, 280, 8],
              [5, 8, 7, 186],
            ],
          },
        },
        status: 'Production',
        modelPath: 'models/deep_classifier_v1.bin',
      });

      await ModelRegistry.create({
        name: 'Deep Neural Network (High-Res) Experimental',
        version: 'v1.1.0-exp',
        backbone: 'Deep Neural Backbone (1024d feature embeddings)',
        classifier: 'Gradient Boosted Trees with SHAP-guided Top-128 features',
        datasetVersion: 'ColoPolyp-Benchmark-DB-v1.0',
        metrics: {
          accuracy: 0.954,
          precision: 0.949,
          recall: 0.951,
          f1Score: 0.950,
          rocAuc: 0.986,
          sensitivity: 0.958,
          specificity: 0.946,
        },
        status: 'Validation',
        modelPath: 'models/deep_classifier_v2_exp.bin',
      });
    }

    // 4. Dataset
    const existingDataset = await Dataset.findOne({ version: 'v1.0.0' });
    if (!existingDataset) {
      await Dataset.create({
        name: 'ColoPolyp Comprehensive Colonoscopy Benchmark',
        version: 'v1.0.0',
        description: 'Multi-center standardized colonoscopy polyp dataset annotated by expert gastroenterologists with histological ground truth.',
        totalImages: 3450,
        classes: [
          { name: 'Adenomatous Polyp', count: 1420 },
          { name: 'Hyperplastic Polyp', count: 980 },
          { name: 'Serrated Polyp', count: 650 },
          { name: 'Other / Non-polyp', count: 400 },
        ],
        metadata: {
          source: 'Colonoscopy Polyp Benchmark Consortium',
          resolution: '1920x1080 high definition, center cropped & normalized to 224x224',
          colorSpace: 'RGB / NBI (Narrow Band Imaging)',
          splits: {
            train: 0.7,
            val: 0.15,
            test: 0.15,
          },
        },
      });
    }

    // 5. Rich Demonstration Historical Predictions
    const predCount = await Prediction.countDocuments();
    if (predCount <= 1) {
      console.log('[Seed] Populating rich demo predictions for presentation readiness...');

      // Image 1: Adenomatous Sample
      const img1 = await Image.create({
        storageKey: 'adenomatous_polyp_sample_01.jpg',
        fileName: 'adenomatous_polyp_sample_01.jpg',
        originalName: 'endoscopy_ascending_colon_01.jpg',
        fileType: 'image/jpeg',
        fileSize: 48200,
        uploadedBy: researcherUser._id,
      });

      const pred1 = new Prediction({
        analysisId: 'CP-2026-1042',
        userId: researcherUser._id,
        imageId: img1._id,
        modelVersionId: activeModel?._id,
        predictedClass: 'Adenomatous Polyp',
        confidence: 0.924,
        probabilities: [
          { className: 'Adenomatous Polyp', probability: 0.924 },
          { className: 'Hyperplastic Polyp', probability: 0.048 },
          { className: 'Serrated Polyp', probability: 0.021 },
          { className: 'Other / Non-polyp', probability: 0.007 },
        ],
        status: 'COMPLETED',
        reviewStatus: 'REVIEWED',
        reviewNotes: 'Tubular adenoma morphology corroborated with Kudo Type III pit pattern. Recommended for complete endoscopic resection via snare polypectomy.',
        reviewerId: clinicianUser._id,
        reviewedAt: new Date(Date.now() - 3600000 * 4),
        processingTimeMs: 820,
      });

      const exp1 = await Explanation.create({
        predictionId: pred1._id,
        method: 'SHAP (TreeExplainer) + Attention Heatmap',
        featureContributions: [
          {
            featureId: 'f_feature_127',
            name: 'Vascular Pit Pattern Intensity (Kudo Type III/IV)',
            contribution: 0.312,
            description: 'High microvascular network density detected in mucosal surface',
          },
          {
            featureId: 'f_feature_842',
            name: 'Glandular Lumen Architecture Irregularity',
            contribution: 0.245,
            description: 'Tubular and villous architectural distortion characteristic of dysplasia',
          },
          {
            featureId: 'f_feature_421',
            name: 'Marginal Demarcation & Elevation',
            contribution: 0.184,
            description: 'Sharp polyp border elevation contrasting surrounding normal epithelium',
          },
          {
            featureId: 'f_feature_093',
            name: 'Surface Mucus Reflectance & Capping',
            contribution: -0.052,
            description: 'Absence of thick adherent mucous cap',
          },
        ],
        summaryNote: 'Inference completed in 820ms using Deep Neural Backbone and Gradient Boosted Classifier.',
      });

      pred1.explanationId = exp1._id as any;
      await pred1.save();

      // Generate pre-loaded PDF report for pred1
      try {
        const { filePath } = await PDFService.generateReport({
          prediction: pred1,
          image: img1,
          explanation: exp1,
          model: activeModel,
          reviewerName: clinicianUser.name,
          generatedByName: researcherUser.name,
        });
        const stat = fs.existsSync(filePath) ? fs.statSync(filePath) : { size: 28500 };
        const rep1 = await Report.create({
          reportId: 'REP-CP-2026-1042-01',
          predictionId: pred1._id,
          generatedBy: researcherUser._id,
          filePath,
          fileSize: stat.size,
          status: 'READY',
        });
        pred1.reportId = rep1._id as any;
        await pred1.save();
      } catch (e) {
        console.warn('[Seed] Could not generate initial demo PDF:', e);
      }

      // Image 2: Hyperplastic Sample
      const img2 = await Image.create({
        storageKey: 'hyperplastic_polyp_sample_02.jpg',
        fileName: 'hyperplastic_polyp_sample_02.jpg',
        originalName: 'endoscopy_rectum_02.jpg',
        fileType: 'image/jpeg',
        fileSize: 45100,
        uploadedBy: researcherUser._id,
      });

      const pred2 = new Prediction({
        analysisId: 'CP-2026-1088',
        userId: researcherUser._id,
        imageId: img2._id,
        modelVersionId: activeModel?._id,
        predictedClass: 'Hyperplastic Polyp',
        confidence: 0.912,
        probabilities: [
          { className: 'Adenomatous Polyp', probability: 0.052 },
          { className: 'Hyperplastic Polyp', probability: 0.912 },
          { className: 'Serrated Polyp', probability: 0.026 },
          { className: 'Other / Non-polyp', probability: 0.010 },
        ],
        status: 'COMPLETED',
        reviewStatus: 'REVIEWED',
        reviewNotes: 'Diminutive distal rectal hyperplastic polyp. Regular round pit patterns (Kudo Type II) observed. Low clinical risk.',
        reviewerId: clinicianUser._id,
        reviewedAt: new Date(Date.now() - 3600000 * 2),
        processingTimeMs: 760,
      });

      const exp2 = await Explanation.create({
        predictionId: pred2._id,
        method: 'SHAP (TreeExplainer) + Attention Heatmap',
        featureContributions: [
          {
            featureId: 'f_feature_093',
            name: 'Surface Mucus Reflectance & Capping',
            contribution: 0.284,
            description: 'Glistening regular surface reflectance without irregular vascular loops',
          },
          {
            featureId: 'f_feature_421',
            name: 'Marginal Demarcation & Elevation',
            contribution: -0.152,
            description: 'Flat, sessile mucosal contour with gentle slope into surrounding mucosa',
          },
        ],
      });

      pred2.explanationId = exp2._id as any;
      await pred2.save();

      // Image 3: Serrated Polyp Sample (PENDING REVIEW for Clinician Queue Demo!)
      const img3 = await Image.create({
        storageKey: 'serrated_polyp_sample_03.jpg',
        fileName: 'serrated_polyp_sample_03.jpg',
        originalName: 'endoscopy_cecum_03.jpg',
        fileType: 'image/jpeg',
        fileSize: 51200,
        uploadedBy: researcherUser._id,
      });

      const pred3 = new Prediction({
        analysisId: 'CP-2026-2150',
        userId: researcherUser._id,
        imageId: img3._id,
        modelVersionId: activeModel?._id,
        predictedClass: 'Serrated Polyp',
        confidence: 0.898,
        probabilities: [
          { className: 'Adenomatous Polyp', probability: 0.065 },
          { className: 'Hyperplastic Polyp', probability: 0.024 },
          { className: 'Serrated Polyp', probability: 0.898 },
          { className: 'Other / Non-polyp', probability: 0.013 },
        ],
        status: 'COMPLETED',
        reviewStatus: 'PENDING', // PENDING REVIEW SO CLINICIAN CAN DEMO!
        processingTimeMs: 890,
      });

      const exp3 = await Explanation.create({
        predictionId: pred3._id,
        method: 'SHAP (TreeExplainer) + Attention Heatmap',
        featureContributions: [
          {
            featureId: 'f_feature_093',
            name: 'Surface Mucus Reflectance & Capping',
            contribution: 0.342,
            description: 'Prominent adherent mucous cap and cloud-like surface texture',
          },
          {
            featureId: 'f_feature_421',
            name: 'Marginal Demarcation & Elevation',
            contribution: 0.215,
            description: 'Indistinct irregular borders typical of sessile serrated lesions (SSL)',
          },
        ],
      });

      pred3.explanationId = exp3._id as any;
      await pred3.save();
    }

    // 6. Audit Trail Seeding
    const logCount = await AuditLog.countDocuments();
    if (logCount < 8) {
      await AuditLog.create({
        userName: 'Dr. Sarah Mitchell, MD',
        action: 'SYSTEM_CONFIG_UPDATE',
        resource: 'AI Microservice Cluster',
        metadata: { version: '1.2.0', initializedRoles: 3, initializedModels: 2 },
        ip: '192.168.1.10',
        status: 'SUCCESS',
      });
      await AuditLog.create({
        userId: adminUser?._id,
        userName: adminUser?.name || 'Dr. Sarah Mitchell, MD',
        action: 'MODEL_ACTIVATE_PRODUCTION',
        resource: 'Deep Vision Backbone v1.0.0-prod',
        metadata: { modelVersion: 'v1.0.0-prod', pipeline: 'Deep Hybrid Architecture' },
        ip: '192.168.1.10',
        status: 'SUCCESS',
      });
      await AuditLog.create({
        userId: researcherUser?._id,
        userName: researcherUser?.name || 'Prof. David Chen, PhD',
        action: 'PREDICTION_RUN',
        resource: 'Polyp Study #CP-2026-1042',
        metadata: { analysisId: 'CP-2026-1042', predictedClass: 'Adenomatous Polyp', confidence: 0.924 },
        ip: '192.168.1.15',
        status: 'SUCCESS',
      });
      await AuditLog.create({
        userId: clinicianUser?._id,
        userName: clinicianUser?.name || 'Dr. Elena Rostova, MD',
        action: 'CLINICAL_REVIEW_SUBMITTED',
        resource: 'Polyp Triage #CP-2026-1042',
        metadata: { status: 'APPROVED', notes: 'Clinically consistent with histopathology' },
        ip: '192.168.1.20',
        status: 'SUCCESS',
      });
    }

    // 7. Seed Initial Presentation Cases
    const caseCount = await PatientCase.countDocuments();
    if (caseCount === 0) {
      await PatientCase.insertMany([
        {
          caseId: 'CASE-2026-1042',
          patientName: 'Robert Jenkins',
          patientAge: 62,
          patientGender: 'Male',
          procedureDate: new Date('2025-04-28T10:30:00Z'),
          endoscopist: 'Dr. Elena Rostova, MD (Chief Endoscopist)',
          indication: 'Screening',
          anatomicalLocation: 'Sigmoid Colon (35cm)',
          polypFindings: 'Adenomatous Polyp (12mm tubular adenoma)',
          riskLevel: 'High',
          status: 'Completed',
          notes: 'Tubular adenoma identified at sigmoid junction. High confidence deep learning classification (92.4%). Resected completely with snare polypectomy.',
        },
        {
          caseId: 'CASE-2026-1088',
          patientName: 'Margaret Davis',
          patientAge: 58,
          patientGender: 'Female',
          procedureDate: new Date('2025-04-28T14:15:00Z'),
          endoscopist: 'Dr. Marcus Vance, MD (Consultant Pathologist)',
          indication: 'Surveillance',
          anatomicalLocation: 'Distal Rectum (8cm)',
          polypFindings: 'Hyperplastic Polyp (4mm sessile)',
          riskLevel: 'Low',
          status: 'Reviewed',
          notes: 'Small pale sessile polyp with regular mucosal pits. Low oncogenic risk confirmed by clinician.',
        },
        {
          caseId: 'CASE-2026-2150',
          patientName: 'Thomas Wilson',
          patientAge: 67,
          patientGender: 'Male',
          procedureDate: new Date('2025-04-27T09:00:00Z'),
          endoscopist: 'Dr. Priya Sharma, MBBS (Endoscopy Fellow)',
          indication: 'High Risk',
          anatomicalLocation: 'Ascending Colon (Hepatic Flexure)',
          polypFindings: 'Serrated Polyp (18mm sessile serrated lesion)',
          riskLevel: 'High',
          status: 'Follow-up Required',
          notes: 'Large flat serrated lesion with thick mucinous cap. Endoscopic mucosal resection performed. Surveillance colonoscopy recommended in 1 year.',
        },
        {
          caseId: 'CASE-2026-3091',
          patientName: 'Susan Miller',
          patientAge: 49,
          patientGender: 'Female',
          procedureDate: new Date('2025-04-26T11:45:00Z'),
          endoscopist: 'Dr. Aris Thorne, MD (Clinical Quality Lead)',
          indication: 'Screening',
          anatomicalLocation: 'Transverse Colon (Mid)',
          polypFindings: 'Other / Non-polyp (Normal Mucosa)',
          riskLevel: 'Low',
          status: 'Reviewed',
          notes: 'Routine baseline screening. No adenomatous lesions identified. Routine 10-year recall recommended.',
        },
        {
          caseId: 'CASE-2026-4412',
          patientName: 'Arthur Pendelton',
          patientAge: 71,
          patientGender: 'Male',
          procedureDate: new Date('2025-04-25T13:20:00Z'),
          endoscopist: 'Dr. Elena Rostova, MD (Chief Endoscopist)',
          indication: 'High Risk',
          anatomicalLocation: 'Cecum (Periappendiceal orifice)',
          polypFindings: 'Adenomatous Polyp (14mm sessile adenoma with dysplasia)',
          riskLevel: 'High',
          status: 'Completed',
          notes: 'Right-sided flat adenoma. Clean margins confirmed via endoscopic clip placement and cold snare excision.',
        },
        {
          caseId: 'CASE-2026-5820',
          patientName: 'Mei-Ling Zhou',
          patientAge: 53,
          patientGender: 'Female',
          procedureDate: new Date('2025-04-24T15:10:00Z'),
          endoscopist: 'Dr. Marcus Vance, MD (Consultant Pathologist)',
          indication: 'Surveillance',
          anatomicalLocation: 'Descending Colon (Splenic Flexure)',
          polypFindings: 'Serrated Polyp (9mm sessile serrated lesion)',
          riskLevel: 'Moderate',
          status: 'Follow-up Required',
          notes: 'Mucosal elevation with indistinct borders. Resected and specimen sent for molecular BRAF mutation testing.',
        },
      ]);
    }

    // Seed initial notifications if not already present
    await notificationService.seedInitialNotifications();

    console.log('[Seed] Database successfully initialized with default roles, users, models, datasets, notifications, and presentation demo cases.');
  } catch (error) {
    console.error('[Seed] Database initialization error:', error);
  }
};
