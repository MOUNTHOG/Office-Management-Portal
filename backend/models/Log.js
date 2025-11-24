const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  loginDate: {
    type: Date,
    required: true
  },
  loginTime: {
    type: String,
    required: true
  },
  remoteIP: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('Log', logSchema);