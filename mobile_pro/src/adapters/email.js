import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'buivuongdhmo@gmail.com',
    pass: 'Zaq1@wsxcde3',
  },
});

export default transporter;
