// routes.js
const userRoutes = require('./routes/user/userRoutes');
const projectRoutes = require('./routes/project/projectRoutes');
const protocolRoutes = require('./routes/protocol/protocolRoutes');
const searchRoutes = require('./routes/search/searchRoutes');
const screeningRoutes = require('./routes/screening/screeningRoutes');
const qualityAssessmentRoutes = require('./routes/qualityAssessment/qualityAssessmentRoutes');
const dataExtractionRoutes = require('./routes/dataExtraction/dataExtractionRoutes');
const dataSynthesisRoutes = require('./routes/dataSynthesis/dataSynthesisRoutes');
const reportRoutes = require('./routes/Report/ReportRoutes');
const mlRoutes = require('./routes/ml/mlRoutes');
const communicationRoutes = require('./routes/communication/communicationRoutes');
const adminUserRoutes = require('./routes/adminUser/adminUserRoutes');
const adminSettingRoutes = require('./routes/setting/adminSettingRoutes');

module.exports = {
  userRoutes,
  projectRoutes,
  protocolRoutes,
  searchRoutes,
  screeningRoutes,
  qualityAssessmentRoutes,
  dataExtractionRoutes,
  dataSynthesisRoutes,
  reportRoutes,
  mlRoutes,
  communicationRoutes,
  adminUserRoutes,
  adminSettingRoutes,
};
