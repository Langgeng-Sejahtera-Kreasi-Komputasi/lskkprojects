// server.js - KODE LENGKAP & FINAL TANPA RINGKASAN

// --- 1. Import Dependencies ---
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const http = require('http');
const { Server } = require("socket.io");

// --- 2. Initialize App & Server ---
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Izinkan semua origin, sesuaikan untuk produksi
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});
const PORT = process.env.PORT || 3000;

// --- 3. Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --- 4. Connect to MongoDB ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('🚀 Successfully connected to MongoDB Atlas!'))
    .catch(err => { console.error('Connection error', err.message); process.exit(1); });

// --- 5. Models ---
const projectSchema = new mongoose.Schema({ name: { type: String, required: true, unique: true, trim: true } }, { timestamps: true, versionKey: false });
const taskSchema = new mongoose.Schema({
    description: { type: String, required: true, trim: true },
    pic: { type: String, required: true },
    project: { type: String, required: true },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['todo', 'inprogress', 'done'], default: 'todo' },
}, { timestamps: true, versionKey: false });
const teamMemberSchema = new mongoose.Schema({ name: { type: String, required: true, unique: true, trim: true }, role: { type: String, required: true, trim: true } }, { timestamps: true, versionKey: false });

const Project = mongoose.model('Project', projectSchema);
const Task = mongoose.model('Task', taskSchema);
const TeamMember = mongoose.model('TeamMember', teamMemberSchema);


// --- 6. API Routes ---

// Endpoint Statistik Dashboard
app.get('/api/dashboard-stats', async (req, res) => {
    try {
        const tasksByStatus = await Task.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        
        const stats = {
            total: await Task.countDocuments(),
            todo: tasksByStatus.find(s => s._id === 'todo')?.count || 0,
            inprogress: tasksByStatus.find(s => s._id === 'inprogress')?.count || 0,
            done: tasksByStatus.find(s => s._id === 'done')?.count || 0,
            totalProjects: await Project.countDocuments(),
            totalMembers: await TeamMember.countDocuments()
        };
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil statistik dashboard." });
    }
});

// == PROJECTS ==
app.get('/api/projects', async (req, res) => {
    try {
        if (req.query.all === 'true') {
            const allProjects = await Project.find().sort({ name: 1 });
            return res.json({ data: allProjects });
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const skip = (page - 1) * limit;
        const projects = await Project.find().sort({ createdAt: -1 }).limit(limit).skip(skip);
        const total = await Project.countDocuments();
        res.json({
            data: projects,
            pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) }
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error saat mengambil proyek.' });
    }
});

app.post('/api/projects', async (req, res) => {
    const { name } = req.body;
    if (!name || name.trim() === '') {
        return res.status(400).json({ message: 'Nama proyek tidak boleh kosong.' });
    }
    try {
        const newProject = await new Project({ name }).save();
        io.emit('projects_changed');
        io.emit('notification', { message: `Proyek baru ditambahkan: ${newProject.name}`, type: 'info' });
        res.status(201).json(newProject);
    } catch (err) {
        if (err.code === 11000) return res.status(409).json({ message: 'Nama proyek sudah ada.' });
        res.status(500).json({ message: 'Server error saat membuat proyek.' });
    }
});

app.delete('/api/projects/:id', async (req, res) => {
    const authCode = req.headers['x-auth-code'];
    if (authCode !== process.env.DELETION_CODE) {
        return res.status(401).json({ message: 'Kode otorisasi salah atau tidak valid.' });
    }
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Proyek tidak ditemukan.' });
        
        await Task.deleteMany({ project: project.name });
        await Project.deleteOne({ _id: req.params.id });
        
        io.emit('projects_changed');
        io.emit('tasks_changed'); // Tugas juga berubah karena dihapus
        io.emit('notification', { message: `Proyek "${project.name}" dan semua tugasnya dihapus.`, type: 'error' });
        res.json({ message: 'Proyek dan tugas terkait berhasil dihapus.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error saat menghapus proyek.' });
    }
});


// == TASKS ==
app.get('/api/tasks', async (req, res) => {
    try {
        const { page = 1, limit = 10, project, pic, search } = req.query;
        const skip = (page - 1) * limit;
        const queryFilter = {};

        if (project && project !== 'all') queryFilter.project = project;
        if (pic && pic !== 'all') queryFilter.pic = pic;
        if (search) {
            queryFilter.description = { $regex: search, $options: 'i' };
        }

        const tasks = await Task.find(queryFilter).sort({ createdAt: -1 }).limit(limit).skip(skip);
        const total = await Task.countDocuments(queryFilter);
        res.json({
            data: tasks,
            pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) }
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error saat mengambil tugas.' });
    }
});

app.post('/api/tasks', async (req, res) => {
    try {
        const newTask = await new Task(req.body).save();
        io.emit('notification', { message: `Tugas baru: "${newTask.description.substring(0, 30)}..."`, type: 'info' });
        io.emit('tasks_changed');
        res.status(201).json(newTask);
    } catch (err) {
        res.status(400).json({ message: 'Data tidak valid.' });
    }
});

app.put('/api/tasks/:id', async (req, res) => {
    try {
        const updatedTask = await Task.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
        if (!updatedTask) return res.status(404).json({ message: 'Tugas tidak ditemukan.' });
        io.emit('notification', { message: `Tugas "${updatedTask.description.substring(0, 20)}..." diubah ke ${req.body.status}.`, type: 'success' });
        io.emit('tasks_changed');
        res.json(updatedTask);
    } catch (err) {
        res.status(500).json({ message: 'Server error.' });
    }
});

app.delete('/api/tasks/:id', async (req, res) => {
    const authCode = req.headers['x-auth-code'];
    if (authCode !== process.env.DELETION_CODE) {
        return res.status(401).json({ message: 'Kode otorisasi salah atau tidak valid.' });
    }
    try {
        const task = await Task.findByIdAndDelete(req.params.id);
        if (!task) return res.status(404).json({ message: 'Tugas tidak ditemukan.' });
        io.emit('notification', { message: `Tugas "${task.description.substring(0,20)}..." telah dihapus.`, type: 'error'});
        io.emit('tasks_changed');
        res.json({ message: 'Tugas berhasil dihapus.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error saat menghapus tugas.' });
    }
});


// == TEAM MEMBERS ==
app.get('/api/members', async (req, res) => {
    try {
        if (req.query.all === 'true') {
            const allMembers = await TeamMember.find().sort({ name: 1 });
            return res.json({ data: allMembers });
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const skip = (page - 1) * limit;
        const members = await TeamMember.find().sort({ createdAt: -1 }).limit(limit).skip(skip);
        const total = await TeamMember.countDocuments();
        res.json({
            data: members,
            pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) }
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error saat mengambil data anggota.' });
    }
});

app.post('/api/members', async (req, res) => {
    const { name, role } = req.body;
    if (!name || !role) {
        return res.status(400).json({ message: 'Nama dan Jabatan wajib diisi.' });
    }
    try {
        const newMember = await new TeamMember({ name, role }).save();
        io.emit('members_changed');
        io.emit('notification', { message: `Anggota tim baru: ${newMember.name}`, type: 'info' });
        res.status(201).json(newMember);
    } catch (err) {
        if (err.code === 11000) return res.status(409).json({ message: 'Nama anggota sudah ada.' });
        res.status(500).json({ message: 'Server error saat menambah anggota.' });
    }
});

app.put('/api/members/:id', async (req, res) => {
    const { name, role } = req.body;
    if (!name || !role) {
        return res.status(400).json({ message: 'Nama dan Jabatan wajib diisi.' });
    }
    try {
        const updatedMember = await TeamMember.findByIdAndUpdate(req.params.id, { name, role }, { new: true, runValidators: true });
        if (!updatedMember) return res.status(404).json({ message: 'Anggota tidak ditemukan.' });
        io.emit('members_changed');
        io.emit('notification', { message: `Data anggota ${updatedMember.name} diperbarui.`, type: 'success' });
        res.json(updatedMember);
    } catch (err) {
         if (err.code === 11000) return res.status(409).json({ message: 'Nama anggota tersebut sudah digunakan.' });
        res.status(500).json({ message: 'Server error saat memperbarui anggota.' });
    }
});

app.delete('/api/members/:id', async (req, res) => {
    const authCode = req.headers['x-auth-code'];
    if (authCode !== process.env.DELETION_CODE) {
        return res.status(401).json({ message: 'Kode otorisasi salah.' });
    }
    try {
        const member = await TeamMember.findByIdAndDelete(req.params.id);
        if (!member) return res.status(404).json({ message: 'Anggota tidak ditemukan.' });
        io.emit('members_changed');
        io.emit('notification', { message: `Anggota tim ${member.name} dihapus.`, type: 'error' });
        res.json({ message: 'Anggota berhasil dihapus.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error saat menghapus anggota.' });
    }
});


// --- 7. Socket.IO Connection ---
io.on('connection', (socket) => {
    console.log('🔌 A user connected');
    socket.on('disconnect', () => {
        console.log('👋 User disconnected');
    });
});

// --- 8. Start the Server ---
server.listen(PORT, () => {
    console.log(`🚀 Server with Socket.IO is running on http://localhost:${PORT}`);
});