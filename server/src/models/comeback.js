// server/src/models/comeback.js
const mongoose = require('mongoose');

const AuditEntrySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ['flagged', 'reviewed', 'rejected', 'updated', 'status_changed', 'classified'],
      required: true,
    },
    by: { type: String, required: true },
    notes: String,
  },
  { _id: false, timestamps: { createdAt: 'at' } }
);

const ComebackSchema = new mongoose.Schema(
  {
    roNumber: { type: String, required: true, trim: true, index: true },
    customerName: { type: String, required: true, trim: true },

    vehicle: {
      make: { type: String, trim: true },
      model: { type: String, trim: true },
      year: { type: Number, min: 1900, max: 9999 },
      vin: { type: String, trim: true },
    },

    dateOriginalRepair: { type: Date, required: true },
    dateOfComeback: { type: Date, required: true },

    reportedIssue: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },

    type: {
      type: String,
      enum: ['workmanship', 'misdiagnosis', 'parts_failure', 'customer_declined_work', 'new_issue'],
      default: 'new_issue',
      index: true,
    },

    financial: {
      partsCost: { type: Number, default: 0, min: 0 },
      laborCost: { type: Number, default: 0, min: 0 },
      warrantyOrDiscount: { type: Number, default: 0, min: 0 },
    },

    resolution: {
      assignedTo: { type: String, trim: true },
      status: {
        type: String,
        enum: ['open', 'in_progress', 'resolved', 'closed'],
        default: 'open',
        index: true,
      },
      notes: { type: String, trim: true },
    },

    audit: {
      flaggedBy: { type: String, required: true },
      reviewedBy: { type: String },
      finalClassification: {
        type: String,
        enum: ['workmanship', 'misdiagnosis', 'parts_failure', 'customer_declined_work', 'new_issue', 'unconfirmed'],
        default: 'unconfirmed',
      },
      log: [AuditEntrySchema],
    },

    location: { type: String, trim: true },
    advisor: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Comeback', ComebackSchema);
