/* eslint-disable import/prefer-default-export */
import helper from 'micro-helper';
import db from '../adapters/db';

export const listOpenDispute = async (req, res) => {
    try {
        const list = await db('open_disputes')
            .select();

        const count = await db('open_disputes')
            .count('id', { as: 'count' })
            .first();

        return helper.showSuccessOk(res, { list, count: count.count });
    } catch (error) {
        return helper.showServerError(res, error);
    }
};

export const rejectOpenDispute = async (req, res) => {
    try {

        await db.transaction(async (trx) => {
            await trx();
        });


        return helper.showSuccessOk(res, helper.SUCCESS);
    } catch (error) {
        return helper.showServerError(res, error);
    }
};
