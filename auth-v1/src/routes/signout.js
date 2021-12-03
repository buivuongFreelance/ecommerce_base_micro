import express from 'express';
import { body } from 'express-validator';
import { validateAuth } from '../middleware/validate';
import { validateRequest, QueryFailedError } from '@tomrot/common';
import db from '../adapters/db';

const router = express.Router();

router.post('/api/v1/auth/signout', validateAuth, [
    body('clientId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a client Id')
], validateRequest, async (req, res) => {
    const { clientId } = req.body;
    const { userId } = req;
    try {
        await db('auth_access_tokens')
            .del()
            .where({
                user_id: userId,
                client_id: clientId
            })
    } catch (err) {
        console.log(err);
        throw new QueryFailedError();
    }
    res.send({});
});

export { router as signoutRouter };