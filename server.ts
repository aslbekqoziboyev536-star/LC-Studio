import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://Aslbek:<db_password>@database.fjavu3b.mongodb.net/?appName=Database';
if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('<db_password>')) {
    console.error('DIQQAT: MONGODB_URI o\'rnatilmagan yoki parol kiritilmagan!');
    console.log('Iltimos, AI Studio sozlamalarida MONGODB_URI o\'zgaruvchisini o\'rnating.');
}
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';

app.use(cors());
app.use(express.json());

// --- MODELS ---

const userSchema = new mongoose.Schema({
  role: { type: String, required: true },
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  centerName: String,
  courseName: String,
  coursePrice: Number,
  monthlySalary: Number,
  salaryPaid: { type: Boolean, default: false },
  joinDate: String,
  isLeft: { type: Boolean, default: false },
  devices: [{
    id: String,
    name: String,
    lastLogin: String,
    ip: String,
    isCurrent: Boolean
  }]
});

const User = mongoose.model('User', userSchema);

const Course = mongoose.model('Course', new mongoose.Schema({
  name: { type: String, required: true },
  teacherId: { type: String, required: false },
  schedule: { type: String, required: true },
  price: Number,
  centerName: String,
  lessons: [{
    date: { type: String, required: true },
    topic: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }]
}));

const Student = mongoose.model('Student', new mongoose.Schema({
  name: { type: String, required: true },
  teacherId: { type: String, required: true },
  courseName: String,
  paid: { type: Boolean, default: false },
  attendance: { type: Object, default: {} },
  centerName: String
}, { minimize: false }));

// --- MIDDLEWARE ---

const authenticate = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token kiritilmagan' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'Foydalanuvchi topilmadi' });
    
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Yaroqsiz token' });
  }
};

// --- HELPERS ---

const generateSuggestions = async (username: string) => {
  const suggestions = [];
  const suffixes = [
    Math.floor(Math.random() * 1000),
    new Date().getFullYear(),
    'uz',
    'pro',
    Math.floor(Math.random() * 99)
  ];
  
  for (const suffix of suffixes) {
    const candidate = `${username}${suffix}`;
    const exists = await User.findOne({ username: candidate });
    if (!exists) {
      suggestions.push(candidate);
    }
    if (suggestions.length >= 3) break;
  }
  
  while (suggestions.length < 3) {
    const candidate = `${username}${Math.floor(Math.random() * 10000)}`;
    const exists = await User.findOne({ username: candidate });
    if (!exists) suggestions.push(candidate);
  }

  return suggestions;
};

const getDeviceName = (ua: string) => {
  let name = 'Unknown Device';
  if (/windows/i.test(ua)) name = 'Windows PC';
  else if (/macintosh|mac os x/i.test(ua)) name = 'MacBook/iMac';
  else if (/linux/i.test(ua)) name = 'Linux PC';
  else if (/android/i.test(ua)) name = 'Android Device';
  else if (/iphone|ipad|ipod/i.test(ua)) name = 'iOS Device';

  if (/chrome/i.test(ua)) name += ' (Chrome)';
  else if (/firefox/i.test(ua)) name += ' (Firefox)';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) name += ' (Safari)';
  else if (/edge/i.test(ua)) name += ' (Edge)';
  
  return name;
};

// --- API ROUTES ---

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const cleanUsername = username ? username.trim() : '';
  const cleanPassword = password ? password.trim() : '';

  try {
    const user = await User.findOne({ username: cleanUsername, password: cleanPassword }); 
    
    if (!user) {
      return res.status(401).json({ message: 'Login yoki parol noto‘g‘ri' });
    }
    
    const deviceId = 'dev-' + Date.now() + Math.floor(Math.random() * 1000);
    const deviceName = getDeviceName(req.headers['user-agent'] || '');
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (!user.devices) (user as any).devices = [];
    (user as any).devices = (user as any).devices.map((d: any) => ({ ...d, isCurrent: false }));

    (user as any).devices.push({
        id: deviceId,
        name: deviceName,
        lastLogin: new Date().toISOString(),
        ip: clientIp as string,
        isCurrent: true
    });
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET);
    res.json({ token, user, currentDeviceId: deviceId });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/auth/me', authenticate, (req: any, res) => {
  res.json({ user: req.user });
});

app.get('/api/users', authenticate, async (req: any, res) => {
  try {
    const users = await User.find({ 
        $or: [
            { centerName: req.user.centerName },
            { centerName: { $exists: false } }
        ]
    });
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ message: 'Username kiritilmadi' });

    const cleanUsername = username.trim();
    const existing = await User.findOne({ username: cleanUsername });
    
    if (existing) {
      const suggestions = await generateSuggestions(cleanUsername);
      return res.status(400).json({ 
        message: 'Bunday foydalanuvchi nomi mavjud', 
        suggestions 
      });
    }

    const newUser = new User(req.body);
    newUser.username = cleanUsername;
    if(newUser.password) newUser.password = newUser.password.trim();
    
    await newUser.save();
    res.json(newUser);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

app.put('/api/users/:id', authenticate, async (req: any, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser || (targetUser.centerName && targetUser.centerName !== req.user.centerName)) {
        return res.status(403).json({ message: 'Ruxsat berilmagan' });
    }

    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedUser);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

app.delete('/api/users/:id', authenticate, async (req: any, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser || (targetUser.centerName && targetUser.centerName !== req.user.centerName)) {
        return res.status(403).json({ message: 'Ruxsat berilmagan' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/users/:userId/devices/:deviceId', authenticate, async (req: any, res) => {
    try {
      const { userId, deviceId } = req.params;
      if (userId !== req.user._id.toString() && req.user.role !== 'SUPER_ADMIN') {
          return res.status(403).json({ message: 'Ruxsat berilmagan' });
      }

      const user = await User.findById(userId);
      if (!user || (user as any).centerName !== req.user.centerName) return res.status(404).json({ message: 'User not found' });
      
      (user as any).devices = (user as any).devices.filter((d: any) => d.id !== deviceId);
      await user.save();
      res.json({ message: 'Device removed', user });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
});

app.get('/api/courses', authenticate, async (req: any, res) => {
    try {
        const courses = await Course.find({ 
            $or: [
                { centerName: req.user.centerName },
                { centerName: { $exists: false } }
            ]
        });
        res.json(courses);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/courses', authenticate, async (req: any, res) => {
    try {
        const newCourse = new Course({ ...req.body, centerName: req.user.centerName });
        await newCourse.save();
        res.json(newCourse);
    } catch (err: any) {
        res.status(400).json({ message: err.message });
    }
});

app.put('/api/courses/:id', authenticate, async (req: any, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course || (course.centerName && course.centerName !== req.user.centerName)) {
            return res.status(403).json({ message: 'Ruxsat berilmagan' });
        }
        const updatedCourse = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedCourse);
    } catch (err: any) {
        res.status(400).json({ message: err.message });
    }
});

app.delete('/api/courses/:id', authenticate, async (req: any, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course || (course.centerName && course.centerName !== req.user.centerName)) {
            return res.status(403).json({ message: 'Ruxsat berilmagan' });
        }
        await Course.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

app.put('/api/students/bulk', authenticate, async (req: any, res) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates)) return res.status(400).json({ message: 'Updates must be an array' });

    const results = [];
    for (const update of updates) {
      const student = await Student.findById(update.id);
      if (student && (!student.centerName || student.centerName === req.user.centerName)) {
        student.attendance = { ...student.attendance, ...update.attendance };
        await student.save();
        results.push(student);
      }
    }
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/students', authenticate, async (req: any, res) => {
  try {
    let query: any = { 
        $or: [
            { centerName: req.user.centerName },
            { centerName: { $exists: false } }
        ]
    };
    
    if (req.user.role === 'TEACHER') {
        query = { 
            $and: [
                query,
                { teacherId: req.user._id.toString() }
            ]
        };
    }

    const students = await Student.find(query);
    res.json(students);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/students', authenticate, async (req: any, res) => {
  try {
    const newStudent = new Student({ ...req.body, centerName: req.user.centerName });
    await newStudent.save();
    res.json(newStudent);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

app.put('/api/students/:id', authenticate, async (req: any, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student || (student.centerName && student.centerName !== req.user.centerName)) {
        return res.status(403).json({ message: 'Ruxsat berilmagan' });
    }
    
    if (req.user.role === 'TEACHER' && student.teacherId !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Ruxsat berilmagan' });
    }

    const updatedStudent = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedStudent);
  } catch (err: any) {
     res.status(400).json({ message: err.message });
  }
});

app.delete('/api/students/:id', authenticate, async (req: any, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Noto\'g\'ri ID formati' });
    }

    const student = await Student.findById(req.params.id);
    if (!student) {
        return res.status(404).json({ message: 'O\'quvchi topilmadi' });
    }

    if (student.centerName && student.centerName !== req.user.centerName) {
        return res.status(403).json({ message: 'Ruxsat berilmagan' });
    }
    
    if (req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ message: 'Faqat admin o\'quvchilarni o\'chira oladi' });
    }

    await Student.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// --- VITE MIDDLEWARE ---

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  mongoose.connect(MONGO_URI)
    .then(() => {
      console.log('MongoDB Connected');
    })
    .catch(err => {
      console.error('MongoDB Connection Error:', err.message);
      console.log('Iltimos, MONGODB_URI va parolni tekshiring.');
    });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
