const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const Study = require('../models/Study');
const { protect } = require('../middleware/auth');

const router = express.Router();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || './uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `study-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.tiff', '.tif', '.dcm'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}`));
    }
  },
});

// ─── Map modality to AI service modality key ───────────
function getAIModality(modality, bodyPart) {
  if (modality === 'X-Ray') return 'xray';
  if (modality === 'MRI' && bodyPart?.toLowerCase().includes('brain')) return 'brain';
  if (modality === 'MRI') return 'brain'; // Default MRI to brain
  return null; // CT not supported yet
}

// ─── Call AI Service for prediction ────────────────────
async function runAIPrediction(filePath, modality, explain = true) {
  const aiModality = typeof modality === 'string' ? modality : 'xray';
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('modality', aiModality);
  form.append('explain', explain.toString());
  form.append('top_k', '5');

  const startTime = Date.now();
  const response = await axios.post(
    `${AI_SERVICE_URL}/inference/predict`,
    form,
    {
      headers: form.getHeaders(),
      timeout: 60000, // 60s timeout for inference
    }
  );
  const inferenceTime = Date.now() - startTime;

  return { ...response.data, inferenceTime };
}

// ─── Save heatmap from base64 ─────────────────────────
function saveHeatmap(base64Data, studyId) {
  if (!base64Data) return null;
  const uploadsDir = process.env.UPLOAD_DIR || './uploads';
  const heatmapDir = path.join(uploadsDir, 'heatmaps');
  if (!fs.existsSync(heatmapDir)) fs.mkdirSync(heatmapDir, { recursive: true });

  const filename = `heatmap-${studyId}-${Date.now()}.png`;
  const filepath = path.join(heatmapDir, filename);
  const buffer = Buffer.from(base64Data, 'base64');
  fs.writeFileSync(filepath, buffer);

  return `/uploads/heatmaps/${filename}`;
}

// ─── GET /api/v1/studies — List studies ─────────────────
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, modality, search } = req.query;

    const query = {};
    if (status && status !== 'All') query.status = status;
    if (modality) query.modality = modality;
    if (search) {
      query.$or = [
        { patientName: { $regex: search, $options: 'i' } },
        { studyId: { $regex: search, $options: 'i' } },
        { patientId: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Study.countDocuments(query);
    const studies = await Study.find(query)
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      studies,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('List studies error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /api/v1/studies/:id — Get study detail ────────
router.get('/:id', protect, async (req, res) => {
  try {
    const study = await Study.findById(req.params.id)
      .populate('uploadedBy', 'name email')
      .populate('reviewedBy', 'name email');

    if (!study) {
      return res.status(404).json({ message: 'Study not found' });
    }

    res.json({ study });
  } catch (error) {
    console.error('Get study error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── POST /api/v1/studies/upload — Upload + AI analysis ─
router.post('/upload', protect, upload.array('files', 50), async (req, res) => {
  try {
    const { patientName, patientId, dob, modality, bodyPart, notes } = req.body;

    const files = (req.files || []).map((f) => ({
      filename: f.filename,
      originalName: f.originalname,
      mimetype: f.mimetype,
      size: f.size,
      path: f.path,
    }));

    const study = await Study.create({
      patientName,
      patientId,
      dob: dob || undefined,
      modality,
      bodyPart: bodyPart || '',
      notes: notes || '',
      files,
      uploadedBy: req.user._id,
      status: 'Processing',
    });

    // Trigger AI prediction asynchronously
    const aiModality = getAIModality(modality, bodyPart);
    if (aiModality && files.length > 0) {
      // Don't await — let it run in background
      runAIPrediction(files[0].path, aiModality, true)
        .then(async (result) => {
          const heatmapUrl = saveHeatmap(result.heatmap_base64, study.studyId);
          await Study.findByIdAndUpdate(study._id, {
            status: 'Completed',
            prediction: result.prediction,
            confidence: Math.round(result.confidence * 100),
            heatmapUrl,
            aiResults: {
              topPredictions: result.top_predictions?.map(p => ({
                class: p.class,
                confidence: p.confidence,
              })),
              modelInfo: result.model_info ? {
                architecture: result.model_info.architecture,
                classes: result.model_info.classes,
                valAccuracy: result.model_info.val_accuracy,
              } : undefined,
              inferenceTime: result.inferenceTime,
              analyzedAt: new Date(),
            },
          });
          console.log(`✅ AI analysis complete for ${study.studyId}: ${result.prediction} (${(result.confidence * 100).toFixed(1)}%)`);
        })
        .catch(async (err) => {
          console.error(`❌ AI analysis failed for ${study.studyId}:`, err.message);
          await Study.findByIdAndUpdate(study._id, { status: 'Failed' });
        });
    }

    res.status(201).json({
      message: 'Study uploaded — AI analysis in progress',
      study,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    console.error('Upload study error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── POST /api/v1/studies/:id/analyze — Re-run AI analysis ─
router.post('/:id/analyze', protect, async (req, res) => {
  try {
    const study = await Study.findById(req.params.id);
    if (!study) {
      return res.status(404).json({ message: 'Study not found' });
    }

    if (!study.files || study.files.length === 0) {
      return res.status(400).json({ message: 'No files to analyze' });
    }

    const aiModality = getAIModality(study.modality, study.bodyPart);
    if (!aiModality) {
      return res.status(400).json({ message: `AI analysis not available for ${study.modality}` });
    }

    // Update status
    study.status = 'Processing';
    await study.save();

    // Run prediction
    const filePath = study.files[0].path;
    if (!fs.existsSync(filePath)) {
      study.status = 'Failed';
      await study.save();
      return res.status(400).json({ message: 'Image file not found on disk' });
    }

    const result = await runAIPrediction(filePath, aiModality, true);
    const heatmapUrl = saveHeatmap(result.heatmap_base64, study.studyId);

    study.status = 'Completed';
    study.prediction = result.prediction;
    study.confidence = Math.round(result.confidence * 100);
    study.heatmapUrl = heatmapUrl;
    study.aiResults = {
      topPredictions: result.top_predictions?.map(p => ({
        class: p.class,
        confidence: p.confidence,
      })),
      modelInfo: result.model_info ? {
        architecture: result.model_info.architecture,
        classes: result.model_info.classes,
        valAccuracy: result.model_info.val_accuracy,
      } : undefined,
      inferenceTime: result.inferenceTime,
      analyzedAt: new Date(),
    };
    await study.save();

    res.json({
      message: 'AI analysis complete',
      study,
    });
  } catch (error) {
    console.error('Analyze study error:', error);
    // Update status to failed
    try {
      await Study.findByIdAndUpdate(req.params.id, { status: 'Failed' });
    } catch (e) { /* ignore */ }
    res.status(500).json({ message: `AI analysis failed: ${error.message}` });
  }
});

// ─── GET /api/v1/studies/ai/health — Check AI service health ─
router.get('/ai/health', protect, async (req, res) => {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/inference/health`, { timeout: 5000 });
    res.json(response.data);
  } catch (error) {
    res.status(503).json({
      status: 'unavailable',
      message: 'AI service is not reachable',
      error: error.message,
    });
  }
});

// ─── DELETE /api/v1/studies/:id — Delete study ─────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const study = await Study.findById(req.params.id);
    if (!study) {
      return res.status(404).json({ message: 'Study not found' });
    }

    await study.deleteOne();
    res.json({ message: 'Study deleted successfully' });
  } catch (error) {
    console.error('Delete study error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
