import express from 'express';
import { body } from 'express-validator';
import { BadRequestError, QueryFailedError } from '@tomrot/common';
import { validateRequest } from '@tomrot/common';
import { Password } from '../services/password';
import { v1 as uuidv1 } from 'uuid';
import db from '../adapters/db';

const router = express.Router();

router.post('/api/v1/auth/signin', [
    body('email')
        .isEmail()
        .withMessage('Email must be valid'),
    body('password')
        .trim()
        .notEmpty()
        .withMessage('You must supply a password'),
    body('clientId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a client Id')
], validateRequest, async (req, res) => {
    const { email, password, clientId } = req.body;

    const existingUser = await db('auth_users').first('id', 'email', 'password').where('email', email);

    if (!existingUser) {
        throw new BadRequestError('Invalid credentials');
    }

    const passwordsMatch = await Password.compare(existingUser.password, password);

    if (!passwordsMatch) {
        throw new BadRequestError('Invalid credentials');
    }

    const token = uuidv1();
    const date = new Date();
    try {
        await db('auth_access_tokens')
            .insert({
                client_id: clientId, user_id: existingUser.id,
                token, created_at: date, updated_at: date,
            });
    } catch (err) {
        throw new QueryFailedError();
    }

    existingUser.token = token;
    delete existingUser.password;

    res.status(200).send(existingUser);
});

export { router as signinRouter };