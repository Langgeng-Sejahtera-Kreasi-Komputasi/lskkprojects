// server.js - VERSI LENGKAP & DIPERBAIKI

// --- 1. Import Dependencies ---
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// --- 2. Initialize Express App ---
const app = express();
const PORT = process.env.PORT || 3000; // Pastikan port sesuai dengan frontend

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

// --- 5. Define Mongoose Schemas (Struktur Data) ---
const projectSchema = new mongoose.Schema({
    // PERBAIKAN: Menghapus field `createdAt` yang redundan
    name: { type: String, required: true, unique: true, trim: true },
}, {
    timestamps: true,
    versionKey: false
});

const taskSchema = new mongoose.Schema({
    description: { type: String, required: true, trim: true },
    pic: { type: String, required: true },
    project: { type: String, required: true },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['todo', 'inprogress', 'done'], default: 'todo' },
}, {
    timestamps: true,
    versionKey: false
});

const Project = mongoose.model('Project', projectSchema);
const Task = mongoose.model('Task', taskSchema);

// --- 6. API Routes (Endpoints) ---

// == PROJECTS ==
app.get('/api/projects', async (req, res) => {
    try {
        const projects = await Project.find().sort({ name: 1 });
        res.json(projects);
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
        // PERBAIKAN: Penanganan error duplikat yang lebih baik
        if (err.code === 11000) {
            return res.status(409).json({ message: 'Nama proyek sudah ada.' });
        }
        res.status(500).json({ message: 'Server error saat membuat proyek.' });
    }
});

app.delete('/api/projects/:id', async (req, res) => {
    // PERBAIKAN KEAMANAN: Validasi kode otorisasi dari header
    const authCode = req.headers['x-auth-code'];
    if (authCode !== process.env.DELETION_CODE) {
        return res.status(401).json({ message: 'Kode otorisasi salah atau tidak valid.' });
    }
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Proyek tidak ditemukan.' });

        await Task.deleteMany({ project: project.name });
        // PERBAIKAN: Menggunakan metode modern `deleteOne`
        await Project.deleteOne({ _id: req.params.id });

        res.json({ message: 'Proyek dan tugas terkait berhasil dihapus.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error saat menghapus proyek.' });
    }
});


// == TASKS ==
app.get('/api/tasks', async (req, res) => {
    try {
        const tasks = await Task.find().sort({ createdAt: -1 });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: 'Server error saat mengambil tugas.' });
    }
});

app.post('/api/tasks', async (req, res) => {
    const { description, pic, project, dueDate } = req.body;
    if (!description || !pic || !project || !dueDate) {
        return res.status(400).json({ message: 'Semua field wajib diisi.' });
    }
    const task = new Task({ description, pic, project, dueDate });
    try {
        const newTask = await task.save();
        res.status(201).json(newTask);
    } catch (err) {
        // PERBAIKAN: Penanganan error validasi yang lebih baik
        res.status(400).json({ message: 'Data tidak valid atau terjadi kesalahan server.' });
    }
});

app.put('/api/tasks/:id', async (req, res) => {
    const { status } = req.body;
    if (!status || !['todo', 'inprogress', 'done'].includes(status)) {
        return res.status(400).json({ message: 'Status tidak valid.' });
    }
    try {
        // PERBAIKAN: Menggunakan findByIdAndUpdate untuk efisiensi (operasi atomik)
        const updatedTask = await Task.findByIdAndUpdate(
            req.params.id, 
            { status }, 
            { new: true } // Opsi untuk mengembalikan dokumen yang sudah diupdate
        );
        if (!updatedTask) return res.status(404).json({ message: 'Tugas tidak ditemukan.' });
        res.json(updatedTask);
    } catch (err) {
        res.status(500).json({ message: 'Server error saat memperbarui tugas.' });
    }
});

app.delete('/api/tasks/:id', async (req, res) => {
    // PERBAIKAN KEAMANAN: Validasi kode otorisasi dari header
    const authCode = req.headers['x-auth-code'];
    if (authCode !== process.env.DELETION_CODE) {
        return res.status(401).json({ message: 'Kode otorisasi salah atau tidak valid.' });
    }
    try {
        // PERBAIKAN: Menggunakan metode modern `findByIdAndDelete`
        const task = await Task.findByIdAndDelete(req.params.id);
        if (!task) return res.status(404).json({ message: 'Tugas tidak ditemukan.' });
        res.json({ message: 'Tugas berhasil dihapus.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error saat menghapus tugas.' });
    }
});


// --- 7. Start the Server ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});