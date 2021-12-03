import express from 'express';
import { body } from 'express-validator';
import { QueryFailedError, BadRequestError } from '@tomrot/common';
import { validateRequest } from '@tomrot/common';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';
import { shippoAddressCreate } from '../adapters/shippo';
import { v1 as uuidv1 } from 'uuid';

const router = express.Router();

router.post('/api/v1/auth/shippingAddress/update', validateAuth, [
    body('id')
        .trim()
        .notEmpty()
        .withMessage('You must supply an id'),
    body('clientId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a client Id'),
    body('countryCode')
        .trim()
        .notEmpty()
        .withMessage('You must supply a country code'),
    body('stateCode')
        .trim()
        .notEmpty()
        .withMessage('You must supply a state code'),
    body('cityId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a city id'),
    body('firstName')
        .trim()
        .notEmpty()
        .withMessage('You must supply a first name'),
    body('lastName')
        .trim()
        .notEmpty()
        .withMessage('You must supply a first name'),
    body('street')
        .trim()
        .notEmpty()
        .withMessage('You must supply a street'),
    body('zip')
        .trim()
        .notEmpty()
        .withMessage('You must supply a zip'),
], validateRequest, async (req, res) => {
    const { countryCode, stateCode, cityId, firstName, lastName, street, zip, id } = req.body;

    const { userId } = req;

    const fullName = `${firstName} ${lastName}`;

    const city = await db('cities').first('name').where('id', cityId);
    const user = await db('auth_users').first('email').where('id', userId);

    if (!user) {
        throw new BadRequestError('User not found');
    }

    if (!city) {
        throw new BadRequestError('City not found');
    }

    const address = await shippoAddressCreate({
        name: fullName,
        street,
        city: city.name,
        state: stateCode,
        zip,
        country: countryCode,
        email: user.email,
    });
    if (!address) {
        throw new BadRequestError('Address not found');
    }
    if (!address.validation_results) {
        throw new BadRequestError('Address not found');
    }
    const isValidAddress = address.validation_results.is_valid;
    if (!isValidAddress) {
        throw new BadRequestError('Address not found');
    }

    try {
        const date = new Date();

        await db('shippings').update({
            first_name: firstName,
            last_name: lastName,
            address: street,
            zip,
            city_id: cityId,
            user_id: userId,
            state_code: stateCode,
            country_code: countryCode,
            created_at: date,
            updated_at: date,
        }).where('id', id);
        res.send({});
    } catch (err) {
        throw new QueryFailedError();
    }
});

export { router as updateShippingAddressRouter };