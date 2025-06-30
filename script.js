import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://zyehecfhbcfexfmkyhib.supabase.co';

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5ZWhlY2ZoYmNmZXhmbWt5aGliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyMzE3NjEsImV4cCI6MjA2NjgwNzc2MX0.ck8-G3bi0FA41aS8WSXpVCkd6fDFaSLh_Bqbw-xBCIM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const taskList = document.getElementById('task-list');
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const feedbackMessageDiv = document.getElementById('feedback-message'); 

const filterAllBtn = document.getElementById('filter-all');
const filterActiveBtn = document.getElementById('filter-active');
const filterCompletedBtn = document.getElementById('filter-completed');
const clearCompletedButton = document.getElementById('clear-completed-button');
const taskCountSpan = document.getElementById('task-count');

const deleteConfirmationModal = document.getElementById('delete-confirmation-modal');
const confirmDeleteButton = document.getElementById('confirm-delete-button');
const cancelDeleteButton = document.getElementById('cancel-delete-button');

let currentFilter = 'all'; 
let taskIdToDelete = null;
let listItemToDelete = null;


function showFeedback(message, type) {
    feedbackMessageDiv.textContent = message;
    feedbackMessageDiv.className = ''; 
    feedbackMessageDiv.classList.add(type); 
    feedbackMessageDiv.classList.add('show'); 

    setTimeout(() => {
        feedbackMessageDiv.classList.remove('show'); 
        setTimeout(() => {
            feedbackMessageDiv.className = '';
        }, 300); 
    }, 3000);
}

function displayTasks(tasks) {
    taskList.innerHTML = '';
    let activeTasksCount = 0;

    tasks.forEach(task => {
        const listItem = document.createElement('li');
        listItem.dataset.id = task.id;
        listItem.dataset.isComplete = task.is_complete;

        if (!task.is_complete) {
            activeTasksCount++;
        }

        const taskContent = document.createElement('div');
        taskContent.classList.add('task-content');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = task.is_complete;
        checkbox.addEventListener('change', () => toggleTaskComplete(task.id, !task.is_complete));

        const taskText = document.createElement('span');
        taskText.textContent = task.description;
        if (task.is_complete) {
            taskText.classList.add('completed');
        }

        taskText.addEventListener('click', () => enableInlineEdit(task.id, taskText, task.description));

        taskContent.appendChild(checkbox);
        taskContent.appendChild(taskText);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Excluir';
        deleteButton.classList.add('delete-button');
        deleteButton.addEventListener('click', () => {
            taskIdToDelete = task.id;
            listItemToDelete = listItem;
            deleteConfirmationModal.classList.add('show-modal');
        });

        listItem.appendChild(taskContent);
        listItem.appendChild(deleteButton);
        taskList.appendChild(listItem);
    });

    updateTaskCount(activeTasksCount);
}

function enableInlineEdit(taskId, taskTextElement, currentDescription) {
    if (taskTextElement.classList.contains('completed')) {
        showFeedback('Não é possível editar tarefas concluídas.', 'error');
        return;
    }

    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.classList.add('edit-input');
    editInput.value = currentDescription;

    taskTextElement.parentNode.replaceChild(editInput, taskTextElement);
    editInput.focus(); 

    editInput.addEventListener('blur', async () => {
        const newDescription = editInput.value.trim();
        if (newDescription !== currentDescription && newDescription !== '') {
            await updateTaskDescription(taskId, newDescription);
        } else {
            editInput.parentNode.replaceChild(taskTextElement, editInput);
            taskTextElement.textContent = currentDescription; 
        }
    });

    editInput.addEventListener('keypress', async (event) => {
        if (event.key === 'Enter') {
            editInput.blur(); 
        }
    });
}

async function updateTaskDescription(id, newDescription) {
    const { data, error } = await supabase
        .from('tasks')
        .update({ description: newDescription })
        .eq('id', id);

    if (error) {
        console.error('Erro ao atualizar descrição da tarefa:', error.message);
        showFeedback('Erro ao atualizar tarefa!', 'error');
    } else {
        console.log('Descrição da tarefa atualizada com sucesso:', data);
        getTasks(); 
        showFeedback('Tarefa atualizada com sucesso!', 'success');
    }
}

async function getTasks() {
    let query = supabase.from('tasks').select('*');

    if (currentFilter === 'active') {
        query = query.eq('is_complete', false);
    } else if (currentFilter === 'completed') {
        query = query.eq('is_complete', true);
    }

    query = query.order('created_at', { ascending: true });

    let { data: tasks, error } = await query;

    if (error) {
        console.error('Erro ao buscar tarefas:', error.message);
        showFeedback('Erro ao carregar tarefas!', 'error');
    } else {
        displayTasks(tasks);
        console.log('Tarefas carregadas e exibidas com filtro:', currentFilter);
    }
}

async function addTask(description) {
    const { data, error } = await supabase
        .from('tasks')
        .insert([
            { description: description, is_complete: false }
        ]);

    if (error) {
        console.error('Erro ao adicionar tarefa:', error.message);
        showFeedback('Erro ao adicionar tarefa!', 'error');
    } else {
        console.log('Tarefa adicionada com sucesso:', data);
        taskInput.value = '';
        currentFilter = 'all'; 
        updateFilterButtons(); 
        getTasks(); 
        showFeedback('Tarefa adicionada com sucesso!', 'success');
    }
}

async function toggleTaskComplete(id, is_complete) {
    const { data, error } = await supabase
        .from('tasks')
        .update({ is_complete: is_complete })
        .eq('id', id);

    if (error) {
        console.error('Erro ao atualizar tarefa:', error.message);
        showFeedback('Erro ao atualizar tarefa!', 'error');
    } else {
        console.log('Tarefa atualizada com sucesso:', data);
        getTasks(); 
        showFeedback('Tarefa atualizada com sucesso!', 'success');
    }
}

async function deleteTask(id, listItem) {
    listItem.classList.add('task-item-exit');
    const animationDuration = 300; 

    const animationEndHandler = async () => {
        listItem.removeEventListener('animationend', animationEndHandler); 
        performSupabaseDelete();
    };

    listItem.addEventListener('animationend', animationEndHandler); 

    const performSupabaseDelete = async () => {
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Erro do Supabase ao excluir:', error.message);
            showFeedback('Erro ao excluir tarefa!', 'error');
            listItem.classList.remove('task-item-exit');
        } else {
            console.log('Tarefa excluída com sucesso.');
            getTasks(); 
            showFeedback('Tarefa excluída com sucesso!', 'success');
        }
    };

    setTimeout(() => {
        if (listItem.classList.contains('task-item-exit')) {
            performSupabaseDelete();
        }
    }, animationDuration + 50);
}

async function clearCompletedTasks() {
    const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('is_complete', true);

    if (error) {
        console.error('Erro ao limpar tarefas concluídas:', error.message);
        showFeedback('Erro ao limpar tarefas concluídas!', 'error');
    } else {
        console.log('Tarefas concluídas limpas com sucesso.');
        getTasks();
        showFeedback('Tarefas concluídas limpas!', 'success');
    }
}

function updateFilterButtons() {
    filterAllBtn.classList.remove('active');
    filterActiveBtn.classList.remove('active');
    filterCompletedBtn.classList.remove('active');

    if (currentFilter === 'all') {
        filterAllBtn.classList.add('active');
    } else if (currentFilter === 'active') {
        filterActiveBtn.classList.add('active');
    } else if (currentFilter === 'completed') {
        filterCompletedBtn.classList.add('active');
    }
}

function updateTaskCount(count) {
    taskCountSpan.textContent = `${count} tarefas ativas`;
}

filterAllBtn.addEventListener('click', () => {
    currentFilter = 'all';
    updateFilterButtons();
    getTasks();
});

filterActiveBtn.addEventListener('click', () => {
    currentFilter = 'active';
    updateFilterButtons();
    getTasks();
});

filterCompletedBtn.addEventListener('click', () => {
    currentFilter = 'completed';
    updateFilterButtons();
    getTasks();
});

clearCompletedButton.addEventListener('click', clearCompletedTasks);

confirmDeleteButton.addEventListener('click', () => {
    if (taskIdToDelete !== null && listItemToDelete !== null) {
        deleteTask(taskIdToDelete, listItemToDelete);
    }
    deleteConfirmationModal.classList.remove('show-modal');
    taskIdToDelete = null;
    listItemToDelete = null;
});

cancelDeleteButton.addEventListener('click', () => {
    deleteConfirmationModal.classList.remove('show-modal');
    taskIdToDelete = null;
    listItemToDelete = null;
});

taskForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const description = taskInput.value.trim();
    if (description) {
        addTask(description);
    } else {
        showFeedback('A descrição da tarefa não pode ser vazia.', 'error');
    }
});

updateFilterButtons();
getTasks();