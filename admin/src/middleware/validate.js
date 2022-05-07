import { validateAuth as validateAuthCommon } from '@tomrot/common';
import AdminFirebase from '../adapters/firebase';

export const validateAuth = async (req, res, next) => {
    return validateAuthCommon(req, res, next, AdminFirebase);
};