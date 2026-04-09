
import { HealthPrescriptionService } from '../../services/v3/HealthPrescriptionService.js';
import db from '../../config/database.js';
import logger from '../../utils/logger.js';

/**
 * Health Controller
 * Implements US_062: Health Prescription & Data Recovery System
 */

export const generatePrescriptions = async (req, res) => {
    try {
        const result = await HealthPrescriptionService.generatePrescriptions();
        res.json({
            success: true,
            data: {
                message: "Prescription generation complete",
                ...result
            }
        });
    } catch (error) {
        logger.error({ err: error }, 'Prescription generation error');
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getPrescriptions = async (req, res) => {
    try {
        const { status = 'PENDING', type } = req.query;
        let sql = "SELECT * FROM V3_Health_Prescriptions WHERE status = ?";
        const params = [status];

        if (type) {
            sql += " AND type = ?";
            params.push(type);
        }

        sql += " ORDER BY priority DESC, created_at DESC";
        const prescriptions = await db.all(sql, params);
        res.json({ success: true, data: prescriptions });
    } catch (error) {
        logger.error({ err: error }, 'Prescription fetch error');
        res.status(500).json({ success: false, error: error.message });
    }
};

export const executePrescription = async (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, error: "Missing prescription id" });
    }

    // Since execution (imports) take time and use SSE, we set headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendLog = (message, type = 'info') => {
        res.write(`data: ${JSON.stringify({ message, type })}\n\n`);
    };
    sendLog.emit = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

    try {
        const result = await HealthPrescriptionService.execute(id, sendLog);
        sendLog(`🎉 Success: ${JSON.stringify(result)}`, 'complete');
        res.end();
    } catch (error) {
        sendLog(`❌ Critical Failure: ${error.message}`, 'error');
        res.end();
    }
};
