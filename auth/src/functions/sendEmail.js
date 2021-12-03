import axios from 'axios';

const sendEmailRegistration = (email, api, url) => {
  const data = {
    email,
    api,
  };
  axios({
    method: 'POST',
    url,
    data,
  });
};
const sendEmailForgotPassword = async (email, ramdomPassword, url, api) => {
  const data = {
    email,
    ramdomPassword,
    api,
  };
  await axios({
    method: 'POST',
    url,
    data,
  });
};
export default { sendEmailRegistration, sendEmailForgotPassword };
