export class PermissionManager {
    constructor() {
        this.contentArea = document.getElementById('contentArea');
    }

    async load() {
        await this.renderPermissionManagement();
        this.attachEventListeners();
    }

    async renderPermissionManagement() {
        this.contentArea.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2>Permission Management</h2>
                    <div class="actions">
                        <select id="categoryFilter" class="select-filter">
                            <option value="">All Categories</option>
                        </select>
                        <button id="createPermissionBtn" class="btn btn-primary">
                            <i class="fas fa-plus"></i> Create Permission
                        </button>
                    </div>
                </div>
                <div class="permissions-overview">
                    <div class="stats-cards">
                        <div class="stat-card">
                            <h3>Total Permissions</h3>
                            <div class="stat-number" id="totalPermissions">...</div>
                        </div>
                        <div class="stat-card">
                            <h3>Categories</h3>
                            <div class="stat-number" id="totalCategories">...</div>
                        </div>
                    </div>
                </div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Category</th>
                                <th>Description</th>
                                <th>Roles Using</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="permissionTableBody">
                            <tr>
                                <td colspan="6" class="loading">Loading permissions...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        await this.loadPermissions();
    }

    async loadPermissions(category = '') {
        try {
            const response = await fetch(
                `http://localhost:8000/api/permissions${category ? `?category=${category}` : ''}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to load permissions');

            const data = await response.json();
            this.renderPermissions(data.permissions);
            this.updateStats(data.stats);
            this.updateCategoryFilter(data.categories);
        } catch (error) {
            this.showError('Error loading permissions: ' + error.message);
        }
    }

    renderPermissions(permissions) {
        const tbody = document.getElementById('permissionTableBody');
        tbody.innerHTML = permissions.map(permission => `
            <tr>
                <td>${permission.id}</td>
                <td>
                    <span class="permission-name" title="${permission.name}">
                        ${permission.name}
                    </span>
                </td>
                <td>
                    <span class="badge badge-${this.getCategoryColor(permission.category)}">
                        ${permission.category}
                    </span>
                </td>
                <td>${permission.description}</td>
                <td>
                    ${this.renderRoleUsage(permission.roles)}
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-icon" onclick="editPermission(${permission.id})"
                                title="Edit Permission">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-icon" onclick="viewPermission(${permission.id})"
                                title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-icon btn-danger" 
                                onclick="deletePermission(${permission.id})"
                                title="Delete Permission"
                                ${permission.roles.length > 0 ? 'disabled' : ''}>
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    renderRoleUsage(roles) {
        if (roles.length === 0) return '<span class="text-muted">None</span>';
        
        const displayRoles = roles.slice(0, 2);
        const remaining = roles.length - 2;
        
        return `
            <div class="role-usage">
                ${displayRoles.map(role => `
                    <span class="badge badge-${this.getRoleBadgeClass(role.name)}">
                        ${role.name}
                    </span>
                `).join('')}
                ${remaining > 0 ? `
                    <span class="badge badge-secondary" title="${roles.slice(2).map(r => r.name).join(', ')}">
                        +${remaining} more
                    </span>
                ` : ''}
            </div>
        `;
    }

    async showPermissionModal(permissionId = null) {
        const categories = await this.fetchCategories();
        const permission = permissionId ? await this.fetchPermission(permissionId) : null;

        const modal = document.getElementById('modal');
        const modalContent = document.getElementById('modalContent');

        modalContent.innerHTML = `
            <h2>${permissionId ? 'Edit' : 'Create'} Permission</h2>
            <form id="permissionForm">
                <div class="form-group">
                    <label for="permissionName">Permission Name</label>
                    <input type="text" id="permissionName" required 
                           value="${permission ? permission.name : ''}"
                           pattern="[a-z_]+" 
                           title="Lowercase letters and underscores only">
                    <small class="form-text">Use lowercase letters and underscores only (e.g., manage_users)</small>
                </div>
                <div class="form-group">
                    <label for="permissionCategory">Category</label>
                    <select id="permissionCategory" required>
                        ${categories.map(category => `
                            <option value="${category}" 
                                ${permission && permission.category === category ? 'selected' : ''}>
                                ${category}
                            </option>
                        `).join('')}
                        <option value="new_category">+ Add New Category</option>
                    </select>
                </div>
                <div id="newCategoryInput" class="form-group" style="display: none;">
                    <label for="newCategory">New Category Name</label>
                    <input type="text" id="newCategory" pattern="[a-z_]+">
                </div>
                <div class="form-group">
                    <label for="permissionDescription">Description</label>
                    <textarea id="permissionDescription" required rows="3">${permission ? permission.description : ''}</textarea>
                </div>
                ${permission ? `
                    <div class="form-group">
                        <label>Currently Used By Roles:</label>
                        <div class="role-list">
                            ${this.renderRoleList(permission.roles)}
                        </div>
                    </div>
                ` : ''}
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">
                        ${permissionId ? 'Update' : 'Create'} Permission
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">
                        Cancel
                    </button>
                </div>
            </form>
        `;

        // Handle new category selection
        const categorySelect = document.getElementById('permissionCategory');
        const newCategoryInput = document.getElementById('newCategoryInput');
        categorySelect.addEventListener('change', (e) => {
            newCategoryInput.style.display = e.target.value === 'new_category' ? 'block' : 'none';
        });

        modal.style.display = 'block';
        
        document.getElementById('permissionForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.savePermission(permissionId);
        });
    }

    async savePermission(permissionId = null) {
        try {
            const categorySelect = document.getElementById('permissionCategory');
            const category = categorySelect.value === 'new_category' 
                ? document.getElementById('newCategory').value 
                : categorySelect.value;

            const permissionData = {
                name: document.getElementById('permissionName').value,
                category: category,
                description: document.getElementById('permissionDescription').value
            };

            const response = await fetch(
                `http://localhost:8000/api/permissions${permissionId ? `/${permissionId}` : ''}`, {
                method: permissionId ? 'PUT' : 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(permissionData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Operation failed');
            }

            this.closeModal();
            this.showSuccess(`Permission successfully ${permissionId ? 'updated' : 'created'}`);
            await this.loadPermissions();
        } catch (error) {
            this.showError(error.message);
        }
    }

    async deletePermission(permissionId) {
        if (!confirm('Are you sure you want to delete this permission?')) return;

        try {
            const response = await fetch(`http://localhost:8000/api/permissions/${permissionId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Delete failed');
            }

            this.showSuccess('Permission successfully deleted');
            await this.loadPermissions();
        } catch (error) {
            this.showError(error.message);
        }
    }

    async viewPermission(permissionId) {
        const permission = await this.fetchPermission(permissionId);
        const usageStats = await this.fetchPermissionUsage(permissionId);

        const modal = document.getElementById('modal');
        const modalContent = document.getElementById('modalContent');

        modalContent.innerHTML = `
            <h2>Permission Details</h2>
            <div class="permission-details">
                <div class="detail-group">
                    <label>Name:</label>
                    <span>${permission.name}</span>
                </div>
                <div class="detail-group">
                    <label>Category:</label>
                    <span class="badge badge-${this.getCategoryColor(permission.category)}">
                        ${permission.category}
                    </span>
                </div>
                <div class="detail-group">
                    <label>Description:</label>
                    <span>${permission.description}</span>
                </div>
                <div class="detail-group">
                    <label>Usage Statistics:</label>
                    <div class="usage-stats">
                        <div class="stat-item">
                            <span class="stat-label">Roles:</span>
                            <span class="stat-value">${usageStats.roleCount}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Users Affected:</span>
                            <span class="stat-value">${usageStats.userCount}</span>
                        </div>
                    </div>
                </div>
                <div class="detail-group">
                    <label>Roles Using This Permission:</label>
                    <div class="role-grid">
                        ${this.renderDetailedRoleUsage(permission.roles)}
                    </div>
                </div>
            </div>
            <div class="form-actions">
                <button class="btn btn-primary" onclick="editPermission(${permission.id})">
                    Edit Permission
                </button>
                <button class="btn btn-secondary" onclick="closeModal()">
                    Close
                </button>
            </div>
        `;

        modal.style.display = 'block';
    }

    renderDetailedRoleUsage(roles) {
        if (roles.length === 0) {
            return '<p class="text-muted">No roles are currently using this permission.</p>';
        }

        return roles.map(role => `
            <div class="role-card">
                <div class="role-header">
                    <span class="badge badge-${this.getRoleBadgeClass(role.name)}">
                        ${role.name}
                    </span>
                </div>
                <div class="role-body">
                    <p>${role.description || 'No description available'}</p>
                    <small>Users: ${role.user_count}</small>
                </div>
            </div>
        `).join('');
    }

    updateStats(stats) {
        document.getElementById('totalPermissions').textContent = stats.total;
        document.getElementById('totalCategories').textContent = stats.categories;
    }

    updateCategoryFilter(categories) {
        const filter = document.getElementById('categoryFilter');
        const currentValue = filter.value;

        filter.innerHTML = `
            <option value="">All Categories</option>
            ${categories.map(category => `
                <option value="${category}" ${category === currentValue ? 'selected' : ''}>
                    ${category}
                </option>
            `).join('')}
        `;
    }

    attachEventListeners() {
        document.getElementById('createPermissionBtn').addEventListener('click', () => {
            this.showPermissionModal();
        });

        document.getElementById('categoryFilter').addEventListener('change', (e) => {
            this.loadPermissions(e.target.value);
        });
    }

    getCategoryColor(category) {
        const colors = {
            user: 'primary',
            role: 'success',
            system: 'warning',
            security: 'danger',
            default: 'secondary'
        };
        return colors[category] || colors.default;
    }

    getRoleBadgeClass(roleName) {
        const classes = {
            admin: 'danger',
            moderator: 'warning',
            user: 'info',
            default: 'secondary'
        };
        return classes[roleName] || classes.default;
    }

    async fetchPermission(permissionId) {
        const response = await fetch(`http://localhost:8000/api/permissions/${permissionId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        return await response.json();
    }

    async fetchCategories() {
        const response = await fetch('http://localhost:8000/api/permissions/categories', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        return await response.json();
    }

    async fetchPermissionUsage(permissionId) {
        const response = await fetch(`http://localhost:8000/api/permissions/${permissionId}/usage`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        return await response.json();
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