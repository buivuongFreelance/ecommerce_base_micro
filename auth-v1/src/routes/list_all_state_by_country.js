import express from 'express';
import { body } from 'express-validator';
import { QueryFailedError, BadRequestError } from '@tomrot/common';
import { validateRequest } from '@tomrot/common';
import db from '../adapters/db';

const router = express.Router();

router.post('/api/v1/auth/state/listByCountry', [
    body('countryCode')
        .trim()
        .notEmpty()
        .withMessage('You must supply a country code'),
], validateRequest, async (req, res) => {
    const { countryCode } = req.body;

    const country = await db('countries').first('id').where('country_code_alpha2', countryCode);
    if (!country) {
        throw new BadRequestError('Country not found');
    }

    try {
        const states = await db('states').select('*').where('country_id', country.id)
            .orderBy('name', 'asc');
        res.send(states);
    } catch (err) {
        throw new QueryFailedError();
    }
});

export { router as listAllStateByCountryRouter };