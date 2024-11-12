export class UserManager {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalUsers = 0;
        this.contentArea = document.getElementById('contentArea');
    }

    async load() {
        await this.renderUserManagement();
        this.attachEventListeners();
    }

    async renderUserManagement() {
        this.contentArea.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2>User Management</h2>
                    <div class="actions">
                        <input type="text" id="userSearch" placeholder="Search users..." class="search-input">
                        <button id="createUserBtn" class="btn btn-primary">
                            <i class="fas fa-plus"></i> Create User
                        </button>
                    </div>
                </div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Username</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="userTableBody">
                            <tr>
                                <td colspan="7" class="loading">Loading users...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="pagination" id="userPagination"></div>
            </div>
        `;

        await this.loadUsers();
    }

    async loadUsers() {
        try {
            const response = await fetch(
                `http://localhost:8000/api/users?page=${this.currentPage}&page_size=${this.pageSize}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
    
            if (!response.ok) throw new Error('Failed to load users');
    
            const data = await response.json();
            this.totalUsers = data.total;
            this.renderUsers(data.users);
            this.renderPagination();
        } catch (error) {
            this.showError('Error loading users: ' + error.message);
        }
    }

    renderUsers(users) {
        const tbody = document.getElementById('userTableBody');
        tbody.innerHTML = users.map(user => `
            <tr data-user-id="${user.id}">
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>
                    <span class="badge badge-${this.getRoleBadgeClass(user.role_name)}">
                        ${user.role_name}
                    </span>
                </td>
                <td>
                    <span class="badge badge-${user.is_active ? 'success' : 'danger'}">
                        ${user.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-icon edit-user" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-icon view-user" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-icon btn-danger delete-user" 
                                title="Delete"
                                ${user.role_name === 'admin' ? 'disabled' : ''}>
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    
        // Add event listeners after rendering
        this.attachUserActionListeners();
    }
    attachUserActionListeners() {
        const tbody = document.getElementById('userTableBody');
    
        // Edit buttons
        tbody.querySelectorAll('.edit-user').forEach(button => {
            button.addEventListener('click', (e) => {
                const userId = this.getUserIdFromButton(e.target);
                this.showUserModal(userId);
            });
        });
    
        // View buttons
        tbody.querySelectorAll('.view-user').forEach(button => {
            button.addEventListener('click', (e) => {
                const userId = this.getUserIdFromButton(e.target);
                this.viewUser(userId);
            });
        });
    
        // Delete buttons
        tbody.querySelectorAll('.delete-user').forEach(button => {
            button.addEventListener('click', async (e) => {
                const userId = this.getUserIdFromButton(e.target);
                await this.deleteUser(userId);
            });
        });
    }
    
    getUserIdFromButton(element) {
        // Handle both button and icon clicks
        const row = element.closest('tr');
        return parseInt(row.dataset.userId);
    }

    getRoleBadgeClass(role) {
        const classes = {
            admin: 'primary',
            moderator: 'warning',
            user: 'info'
        };
        return classes[role] || 'secondary';
    }

    renderPagination() {
        const totalPages = Math.ceil(this.totalUsers / this.pageSize);
        const pagination = document.getElementById('userPagination');
        
        pagination.innerHTML = `
            <button class="btn btn-icon prev-page" 
                    ${this.currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
            <span>Page ${this.currentPage} of ${totalPages}</span>
            <button class="btn btn-icon next-page"
                    ${this.currentPage === totalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
    
        // Add pagination event listeners
        const prevButton = pagination.querySelector('.prev-page');
        const nextButton = pagination.querySelector('.next-page');
    
        if (!prevButton.disabled) {
            prevButton.addEventListener('click', () => this.goToPage(this.currentPage - 1));
        }
        if (!nextButton.disabled) {
            nextButton.addEventListener('click', () => this.goToPage(this.currentPage + 1));
        }
    }
    async goToPage(page) {
        this.currentPage = page;
        await this.loadUsers();
    }

    attachEventListeners() {
        // Create user button
        document.getElementById('createUserBtn').addEventListener('click', () => {
            this.showUserModal();
        });

        // Search input
        const searchInput = document.getElementById('userSearch');
        let debounceTimer;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                this.searchUsers(e.target.value);
            }, 300);
        });
    }

    async searchUsers(query) {
        this.currentPage = 1;
        try {
            const response = await fetch(
                `http://localhost:8000/api/users/search?q=${query}&page=${this.currentPage}&page_size=${this.pageSize}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Search failed');

            const data = await response.json();
            this.totalUsers = data.total;
            this.renderUsers(data.users);
            this.renderPagination();
        } catch (error) {
            this.showError('Search error: ' + error.message);
        }
    }

    async showUserModal(userId = null) {
        const roles = await this.fetchRoles();
        const user = userId ? await this.fetchUser(userId) : null;

        const modal = document.getElementById('modal');
        const modalContent = document.getElementById('modalContent');

        modalContent.innerHTML = `
            <h2>${userId ? 'Edit' : 'Create'} User</h2>
            <form id="userForm">
                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" id="username" required 
                           value="${user ? user.username : ''}"
                           ${user ? 'readonly' : ''}>
                </div>
                <div class="form-group">
                    <label for="email">Email</label>
                    <input type="email" id="email" required
                           value="${user ? user.email : ''}">
                </div>
                ${!user ? `
                    <div class="form-group">
                        <label for="password">Password</label>
                        <input type="password" id="password" required>
                    </div>
                ` : ''}
                <div class="form-group">
                    <label for="role">Role</label>
                    <select id="role" required>
                        ${roles.map(role => `
                            <option value="${role.id}" 
                                ${user && user.role_id === role.id ? 'selected' : ''}>
                                ${role.name}
                            </option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="isActive" 
                               ${user ? (user.is_active ? 'checked' : '') : 'checked'}>
                        Active
                    </label>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">
                        ${userId ? 'Update' : 'Create'} User
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">
                        Cancel
                    </button>
                </div>
            </form>
        `;

        modal.style.display = 'block';
        
        document.getElementById('userForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveUser(userId);
        });
    }

    async saveUser(userId = null) {
        try {
            const userData = {
                username: document.getElementById('username').value,
                email: document.getElementById('email').value,
                role_id: parseInt(document.getElementById('role').value),
                is_active: document.getElementById('isActive').checked
            };

            if (!userId) {
                userData.password = document.getElementById('password').value;
            }

            const response = await fetch(
                `http://localhost:8000/api/users${userId ? `/${userId}` : ''}`, {
                method: userId ? 'PUT' : 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Operation failed');
            }

            this.closeModal();
            this.showSuccess(`User successfully ${userId ? 'updated' : 'created'}`);
            await this.loadUsers();
        } catch (error) {
            this.showError(error.message);
        }
    }

    async deleteUser(userId) {
        if (!confirm('Are you sure you want to delete this user?')) return;

        try {
            const response = await fetch(`http://localhost:8000/api/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Delete failed');
            }

            this.showSuccess('User successfully deleted');
            await this.loadUsers();
        } catch (error) {
            this.showError(error.message);
        }
    }

    async fetchUser(userId) {
        const response = await fetch(`http://localhost:8000/api/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        return await response.json();
    }

    async fetchRoles() {
        const response = await fetch('http://localhost:8000/api/rbac/roles', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        return await response.json();
    }

    async viewUser(userId) {
        const user = await this.fetchUser(userId);
        const modal = document.getElementById('modal');
        const modalContent = document.getElementById('modalContent');
    
        modalContent.innerHTML = `
            <h2>User Details</h2>
            <div class="user-details">
                <div class="detail-group">
                    <label>Username:</label>
                    <span>${user.username}</span>
                </div>
                <div class="detail-group">
                    <label>Email:</label>
                    <span>${user.email}</span>
                </div>
                <div class="detail-group">
                    <label>Role:</label>
                    <span>${user.role_name}</span>
                </div>
                <div class="detail-group">
                    <label>Status:</label>
                    <span class="badge badge-${user.is_active ? 'success' : 'danger'}">
                        ${user.is_active ? 'Active' : 'Inactive'}
                    </span>
                </div>
                <div class="detail-group">
                    <label>Created:</label>
                    <span>${new Date(user.created_at).toLocaleString()}</span>
                </div>
            </div>
            <div class="form-actions">
                <button class="btn btn-primary edit-user-btn">Edit User</button>
                <button class="btn btn-secondary close-modal-btn">Close</button>
            </div>
        `;
    
        modal.style.display = 'block';
    
        // Add event listeners
        modalContent.querySelector('.edit-user-btn').addEventListener('click', () => {
            this.showUserModal(userId);
        });
    
        modalContent.querySelector('.close-modal-btn').addEventListener('click', () => {
            this.closeModal();
        });
    }

    closeModal() {
        document.getElementById('modal').style.display = 'none';
    }

    showSuccess(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-success';
        alert.textContent = message;
        this.contentArea.insertBefore(alert, this.contentArea.firstChild);
        setTimeout(() => alert.remove(), 3000);
    }

    showError(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-error';
        alert.textContent = message;
        this.contentArea.insertBefore(alert, this.contentArea.firstChild);
        setTimeout(() => alert.remove(), 3000);
    }
}