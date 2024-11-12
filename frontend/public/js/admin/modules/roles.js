export class RoleManager {
    constructor() {
        this.contentArea = document.getElementById('contentArea');
    }

    async load() {
        await this.renderRoleManagement();
        this.attachEventListeners();
    }

    async renderRoleManagement() {
        this.contentArea.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2>Role Management</h2>
                    <div class="actions">
                        <button id="createRoleBtn" class="btn btn-primary">
                            <i class="fas fa-plus"></i> Create Role
                        </button>
                    </div>
                </div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Description</th>
                                <th>Users</th>
                                <th>Permissions</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="roleTableBody">
                            <tr>
                                <td colspan="6" class="loading">Loading roles...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        await this.loadRoles();
    }

    async loadRoles() {
        try {
            const response = await fetch('http://localhost:8000/api/rbac/roles', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to load roles');

            const roles = await response.json();
            this.renderRoles(roles);
        } catch (error) {
            this.showError('Error loading roles: ' + error.message);
        }
    }

    renderRoles(roles) {
        const tbody = document.getElementById('roleTableBody');
        tbody.innerHTML = roles.map(role => `
            <tr>
                <td>${role.id}</td>
                <td>${role.name}</td>
                <td>${role.description || '-'}</td>
                <td>${role.user_count}</td>
                <td>
                    <div class="permission-badges">
                        ${this.renderPermissionBadges(role.permissions)}
                    </div>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-icon" onclick="editRole(${role.id})" 
                                ${role.name === 'admin' ? 'disabled' : ''}>
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-icon" onclick="viewRole(${role.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-icon btn-danger" 
                                onclick="deleteRole(${role.id})"
                                ${role.name === 'admin' ? 'disabled' : ''}>
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    renderPermissionBadges(permissions) {
        return permissions.slice(0, 3).map(perm => `
            <span class="badge badge-info" title="${perm.description}">
                ${perm.name}
            </span>
        `).join('') + (permissions.length > 3 ? `
            <span class="badge badge-secondary">
                +${permissions.length - 3} more
            </span>
        ` : '');
    }

    attachEventListeners() {
        document.getElementById('createRoleBtn').addEventListener('click', () => {
            this.showRoleModal();
        });
    }

    async showRoleModal(roleId = null) {
        const permissions = await this.fetchPermissions();
        const role = roleId ? await this.fetchRole(roleId) : null;

        const modal = document.getElementById('modal');
        const modalContent = document.getElementById('modalContent');

        modalContent.innerHTML = `
            <h2>${roleId ? 'Edit' : 'Create'} Role</h2>
            <form id="roleForm">
                <div class="form-group">
                    <label for="roleName">Role Name</label>
                    <input type="text" id="roleName" required 
                           value="${role ? role.name : ''}"
                           ${role?.name === 'admin' ? 'readonly' : ''}>
                </div>
                <div class="form-group">
                    <label for="roleDescription">Description</label>
                    <textarea id="roleDescription" rows="3">${role ? role.description : ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Permissions</label>
                    <div class="permissions-grid">
                        ${this.renderPermissionCheckboxes(permissions, role?.permissions || [])}
                    </div>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">
                        ${roleId ? 'Update' : 'Create'} Role
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">
                        Cancel
                    </button>
                </div>
            </form>
        `;

        modal.style.display = 'block';
        
        document.getElementById('roleForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveRole(roleId);
        });
    }

    renderPermissionCheckboxes(allPermissions, rolePermissions = []) {
        const rolePermissionIds = rolePermissions.map(p => p.id);
        
        // Group permissions by category
        const groupedPermissions = allPermissions.reduce((acc, perm) => {
            if (!acc[perm.category]) {
                acc[perm.category] = [];
            }
            acc[perm.category].push(perm);
            return acc;
        }, {});

        return Object.entries(groupedPermissions).map(([category, permissions]) => `
            <div class="permission-group">
                <h4>${category.charAt(0).toUpperCase() + category.slice(1)}</h4>
                ${permissions.map(permission => `
                    <div class="permission-item">
                        <label>
                            <input type="checkbox" 
                                   name="permissions" 
                                   value="${permission.id}"
                                   ${rolePermissionIds.includes(permission.id) ? 'checked' : ''}>
                            ${permission.name}
                            <span class="permission-description">
                                ${permission.description}
                            </span>
                        </label>
                    </div>
                `).join('')}
            </div>
        `).join('');
    }

    async saveRole(roleId = null) {
        try {
            const roleData = {
                name: document.getElementById('roleName').value,
                description: document.getElementById('roleDescription').value,
                permissions: Array.from(document.querySelectorAll('input[name="permissions"]:checked'))
                    .map(cb => parseInt(cb.value))
            };

            const response = await fetch(
                `http://localhost:8000/api/rbac/oles${roleId ? `/${roleId}` : ''}`, {
                method: roleId ? 'PUT' : 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(roleData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Operation failed');
            }

            this.closeModal();
            this.showSuccess(`Role successfully ${roleId ? 'updated' : 'created'}`);
            await this.loadRoles();
        } catch (error) {
            this.showError(error.message);
        }
    }

    async deleteRole(roleId) {
        if (!confirm('Are you sure you want to delete this role? This will affect all users with this role.')) return;

        try {
            const response = await fetch(`http://localhost:8000/api/rbac/roles/${roleId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Delete failed');
            }

            this.showSuccess('Role successfully deleted');
            await this.loadRoles();
        } catch (error) {
            this.showError(error.message);
        }
    }

    async viewRole(roleId) {
        const role = await this.fetchRole(roleId);
        const userCount = await this.fetchRoleUserCount(roleId);

        const modal = document.getElementById('modal');
        const modalContent = document.getElementById('modalContent');

        modalContent.innerHTML = `
            <h2>Role Details</h2>
            <div class="role-details">
                <div class="detail-group">
                    <label>Name:</label>
                    <span>${role.name}</span>
                </div>
                <div class="detail-group">
                    <label>Description:</label>
                    <span>${role.description || '-'}</span>
                </div>
                <div class="detail-group">
                    <label>Users with this role:</label>
                    <span>${userCount}</span>
                </div>
                <div class="detail-group">
                    <label>Permissions:</label>
                    <div class="permission-list">
                        ${this.renderDetailedPermissions(role.permissions)}
                    </div>
                </div>
            </div>
            <div class="form-actions">
                ${role.name !== 'admin' ? `
                    <button class="btn btn-primary" onclick="editRole(${role.id})">
                        Edit Role
                    </button>
                ` : ''}
                <button class="btn btn-secondary" onclick="closeModal()">
                    Close
                </button>
            </div>
        `;

        modal.style.display = 'block';
    }

    renderDetailedPermissions(permissions) {
        const groupedPermissions = permissions.reduce((acc, perm) => {
            if (!acc[perm.category]) {
                acc[perm.category] = [];
            }
            acc[perm.category].push(perm);
            return acc;
        }, {});

        return Object.entries(groupedPermissions).map(([category, perms]) => `
            <div class="permission-category">
                <h4>${category.charAt(0).toUpperCase() + category.slice(1)}</h4>
                <ul>
                    ${perms.map(perm => `
                        <li>
                            <span class="permission-name">${perm.name}</span>
                            <span class="permission-description">${perm.description}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `).join('');
    }

    async fetchRole(roleId) {
        const response = await fetch(`http://localhost:8000/api/rbac/roles/${roleId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        return await response.json();
    }

    async fetchPermissions() {
        const response = await fetch('http://localhost:8000/api/permissions', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        return await response.json();
    }

    async fetchRoleUserCount(roleId) {
        const response = await fetch(`http://localhost:8000/api/rbac/roles/${roleId}/users/count`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const data = await response.json();
        return data.count;
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
