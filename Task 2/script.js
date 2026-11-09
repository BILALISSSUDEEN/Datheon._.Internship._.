/* TaskFlow — all data stays in this browser. */
(() => {
  "use strict";
  const STORAGE_KEY = "taskflow.tasks.v1";
  const THEME_KEY = "taskflow.theme";
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const els = {
    taskList: $("#taskList"), empty: $("#emptyState"), modal: $("#taskModal"),
    form: $("#taskForm"), title: $("#taskTitle"), description: $("#taskDescription"),
    category: $("#taskCategory"), due: $("#taskDueDate"), priority: $("#taskPriority"),
    id: $("#taskId"), modalTitle: $("#modalTitle"), saveButton: $("#saveTaskButton"),
    search: $("#searchInput"), sort: $("#sortSelect"), toast: $("#toast")
  };

  let tasks = loadTasks();
  let currentFilter = "all";
  let currentCategory = null;
  let searchTerm = "";
  let draggedId = null;
  let toastTimer;

  function loadTasks() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(data) ? data.filter(t => t && typeof t.id === "string" && typeof t.title === "string") : [];
    } catch (error) {
      console.warn("TaskFlow could not read saved tasks:", error);
      return [];
    }
  }
  function saveTasks() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }
    catch (error) { showToast("Storage is unavailable. Check your browser settings."); }
  }
  function makeId() {
    return window.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
  function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  }
  function localDateString(date = new Date()) {
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
  }
  function formatDate(dateString) {
    if (!dateString) return "";
    const date = new Date(`${dateString}T00:00:00`);
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2400);
  }
  function openModal(task = null) {
    els.form.reset();
    els.id.value = task?.id || "";
    els.title.value = task?.title || "";
    els.description.value = task?.description || "";
    els.category.value = task?.category || "Work";
    els.due.value = task?.dueDate || "";
    els.priority.value = task?.priority || "medium";
    els.modalTitle.textContent = task ? "Edit task" : "Create a task";
    els.saveButton.innerHTML = task ? 'Save changes <span>→</span>' : 'Create task <span>→</span>';
    els.modal.classList.add("open");
    els.modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    setTimeout(() => els.title.focus(), 50);
  }
  function closeModal() {
    els.modal.classList.remove("open");
    els.modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
  function isOverdue(task) {
    return !task.completed && task.dueDate && task.dueDate < localDateString();
  }
  function dueMarkup(task) {
    if (!task.dueDate) return "";
    const today = localDateString();
    let cls = "", label = `Due ${formatDate(task.dueDate)}`;
    if (!task.completed && task.dueDate < today) { cls = "overdue"; label = `Overdue · ${formatDate(task.dueDate)}`; }
    else if (!task.completed && task.dueDate === today) { cls = "today"; label = "Due today"; }
    return `<span class="due-label ${cls}">◷ ${label}</span>`;
  }
  function taskMarkup(task) {
    const category = ["Work","Personal","Study","Other"].includes(task.category) ? task.category : "Other";
    const priority = ["high","medium","low"].includes(task.priority) ? task.priority : "medium";
    return `<article class="task-card ${task.completed ? "is-complete" : ""}" draggable="true" data-id="${escapeHTML(task.id)}">
      <input class="task-check" type="checkbox" aria-label="Mark ${escapeHTML(task.title)} complete" ${task.completed ? "checked" : ""}>
      <div class="task-main">
        <div class="task-title-line"><span class="task-title">${escapeHTML(task.title)}</span></div>
        ${task.description ? `<p class="task-description">${escapeHTML(task.description)}</p>` : ""}
        <div class="task-meta"><span class="category-pill ${category.toLowerCase()}">${category}</span><span class="priority-pill ${priority}">${priority[0].toUpperCase()+priority.slice(1)} priority</span>${dueMarkup(task)}</div>
      </div>
      <div class="task-actions"><button class="task-action edit" title="Edit task" aria-label="Edit task">✎</button><button class="task-action delete" title="Delete task" aria-label="Delete task">⌫</button></div>
    </article>`;
  }
  function getVisibleTasks() {
    let result = [...tasks];
    if (currentFilter === "active") result = result.filter(t => !t.completed);
    if (currentFilter === "completed") result = result.filter(t => t.completed);
    if (currentCategory) result = result.filter(t => t.category === currentCategory);
    if (searchTerm) result = result.filter(t => `${t.title} ${t.description || ""} ${t.category}`.toLowerCase().includes(searchTerm));
    const sort = els.sort.value;
    if (sort === "due") result.sort((a,b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
    if (sort === "priority") { const rank = {high:0,medium:1,low:2}; result.sort((a,b) => rank[a.priority]-rank[b.priority]); }
    if (sort === "title") result.sort((a,b) => a.title.localeCompare(b.title));
    if (sort === "created") result.sort((a,b) => (b.createdAt || 0)-(a.createdAt || 0));
    return result;
  }
  function render() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const active = total - completed;
    const overdue = tasks.filter(isOverdue).length;
    const rate = total ? Math.round(completed / total * 100) : 0;
    $("#totalStat").textContent = total;
    $("#activeStat").textContent = active;
    $("#completedStat").textContent = completed;
    $("#overdueStat").textContent = overdue;
    $("#completionRate").textContent = `${rate}% completion rate`;
    $("#progressPercent").textContent = `${rate}%`;
    $("#progressBar").style.width = `${rate}%`;
    $(".focus-progress span").style.width = `${rate}%`;
    $("#focusText").textContent = total ? `${completed} of ${total} tasks completed` : "Your progress starts here";
    $("#progressMessage").textContent = total ? (rate === 100 ? "Amazing work — everything is complete!" : `${active} task${active === 1 ? "" : "s"} left. Keep your momentum going.`) : "Complete a task to build your momentum.";
    $("#navAllCount").textContent = total;
    $("#navActiveCount").textContent = active;
    $("#allFilterCount").textContent = total;
    $("#activeFilterCount").textContent = active;
    $("#completedFilterCount").textContent = completed;
    const visible = getVisibleTasks();
    $("#visibleTaskCount").textContent = visible.length;
    els.taskList.innerHTML = visible.map(taskMarkup).join("");
    els.empty.hidden = visible.length !== 0;
    els.taskList.hidden = visible.length === 0;
    $$(".filter-tab").forEach(btn => btn.classList.toggle("selected", btn.dataset.filter === currentFilter));
    $$(".side-nav [data-filter]").forEach(btn => btn.classList.toggle("active", btn.dataset.filter === currentFilter && !currentCategory));
    $$(".category-nav [data-category]").forEach(btn => btn.classList.toggle("active", btn.dataset.category === currentCategory));
    $("#breadcrumbTitle").textContent = currentCategory || (currentFilter === "all" ? "Overview" : currentFilter === "active" ? "My tasks" : "Completed");
    $("#pageTitle").innerHTML = currentCategory ? `${escapeHTML(currentCategory)} tasks <span>at a glance.</span>` : currentFilter === "completed" ? `Look what you've <span>accomplished.</span>` : currentFilter === "active" ? `One thing at a time. <span>You've got this.</span>` : `Good day. <span>Let's get things done.</span>`;
    $("#dateGreeting").textContent = new Date().toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"}).toUpperCase();
  }
  function setFilter(filter) { currentFilter = filter; currentCategory = null; render(); }
  function addOrUpdateTask(event) {
    event.preventDefault();
    const title = els.title.value.trim();
    if (!title) { els.title.focus(); return; }
    const id = els.id.value;
    if (id) {
      const task = tasks.find(t => t.id === id);
      if (task) Object.assign(task, {title,description:els.description.value.trim(),category:els.category.value,dueDate:els.due.value,priority:els.priority.value,updatedAt:Date.now()});
      showToast("Task updated successfully");
    } else {
      tasks.unshift({id:makeId(),title,description:els.description.value.trim(),category:els.category.value,dueDate:els.due.value,priority:els.priority.value,completed:false,createdAt:Date.now()});
      showToast("New task added");
    }
    saveTasks(); closeModal(); render();
  }
  function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    task.completed = !task.completed;
    task.completedAt = task.completed ? Date.now() : null;
    saveTasks(); render(); showToast(task.completed ? "Great job — task completed!" : "Task moved back to active");
  }
  function deleteTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task || !confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    tasks = tasks.filter(t => t.id !== id);
    saveTasks(); render(); showToast("Task deleted");
  }

  $("#openTaskModal").addEventListener("click", () => openModal());
  $("#emptyAddButton").addEventListener("click", () => openModal());
  $("#closeModal").addEventListener("click", closeModal);
  $("#cancelModal").addEventListener("click", closeModal);
  els.modal.addEventListener("click", e => { if (e.target === els.modal) closeModal(); });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeModal();
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); els.search.focus(); }
  });
  els.form.addEventListener("submit", addOrUpdateTask);
  els.search.addEventListener("input", e => { searchTerm = e.target.value.trim().toLowerCase(); render(); });
  els.sort.addEventListener("change", render);
  $$(".filter-tab").forEach(btn => btn.addEventListener("click", () => setFilter(btn.dataset.filter)));
  $$(".side-nav [data-filter]").forEach(btn => btn.addEventListener("click", () => setFilter(btn.dataset.filter)));
  $$(".category-nav [data-category]").forEach(btn => btn.addEventListener("click", () => { currentCategory = currentCategory === btn.dataset.category ? null : btn.dataset.category; currentFilter = "all"; render(); }));
  els.taskList.addEventListener("click", e => {
    const card = e.target.closest(".task-card"); if (!card) return;
    const id = card.dataset.id;
    if (e.target.matches(".task-check")) toggleTask(id);
    if (e.target.closest(".edit")) openModal(tasks.find(t => t.id === id));
    if (e.target.closest(".delete")) deleteTask(id);
  });
  els.taskList.addEventListener("dragstart", e => {
    const card = e.target.closest(".task-card"); if (!card) return;
    draggedId = card.dataset.id; card.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", draggedId);
  });
  els.taskList.addEventListener("dragend", e => { e.target.closest(".task-card")?.classList.remove("dragging"); $$(".drag-over").forEach(el => el.classList.remove("drag-over")); });
  els.taskList.addEventListener("dragover", e => {
    e.preventDefault(); const target = e.target.closest(".task-card");
    if (target && target.dataset.id !== draggedId) { $$(".drag-over").forEach(el => el.classList.remove("drag-over")); target.classList.add("drag-over"); }
  });
  els.taskList.addEventListener("drop", e => {
    e.preventDefault(); const target = e.target.closest(".task-card"); if (!target || !draggedId || target.dataset.id === draggedId) return;
    const from = tasks.findIndex(t => t.id === draggedId), to = tasks.findIndex(t => t.id === target.dataset.id);
    if (from < 0 || to < 0) return;
    const [moved] = tasks.splice(from,1); tasks.splice(to,0,moved);
    // Keep manual order when "Recently added" is selected by updating the ordering timestamp.
    tasks.forEach((t,i) => { t.createdAt = Date.now() - i; });
    saveTasks(); render(); draggedId = null;
  });
  $("#themeToggle").addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem(THEME_KEY, document.body.classList.contains("dark") ? "dark" : "light");
  });
  if (localStorage.getItem(THEME_KEY) === "dark") document.body.classList.add("dark");
  $("#mobileMenu").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
  document.addEventListener("click", e => {
    if (window.innerWidth <= 780 && !e.target.closest("#sidebar") && !e.target.closest("#mobileMenu")) $("#sidebar").classList.remove("open");
  });
  $("#addCategoryBtn").addEventListener("click", () => showToast("Use the built-in categories: Work, Personal, Study and Other."));
  $("#todayLabel").textContent = new Date().toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});
  render();
})();
