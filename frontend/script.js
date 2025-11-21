const API_URL = "http://localhost:5000";

// Глобальная функция upload() — потому что у тебя onclick="upload()" в HTML
function showToast(message, type = 'info', duration = 500) {
    const container = document.getElementById('toastContainer');
    if (!container) {
        alert(message);
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    const removeToast = () => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    };

    toast.addEventListener('click', removeToast);

    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(removeToast, duration);
}

async function upload() {
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('Сначала войдите в аккаунт!', 'warning');
        document.getElementById('openLogin')?.click();
        return;
    }

    // Создаём input для выбора файла (если его ещё нет)
    let fileInput = document.getElementById('fileInput');
    if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'fileInput';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
    }

    // Очищаем старое значение
    fileInput.value = '';
    fileInput.onchange = async () => {
        const file = fileInput.files[0];
        if (!file) return;

        const uploadBtn = document.querySelector('.infbtn');
        const originalText = uploadBtn.textContent;
        uploadBtn.textContent = 'Загрузка...';
        uploadBtn.disabled = true;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(API_URL + "/upload", {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await res.json();

            if (res.ok) {
                showToast(`Файл загружен. Ссылка: ${data.url}`, 'success');
                loadMyFiles(); // обновляем список
            } else {
                showToast(data.error || 'Ошибка загрузки', 'error');
            }
        } catch (e) {
            showToast('Нет связи с сервером', 'error');
        } finally {
            uploadBtn.textContent = originalText;
            uploadBtn.disabled = false;
        }
    };

    fileInput.click();
}

let myFilesCache = [];
let currentSearchTerm = '';

function getFilteredFiles() {
    if (!currentSearchTerm) return myFilesCache;
    return myFilesCache.filter(file =>
        (file.filename || '').toLowerCase().includes(currentSearchTerm)
    );
}

function renderFiles(files) {
    const container = document.querySelector('.content');
    if (!container) return;

    if (!files || files.length === 0) {
        const message = currentSearchTerm
            ? 'Файлы не найдены'
            : 'Нет загруженных файлов';
        container.innerHTML = `<p style="text-align:center; color:#888; padding:50px;">${message}</p>`;
        return;
    }

    const template = document.getElementById('fileRowTemplate');
    if (!template) {
        container.innerHTML = '<p style="color:red;">Template not found</p>';
        return;
    }

    container.innerHTML = '';
    const fragment = document.createDocumentFragment();

    files.forEach((f, index) => {
        const clone = template.content.cloneNode(true);
        const numberEl = clone.querySelector('[data-field="number"]');
        const nameEl = clone.querySelector('[data-field="name"]');
        const sizeEl = clone.querySelector('[data-field="size"]');
        const modifiedEl = clone.querySelector('[data-field="modified"]');
        const downloadBtn = clone.querySelector('[data-field="downloadBtn"]');
        const deleteBtn = clone.querySelector('[data-field="deleteBtn"]');

        if (numberEl) numberEl.textContent = index + 1;
        if (nameEl) {
            // Определяем расширение файла
            const ext = (f.filename || '').split('.').pop().toLowerCase();
            let icon = '';
            switch (ext) {
                case 'jpg':
                case 'jpeg':
                case 'png':
                case 'gif':
                case 'bmp':
                    icon = "<i class='bx bx-image' style='font-size:22px;vertical-align:middle;margin-right:8px;color:#3f57cf;'></i>";
                    break;
                case 'pdf':
                    icon = "<i class='bx bxs-file-pdf' style='font-size:22px;vertical-align:middle;margin-right:8px;color:#cf3f3f;'></i>";
                    break;
                case 'zip':
                case 'rar':
                case '7z':
                    icon = "<i class='bx bxs-file-archive' style='font-size:22px;vertical-align:middle;margin-right:8px;color:#cf7f3f;'></i>";
                    break;
                case 'doc':
                case 'docx':
                    icon = "<i class='bx bxs-file-doc' style='font-size:22px;vertical-align:middle;margin-right:8px;color:#3f7fcf;'></i>";
                    break;
                case 'xls':
                case 'xlsx':
                    icon = "<i class='bx bxs-file' style='font-size:22px;vertical-align:middle;margin-right:8px;color:#3fcf7f;'></i>";
                    break;
                case 'txt':
                case 'md':
                    icon = "<i class='bx bxs-file-txt' style='font-size:22px;vertical-align:middle;margin-right:8px;color:#888;'></i>";
                    break;
                case 'mp3':
                case 'wav':
                case 'ogg':
                    icon = "<i class='bx bxs-music' style='font-size:22px;vertical-align:middle;margin-right:8px;color:#cf3fcf;'></i>";
                    break;
                case 'mp4':
                case 'avi':
                case 'mov':
                case 'mkv':
                    icon = "<i class='bx bxs-videos' style='font-size:22px;vertical-align:middle;margin-right:8px;color:#cfbf3f;'></i>";
                    break;
                default:
                    icon = "<i class='bx bxs-file' style='font-size:22px;vertical-align:middle;margin-right:8px;color:#aaa;'></i>";
            }
            nameEl.innerHTML = icon + f.filename;
        }
        if (sizeEl) {
            if (typeof f.size === 'number') {
                // Форматирование размера в МБ с 2 знаками после запятой
                sizeEl.textContent = (f.size / (1024 * 1024)).toFixed(2) + ' MB';
            } else {
                sizeEl.textContent = '—';
            }
        }
        if (modifiedEl) modifiedEl.textContent = f.modified || new Date(f.upload_time).toLocaleString();
        if (downloadBtn) {
            downloadBtn.dataset.fileId = f.id;
            downloadBtn.dataset.filename = f.filename;
            downloadBtn.addEventListener('click', () => downloadFile(f.id, f.filename));
        }
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => deleteFile(f.id, f.filename));
        }

        fragment.appendChild(clone);
    });

    container.appendChild(fragment);
}

// === Загрузка списка файлов ===
async function loadMyFiles() {
    const token = localStorage.getItem('token');
    if (!token) {
        myFilesCache = [];
        renderFiles([]);
        return;
    }

    try {
        const res = await fetch(API_URL + "/my-files", {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const files = await res.json();
        myFilesCache = Array.isArray(files) ? files : [];
        renderFiles(getFilteredFiles());
    } catch (e) {
        document.querySelector('.content').innerHTML = '<p style="color:red;">Ошибка загрузки списка</p>';
    }
}

async function downloadFile(fileId, filename = 'file') {
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('Please log in to download files', 'warning');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/download/${fileId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!res.ok) {
            let message = 'Download error';
            try {
                const errorData = await res.json();
                message = errorData.error || errorData.msg || message;
            } catch (parseErr) {
                message = res.statusText || message;
            }
            showToast(message, 'error');
            return;
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        showToast('Download started', 'success');
    } catch (err) {
        console.error(err);
        showToast('Download failed', 'error');
    }
}

async function deleteFile(fileId, filename) {
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('Сначала войдите в аккаунт!', 'warning');
        return;
    }

    const confirmed = await showConfirm(`Удалить файл "${filename}"?`);
    if (!confirmed) return;

    try {
        const res = await fetch(`${API_URL}/delete/${fileId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (res.ok) {
            showToast('Файл успешно удален', 'success');
            loadMyFiles(); // обновляем список файлов
        } else {
            const errorData = await res.json();
            showToast(errorData.error || 'Ошибка удаления файла', 'error');
        }
    } catch (err) {
        console.error('Delete error:', err);
        showToast('Ошибка соединения с сервером', 'error');
    }
}

function showConfirm(message) {
    return new Promise(resolve => {
        const modal = document.getElementById('confirm-modal');
        const messageEl = document.getElementById('confirmMessage');
        const yesBtn = document.getElementById('confirmYes');
        const noBtn = document.getElementById('confirmNo');

        if (!modal || !messageEl || !yesBtn || !noBtn) {
            // если по каким-то причинам модалки нет, просто продолжаем
            return resolve(true);
        }

        messageEl.textContent = message;
        modal.style.display = 'flex';

        const cleanup = (result) => {
            modal.style.display = 'none';
            yesBtn.removeEventListener('click', onYes);
            noBtn.removeEventListener('click', onNo);
            modal.removeEventListener('click', onOutsideClick);
            window.removeEventListener('keydown', onKeyDown);
            resolve(result);
        };

        const onYes = () => cleanup(true);
        const onNo = () => cleanup(false);
        const onOutsideClick = (event) => {
            if (event.target === modal) cleanup(false);
        };
        const onKeyDown = (event) => {
            if (event.key === 'Escape') cleanup(false);
        };

        yesBtn.addEventListener('click', onYes);
        noBtn.addEventListener('click', onNo);
        modal.addEventListener('click', onOutsideClick);
        window.addEventListener('keydown', onKeyDown);
    });
}

// === Основной запуск ===
document.addEventListener('DOMContentLoaded', () => {
    const loginModal    = document.getElementById('login-modal');
    const registerModal = document.getElementById('register-modal');
    const dropdownMenu  = document.getElementById('dropdownMenu');
    const uploadBtn     = document.querySelector('.infbtn');
    const searchBox     = document.querySelector('.search-box');
    const searchInput   = document.getElementById('searchInput');
    const header        = document.querySelector('.header');

    // Открытие модалок
    document.getElementById('openLogin')?.addEventListener('click', () => {
        closeModals();
        loginModal.style.display = 'flex';
    });

    document.getElementById('openRegister')?.addEventListener('click', () => {
        closeModals();
        registerModal.style.display = 'flex';
    });

    // Закрытие модалок
    function closeModals() {
        loginModal.style.display = 'none';
        registerModal.style.display = 'none';
    }

    document.querySelectorAll('.close').forEach(el => el.onclick = closeModals);
    window.onclick = e => {
        if (e.target === loginModal || e.target === registerModal) closeModals();
    };

    // Вход
    document.getElementById('loginBtn')?.addEventListener('click', async () => {
        const username = document.getElementById('username_lo').value.trim();
        const password = document.getElementById('password_lo').value;
        if (!username || !password) return showToast('Fill in the fields', 'warning');

        const res = await fetch(API_URL + "/login", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('username', username);
            location.reload();
        } else {
            showToast(data.error || 'Login error', 'error');
        }
    });

    // Регистрация
    document.getElementById('registerBtn')?.addEventListener('click', async () => {
        const username = document.getElementById('username_re').value.trim();
        const password = document.getElementById('password_re').value;
        if (!username || !password) return showToast('Fill in the fields', 'warning');

        const res = await fetch(API_URL + "/register", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (res.ok) {
            showToast(data.message || 'Registration successful', 'success');
            closeModals();
        } else {
            showToast(data.error || 'Registration error', 'error');
        }
    });

    // Дропдаун профиля
    document.getElementById('profileToggle')?.addEventListener('click', e => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
    });

    // ВЫХОД
    document.getElementById('logoutBtn')?.addEventListener('click', async e => {
        e.stopPropagation();
        const confirmed = await showConfirm('Log out of your account?');
        if (!confirmed) return;

        const token = localStorage.getItem('token');
        try {
            if (token) {
                await fetch(API_URL + "/logout", {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            }
        } catch (err) {
            console.warn('Logout request failed', err);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            location.reload();
        }
    });

    document.addEventListener('click', e => {
        if (!e.target.closest('.user-profile')) {
            dropdownMenu.classList.remove('show');
        }
    });

    // Поиск
    searchInput?.addEventListener('input', e => {
        currentSearchTerm = e.target.value.trim().toLowerCase();
        renderFiles(getFilteredFiles());
    });

    // === Проверка авторизации ===
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const tableHeader = document.getElementById('tableHeader');

    const guestImages = document.getElementById('guestImages');
    if (token && username) {
        document.getElementById('authButtons').style.display = 'none';
        document.getElementById('userProfile').style.display = 'flex';
        document.getElementById('usernameDisplay').textContent = username;
        if (uploadBtn) uploadBtn.style.display = 'inline-block'; // показываем кнопку Upload
        if (searchBox) searchBox.style.display = 'flex';
        if (header) header.style.display = '';
        if (tableHeader) tableHeader.style.display = 'grid';
        if (guestImages) guestImages.style.display = 'none';
        loadMyFiles();
    } else {
        if (uploadBtn) uploadBtn.style.display = 'none'; // скрываем Upload для гостей
        if (searchBox) searchBox.style.display = 'none';
        if (searchInput) searchInput.value = '';
        if (header) header.style.display = '';
        if (tableHeader) tableHeader.style.display = 'none';
        if (guestImages) guestImages.style.display = 'block';
        currentSearchTerm = '';
    }
});