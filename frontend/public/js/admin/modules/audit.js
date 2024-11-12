export class AuditManager {
    constructor() {
        this.contentArea = document.getElementById('contentArea');
        this.currentPage = 1;
        this.pageSize = 20;
        this.filters = {
            action: '',
            entityType: '',
            userId: '',
            dateFrom: '',
            dateTo: ''
        };
    }

    async load() {
        await this.renderAuditLog();
        this.attachEventListeners();
    }

    async renderAuditLog() {
        this.contentArea.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2>Audit Log</h2>
                    <div class="audit-filters">
                        <div class="filter-group">
                            <select id="actionFilter" class="select-filter">
                                <option value="">All Actions</option>
                                <option value="create">Create</option>
                                <option value="update">Update</option>
                                <option value="delete">Delete</option>
                                <option value="login">Login</option>
                                <option value="logout">Logout</option>
                            </select>
                            <select id="entityFilter" class="select-filter">
                                <option value="">All Entities</option>
                                <option value="user">User</option>
                                <option value="role">Role</option>
                                <option value="permission">Permission</option>
                            </select>
                            <input type="date" id="dateFrom" class="date-filter" 
                                   placeholder="From Date">
                            <input type="date" id="dateTo" class="date-filter" 
                                   placeholder="To Date">
                        </div>
                        <div class="filter-actions">
                            <button id="applyFilters" class="btn btn-primary">
                                Apply Filters
                            </button>
                            <button id="resetFilters" class="btn btn-secondary">
                                Reset
                            </button>
                            <button id="exportAudit" class="btn btn-success">
                                <i class="fas fa-download"></i> Export
                            </button>
                        </div>
                    </div>
                </div>
                <div class="audit-summary">
                    <div class="summary-cards">
                        <div class="summary-card">
                            <h3>Total Events</h3>
                            <div class="summary-number" id="totalEvents">...</div>
                        </div>
                        <div class="summary-card">
                            <h3>Users Active</h3>
                            <div class="summary-number" id="activeUsers">...</div>
                        </div>
                        <div class="summary-card">
                            <h3>Today's Events</h3>
                            <div class="summary-number" id="todayEvents">...</div>
                        </div>
                    </div>
                </div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>User</th>
                                <th>Action</th>
                                <th>Entity Type</th>
                                <th>Entity ID</th>
                                <th>Details</th>
                                <th>IP Address</th>
                            </tr>
                        </thead>
                        <tbody id="auditTableBody">
                            <tr>
                                <td colspan="7" class="loading">Loading audit logs...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="pagination" id="auditPagination"></div>
            </div>
        `;

        await this.loadAuditLogs();
    }


    async loadAuditLogs() {
        try {
            const queryParams = new URLSearchParams({
                page: this.currentPage,
                page_size: this.pageSize,
                ...this.filters
            });

            const response = await fetch(`http://localhost:8000/api/audit/logs?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to load audit logs');

            const data = await response.json();
            this.renderAuditEntries(data.logs);
            this.renderPagination(data.total);
            this.updateSummary(data.summary);
        } catch (error) {
            this.showError('Error loading audit logs: ' + error.message);
        }
    }

    renderAuditEntries(logs) {
        const tbody = document.getElementById('auditTableBody');
        tbody.innerHTML = logs.map(log => `
            <tr class="audit-row ${this.getActionClass(log.action)}">
                <td>
                    <div class="timestamp">
                        <span class="date">${new Date(log.created_at).toLocaleDateString()}</span>
                        <span class="time">${new Date(log.created_at).toLocaleTimeString()}</span>
                    </div>
                </td>
                <td>
                    <div class="user-info">
                        <span class="username">${log.username}</span>
                        ${log.user_id ? `
                            <a href="#" onclick="viewUser(${log.user_id})" class="user-link">
                                <i class="fas fa-external-link-alt"></i>
                            </a>
                        ` : ''}
                    </div>
                </td>
                <td>
                    <span class="badge badge-${this.getActionBadgeClass(log.action)}">
                        ${this.formatAction(log.action)}
                    </span>
                </td>
                <td>${this.formatEntityType(log.entity_type)}</td>
                <td>${log.entity_id || '-'}</td>
                <td>
                    <div class="details-cell">
                        <span class="details-preview">${this.formatDetails(log.details)}</span>
                        ${log.details ? `
                            <button class="btn btn-icon" onclick="viewAuditDetails('${this.escapeHtml(JSON.stringify(log))}')">
                                <i class="fas fa-info-circle"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
                <td>
                    <span class="ip-address" title="Click to copy">
                        ${log.ip_address}
                    </span>
                </td>
            </tr>
        `).join('');

        // Add click-to-copy functionality for IP addresses
        document.querySelectorAll('.ip-address').forEach(elem => {
            elem.addEventListener('click', () => {
                navigator.clipboard.writeText(elem.textContent.trim())
                    .then(() => this.showTooltip(elem, 'Copied!'))
                    .catch(() => this.showTooltip(elem, 'Copy failed'));
            });
        });
    }

    renderPagination(total) {
        const totalPages = Math.ceil(total / this.pageSize);
        const pagination = document.getElementById('auditPagination');
        
        let paginationHtml = `
            <button class="btn btn-icon" 
                    ${this.currentPage === 1 ? 'disabled' : ''}
                    onclick="this.goToPage(${this.currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;

        // Add page numbers
        for (let i = Math.max(1, this.currentPage - 2); i <= Math.min(totalPages, this.currentPage + 2); i++) {
            paginationHtml += `
                <button class="btn btn-page ${i === this.currentPage ? 'active' : ''}"
                        onclick="this.goToPage(${i})">
                    ${i}
                </button>
            `;
        }

        paginationHtml += `
            <button class="btn btn-icon"
                    ${this.currentPage === totalPages ? 'disabled' : ''}
                    onclick="this.goToPage(${this.currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;

        pagination.innerHTML = paginationHtml;
    }

    updateSummary(summary) {
        document.getElementById('totalEvents').textContent = summary.total_events;
        document.getElementById('activeUsers').textContent = summary.active_users;
        document.getElementById('todayEvents').textContent = summary.today_events;
    }

    attachEventListeners() {
        // Filter handlers
        document.getElementById('applyFilters').addEventListener('click', () => {
            this.updateFilters();
            this.loadAuditLogs();
        });

        document.getElementById('resetFilters').addEventListener('click', () => {
            this.resetFilters();
        });

        document.getElementById('exportAudit').addEventListener('click', () => {
            this.exportAuditLogs();
        });

        // Real-time updates
        this.startRealtimeUpdates();
    }

    updateFilters() {
        this.filters = {
            action: document.getElementById('actionFilter').value,
            entityType: document.getElementById('entityFilter').value,
            dateFrom: document.getElementById('dateFrom').value,
            dateTo: document.getElementById('dateTo').value
        };
        this.currentPage = 1; // Reset to first page when filters change
    }

    resetFilters() {
        document.getElementById('actionFilter').value = '';
        document.getElementById('entityFilter').value = '';
        document.getElementById('dateFrom').value = '';
        document.getElementById('dateTo').value = '';
        this.filters = {};
        this.loadAuditLogs();
    }

    async exportAuditLogs() {
        try {
            const queryParams = new URLSearchParams(this.filters);
            const response = await fetch(`http://localhost:8000/api/audit/export?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Export failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            this.showError('Export failed: ' + error.message);
        }
    }

    async viewAuditDetails(logData) {
        const log = JSON.parse(logData);
        const modal = document.getElementById('modal');
        const modalContent = document.getElementById('modalContent');

        modalContent.innerHTML = `
            <h2>Audit Log Details</h2>
            <div class="audit-details">
                <div class="detail-group">
                    <label>Timestamp:</label>
                    <span>${new Date(log.created_at).toLocaleString()}</span>
                </div>
                <div class="detail-group">
                    <label>User:</label>
                    <span>${log.username}</span>
                </div>
                <div class="detail-group">
                    <label>Action:</label>
                    <span class="badge badge-${this.getActionBadgeClass(log.action)}">
                        ${this.formatAction(log.action)}
                    </span>
                </div>
                <div class="detail-group">
                    <label>Entity:</label>
                    <span>${this.formatEntityType(log.entity_type)} (ID: ${log.entity_id || 'N/A'})</span>
                </div>
                <div class="detail-group">
                    <label>IP Address:</label>
                    <span>${log.ip_address}</span>
                </div>
                <div class="detail-group">
                    <label>Changes:</label>
                    <div class="changes-container">
                        ${this.renderDetailedChanges(log.details)}
                    </div>
                </div>
                ${log.metadata ? `
                    <div class="detail-group">
                        <label>Additional Information:</label>
                        <pre class="metadata-json">${JSON.stringify(log.metadata, null, 2)}</pre>
                    </div>
                ` : ''}
            </div>
            <div class="form-actions">
                <button class="btn btn-secondary" onclick="closeModal()">Close</button>
            </div>
        `;

        modal.style.display = 'block';
    }

    renderDetailedChanges(details) {
        if (!details || typeof details !== 'object') return 'No detailed changes available';

        if (details.changes) {
            return `
                <table class="changes-table">
                    <thead>
                        <tr>
                            <th>Field</th>
                            <th>Old Value</th>
                            <th>New Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(details.changes).map(([field, change]) => `
                            <tr>
                                <td>${this.formatFieldName(field)}</td>
                                <td class="old-value">${this.formatValue(change.old)}</td>
                                <td class="new-value">${this.formatValue(change.new)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }

        return `<pre class="details-json">${JSON.stringify(details, null, 2)}</pre>`;
    }

    // Utility methods
    getActionClass(action) {
        const classes = {
            create: 'audit-create',
            update: 'audit-update',
            delete: 'audit-delete',
            login: 'audit-login',
            logout: 'audit-logout'
        };
        return classes[action] || '';
    }

    getActionBadgeClass(action) {
        const classes = {
            create: 'success',
            update: 'warning',
            delete: 'danger',
            login: 'info',
            logout: 'secondary'
        };
        return classes[action] || 'default';
    }

    formatAction(action) {
        return action.charAt(0).toUpperCase() + action.slice(1);
    }

    formatEntityType(type) {
        return type.charAt(0).toUpperCase() + type.slice(1);
    }

    formatFieldName(field) {
        return field.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    formatValue(value) {
        if (value === null || value === undefined) return '-';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (typeof value === 'object') return JSON.stringify(value);
        return value.toString();
    }

    escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    showTooltip(element, message) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = message;
        element.appendChild(tooltip);
        setTimeout(() => tooltip.remove(), 2000);
    }

    showError(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-error';
        alert.textContent = message;
        this.contentArea.insertBefore(alert, this.contentArea.firstChild);
        setTimeout(() => alert.remove(), 3000);
    }
}