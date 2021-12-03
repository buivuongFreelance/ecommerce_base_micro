import express from 'express';
import { validateRequest, BadRequestError, QueryFailedError } from '@tomrot/common';
import { body } from 'express-validator';
import IMEI from 'node-imei';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';

const router = express.Router();

router.post('/api/v1/device/checkImei', validateAuth, [
    body('imei')
        .trim()
        .notEmpty()
        .withMessage('You must supply an imei'),
], validateRequest, async (req, res) => {
    const { imei } = req.body;
    const check = new IMEI();
    if (!check.isValid(imei)) {
        throw new BadRequestError('IMEI not valid');
    }
    const tac = imei.toString().substring(0, 8);
    const tacCheck = await db('tacs').first().where('code', tac);
    if (!tacCheck) {
        throw new BadRequestError('IMEI not valid');
    }
    try{
        const imeiDetail = await db('models')
            .innerJoin('brands', 'models.brand_id', 'brands.id')
            .innerJoin('categories', 'models.category_id', 'categories.id')
            .first(
                'models.device_detail as other_detail',
                'models.id as model_id',
                'models.name as model',
                'models.image_url as model_image_url',
                'brands.id as brand_id',
                'brands.name as brand_name',
                'brands.image_url as brand_image_url',
                'categories.id as category_id',
                'categories.name as category_name',
            )
            .where('models.id', tacCheck.model_id);
        if (imeiDetail) {
            imeiDetail.imei = imei;
        }
        res.send(imeiDetail);
    }catch(err){
        console.log(err);
        throw new QueryFailedError();
    }
});

export { router as checkImeiRouter };