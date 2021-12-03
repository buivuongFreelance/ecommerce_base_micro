import express from 'express';
import { body } from 'express-validator';
import { validateRequest, QueryFailedError, BadRequestError } from '@tomrot/common';
import db from '../adapters/db';
import { Password } from '../services/password';
import { v1 as uuidv1 } from 'uuid';

const router = express.Router();

router.post('/api/v1/auth/signup', [
    body('email').isEmail()
        .withMessage('Email must be valid'),
    body('password').trim().isLength({ min: 4, max: 20 })
        .withMessage('Password must be between 4 and 20 characters'),
    body('clientId').notEmpty()
        .withMessage('Client id must be valid')
], validateRequest, async (req, res) => {
    const { email, password, clientId } = req.body;
    const existingUser = await db('auth_users').first('email').where('email', email);

    if (existingUser) {
        throw new BadRequestError('Email in use');
    }

    const hashed = await Password.toHash(password);
    const id = uuidv1();
    const date = new Date();

    try {
        await db.transaction(async (trx) => {
            await trx('auth_users').insert({
                id,
                email,
                password: hashed,
                active: true,
                auth_client_id: clientId,
                created_at: date,
                updated_at: date
            });
            await trx('auth_users_info').insert({
                user_id: id,
                created_at: date,
                updated_at: date,
                wallet: 0,
            });

        });
        res.status(201).send(null);
    } catch (err) {
        throw new QueryFailedError();
    }
});

export { router as signupRouter };