import { Router } from 'express';

const router = Router();

// Legacy API endpoints are decoupled to strip unrequested gaming features (e.g. daily spins, achievements, item shops).
// All classroom session endpoints run under /api/v1/teacher router.

export default router;
