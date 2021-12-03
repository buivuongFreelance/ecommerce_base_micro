import helper from 'micro-helper';
import express from 'express';
import path from 'path';

require('dotenv').config();

const { EMAIL_SUPPORT, PASS_SUPPORT } = process.env;
const Email = require('email-templates');

const nodemailer = require('nodemailer');

const router = express.Router();
router.post('/registration', async (req, res) => {
  try {
    const payload = req.body;
    const emailTemplate = new Email({
      transport: {
        jsonTransport: true,
      },
      views: {
        options: {
          extension: 'ejs',
        },
      },
    });
    const locals = {
      name: payload.email,
      api: payload.api,
    };
    const html = await emailTemplate.render(
      path.resolve(__dirname, '..', 'templates/registration'),
      locals,
    );
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: EMAIL_SUPPORT,
        pass: PASS_SUPPORT,
      },
    });
    const mailOptions = {
      from: 'dingtoi@gmail.com',
      to: payload.email,
      subject: 'email verification',
      html,
    };
    await transporter.sendMail(mailOptions);
    
    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    console.log(`error${JSON.stringify(error)}`);
    return helper.showServerError(res, error);
  }
});
router.post('/forgotPassword', async (req, res) => {
  try {
    const payload = req.body;
    const emailTemplate = new Email({
      transport: {
        jsonTransport: true,
      },
      views: {
        options: {
          extension: 'ejs',
        },
      },
    });
    const locals = {
      name: payload.email,
      password: payload.ramdomPassword,
      url: payload.api,
    };
    const html = await emailTemplate.render(
      path.resolve(__dirname, '..', 'templates/forgotpassword'),
      locals,
    );
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: EMAIL_SUPPORT,
        pass: PASS_SUPPORT,
      },
    });
    const mailOptions = {
      from: 'dingtoi@gmail.com',
      to: payload.email,
      subject: 'Forgot Password',
      html,
    };
    await transporter.sendMail(mailOptions);
    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    console.log(`error${JSON.stringify(error)}`);
    return helper.showServerError(res, error);
  }
});
export default router;
