import { UserManager } from './modules/users.js';
import { RoleManager } from './modules/roles.js';
import { PermissionManager } from './modules/permissions.js';
import { AuditManager } from './modules/audit.js';
import { SettingsManager } from './modules/settings.js';

class AdminDashboard {
    constructor() {
        this.currentModule = null;
        this.modules = {
            dashboard: this.loadDashboard.bind(this),
            users: new UserManager(),
            roles: new RoleManager(),
            permissions: new PermissionManager(),
            audit: new AuditManager(),
            settings: new SettingsManager()
        };

        this.init();
    }

    async init() {
        this.attachEventListeners();
        await this.checkAdminAccess();
        await this.loadDashboard();
        this.updateUserInfo();
    }

    attachEventListeners() {
        // Sidebar navigation
        document.querySelectorAll('.sidebar-nav li').forEach(item => {
            item.addEventListener('click', (e) => {
                const page = e.currentTarget.dataset.page;
                this.navigate(page);
            });
        });

        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
    }

    async checkAdminAccess() {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login.html';
            return;
        }

        try {
            const response = await fetch('http://localhost:8000/api/verify-admin', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Not authorized');
            }
        } catch (error) {
            localStorage.removeItem('token');
            window.location.href = '/login.html';
        }
    }

    async navigate(page) {
        // Update active sidebar item
        document.querySelectorAll('.sidebar-nav li').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === page) {
                item.classList.add('active');
            }
        });

        // Update breadcrumb
        document.getElementById('breadcrumb').textContent = 
            page.charAt(0).toUpperCase() + page.slice(1);

        // Load content
        if (this.modules[page]) {
            if (typeof this.modules[page] === 'function') {
                await this.modules[page]();
            } else {
                await this.modules[page].load();
            }
        }
    }

    async loadDashboard() {
        const contentArea = document.getElementById('contentArea');
        try {
            const [userCount, roleCount, recentActivities] = await Promise.all([
                this.fetchUserCount(),
                this.fetchRoleCount(),
                this.fetchRecentActivities()
            ]);

            contentArea.innerHTML = `
                <div class="dashboard-grid">
                    <div class="card stats-card">
                        <h3>Users</h3>
                        <div class="stat-number">${userCount}</div>
                    </div>
                    <div class="card stats-card">
                        <h3>Roles</h3>
                        <div class="stat-number">${roleCount}</div>
                    </div>
                    <div class="card activity-card">
                        <h3>Recent Activities</h3>
                        <div class="activity-list">
                            ${this.renderActivities(recentActivities)}
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            contentArea.innerHTML = `
                <div class="alert alert-error">
                    Error loading dashboard data: ${error.message}
                </div>
            `;
        }
    }

    async fetchUserCount() {
        const response = await fetch('http://localhost:8000/api/rbac/users/count', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const data = await response.json();
        return data.count;
    }

    async fetchRoleCount() {
        const response = await fetch('http://localhost:8000/api/rbac/roles/count', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const data = await response.json();
        return data.count;
    }

    async fetchRecentActivities() {
        const response = await fetch('http://localhost:8000/api/audit/recent', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        return await response.json();
    }

    renderActivities(activities) {
        return activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas ${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-details">
                    <div class="activity-text">${activity.description}</div>
                    <div class="activity-time">${new Date(activity.timestamp).toLocaleString()}</div>
                </div>
            </div>
        `).join('');
    }

    getActivityIcon(type) {
        const icons = {
            user_created: 'fa-user-plus',
            user_updated: 'fa-user-edit',
            role_assigned: 'fa-user-tag',
            login: 'fa-sign-in-alt',
            default: 'fa-info-circle'
        };
        return icons[type] || icons.default;
    }

    updateUserInfo() {
        const username = localStorage.getItem('username');
        if (username) {
            document.getElementById('currentUser').textContent = username;
        }
    }

    async handleLogout() {
        try {
            await fetch('http://localhost:8000/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            window.location.href = '/login.html';
        }
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    new AdminDashboard();
});