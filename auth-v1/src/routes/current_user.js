import express from 'express';
import { currentUser } from '@tomrot/common';
import { requireAuth } from '@tomrot/common';

const router = express.Router();

router.get('/api/v1/auth/currentUser', currentUser, requireAuth, (req, res) => {
    res.send({ currentUser: req.currentUser || null });
});

export { router as currentUserRouter };