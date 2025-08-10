document.addEventListener('DOMContentLoaded', () => {

    // --- KONFIGURASI TIM & KEAMANAN ---
    const DELETION_CODE = 'LSKK2025';
    const teamMembers = [
        "Asep Trisna Setiawan (Lead)", "M Aji Perdana (BE)", "M Rizki Fahreaza (Mobile)",
        "Faiza Kailani K (Website)", "Ahmad Sholeh Kurniawan (Mobile)", "Harist Fadilah (Website)", "M Riza Nurtam (Infra)"
    ];

    // --- ELEMEN DOM ---
    const navDashboard = document.getElementById('nav-dashboard');
    const navTable = document.getElementById('nav-table'); // Tombol Nav Baru
    const navAdmin = document.getElementById('nav-admin');
    const adminView = document.getElementById('admin-view');
    const dashboardView = document.getElementById('dashboard-view');
    const tableView = document.getElementById('table-view'); // View Baru

    const projectForm = document.getElementById('project-form');
    const projectNameInput = document.getElementById('project-name');
    const projectList = document.getElementById('project-list');
    
    const taskForm = document.getElementById('task-form');
    const taskDescriptionInput = document.getElementById('task-description');
    const taskPicSelect = document.getElementById('task-pic');
    const taskProjectSelect = document.getElementById('task-project');
    const taskDueDateInput = document.getElementById('task-due-date');
    
    // Filter untuk Papan Kanban
    const projectFilterBoard = document.getElementById('project-filter-board');
    const memberFilterBoard = document.getElementById('member-filter-board');
    // Filter untuk Tabel (duplikat untuk UI terpisah)
    const projectFilterTable = document.getElementById('project-filter-table');
    const memberFilterTable = document.getElementById('member-filter-table');
    
    const todoTasksContainer = document.getElementById('todo-tasks');
    const inprogressTasksContainer = document.getElementById('inprogress-tasks');
    const doneTasksContainer = document.getElementById('done-tasks');
    const taskTableBody = document.getElementById('task-table-body'); // Body Tabel
    
    // --- FUNGSI NAVIGASI TAMPILAN (TAB) ---
    const switchView = (viewToShow) => {
        // Sembunyikan semua view
        [adminView, dashboardView, tableView].forEach(v => v.classList.add('hidden'));
        // Nonaktifkan semua tombol nav
        [navAdmin, navDashboard, navTable].forEach(b => b.classList.remove('active'));

        if (viewToShow === 'admin') {
            adminView.classList.remove('hidden');
            navAdmin.classList.add('active');
        } else if (viewToShow === 'table') {
            tableView.classList.remove('hidden');
            navTable.classList.add('active');
        } else { // Default ke dashboard
            dashboardView.classList.remove('hidden');
            navDashboard.classList.add('active');
        }
    };

    // --- FUNGSI DATABASE (localStorage) ---
    const getProjects = () => JSON.parse(localStorage.getItem('lskk_projectsDB')) || [];
    const saveProjects = (projects) => localStorage.setItem('lskk_projectsDB', JSON.stringify(projects));
    const getTasks = () => JSON.parse(localStorage.getItem('lskk_tasksDB')) || [];
    const saveTasks = (tasks) => localStorage.setItem('lskk_tasksDB', JSON.stringify(tasks));

    // --- FUNGSI MANAJEMEN DATA (Tidak berubah) ---
    const addProject = (e) => { e.preventDefault(); const n=projectNameInput.value.trim(); if(n){const p=getProjects();if(p.find(t=>t.name.toLowerCase()===n.toLowerCase()))return void alert("Nama proyek sudah ada!");p.push({id:Date.now(),name:n}),saveProjects(p),projectNameInput.value="",renderAll()}};
    const deleteProject = (id) => { const c=prompt("Hanya Lead. Masukkan kode otorisasi:"); if(c===null)return; if(c===DELETION_CODE){let p=getProjects(),t=p.find(e=>e.id===id); if(!t)return; if(confirm(`Yakin hapus proyek "${t.name}"? SEMUA TUGAS terkait akan terhapus.`)){p=p.filter(e=>e.id!==id),saveProjects(p);let s=getTasks();s=s.filter(e=>e.project!==t.name),saveTasks(s),renderAll(),alert("Proyek dihapus.")}}else alert("Kode Salah.")};
    const addTask = (e) => { e.preventDefault(); const t={id:Date.now(),description:taskDescriptionInput.value,pic:taskPicSelect.value,project:taskProjectSelect.value,dueDate:taskDueDateInput.value,status:"todo"};const s=getTasks();s.push(t),saveTasks(s),taskForm.reset(),alert("Tugas baru ditambahkan!"),applyFilters()};
    const deleteTask = (id) => { const c=prompt("Hanya Lead. Masukkan kode otorisasi:"); if(c===null)return; if(c===DELETION_CODE){let t=getTasks();t=t.filter(e=>e.id!==id),saveTasks(t),applyFilters(),alert("Tugas dihapus.")}else alert("Kode Salah.")};
    const updateTaskStatus = (id,status) => {let t=getTasks(),s=t.findIndex(e=>e.id===id);s>-1&&(t[s].status=status,saveTasks(t),applyFilters())};

    // --- FUNGSI RENDER (Menampilkan ke UI) ---
    const applyFilters = () => {
        // Ambil nilai dari salah satu set filter (keduanya disinkronkan)
        const selectedProject = projectFilterBoard.value;
        const selectedMember = memberFilterBoard.value;
        
        // Update kedua set filter agar nilainya selalu sama
        projectFilterTable.value = selectedProject;
        memberFilterTable.value = selectedMember;

        // Render kedua tampilan dengan data yang sudah difilter
        renderTasks(selectedProject, selectedMember);
        renderTable(selectedProject, selectedMember);
    };

    // Render Papan Kanban
    const renderTasks = (projectFilterValue = 'all', memberFilterValue = 'all') => {
        let tasksToRender = getTasks();
        if (projectFilterValue !== 'all') tasksToRender = tasksToRender.filter(t => t.project === projectFilterValue);
        if (memberFilterValue !== 'all') tasksToRender = tasksToRender.filter(t => t.pic === memberFilterValue);
        
        [todoTasksContainer, inprogressTasksContainer, doneTasksContainer].forEach(c => c.innerHTML = '');
        tasksToRender.forEach(task => {
            const card = createTaskCard(task);
            if (task.status === 'todo') todoTasksContainer.appendChild(card);
            else if (task.status === 'inprogress') inprogressTasksContainer.appendChild(card);
            else if (task.status === 'done') doneTasksContainer.appendChild(card);
        });
    };

    // Render Tabel (FUNGSI BARU)
    const renderTable = (projectFilterValue = 'all', memberFilterValue = 'all') => {
        let tasksToRender = getTasks();
        if (projectFilterValue !== 'all') tasksToRender = tasksToRender.filter(t => t.project === projectFilterValue);
        if (memberFilterValue !== 'all') tasksToRender = tasksToRender.filter(t => t.pic === memberFilterValue);
        
        taskTableBody.innerHTML = ''; // Kosongkan body tabel
        tasksToRender.forEach(task => {
            const row = document.createElement('tr');
            let statusText = "Selesai";
            if (task.status === 'todo') statusText = "Belum Dikerjakan";
            if (task.status === 'inprogress') statusText = "Dikerjakan";

            row.innerHTML = `
                <td>${task.description}</td>
                <td>${task.project}</td>
                <td>${task.pic}</td>
                <td>${task.dueDate}</td>
                <td><span class="status-badge ${task.status}">${statusText}</span></td>
            `;
            taskTableBody.appendChild(row);
        });
    };
    
    // Fungsi lain tidak berubah signifikan (hanya copy-paste)
    const createTaskCard = (task) => { const c=document.createElement("div");c.className="task-card",c.setAttribute("data-id",task.id);let t="var(--secondary-color)";"inprogress"===task.status&&(t="var(--primary-color)"),"done"===task.status&&(t="#198754"),c.style.borderLeftColor=t,c.innerHTML=`<p>${task.description}</p><div class="task-meta"><span data-meta="project"><strong>Proyek:</strong> ${task.project}</span><span data-meta="pic"><strong>PIC:</strong> ${task.pic}</span><span data-meta="deadline"><strong>Deadline:</strong> ${task.dueDate}</span></div><div class="task-actions"><select class="status-changer"><option value="todo" ${"todo"===task.status?"selected":""}>Belum Dikerjakan</option><option value="inprogress" ${"inprogress"===task.status?"selected":""}>Dikerjakan</option><option value="done" ${"done"===task.status?"selected":""}>Selesai</option></select><button class="delete-task-btn" title="Hapus Tugas">🗑️</button></div>`,c.querySelector(".delete-task-btn").addEventListener("click",()=>deleteTask(task.id)),c.querySelector(".status-changer").addEventListener("change",e=>updateTaskStatus(task.id,e.target.value));return c};
    const renderProjectList = () => {projectList.innerHTML="",getProjects().forEach(p=>{const e=document.createElement("li");e.textContent=p.name;const t=document.createElement("button");t.className="delete-project-btn",t.innerHTML="✖",t.title=`Hapus proyek ${p.name}`,t.onclick=()=>deleteProject(p.id),e.appendChild(t),projectList.appendChild(e)})};
    const populatePicOptions = () => {[taskPicSelect,memberFilterBoard,memberFilterTable].forEach(s=>{s.innerHTML='<option value="">Pilih Anggota Tim</option>',s.innerHTML+='<option value="all">Semua Anggota</option>',teamMembers.forEach(m=>{const o=`<option value="${m}">${m}</option>`;"task-pic"===s.id?s.innerHTML+=o:s.innerHTML.includes(o)||s.insertAdjacentHTML("beforeend",o)})})};
    const populateProjectDropdowns = () => {const p=getProjects();[taskProjectSelect,projectFilterBoard,projectFilterTable].forEach(s=>{s.innerHTML='<option value="">Pilih Proyek</option>',s.innerHTML+='<option value="all">Semua Proyek</option>',p.forEach(pr=>{const o=`<option value="${pr.name}">${pr.name}</option>`;"task-project"===s.id?s.innerHTML+=o:s.innerHTML.includes(o)||s.insertAdjacentHTML("beforeend",o)})})};
    const renderAll = () => { renderProjectList(); populateProjectDropdowns(); populatePicOptions(); applyFilters(); };

    // --- EVENT LISTENERS ---
    navDashboard.addEventListener('click', () => switchView('dashboard'));
    navTable.addEventListener('click', () => switchView('table'));
    navAdmin.addEventListener('click', () => switchView('admin'));

    projectForm.addEventListener('submit', addProject);
    taskForm.addEventListener('submit', addTask);

    // Sinkronkan filter
    projectFilterBoard.addEventListener('change', () => { projectFilterTable.value = projectFilterBoard.value; applyFilters(); });
    memberFilterBoard.addEventListener('change', () => { memberFilterTable.value = memberFilterBoard.value; applyFilters(); });
    projectFilterTable.addEventListener('change', () => { projectFilterBoard.value = projectFilterTable.value; applyFilters(); });
    memberFilterTable.addEventListener('change', () => { memberFilterBoard.value = memberFilterTable.value; applyFilters(); });
    
    // --- Inisialisasi Aplikasi ---
    renderAll();
    switchView('dashboard'); // Tampilan default
});