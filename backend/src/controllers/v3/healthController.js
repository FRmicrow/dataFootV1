
import { HealthPrescriptionService } from '../../services/v3/HealthPrescriptionService.js';
import db from '../../config/database.js';

/**
 * Health Controller
 * Implements US_062: Health Prescription & Data Recovery System
 */

export const generatePrescriptions = async (req, res) => {
    try {
        const result = await HealthPrescriptionService.generatePrescriptions();
        res.json({
            message: "Prescription generation complete",
            ...result
        });
    } catch (error) {
        console.error("Prescription generation error:", error);
        res.status(500).json({ error: error.message });
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
        const prescriptions = db.all(sql, params);
        res.json(prescriptions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const executePrescription = async (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ error: "Missing prescription id" });
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
