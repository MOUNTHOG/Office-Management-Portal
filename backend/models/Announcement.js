const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  department: {
    type: String,
    required: true,
    trim: true
  },
  announcements: [
    {
      type: String,
      required: true
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);