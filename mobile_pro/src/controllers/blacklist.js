import axios from 'axios';
import imeiCheck from 'imei';
import config from '../config';

const checkBlacklist = async (req, res) => {
  const { imei, countryCode } = req.body;
  const imeiNew = imei.replace(/\s/g, '');
  if (!imei) {
    return res.status(422).json({ message: 'imei must provided' });
  }
  if (!countryCode) {
    return res.status(422).json({ message: 'country code must provided' });
  }
  if (!imeiCheck.isValid(imeiNew)) {
    return res.status(422).json({ message: 'imei not valid' });
  }
  const { ERR_BAD_REQUEST, ERR_USAGE } = config;

  if (!req.login) {
    return res.status(400).json(ERR_BAD_REQUEST);
  }

  const APIKEY = process.env.BLACKLIST_API_KEY;
  const url = process.env.BLACKLIST_URL;

  const headers = {
    Authorization: APIKEY,
    'Content-Type': 'application/json',
  };

  const data = {
    devices: [imeiNew],
  };

  try {
    const result = await axios({
      method: 'POST',
      url,
      headers,
      data,
    });

    if (result.data.data) {
      if (result.data.data.length > 0) {
        const blacklistRes = result.data.data[0].BlacklistStatus;
        if (blacklistRes === 'No') {
          return res.json({ done: true, status: 'CLEAN', type: 'success' });
        }
        return res.json({ done: true, status: 'BLACKLISTED', type: 'error' });
      }
      return res.status(500).json({ done: ERR_USAGE });
    }
    return res.status(500).json({ done: ERR_USAGE });
  } catch (error) {
    if (error.response.status === 400) {
      return res.status(422).json({ done: ERR_USAGE });
    }
    return res.status(500).json({ done: ERR_USAGE });
  }
};

module.exports = {
  checkBlacklist,
};
