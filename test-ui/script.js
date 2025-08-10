document.addEventListener('DOMContentLoaded', () => {

    // --- KONFIGURASI TIM & KEAMANAN ---
    const DELETION_CODE = 'LSKK2025';
    const teamMembers = [
        "Asep Trisna Setiawan (Lead)", "M Aji Perdana (BE)", "M Rizki Fahreaza (Mobile)",
        "Faiza Kailani K (Website)", "Ahmad Sholeh Kurniawan (Mobile)", "Harist Fadilah (Website)", "M Riza Nurtam (Infra)"
    ];

    // --- ELEMEN DOM ---
    const navLinks = {
        dashboard: document.getElementById('nav-dashboard'),
        table: document.getElementById('nav-table'),
        admin: document.getElementById('nav-admin'),
    };
    const views = {
        dashboard: document.getElementById('dashboard-view'),
        table: document.getElementById('table-view'),
        admin: document.getElementById('admin-view'),
    };

    const projectForm = document.getElementById('project-form');
    const projectNameInput = document.getElementById('project-name');
    const projectList = document.getElementById('project-list');
    
    const taskForm = document.getElementById('task-form');
    const taskDescriptionInput = document.getElementById('task-description');
    const taskPicSelect = document.getElementById('task-pic');
    const taskProjectSelect = document.getElementById('task-project');
    const taskDueDateInput = document.getElementById('task-due-date');
    
    const filters = {
        projectBoard: document.getElementById('project-filter-board'),
        memberBoard: document.getElementById('member-filter-board'),
        projectTable: document.getElementById('project-filter-table'),
        memberTable: document.getElementById('member-filter-table'),
    };
    
    const containers = {
        todo: document.getElementById('todo-tasks'),
        inprogress: document.getElementById('inprogress-tasks'),
        done: document.getElementById('done-tasks'),
        tableBody: document.getElementById('task-table-body'),
    };
    
    // --- FUNGSI NAVIGASI TAMPILAN ---
    const switchView = (viewToShow) => {
        Object.values(views).forEach(v => v.classList.add('hidden'));
        Object.values(navLinks).forEach(b => b.classList.remove('active'));

        views[viewToShow].classList.remove('hidden');
        navLinks[viewToShow].classList.add('active');
    };

    // --- FUNGSI DATABASE (localStorage) ---
    const getProjects = () => JSON.parse(localStorage.getItem('lskk_projectsDB_v2')) || [];
    const saveProjects = (projects) => localStorage.setItem('lskk_projectsDB_v2', JSON.stringify(projects));
    const getTasks = () => JSON.parse(localStorage.getItem('lskk_tasksDB_v2')) || [];
    const saveTasks = (tasks) => localStorage.setItem('lskk_tasksDB_v2', JSON.stringify(tasks));

    // --- FUNGSI MANAJEMEN DATA ---
    const addProject = (e) => {
        e.preventDefault();
        const projectName = projectNameInput.value.trim();
        if (!projectName) return;

        const projects = getProjects();
        if (projects.find(p => p.name.toLowerCase() === projectName.toLowerCase())) {
            alert('Nama proyek sudah ada!');
            return;
        }
        projects.push({ id: Date.now(), name: projectName });
        saveProjects(projects);
        projectNameInput.value = '';
        renderAll();
    };
    
    const deleteProject = (projectId) => {
        const code = prompt("Hanya Lead. Masukkan kode otorisasi untuk menghapus proyek:");
        if (code !== DELETION_CODE) {
            if (code !== null) alert('Kode Salah. Aksi dibatalkan.');
            return;
        }
        
        let projects = getProjects();
        const projectToDelete = projects.find(p => p.id === projectId);
        if (!projectToDelete) return;

        if (confirm(`Yakin hapus proyek "${projectToDelete.name}"? SEMUA TUGAS terkait akan terhapus.`)) {
            projects = projects.filter(p => p.id !== projectId);
            saveProjects(projects);
            let tasks = getTasks();
            tasks = tasks.filter(t => t.project !== projectToDelete.name);
            saveTasks(tasks);
            renderAll();
            alert('Proyek berhasil dihapus.');
        }
    };

    const addTask = (e) => {
        e.preventDefault();
        const newTask = {
            id: Date.now(),
            description: taskDescriptionInput.value,
            pic: taskPicSelect.value,
            project: taskProjectSelect.value,
            dueDate: taskDueDateInput.value,
            status: 'todo'
        };
        const tasks = getTasks();
        tasks.push(newTask);
        saveTasks(tasks);
        taskForm.reset();
        alert('Tugas baru berhasil ditambahkan!');
        applyFilters();
    };

    const deleteTask = (taskId) => {
        const code = prompt("Hanya Lead. Masukkan kode otorisasi untuk menghapus tugas:");
        if (code !== DELETION_CODE) {
            if (code !== null) alert('Kode Salah. Aksi dibatalkan.');
            return;
        }

        let tasks = getTasks();
        tasks = tasks.filter(t => t.id !== taskId);
        saveTasks(tasks);
        applyFilters();
        alert('Tugas berhasil dihapus.');
    };
    
    const updateTaskStatus = (taskId, newStatus) => {
        let tasks = getTasks();
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex > -1) {
            tasks[taskIndex].status = newStatus;
            saveTasks(tasks);
            applyFilters();
        }
    };

    // --- FUNGSI RENDER (Menampilkan ke UI) ---
    const applyFilters = () => {
        const selectedProject = filters.projectBoard.value;
        const selectedMember = filters.memberBoard.value;
        
        // Render kedua tampilan
        renderTasks(selectedProject, selectedMember);
        renderTable(selectedProject, selectedMember);
    };

    const renderTasks = (projectFilterValue, memberFilterValue) => {
        let tasksToRender = getTasks();
        if (projectFilterValue !== 'all') tasksToRender = tasksToRender.filter(t => t.project === projectFilterValue);
        if (memberFilterValue !== 'all') tasksToRender = tasksToRender.filter(t => t.pic === memberFilterValue);
        
        Object.values(containers).forEach(c => { if(c !== containers.tableBody) c.innerHTML = ''});

        tasksToRender.forEach(task => {
            const card = createTaskCard(task);
            containers[task.status].appendChild(card);
        });
    };

    const renderTable = (projectFilterValue, memberFilterValue) => {
        let tasksToRender = getTasks();
        if (projectFilterValue !== 'all') tasksToRender = tasksToRender.filter(t => t.project === projectFilterValue);
        if (memberFilterValue !== 'all') tasksToRender = tasksToRender.filter(t => t.pic === memberFilterValue);
        
        containers.tableBody.innerHTML = '';
        tasksToRender.forEach(task => {
            const row = document.createElement('tr');
            let statusText = "Selesai";
            if (task.status === 'todo') statusText = "To Do";
            if (task.status === 'inprogress') statusText = "In Progress";
            row.innerHTML = `<td>${task.description}</td><td>${task.project}</td><td>${task.pic}</td><td>${task.dueDate}</td><td><span class="status-badge ${task.status}">${statusText}</span></td>`;
            containers.tableBody.appendChild(row);
        });
    };
    
    const createTaskCard = (task) => {
        const card = document.createElement("div");
        card.className = "task-card";
        card.innerHTML = `<p>${task.description}</p><div class="task-meta"><span>${task.project}</span><span>${task.pic}</span><span>${task.dueDate}</span></div><div class="task-actions"><select class="status-changer"><option value="todo" ${task.status === "todo" ? "selected" : ""}>To Do</option><option value="inprogress" ${task.status === "inprogress" ? "selected" : ""}>In Progress</option><option value="done" ${task.status === "done" ? "selected" : ""}>Done</option></select><button class="delete-task-btn" title="Hapus Tugas">🗑️</button></div>`;
        card.querySelector(".delete-task-btn").addEventListener("click", () => deleteTask(task.id));
        card.querySelector(".status-changer").addEventListener("change", e => updateTaskStatus(task.id, e.target.value));
        return card;
    };

    const renderProjectList = () => {
        projectList.innerHTML = "";
        getProjects().forEach(p => {
            const li = document.createElement("li");
            li.textContent = p.name;
            const deleteBtn = document.createElement("button");
            deleteBtn.className = "delete-project-btn";
            deleteBtn.innerHTML = "✖";
            deleteBtn.title = `Hapus proyek ${p.name}`;
            deleteBtn.onclick = () => deleteProject(p.id);
            li.appendChild(deleteBtn);
            projectList.appendChild(li);
        });
    };
    
    const populateDropdowns = () => {
        const projects = getProjects();
        const members = teamMembers;
        
        const populate = (select, options, defaultText, allOption) => {
            const currentValue = select.value;
            select.innerHTML = `<option value="">${defaultText}</option>`;
            if (allOption) select.innerHTML += `<option value="all">${allOption}</option>`;
            options.forEach(opt => select.innerHTML += `<option value="${opt}">${opt}</option>`);
            select.value = currentValue;
        };

        populate(taskProjectSelect, projects.map(p => p.name), 'Pilih Proyek');
        populate(filters.projectBoard, projects.map(p => p.name), '', 'Semua Proyek');
        populate(filters.projectTable, projects.map(p => p.name), '', 'Semua Proyek');
        
        populate(taskPicSelect, members, 'Pilih Anggota');
        populate(filters.memberBoard, members, '', 'Semua Anggota');
        populate(filters.memberTable, members, '', 'Semua Anggota');
    };
    
    const renderAll = () => {
        renderProjectList();
        populateDropdowns();
        applyFilters();
    };

    // --- EVENT LISTENERS ---
    Object.keys(navLinks).forEach(key => {
        navLinks[key].addEventListener('click', (e) => {
            e.preventDefault();
            switchView(key);
        });
    });

    projectForm.addEventListener('submit', addProject);
    taskForm.addEventListener('submit', addTask);

    const syncFilters = (source, target) => {
        target.value = source.value;
        applyFilters();
    };

    filters.projectBoard.addEventListener('change', () => syncFilters(filters.projectBoard, filters.projectTable));
    filters.memberBoard.addEventListener('change', () => syncFilters(filters.memberBoard, filters.memberTable));
    filters.projectTable.addEventListener('change', () => syncFilters(filters.projectTable, filters.projectBoard));
    filters.memberTable.addEventListener('change', () => syncFilters(filters.memberTable, filters.memberBoard));
    
    // --- Inisialisasi Aplikasi ---
    renderAll();
    switchView('dashboard'); // Tampilan default
});