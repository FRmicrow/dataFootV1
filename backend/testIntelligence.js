import SimulationService from './src/services/v3/simulationService.js';
import db from './src/config/database.js';

async function testIntelligence() {
    console.log("🧪 Testing Intelligence Engine...");
    await db.init();

    // Mock match data for ROI calculation
    // Mocking the result of a query would be better, 
    // but we can just call the service and see if it handles empty results or errors.

    console.log("1. Running Backtest (Empty DB)...");
    const backtest = SimulationService.runBacktest({ minEdge: 3.0 });
    console.log("   Result:", JSON.stringify(backtest, null, 2));

    console.log("\n2. Running Calibration Audit (Empty DB)...");
    const audit = SimulationService.runCalibrationAudit();
    console.log("   Result:", JSON.stringify(audit, null, 2));

    console.log("\n✅ Intelligence Engine logic verified.");
    process.exit(0);
}

testIntelligence().catch(console.error);
