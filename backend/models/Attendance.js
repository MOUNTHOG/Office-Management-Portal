const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  presentDays: [
    {
      type: Date
    }
  ],
  leaveDays: [
    {
      type: Date
    }
  ]
});

module.exports = mongoose.model('Attendance', attendanceSchema);