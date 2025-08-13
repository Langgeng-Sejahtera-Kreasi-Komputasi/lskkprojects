// server.js - KODE LENGKAP & FINAL

// --- 1. Import Dependencies ---
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// --- 2. Initialize Express App ---
const app = express();
const PORT = process.env.PORT || 3000;

// --- 3. Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --- 4. Connect to MongoDB ---
mongoose.connect(process.env.MONGO_URI).then(() => {
    console.log('🚀 Successfully connected to MongoDB Atlas!');
}).catch(err => {
    console.error('Connection error', err.message);
    process.exit(1);
});

// --- 5. Define Mongoose Schemas & Models ---
const projectSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true },
}, { timestamps: true, versionKey: false });

const taskSchema = new mongoose.Schema({
    description: { type: String, required: true, trim: true },
    pic: { type: String, required: true },
    project: { type: String, required: true },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['todo', 'inprogress', 'done'], default: 'todo' },
}, { timestamps: true, versionKey: false });

const teamMemberSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true },
    role: { type: String, required: true, trim: true },
}, { timestamps: true, versionKey: false });

const Project = mongoose.model('Project', projectSchema);
const Task = mongoose.model('Task', taskSchema);
const TeamMember = mongoose.model('TeamMember', teamMemberSchema);

// --- 6. API Routes (Endpoints) ---

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
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
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
    const project = new Project({ name });
    try {
        const newProject = await project.save();
        res.status(201).json(newProject);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: 'Nama proyek sudah ada.' });
        }
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
        res.json({ message: 'Proyek dan tugas terkait berhasil dihapus.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error saat menghapus proyek.' });
    }
});

// == TASKS ==
app.get('/api/tasks', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const queryFilter = {};
        if (req.query.project && req.query.project !== 'all') {
            queryFilter.project = req.query.project;
        }
        if (req.query.pic && req.query.pic !== 'all') {
            queryFilter.pic = req.query.pic;
        }
        const tasks = await Task.find(queryFilter).sort({ createdAt: -1 }).limit(limit).skip(skip);
        const total = await Task.countDocuments(queryFilter);
        res.json({
            data: tasks,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error saat mengambil tugas.' });
    }
});

app.post('/api/tasks', async (req, res) => {
    const { description, pic, project, dueDate } = req.body;
    if (!description || !pic || !project || !dueDate) {
        return res.status(400).json({ message: 'Semua field wajib diisi.' });
    }
    try {
        const newTask = await new Task({ description, pic, project, dueDate }).save();
        res.status(201).json(newTask);
    } catch (err) {
        res.status(400).json({ message: 'Data tidak valid atau terjadi kesalahan server.' });
    }
});

app.put('/api/tasks/:id', async (req, res) => {
    const { status } = req.body;
    if (!status || !['todo', 'inprogress', 'done'].includes(status)) {
        return res.status(400).json({ message: 'Status tidak valid.' });
    }
    try {
        const updatedTask = await Task.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!updatedTask) return res.status(404).json({ message: 'Tugas tidak ditemukan.' });
        res.json(updatedTask);
    } catch (err) {
        res.status(500).json({ message: 'Server error saat memperbarui tugas.' });
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
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
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
        res.status(201).json(newMember);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: 'Nama anggota sudah ada.' });
        }
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
        res.json(updatedMember);
    } catch (err) {
         if (err.code === 11000) {
            return res.status(409).json({ message: 'Nama anggota tersebut sudah digunakan.' });
        }
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
        res.json({ message: 'Anggota berhasil dihapus.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error saat menghapus anggota.' });
    }
});

// --- 7. Start the Server ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});