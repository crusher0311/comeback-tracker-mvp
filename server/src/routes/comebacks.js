// server/src/routes/comebacks.js
const express = require('express');
const router = express.Router();
const Comeback = require('../models/comeback');

// ---------- helpers ----------
function buildFilters(q) {
  const filters = {};
  if (q.type) filters.type = q.type;
  if (q.status) filters['resolution.status'] = q.status;
  if (q.advisor) filters.advisor = new RegExp(q.advisor, 'i');
  if (q.location) filters.location = new RegExp(q.location, 'i');
  if (q.roNumber) filters.roNumber = new RegExp(q.roNumber, 'i');

  if (q.from || q.to) {
    filters.dateOfComeback = {};
    if (q.from) filters.dateOfComeback.$gte = new Date(q.from);
    if (q.to) filters.dateOfComeback.$lte = new Date(q.to);
  }
  return filters;
}

// ---------- root & specific routes (MUST be before '/:id') ----------

// DELETE /comebacks - delete ALL (for seeding)
router.delete('/', async (_req, res) => {
  try {
    const result = await Comeback.deleteMany({});
    res.json({ ok: true, deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /comebacks - create
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    if (!data.audit || !data.audit.flaggedBy) {
      return res.status(400).json({ error: 'audit.flaggedBy is required' });
    }
    const created = await Comeback.create({
      ...data,
      audit: {
        ...data.audit,
        log: [
          ...(data.audit.log || []),
          { action: 'flagged', by: data.audit.flaggedBy, notes: data.audit?.notes || '' },
        ],
      },
    });
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /comebacks - list with filters & pagination
router.get('/', async (req, res) => {
  try {
    const filters = buildFilters(req.query);
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Comeback.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Comeback.countDocuments(filters),
    ]);

    res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /comebacks/export.csv - CSV export
router.get('/export.csv', async (req, res) => {
  try {
    const { Parser } = require('json2csv');
    const filters = buildFilters(req.query);
    const limit = Math.min(parseInt(req.query.limit || '0', 10) || 0, 20000);
    const fieldsQuery = (req.query.fields || '').trim();

    const defaultFields = [
      'roNumber','customerName','vehicle.make','vehicle.model','vehicle.year','vehicle.vin',
      'dateOriginalRepair','dateOfComeback','reportedIssue','notes','type',
      'financial.partsCost','financial.laborCost','financial.warrantyOrDiscount',
      'resolution.assignedTo','resolution.status','resolution.notes',
      'audit.flaggedBy','audit.reviewedBy','audit.finalClassification',
      'location','advisor','_id','createdAt','updatedAt',
    ];

    const selected = fieldsQuery
      ? fieldsQuery.split(',').map(s => s.trim()).filter(Boolean)
      : defaultFields;

    let q = Comeback.find(filters).sort({ createdAt: -1 }).lean();
    if (limit > 0) q = q.limit(limit);
    const docs = await q;

    const rows = docs.map(d => ({
      roNumber: d.roNumber || '',
      customerName: d.customerName || '',
      'vehicle.make': d.vehicle?.make || '',
      'vehicle.model': d.vehicle?.model || '',
      'vehicle.year': d.vehicle?.year ?? '',
      'vehicle.vin': d.vehicle?.vin || '',
      dateOriginalRepair: d.dateOriginalRepair ? new Date(d.dateOriginalRepair).toISOString().slice(0,10) : '',
      dateOfComeback: d.dateOfComeback ? new Date(d.dateOfComeback).toISOString().slice(0,10) : '',
      reportedIssue: d.reportedIssue || '',
      notes: d.notes || '',
      type: d.type || '',
      'financial.partsCost': d.financial?.partsCost ?? '',
      'financial.laborCost': d.financial?.laborCost ?? '',
      'financial.warrantyOrDiscount': d.financial?.warrantyOrDiscount ?? '',
      'resolution.assignedTo': d.resolution?.assignedTo || '',
      'resolution.status': d.resolution?.status || '',
      'resolution.notes': d.resolution?.notes || '',
      'audit.flaggedBy': d.audit?.flaggedBy || '',
      'audit.reviewedBy': d.audit?.reviewedBy || '',
      'audit.finalClassification': d.audit?.finalClassification || '',
      location: d.location || '',
      advisor: d.advisor || '',
      _id: d._id?.toString() || '',
      createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : '',
      updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : '',
    }));

    const parser = new Parser({ fields: selected });
    const csv = parser.parse(rows);

    const today = new Date().toISOString().slice(0,10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="comebacks_${today}.csv"`);
    res.status(200).send(csv);
  } catch (err) {
    console.error('CSV export error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /comebacks/summary - grouped counts for charts
router.get('/summary', async (req, res) => {
  try {
    const filters = buildFilters(req.query);

    const pipeline = [
      { $match: filters },
      {
        $facet: {
          byType: [
            { $group: { _id: '$type', count: { $sum: 1 } } },
            { $project: { _id: 0, type: '$_id', count: 1 } },
            { $sort: { count: -1 } }
          ],
          byStatus: [
            { $group: { _id: '$resolution.status', count: { $sum: 1 } } },
            { $project: { _id: 0, status: '$_id', count: 1 } },
            { $sort: { count: -1 } }
          ],
          byDay: [
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$dateOfComeback' } },
                count: { $sum: 1 }
              }
            },
            { $project: { _id: 0, date: '$_id', count: 1 } },
            { $sort: { date: 1 } }
          ]
        }
      }
    ];

    const [facet] = await Comeback.aggregate(pipeline);
    const total = await Comeback.countDocuments(filters);

    res.json({
      total,
      byType: facet?.byType || [],
      byStatus: facet?.byStatus || [],
      byDay: facet?.byDay || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- param routes (MUST be last) ----------

// GET /comebacks/:id
router.get('/:id', async (req, res) => {
  try {
    const item = await Comeback.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch {
    res.status(400).json({ error: 'Invalid ID' });
  }
});

// PUT /comebacks/:id
router.put('/:id', async (req, res) => {
  try {
    const updates = req.body || {};
    const existing = await Comeback.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const auditLog = existing.audit?.log || [];
    const who = updates._by || 'system';

    if (updates.resolution?.status && updates.resolution.status !== existing.resolution.status) {
      auditLog.push({ action: 'status_changed', by: who, notes: `to ${updates.resolution.status}` });
    }
    if (updates.type && updates.type !== existing.type) {
      auditLog.push({ action: 'classified', by: who, notes: `type → ${updates.type}` });
    }
    if (updates.audit?.reviewedBy && updates.audit.reviewedBy !== existing.audit.reviewedBy) {
      auditLog.push({ action: 'reviewed', by: updates.audit.reviewedBy });
    }

    const updated = await Comeback.findByIdAndUpdate(
      req.params.id,
      { ...updates, 'audit.log': auditLog },
      { new: true, runValidators: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /comebacks/:id
router.delete('/:id', async (req, res) => {
  try {
    const out = await Comeback.findByIdAndDelete(req.params.id);
    if (!out) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
