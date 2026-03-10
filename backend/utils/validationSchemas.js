const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

exports.bargainSchema = {
  init: Joi.object({
    bookingId:    objectId.required(),
    initialOffer: Joi.number().positive().required()
  }),
  counter: Joi.object({
    amount:  Joi.number().positive().required(),
    message: Joi.string().max(500).optional()
  })
};

exports.chatSchema = {
  initChat: Joi.object({
    providerId: objectId.required(),
    bookingRef: objectId.optional()
  }),
  sendMessage: Joi.object({
    chatId:  objectId.required(),
    content: Joi.string().min(1).max(2000).required(),
    type:    Joi.string().valid('text', 'file', 'image').default('text'),
    replyTo: objectId.optional()
  })
};

exports.chatbotSchema = {
  chat: Joi.object({
    message:   Joi.string().min(1).max(1000).required(),
    sessionId: Joi.string().uuid().optional()
  })
};

exports.authSchema = {
  register: Joi.object({
    name:     Joi.string().min(2).max(50).required(),
    email:    Joi.string().email().required(),
    password: Joi.string().min(8).max(100).required(),
    role:     Joi.string().valid('customer', 'provider').required()
  }),
  login: Joi.object({
    email:    Joi.string().email().required(),
    password: Joi.string().required()
  })
};