const Joi = require('joi');

exports.validate = schema => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const messages = error.details.map(d => d.message.replace(/"/g, '')).join('. ');
    return res.status(400).json({ success: false, error: messages });
  }
  next();
};