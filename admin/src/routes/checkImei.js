import express from 'express';
import { validateRequest, BadRequestError, QueryFailedError, ErrorType } from '@tomrot/common';
import { body } from 'express-validator';
import { v1 as uuidv1 } from 'uuid';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';
import IMEI from 'node-imei';

const router = express.Router();

router.post('/api/v1/device/checkImei', validateAuth, [
    body('imei')
        .trim()
        .notEmpty()
        .withMessage('You must supply an imei'),

], validateRequest, async (req, res) => {
    try {
        const { imei } = req.body;
        const check = new IMEI();
        if (!check.isValid(imei)) {
            throw new BadRequestError(ErrorType.NotValid);
        }
        const tac = imei.toString().substring(0, 8);

        const tacCheck = await db('tacs').first().where('code', tac);
        if (!tacCheck) throw new BadRequestError(ErrorType.NotExists);

        const detailImei = await db('tacs')
            .innerJoin('tacs_model_links', 'tacs.id', 'tacs_model_links.tac_id')
            .innerJoin('models', 'models.id', 'tacs_model_links.model_id')
            .innerJoin('models_brand_links', 'models.id', 'models_brand_links.model_id')
            .innerJoin('brands', 'brands.id', 'models_brand_links.brand_id')
            .first(
                'models.id as model_id',
                'models.name as model',
                'brands.id as brand_id',
                'brands.name as brand_name',
            )
            .where('tacs.id', tacCheck.id);
        if (detailImei) {
            detailImei.imei = imei;
        }
        return res.send({
            detail: detailImei
        });

    } catch (err) {
        console.log(err);
        throw new QueryFailedError();
    }
});

export { router as checkImeiRouter };