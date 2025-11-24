const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const Task = require('../models/Task');

// Get employees by department (for dropdown)
router.get('/employees/:department', async (req, res) => {
  try {
    const { department } = req.params;
    const employees = await Employee.find({ 
      department, 
      isManager: false 
    }).select('userId name email');
    
    if (!employees) {
      return res.status(404).json({ msg: 'No employees found' });
    }
    res.json(employees);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Assign task to employee
router.post('/assign-task', async (req, res) => {
  try {
    const { title, description, assignedTo, dueDate, priority, assignedBy } = req.body;
    
    if (!title || !assignedTo || !assignedBy) {
      return res.status(400).json({ msg: 'Missing required fields' });
    }

    const task = new Task({
      title,
      description,
      assignedTo,
      dueDate,
      priority,
      assignedBy,
      status: 'Pending'
    });

    await task.save();
    res.status(201).json({ msg: 'Task assigned successfully', task });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

module.exports = router;