const mongoose = require('mongoose');

const studySchema = new mongoose.Schema({
  studyId: {
    type: String,
    unique: true,
    required: true,
  },
  patientName: {
    type: String,
    required: [true, 'Patient name is required'],
    trim: true,
  },
  patientId: {
    type: String,
    required: [true, 'Patient ID is required'],
    trim: true,
  },
  dob: Date,
  modality: {
    type: String,
    enum: ['X-Ray', 'CT Scan', 'MRI'],
    required: true,
  },
  bodyPart: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['Pending', 'Processing', 'Completed', 'Failed'],
    default: 'Pending',
  },
  prediction: {
    type: String,
    default: null,
  },
  confidence: {
    type: Number,
    default: null,
    min: 0,
    max: 100,
  },
  heatmapUrl: {
    type: String,
    default: null,
  },
  aiResults: {
    topPredictions: [{
      class: String,
      confidence: Number,
    }],
    modelInfo: {
      architecture: String,
      classes: [String],
      valAccuracy: Number,
    },
    inferenceTime: Number,
    analyzedAt: Date,
  },
  files: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    path: String,
  }],
  notes: {
    type: String,
    default: '',
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, {
  timestamps: true,
});

// Auto-generate studyId before save
studySchema.pre('save', async function (next) {
  if (!this.studyId) {
    const count = await this.constructor.countDocuments();
    this.studyId = `STD-${(3000 + count).toString()}`;
  }
  next();
});

module.exports = mongoose.model('Study', studySchema);
