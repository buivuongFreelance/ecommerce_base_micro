import db from '../adapters/db';
import { validateAuth as validateAuthCommon } from '@tomrot/common';

export const validateAuth = async (req, res, next) => {
    return validateAuthCommon(req, res, next, db);
};