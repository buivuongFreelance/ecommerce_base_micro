/* eslint-disable import/prefer-default-export */
import {
  LangMicro, ServerMicro,
} from '@mm_organ/common';

export const getLang = async (req, res) => ServerMicro.displaySuccess(res, LangMicro);
