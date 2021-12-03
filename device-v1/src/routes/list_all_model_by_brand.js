import express from 'express';
import { validateRequest, QueryFailedError } from '@tomrot/common';
import { body } from 'express-validator';
import db from '../adapters/db';

const router = express.Router();

router.post('/api/v1/device/model/listAllByBrand', [
    body('limit')
        .trim()
        .notEmpty()
        .withMessage('You must supply an limit'),
    body('brandId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a brand id'),
    body('filter')
        .trim()
        .notEmpty()
        .withMessage('You must supply a filter'),
], validateRequest,
    async (req, res) => {
        const {
            limit, offset, filter, brandId,
        } = req.body;
        const parsedFilter = JSON.parse(filter);
        const { modelName } = parsedFilter;

        try {
            const listModel = await db('models')
                .join('brands', 'models.brand_id', 'brands.id')
                .join('categories', 'models.category_id', 'categories.id')
                .select(
                    'models.id as model_id',
                    'models.name as model_name',
                    'models.image_url as model_image_url',
                    'brands.id as brand_id',
                    'brands.name as brand_name',
                    'categories.id as category_id',
                    'categories.name as category_name',
                )
                .where('models.name', 'ILIKE', `%${modelName}%`)
                .where('brands.id', brandId)
                .limit(limit)
                .offset(offset);
            const countRow = await db('models')
                .join('brands', 'models.brand_id', 'brands.id')
                .join('categories', 'models.category_id', 'categories.id')
                .count('models.id', { as: 'count' })
                .where('models.name', 'ILIKE', `%${modelName}%`)
                .where('brands.id', brandId)
                .first();
            res.send({
                list: listModel,
                count: countRow.count,
            });
        } catch (err) {
            throw new QueryFailedError();
        }
    });

export { router as listAllModelByBrandRouter };