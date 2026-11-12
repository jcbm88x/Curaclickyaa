const alertService = require('../services/alert.service');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const result = await alertService.listAlerts(req.user._id);
  res.json(result);
});

const create = asyncHandler(async (req, res) => {
  const alert = await alertService.createAlert(req.user._id, req.body);
  res.status(201).json({ alert });
});

const update = asyncHandler(async (req, res) => {
  const alert = await alertService.updateAlert(
    req.user._id,
    req.params.alertId,
    req.body,
  );
  res.json({ alert });
});

const remove = asyncHandler(async (req, res) => {
  const result = await alertService.deleteAlert(
    req.user._id,
    req.params.alertId,
  );
  res.json(result);
});

module.exports = { create, list, remove, update };
