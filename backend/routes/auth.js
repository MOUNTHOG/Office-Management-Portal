const express = require('express');
const svgCaptcha = require('svg-captcha');
const session = require('express-session');
const Employee = require('../models/Employee');
const Announcement = require('../models/Announcement');
const Task = require('../models/Task');
const Attendance = require('../models/Attendance');
const router = express.Router();
const crypto = require('crypto');
const Log = require('../models/Log');


// app.get('/generate/captcha', (req, res) => {
//   const captcha = svgCaptcha.create({ noise: 5, color: false });
//   req.session.captcha = captcha.text; 
//   res.json({ captcha: captcha.data });
// })

// app.get('/login', (req, res) => {
//   const captcha = svgCaptcha.create({ noise: 5, color: false });
//   req.session.captcha = captcha.text; 
//   res.render('login', { 
//     message: null,
//     captcha: captcha.data 
//   });
// });

const sessions = {};

function generateStrongPassword(length = 8) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{}|;:,.<>?';
  let password = '';
  const bytes = crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    const index = bytes[i] % charset.length;
    password += charset[index];
  }

  return password;
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}


function generateSessionId() {
  return crypto.randomBytes(16).toString("hex");
}


router.get('/profile/:userId', async (req, res) => {
  try {
    console.log("Sessions:", sessions);

    const sessionId = req.cookies.sessionId;
    console.log("Session ID:", sessionId);

    if (!sessionId || !sessions[sessionId]) {
      return res.status(401).json({ msg: 'Unauthorized access' });
    }

    const session = sessions[sessionId];

    if (!session.expiresAt || session.expiresAt < Date.now()) {
      delete sessions[sessionId]; // Remove expired session
      return res.status(401).json({ msg: 'Session expired, please login again' });
    }

    if (session.userId !== req.params.userId) {
      return res.status(403).json({ msg: 'Forbidden: Cannot access other user profiles' });
    }

    const profile = await Employee.findOne({ userId: req.params.userId });
    if (!profile) return res.status(404).json({ msg: 'User not found' });

    console.log("User Profile:", profile);
    res.send(profile);

  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});



router.get('/me', async (req, res) => {
  try {
    // console.log("Sessions:", sessions);

    const sessionId = req.cookies.sessionId;
    console.log("Session ID:", sessionId);

    if (!sessionId || !sessions[sessionId]) {
      return res.status(401).json({ msg: 'Unauthorized access' });
    }

    const session = sessions[sessionId];

    if (!session.expiresAt || session.expiresAt < Date.now()) {
      delete sessions[sessionId]; // Remove expired session
      return res.status(401).json({ msg: 'Session expired, please login again' });
    }

    const profile = await Employee.findOne({userId: sessions[sessionId].userId}); 
    if (!profile) {
      console.log("User not found for session ID:", sessionId);
      return res.status(404).json({ msg: 'User not found' });
    }
    console.log("User Profile:", profile);
    if(profile?.isAdmin){
      console.log("User is an admin");
      res.send(profile);
    }else{
      console.log("User is not an admin");
      res.status(403).json({ msg: 'Forbidden: Access denied for non-admin users', profile: profile });
    }

  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// add to logs
async function AddtoLogs(userId, name, req) {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    // Check if a log for today already exists for this user
    const existingLog = await Log.findOne({
      userId,
      loginDate: { $gte: startOfDay, $lte: endOfDay }
    });

    if (existingLog) {
      return; // Already logged today
    }

    const remoteIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = new Date();
    const loginDate = now;
    const loginTime = now.toTimeString().split(' ')[0];

    const log = new Log({
      userId,
      name,
      loginDate,
      loginTime,
      remoteIP
    });
    await log.save();
    console.log("Log saved successfully");
  } catch (err) {
    console.error("Error saving in logs:", err.message);
  }
}

// add to logs
async function Mark(userId, name, req) {
  try {
    let attendance = await Attendance.findOne({ userId });
    const today = new Date();
    const todayDateString = today.toDateString();

    // If no attendance record exists, create one
    if (!attendance) {
      attendance = new Attendance({
        userId,
        presentDays: [today],
        leaveDays: []
      });
      await attendance.save();
      return;
    }

    // Check if today is already marked as present
    const alreadyPresent = attendance.presentDays.some(
      date => new Date(date).toDateString() === todayDateString
    );

    if (!alreadyPresent) {
      attendance.presentDays.push(today);
      await attendance.save();
    }
  } catch (err) {
    console.error("Error saving in logs:", err.message);
  }
}


// get logs
router.get('/fetch-logs', async(req,res)=>{
  try {
    const logs = await Log.find({});
    if (!logs || logs.length === 0) return res.status(404).json({ msg: 'No logs found' });

    res.send(logs);

  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
})


router.get('/announcements/:userId', async (req, res) => {
  try {
    // Find the user's department
    const user = await Employee.findOne({ userId: req.params.userId });
    if (!user) return res.status(404).json({ msg: 'User not found' });

    // Find announcements for that department
    const deptAnnouncements = await Announcement.findOne({ department: user.department });
    if (!deptAnnouncements) return res.json({ announcements: [] });

    res.send({ announcements: deptAnnouncements.announcements });

  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

router.get('/tasks/:userId', async (req, res) => {
  try {
    // Get all tasks for the user
    const tasks = await Task.find({ assignedTo : req.params.userId });
    res.send(tasks);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

router.get('/attendance/:userId', async (req, res) => {
  try {
    // Get all attendance details for the user
    const attendance = await Attendance.find({ userId : req.params.userId });
    console.log(attendance[0]); 
    res.send(attendance[0]);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

router.get('/check',async(req,res)=>{
  const sessionId = req.cookies.sessionId;
  console.log("Session ID:", sessionId);

  if (!sessionId || !sessions[sessionId]) {
    return res.status(401).json({ msg: 'Unauthorized access' });
  }

  const session = sessions[sessionId];

  if (!session.expiresAt || session.expiresAt < Date.now()) {
    delete sessions[sessionId]; // Remove expired session
    return res.status(401).json({ msg: 'Session expired, please login again' });
  }
  const user = await Employee.findOne({userId : sessions[sessionId].userId});

  res.status(200).json({ msg: 'Session is valid', user: user });
});

router.post('/register', async (req, res) => {
        console.log(req.body);
  const { name, phone, email, dob, department, doj, type } = req.body;

  try {
    const existing = await Employee.findOne({ email });
    if (existing) return res.status(400).json({ msg: 'Employee already exists' });
    const password = generateStrongPassword();
    const hashedPassword = hashPassword(password);
    const count = await Employee.countDocuments({});
    const acount = await Employee.countDocuments({department:"Admin"});
    const nextId = `user${String(count - acount + 1).padStart(2, '0')}`;
    const anextId = `admin${String(acount + 1).padStart(2, '0')}`;
    const newEmp = new Employee({ userId: department==="Admin"? anextId: nextId, password:hashedPassword, name, phone, email, dob, department, doj, type });
    await newEmp.save();
    res.status(201).json({
        msg: 'Employee registered',
        userId: department==="Admin"? anextId: nextId,
        password: password
    });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
    console.error(err);
  }
});

// Login
router.post('/login', async(req,res)=>{
    const {userId, password} = req.body;
    try{
        const employee = await Employee.findOne({userId});
        console.log(employee);
        if(!employee){
            return res.status(400).json({ msg: 'User not found' });
        }
        const hashedPassword = hashPassword(password);
        console.log(hashedPassword, employee.password);
        if(employee.password == hashedPassword){
          // Generate a session ID and store it in the session
          const sessionId = generateSessionId();
          const expiresAt = Date.now() + 60 * 60 * 1000;

          sessions[sessionId] = { userId: employee.userId, expiresAt };
          
          await AddtoLogs(employee.userId, employee.name, req);
          await Mark(employee.userId, employee.name, req);
          console.log("Login Successful");
            res.cookie("sessionId", sessionId, {
              httpOnly: true,
              maxAge: 10 * 60 * 1000, // 5 minutes
                     
            });
            console.log(res.cookie);
            return res.status(200).json({
                msg: "Login Successful",
                userId: employee.userId
            });
        }else{
          return res.status(400).json({ msg: 'Password is invaid' });
        }
    }catch(error){
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});
//Edit
router.post('/edit', async (req, res) => {
    const sessionId = req.cookies.sessionId;
    console.log("Session ID:", sessionId);
    if (!sessionId || !sessions[sessionId]) {
        console.log("entering");
        return res.status(401).json({ msg: 'Unauthorized access' });
    }
    const { name, phone, email, department, type } = req.body;
    console.log(req.body);
    try {
        const userId = sessions[sessionId].userId; // Always use session userId
        const employee = await Employee.findOne({ userId });
        console.log(employee);
        if (!employee) {
            return res.status(400).json({ msg: 'User not found' });
        }
        employee.name = name;
        employee.phone = phone;
        employee.email = email;
        employee.department = department;
        employee.type = type;
        await employee.save();
        // Fetch updated profile using session userId
        const profile = await Employee.findOne({ userId });
        console.log(userId);
        res.status(201).json({ msg: 'User details updated successfully', profile: profile });
    } catch (error) {
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

// Change Password
router.post('/change-password/:userId', async(req,res)=>{
    const { userId } = req.params;
    const {oldpassword, newpassword, confirmpassword} = req.body;
    try{
        const employee = await Employee.findOne({userId});
        console.log(employee);
        if(!employee){
            return res.status(400).json({ msg: 'User not found' });
        }
        const hashedoldPassword = hashPassword(oldpassword);
        if(employee.password != hashedoldPassword){
          return res.status(400).json({ msg: 'Old Password is invalid' });
        }
        if(newpassword !== confirmpassword){
          return res.status(400).json({ msg: 'New Password and Confirm Password do not match' });
        }
        const hashedNewPassword = hashPassword(newpassword);
        if(hashedNewPassword !== hashedoldPassword){
          employee.password = hashedNewPassword;
          await employee.save();
          return res.status(200).json({ msg: 'Password updated successfully' });
        }else{
          return res.status(400).json({ msg: 'Set different password', oldpassword: oldpassword });
        }
    }catch(error){
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

// Get employees by department (for manager task assignment)
router.get('/employees/:department', async (req, res) => {
  try {
    const { department } = req.params;
    const employees = await Employee.find({ 
      department, 
      isManager: false 
    }).select('userId name email');
    
    if (!employees || employees.length === 0) {
      return res.status(404).json({ msg: 'No employees found' });
    }
    res.json(employees);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Get tasks assigned by manager
router.get('/manager-tasks/:managerId', async (req, res) => {
  try {
    const { managerId } = req.params;
    const tasks = await Task.find({ assignedBy: managerId });
    
    if (!tasks) {
      return res.status(404).json({ msg: 'No tasks found' });
    }
    res.json(tasks);
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
      priority: priority || 'Medium',
      assignedBy,
      status: 'Pending'
    });

    await task.save();
    res.status(201).json({ msg: 'Task assigned successfully', task });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Update task details
router.put('/update-task/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title, description, dueDate, priority, status, review } = req.body;

    const task = await Task.findByIdAndUpdate(
      taskId,
      {
        title,
        description,
        dueDate,
        priority,
        status,
        review,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ msg: 'Task not found' });
    }

    res.json({ msg: 'Task updated successfully', task });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

module.exports = router;
