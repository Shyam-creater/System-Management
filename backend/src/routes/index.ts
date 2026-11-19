import { Router } from 'express';
import { nodeController } from '../controllers/nodeController.js';
import { telemetryController } from '../controllers/telemetryController.js';
import { alertController } from '../controllers/alertController.js';
import { reportController } from '../controllers/reportController.js';
import { softwareController } from '../controllers/softwareController.js';
import { simulatorController } from '../controllers/simulatorController.js';
import { algorithmController } from '../controllers/algorithmController.js';
import { sshController } from '../controllers/sshController.js';
import { authController } from '../controllers/authController.js';

const router = Router();

// Authentication
router.post('/auth/login', (req, res) => authController.login(req, res));
router.get('/auth/me', (req, res) => authController.me(req, res));
router.post('/auth/logout', (req, res) => authController.logout(req, res));

// Master Status & Fleet
router.get('/status', (req, res) => nodeController.getStatus(req, res));
router.get('/nodes', (req, res) => nodeController.getNodes(req, res));
router.post('/nodes/purge_offline', (req, res) => nodeController.purgeOffline(req, res));

// Agent Telemetry
router.post('/report', (req, res) => telemetryController.receiveReport(req, res));
router.get('/history', (req, res) => telemetryController.getHistory(req, res));

// Alerts & Notifications
router.get('/alerts', (req, res) => alertController.getAlerts(req, res));

// Reports & Analytics
router.get('/reports', (req, res) => reportController.getReports(req, res));
router.post('/reports/generate', (req, res) => reportController.generateReport(req, res));

// Simulation Fleet
router.post('/simulator/toggle', (req, res) => simulatorController.toggle(req, res));
router.get('/simulator/status', (req, res) => simulatorController.getStatus(req, res));

// Software Inventory & Exports
router.get('/software', (req, res) => softwareController.getSoftware(req, res));
router.post('/software/rescan', (req, res) => softwareController.rescanSoftware(req, res));
router.get('/export/excel', (req, res) => softwareController.exportSoftware(req, res));
router.get('/export/csv', (req, res) => softwareController.exportSoftware(req, res));
// Compatible alias endpoints
router.get('/software/export.xlsx', (req, res) => softwareController.exportSoftware(req, res));
router.get('/software/export.csv', (req, res) => softwareController.exportSoftware(req, res));

// Algorithmic Deadlock & Banker's Suite
router.post('/algorithms/deadlock', (req, res) => algorithmController.runDeadlockSimulation(req, res));
router.post('/algorithms/bankers', (req, res) => algorithmController.runBankersSafety(req, res));
router.post('/algorithms/bankers/request', (req, res) => algorithmController.requestBankersResources(req, res));

// Agentless SSH Lab Nodes
router.post('/ssh/test', (req, res) => sshController.testConnection(req, res));
router.post('/ssh/connect', (req, res) => sshController.connectNode(req, res));
router.post('/ssh/register', (req, res) => sshController.connectNode(req, res));
router.get('/ssh/nodes', (req, res) => sshController.getNodes(req, res));
router.post('/ssh/remove', (req, res) => sshController.removeNode(req, res));
router.post('/ssh/poll', (req, res) => sshController.pollNode(req, res));
router.post('/ssh/refresh', (req, res) => sshController.pollNode(req, res));

export default router;
