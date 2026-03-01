
import SimulationQueueService from './SimulationQueueService.js';
import mlService from './mlService.js';
import db from '../../config/database.js';
import { cleanParams } from '../../utils/sqlHelpers.js';

/**
 * Forge Laboratory Service
 * Handles the "Breeding Cycle": Sequential Model Building + Historical Backtesting.
 */
class ForgeLaboratoryService {
    constructor() {
        this.activeCycles = new Map();
    }

    async startBreedingCycle(leagueId) {
        if (this.activeCycles.has(leagueId)) {
            return { success: false, message: "Breeding cycle already in progress for this league." };
        }

        const cycle = {
            leagueId,
            status: 'BUILDING_MODELS',
            totalSteps: 0,
            completedSteps: 0,
            logs: [],
            startTime: new Date().toISOString()
        };
        this.activeCycles.set(leagueId, cycle);

        // Run as async task
        this._runCycle(leagueId).catch(err => {
            console.error(`❌ Breeding Cycle Error [League ${leagueId}]:`, err);
            cycle.status = 'FAILED';
            cycle.error = err.message;
        });

        return { success: true, message: "Breeding cycle initiated." };
    }

    async _runCycle(leagueId) {
        const cycle = this.activeCycles.get(leagueId);
        cycle.logs.push(`🚀 Starting breeding cycle for League ${leagueId}`);

        try {
            // 1. Build Models for all 3 horizons
            cycle.logs.push("🔨 Step 1: Building Forge Models (Full, 5Y, 3Y)...");
            const buildRes = await mlService.buildForgeModels(leagueId);
            if (!buildRes.success) throw new Error(`Model building failed: ${buildRes.message}`);

            // Wait for build to complete (polling)
            let isBuilding = true;
            while (isBuilding) {
                await new Promise(r => setTimeout(r, 5000));
                const status = await mlService.getForgeBuildStatus();
                if (!status.is_building) {
                    if (status.error) throw new Error(`Model building failed: ${status.error}`);
                    isBuilding = false;
                }
            }
            cycle.logs.push("✅ Models built successfully.");

            // 2. Identify available years for simulations (US_217 Fix)
            const seasons = db.all("SELECT season_year FROM V3_League_Seasons WHERE league_id = ? AND imported_fixtures = 1", cleanParams([leagueId]));
            const yearsImported = seasons.map(s => s.season_year).sort((a, b) => b - a);

            if (yearsImported.length === 0) throw new Error("No imported seasons with fixtures found for this league.");

            const maxYear = yearsImported[0];
            const horizons = [
                { type: 'FULL_HISTORICAL', years: yearsImported },
                { type: '5Y_ROLLING', years: yearsImported.filter(y => y >= maxYear - 5) },
                { type: '3Y_ROLLING', years: yearsImported.filter(y => y >= maxYear - 3) }
            ];

            cycle.totalSteps = horizons.reduce((acc, h) => acc + h.years.length, 0);
            cycle.status = 'RUNNING_SIMULATIONS';

            // 3. Sequential Simulations
            for (const horizon of horizons) {
                cycle.logs.push(`🧪 Testing Horizon: ${horizon.type}...`);
                for (const year of horizon.years) {
                    cycle.logs.push(`   🔹 Simulating Season ${year} [${horizon.type}]...`);

                    // Trigger simulation with LAB_AUDIT tag (US_220)
                    SimulationQueueService.startSimulation(leagueId, year, 'STATIC', horizon.type, 1, 'LAB_AUDIT_CYCLE');

                    // Poll until this specific sim finishes
                    let isSimming = true;
                    while (isSimming) {
                        await new Promise(r => setTimeout(r, 4000));
                        const job = SimulationQueueService.getJobStatus(leagueId, year, horizon.type);

                        // Verify this is the job we just started and it's done
                        if (!job || job.horizon_type !== horizon.type || (job.status !== 'RUNNING' && job.status !== 'PENDING')) {
                            if (job && job.status === 'FAILED') {
                                cycle.logs.push(`   ⚠️ Sim for ${year} failed: ${job.error_log}`);
                            } else {
                                cycle.logs.push(`   ✅ Sim for ${year} validated.`);
                            }
                            isSimming = false;
                        }
                    }
                    cycle.completedSteps++;
                }
            }

            cycle.status = 'COMPLETED';
            cycle.logs.push("🏆 Breeding cycle finished successfully.");

        } catch (err) {
            cycle.status = 'FAILED';
            cycle.error = err.message;
            cycle.logs.push(`❌ Cycle aborted: ${err.message}`);
        }
    }

    getCycleStatus(leagueId) {
        return this.activeCycles.get(leagueId) || { status: 'IDLE' };
    }
}

export default new ForgeLaboratoryService();
