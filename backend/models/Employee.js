const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
    userId: {
    type: String,
    unique: true,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    unique: true,
    required: true,
    match: /^\d{10}$/
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  dob: {
    type: Date,
    required: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  doj: {
    type: Date,
    required: true
  },
  type: {
    type: String,
    enum: ['Intern', 'Remote', 'Onsite', 'Hybrid'],
    required: true
  },
  isAdmin: {
  type: Boolean,
  default: false
  },
  isManager: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

module.exports = mongoose.model('Employee', employeeSchema);