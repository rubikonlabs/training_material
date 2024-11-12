export class SettingsManager {
    constructor() {
        this.contentArea = document.getElementById('contentArea');
        this.settings = {};
        this.originalSettings = {};
        this.unsavedChanges = false;
    }

    async load() {
        await this.renderSettings();
        this.attachEventListeners();
        this.initializeSettingsWatcher();
    }

    async renderSettings() {
        this.contentArea.innerHTML = `
            <div class="settings-container">
                <!-- Settings Navigation -->
                <div class="settings-nav">
                    <ul>
                        <li data-section="general" class="active">
                            <i class="fas fa-cog"></i> General Settings
                        </li>
                        <li data-section="security">
                            <i class="fas fa-shield-alt"></i> Security
                        </li>
                        <li data-section="authentication">
                            <i class="fas fa-lock"></i> Authentication
                        </li>
                        <li data-section="email">
                            <i class="fas fa-envelope"></i> Email Configuration
                        </li>
                        <li data-section="appearance">
                            <i class="fas fa-paint-brush"></i> Appearance
                        </li>
                        <li data-section="maintenance">
                            <i class="fas fa-tools"></i> Maintenance
                        </li>
                        <li data-section="backup">
                            <i class="fas fa-database"></i> Backup & Restore
                        </li>
                    </ul>
                </div>

                <!-- Settings Content -->
                <div class="settings-content">
                    <div class="settings-header">
                        <h2 id="settingsSectionTitle">General Settings</h2>
                        <div class="settings-actions">
                            <button id="saveSettingsBtn" class="btn btn-primary" disabled>
                                Save Changes
                            </button>
                            <button id="resetSettingsBtn" class="btn btn-secondary" disabled>
                                Reset Changes
                            </button>
                        </div>
                    </div>

                    <div id="settingsAlert" class="alert" style="display: none;"></div>

                    <!-- Settings Forms Container -->
                    <div id="settingsForms" class="settings-forms">
                        <!-- Forms will be loaded dynamically -->
                    </div>
                </div>
            </div>
        `;

        await this.loadSettings();
    }

    async loadSettings() {
        try {
            const response = await fetch('http://localhost:8000/api/settings', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to load settings');

            this.settings = await response.json();
            this.originalSettings = JSON.parse(JSON.stringify(this.settings));
            this.renderCurrentSection();
        } catch (error) {
            this.showError('Error loading settings: ' + error.message);
        }
    }

    renderCurrentSection() {
        const activeSection = document.querySelector('.settings-nav li.active').dataset.section;
        const formsContainer = document.getElementById('settingsForms');
        
        switch (activeSection) {
            case 'general':
                this.renderGeneralSettings(formsContainer);
                break;
            case 'security':
                this.renderSecuritySettings(formsContainer);
                break;
            case 'authentication':
                this.renderAuthenticationSettings(formsContainer);
                break;
            case 'email':
                this.renderEmailSettings(formsContainer);
                break;
            case 'appearance':
                this.renderAppearanceSettings(formsContainer);
                break;
            case 'maintenance':
                this.renderMaintenanceSettings(formsContainer);
                break;
            case 'backup':
                this.renderBackupSettings(formsContainer);
                break;
        }
    }

    renderGeneralSettings(container) {
        container.innerHTML = `
            <div class="settings-section">
                <div class="settings-group">
                    <h3>Site Information</h3>
                    <div class="form-group">
                        <label for="siteName">Site Name</label>
                        <input type="text" id="siteName" name="site.name" 
                               value="${this.settings.site?.name || ''}"
                               class="setting-input">
                    </div>
                    <div class="form-group">
                        <label for="siteDescription">Site Description</label>
                        <textarea id="siteDescription" name="site.description" 
                                  class="setting-input">${this.settings.site?.description || ''}</textarea>
                    </div>
                </div>

                <div class="settings-group">
                    <h3>Contact Information</h3>
                    <div class="form-group">
                        <label for="adminEmail">Admin Email</label>
                        <input type="email" id="adminEmail" name="site.admin_email"
                               value="${this.settings.site?.admin_email || ''}"
                               class="setting-input">
                    </div>
                    <div class="form-group">
                        <label for="supportEmail">Support Email</label>
                        <input type="email" id="supportEmail" name="site.support_email"
                               value="${this.settings.site?.support_email || ''}"
                               class="setting-input">
                    </div>
                </div>

                <div class="settings-group">
                    <h3>Regional Settings</h3>
                    <div class="form-group">
                        <label for="timezone">Default Timezone</label>
                        <select id="timezone" name="site.timezone" class="setting-input">
                            ${this.generateTimezoneOptions()}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="dateFormat">Date Format</label>
                        <select id="dateFormat" name="site.date_format" class="setting-input">
                            <option value="YYYY-MM-DD" ${this.settings.site?.date_format === 'YYYY-MM-DD' ? 'selected' : ''}>
                                YYYY-MM-DD
                            </option>
                            <option value="MM/DD/YYYY" ${this.settings.site?.date_format === 'MM/DD/YYYY' ? 'selected' : ''}>
                                MM/DD/YYYY
                            </option>
                            <option value="DD/MM/YYYY" ${this.settings.site?.date_format === 'DD/MM/YYYY' ? 'selected' : ''}>
                                DD/MM/YYYY
                            </option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    }

    renderSecuritySettings(container) {
        container.innerHTML = `
            <div class="settings-section">
                <div class="settings-group">
                    <h3>Password Policy</h3>
                    <div class="form-group">
                        <label for="minPasswordLength">Minimum Password Length</label>
                        <input type="number" id="minPasswordLength" 
                               name="security.password.min_length"
                               value="${this.settings.security?.password?.min_length || 8}"
                               class="setting-input">
                    </div>
                    <div class="form-group">
                        <div class="checkbox-group">
                            <label>
                                <input type="checkbox" name="security.password.require_uppercase"
                                       ${this.settings.security?.password?.require_uppercase ? 'checked' : ''}
                                       class="setting-input">
                                Require Uppercase Letters
                            </label>
                        </div>
                        <div class="checkbox-group">
                            <label>
                                <input type="checkbox" name="security.password.require_numbers"
                                       ${this.settings.security?.password?.require_numbers ? 'checked' : ''}
                                       class="setting-input">
                                Require Numbers
                            </label>
                        </div>
                        <div class="checkbox-group">
                            <label>
                                <input type="checkbox" name="security.password.require_special"
                                       ${this.settings.security?.password?.require_special ? 'checked' : ''}
                                       class="setting-input">
                                Require Special Characters
                            </label>
                        </div>
                    </div>
                </div>

                <div class="settings-group">
                    <h3>Session Security</h3>
                    <div class="form-group">
                        <label for="sessionTimeout">Session Timeout (minutes)</label>
                        <input type="number" id="sessionTimeout"
                               name="security.session.timeout"
                               value="${this.settings.security?.session?.timeout || 30}"
                               class="setting-input">
                    </div>
                    <div class="form-group">
                        <label for="maxLoginAttempts">Max Login Attempts</label>
                        <input type="number" id="maxLoginAttempts"
                               name="security.login.max_attempts"
                               value="${this.settings.security?.login?.max_attempts || 5}"
                               class="setting-input">
                    </div>
                    <div class="form-group">
                        <label for="lockoutDuration">Account Lockout Duration (minutes)</label>
                        <input type="number" id="lockoutDuration"
                               name="security.login.lockout_duration"
                               value="${this.settings.security?.login?.lockout_duration || 15}"
                               class="setting-input">
                    </div>
                </div>

                <div class="settings-group">
                    <h3>Two-Factor Authentication</h3>
                    <div class="checkbox-group">
                        <label>
                            <input type="checkbox" name="security.two_factor.enabled"
                                   ${this.settings.security?.two_factor?.enabled ? 'checked' : ''}
                                   class="setting-input">
                            Enable Two-Factor Authentication
                        </label>
                    </div>
                    <div class="form-group">
                        <label for="tfaMethod">Default 2FA Method</label>
                        <select id="tfaMethod" name="security.two_factor.method"
                                class="setting-input"
                                ${!this.settings.security?.two_factor?.enabled ? 'disabled' : ''}>
                            <option value="app" ${this.settings.security?.two_factor?.method === 'app' ? 'selected' : ''}>
                                Authenticator App
                            </option>
                            <option value="email" ${this.settings.security?.two_factor?.method === 'email' ? 'selected' : ''}>
                                Email
                            </option>
                            <option value="sms" ${this.settings.security?.two_factor?.method === 'sms' ? 'selected' : ''}>
                                SMS
                            </option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    }

    renderAuthenticationSettings(container) {
        container.innerHTML = `
            <div class="settings-section">
                <div class="settings-group">
                    <h3>Login Settings</h3>
                    <div class="checkbox-group">
                        <label>
                            <input type="checkbox" name="auth.allow_registration"
                                   ${this.settings.auth?.allow_registration ? 'checked' : ''}
                                   class="setting-input">
                            Allow Public Registration
                        </label>
                    </div>
                    <div class="checkbox-group">
                        <label>
                            <input type="checkbox" name="auth.email_verification"
                                   ${this.settings.auth?.email_verification ? 'checked' : ''}
                                   class="setting-input">
                            Require Email Verification
                        </label>
                    </div>
                    <div class="form-group">
                        <label for="defaultRole">Default User Role</label>
                        <select id="defaultRole" name="auth.default_role" class="setting-input">
                            ${this.generateRoleOptions()}
                        </select>
                    </div>
                </div>

                <div class="settings-group">
                    <h3>Social Login</h3>
                    <div class="oauth-settings">
                        <!-- Google OAuth -->
                        <div class="oauth-provider">
                            <div class="provider-header">
                                <i class="fab fa-google"></i>
                                <span>Google Login</span>
                                <label class="switch">
                                    <input type="checkbox" name="auth.oauth.google.enabled"
                                           ${this.settings.auth?.oauth?.google?.enabled ? 'checked' : ''}
                                           class="setting-input">
                                    <span class="slider"></span>
                                </label>
                            </div>
                            <div class="provider-details" id="googleOAuthDetails">
                                <div class="form-group">
                                    <label>Client ID</label>
                                    <input type="text" name="auth.oauth.google.client_id"
                                           value="${this.settings.auth?.oauth?.google?.client_id || ''}"
                                           class="setting-input">
                                </div>
                                <div class="form-group">
                                    <label>Client Secret</label>
                                    <input type="password" name="auth.oauth.google.client_secret"
                                           value="${this.settings.auth?.oauth?.google?.client_secret || ''}"
                                           class="setting-input">
                                </div>
                            </div>
                        </div>

                        <!-- GitHub OAuth -->
                        <div class="oauth-provider">
                            <div class="provider-header">
                                <i class="fab fa-github"></i>
                                <span>GitHub Login</span>
                                <label class="switch">
                                    <input type="checkbox" name="auth.oauth.github.enabled"
                                           ${this.settings.auth?.oauth?.github?.enabled ? 'checked' : ''}
                                           class="setting-input">
                                    <span class="slider"></span>
                                </label>
                            </div>
                            <div class="provider-details" id="githubOAuthDetails">
                                <div class="form-group">
                                    <label>Client ID</label>
                                    <input type="text" name="auth.oauth.github.client_id"
                                           value="${this.settings.auth?.oauth?.github?.client_id || ''}"
                                           class="setting-input">
                                </div>
                                <div class="form-group">
                                    <label>Client Secret</label>
                                    <input type="password" name="auth.oauth.github.client_secret"
                                           value="${this.settings.auth?.oauth?.github?.client_secret || ''}"
                                           class="setting-input">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderEmailSettings(container) {
        container.innerHTML = `
            <div class="settings-section">
                <div class="settings-group">
                    <h3>SMTP Configuration</h3>
                    <div class="form-group">
                        <label for="smtpHost">SMTP Host</label>
                        <input type="text" id="smtpHost" name="email.smtp.host"
                               value="${this.settings.email?.smtp?.host || ''}"
                               class="setting-input">
                    </div>
                    <div class="form-group">
                        <label for="smtpPort">SMTP Port</label>
                        <input type="number" id="smtpPort" name="email.smtp.port"
                               value="${this.settings.email?.smtp?.port || 587}"
                               class="setting-input">
                    </div>
                    <div class="checkbox-group">
                        <label>
                            <input type="checkbox" name="email.smtp.secure"
                                   ${this.settings.email?.smtp?.secure ? 'checked' : ''}
                                   class="setting-input">
                            Use SSL/TLS
                        </label>
                    </div>
                    <div class="form-group">
                        <label for="smtpUsername">SMTP Username</label>
                        <input type="text" id="smtpUsername" name="email.smtp.username"
                               value="${this.settings.email?.smtp?.username || ''}"
                               class="setting-input">
                    </div>
                    <div class="form-group">
                        <label for="smtpPassword">SMTP Password</label>
                        <input type="password" id="smtpPassword" name="email.smtp.password"
                               value="${this.settings.email?.smtp?.password || ''}"
                               class="setting-input">
                    </div>
                    <button class="btn btn-secondary" onclick="testEmailSettings()">
                        Test Email Settings
                    </button>
                </div>

                <div class="settings-group">
                    <h3>Email Templates</h3>
                    <div class="template-list">
                        ${this.renderEmailTemplates()}
                    </div>
                </div>
            </div>
        `;
    }

    renderAppearanceSettings(container) {
        container.innerHTML = `
            <div class="settings-section">
                <div class="settings-group">
                    <h3>Theme Settings</h3>
                    <div class="form-group">
                        <label for="primaryColor">Primary Color</label>
                        <input type="color" id="primaryColor" name="appearance.theme.primary_color"
                               value="${this.settings.appearance?.theme?.primary_color || '#1a73e8'}"
                               class="setting-input color-picker">
                    </div>
                    <div class="form-group">
                        <label for="secondaryColor">Secondary Color</label>
                        <input type="color" id="secondaryColor" name="appearance.theme.secondary_color"
                               value="${this.settings.appearance?.theme?.secondary_color || '#dc3545'}"
                               class="setting-input color-picker">
                    </div>
                    <div class="form-group">
                        <label for="fontFamily">Font Family</label>
                        <select id="fontFamily" name="appearance.theme.font_family" class="setting-input">
                            ${this.generateFontOptions()}
                        </select>
                    </div>
                </div>

                <div class="settings-group">
                    <h3>Layout Options</h3>
                    <div class="form-group">
                        <label for="sidebarPosition">Sidebar Position</label>
                        <select id="sidebarPosition" name="appearance.layout.sidebar_position"
                                class="setting-input">
                            <option value="left" ${this.settings.appearance?.layout?.sidebar_position === 'left' ? 'selected' : ''}>
                                Left
                            </option>
                            <option value="right" ${this.settings.appearance?.layout?.sidebar_position === 'right' ? 'selected' : ''}>
                                Right
                            </option>
                        </select>
                    </div>
                    <div class="checkbox-group">
                        <label>
                            <input type="checkbox" name="appearance.layout.compact_mode"
                                   ${this.settings.appearance?.layout?.compact_mode ? 'checked' : ''}
                                   class="setting-input">
                            Compact Mode
                        </label>
                    </div>
                </div>

                <div class="settings-group">
                    <h3>Custom CSS</h3>
                    <div class="form-group">
                        <label for="customCss">Custom CSS</label>
                        <textarea id="customCss" name="appearance.custom_css"
                                  class="setting-input code-editor"
                                  rows="10">${this.settings.appearance?.custom_css || ''}</textarea>
                    </div>
                </div>
            </div>
        `;
    }

    renderMaintenanceSettings(container) {
        container.innerHTML = `
            <div class="settings-section">
                <div class="settings-group">
                    <h3>Maintenance Mode</h3>
                    <div class="checkbox-group">
                        <label>
                            <input type="checkbox" name="maintenance.enabled"
                                   ${this.settings.maintenance?.enabled ? 'checked' : ''}
                                   class="setting-input">
                            Enable Maintenance Mode
                        </label>
                    </div>
                    <div class="form-group">
                        <label for="maintenanceMessage">Maintenance Message</label>
                        <textarea id="maintenanceMessage" name="maintenance.message"
                                  class="setting-input">${this.settings.maintenance?.message || ''}</textarea>
                    </div>
                </div>

                <div class="settings-group">
                    <h3>System Cleanup</h3>
                    <div class="form-group">
                        <label for="logRetention">Log Retention (days)</label>
                        <input type="number" id="logRetention"
                               name="maintenance.log_retention"
                               value="${this.settings.maintenance?.log_retention || 30}"
                               class="setting-input">
                    </div>
                    <div class="form-group">
                        <label for="sessionCleanup">Session Cleanup (hours)</label>
                        <input type="number" id="sessionCleanup"
                               name="maintenance.session_cleanup"
                               value="${this.settings.maintenance?.session_cleanup || 24}"
                               class="setting-input">
                    </div>
                    <button class="btn btn-warning" onclick="runCleanup()">
                        Run Cleanup Now
                    </button>
                </div>
            </div>
        `;
    }

    renderAuthenticationSettings(container) {
        container.innerHTML = `
            <div class="settings-section">
                <div class="settings-group">
                    <h3>Login Settings</h3>
                    <div class="checkbox-group">
                        <label>
                            <input type="checkbox" name="auth.allow_registration"
                                   ${this.settings.auth?.allow_registration ? 'checked' : ''}
                                   class="setting-input">
                            Allow Public Registration
                        </label>
                    </div>
                    <div class="checkbox-group">
                        <label>
                            <input type="checkbox" name="auth.email_verification"
                                   ${this.settings.auth?.email_verification ? 'checked' : ''}
                                   class="setting-input">
                            Require Email Verification
                        </label>
                    </div>
                    <div class="form-group">
                        <label for="defaultRole">Default User Role</label>
                        <select id="defaultRole" name="auth.default_role" class="setting-input">
                            ${this.generateRoleOptions()}
                        </select>
                    </div>
                </div>

                <div class="settings-group">
                    <h3>Social Login</h3>
                    <div class="oauth-settings">
                        <!-- Google OAuth -->
                        <div class="oauth-provider">
                            <div class="provider-header">
                                <i class="fab fa-google"></i>
                                <span>Google Login</span>
                                <label class="switch">
                                    <input type="checkbox" name="auth.oauth.google.enabled"
                                           ${this.settings.auth?.oauth?.google?.enabled ? 'checked' : ''}
                                           class="setting-input">
                                    <span class="slider"></span>
                                </label>
                            </div>
                            <div class="provider-details" id="googleOAuthDetails">
                                <div class="form-group">
                                    <label>Client ID</label>
                                    <input type="text" name="auth.oauth.google.client_id"
                                           value="${this.settings.auth?.oauth?.google?.client_id || ''}"
                                           class="setting-input">
                                </div>
                                <div class="form-group">
                                    <label>Client Secret</label>
                                    <input type="password" name="auth.oauth.google.client_secret"
                                           value="${this.settings.auth?.oauth?.google?.client_secret || ''}"
                                           class="setting-input">
                                </div>
                            </div>
                        </div>

                        <!-- GitHub OAuth -->
                        <div class="oauth-provider">
                            <div class="provider-header">
                                <i class="fab fa-github"></i>
                                <span>GitHub Login</span>
                                <label class="switch">
                                    <input type="checkbox" name="auth.oauth.github.enabled"
                                           ${this.settings.auth?.oauth?.github?.enabled ? 'checked' : ''}
                                           class="setting-input">
                                    <span class="slider"></span>
                                </label>
                            </div>
                            <div class="provider-details" id="githubOAuthDetails">
                                <div class="form-group">
                                    <label>Client ID</label>
                                    <input type="text" name="auth.oauth.github.client_id"
                                           value="${this.settings.auth?.oauth?.github?.client_id || ''}"
                                           class="setting-input">
                                </div>
                                <div class="form-group">
                                    <label>Client Secret</label>
                                    <input type="password" name="auth.oauth.github.client_secret"
                                           value="${this.settings.auth?.oauth?.github?.client_secret || ''}"
                                           class="setting-input">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderEmailSettings(container) {
        container.innerHTML = `
            <div class="settings-section">
                <div class="settings-group">
                    <h3>SMTP Configuration</h3>
                    <div class="form-group">
                        <label for="smtpHost">SMTP Host</label>
                        <input type="text" id="smtpHost" name="email.smtp.host"
                               value="${this.settings.email?.smtp?.host || ''}"
                               class="setting-input">
                    </div>
                    <div class="form-group">
                        <label for="smtpPort">SMTP Port</label>
                        <input type="number" id="smtpPort" name="email.smtp.port"
                               value="${this.settings.email?.smtp?.port || 587}"
                               class="setting-input">
                    </div>
                    <div class="checkbox-group">
                        <label>
                            <input type="checkbox" name="email.smtp.secure"
                                   ${this.settings.email?.smtp?.secure ? 'checked' : ''}
                                   class="setting-input">
                            Use SSL/TLS
                        </label>
                    </div>
                    <div class="form-group">
                        <label for="smtpUsername">SMTP Username</label>
                        <input type="text" id="smtpUsername" name="email.smtp.username"
                               value="${this.settings.email?.smtp?.username || ''}"
                               class="setting-input">
                    </div>
                    <div class="form-group">
                        <label for="smtpPassword">SMTP Password</label>
                        <input type="password" id="smtpPassword" name="email.smtp.password"
                               value="${this.settings.email?.smtp?.password || ''}"
                               class="setting-input">
                    </div>
                    <button class="btn btn-secondary" onclick="testEmailSettings()">
                        Test Email Settings
                    </button>
                </div>

                <div class="settings-group">
                    <h3>Email Templates</h3>
                    <div class="template-list">
                        ${this.renderEmailTemplates()}
                    </div>
                </div>
            </div>
        `;
    }

    renderAppearanceSettings(container) {
        container.innerHTML = `
            <div class="settings-section">
                <div class="settings-group">
                    <h3>Theme Settings</h3>
                    <div class="form-group">
                        <label for="primaryColor">Primary Color</label>
                        <input type="color" id="primaryColor" name="appearance.theme.primary_color"
                               value="${this.settings.appearance?.theme?.primary_color || '#1a73e8'}"
                               class="setting-input color-picker">
                    </div>
                    <div class="form-group">
                        <label for="secondaryColor">Secondary Color</label>
                        <input type="color" id="secondaryColor" name="appearance.theme.secondary_color"
                               value="${this.settings.appearance?.theme?.secondary_color || '#dc3545'}"
                               class="setting-input color-picker">
                    </div>
                    <div class="form-group">
                        <label for="fontFamily">Font Family</label>
                        <select id="fontFamily" name="appearance.theme.font_family" class="setting-input">
                            ${this.generateFontOptions()}
                        </select>
                    </div>
                </div>

                <div class="settings-group">
                    <h3>Layout Options</h3>
                    <div class="form-group">
                        <label for="sidebarPosition">Sidebar Position</label>
                        <select id="sidebarPosition" name="appearance.layout.sidebar_position"
                                class="setting-input">
                            <option value="left" ${this.settings.appearance?.layout?.sidebar_position === 'left' ? 'selected' : ''}>
                                Left
                            </option>
                            <option value="right" ${this.settings.appearance?.layout?.sidebar_position === 'right' ? 'selected' : ''}>
                                Right
                            </option>
                        </select>
                    </div>
                    <div class="checkbox-group">
                        <label>
                            <input type="checkbox" name="appearance.layout.compact_mode"
                                   ${this.settings.appearance?.layout?.compact_mode ? 'checked' : ''}
                                   class="setting-input">
                            Compact Mode
                        </label>
                    </div>
                </div>

                <div class="settings-group">
                    <h3>Custom CSS</h3>
                    <div class="form-group">
                        <label for="customCss">Custom CSS</label>
                        <textarea id="customCss" name="appearance.custom_css"
                                  class="setting-input code-editor"
                                  rows="10">${this.settings.appearance?.custom_css || ''}</textarea>
                    </div>
                </div>
            </div>
        `;
    }

    renderMaintenanceSettings(container) {
        container.innerHTML = `
            <div class="settings-section">
                <div class="settings-group">
                    <h3>Maintenance Mode</h3>
                    <div class="checkbox-group">
                        <label>
                            <input type="checkbox" name="maintenance.enabled"
                                   ${this.settings.maintenance?.enabled ? 'checked' : ''}
                                   class="setting-input">
                            Enable Maintenance Mode
                        </label>
                    </div>
                    <div class="form-group">
                        <label for="maintenanceMessage">Maintenance Message</label>
                        <textarea id="maintenanceMessage" name="maintenance.message"
                                  class="setting-input">${this.settings.maintenance?.message || ''}</textarea>
                    </div>
                </div>

                <div class="settings-group">
                    <h3>System Cleanup</h3>
                    <div class="form-group">
                        <label for="logRetention">Log Retention (days)</label>
                        <input type="number" id="logRetention"
                               name="maintenance.log_retention"
                               value="${this.settings.maintenance?.log_retention || 30}"
                               class="setting-input">
                    </div>
                    <div class="form-group">
                        <label for="sessionCleanup">Session Cleanup (hours)</label>
                        <input type="number" id="sessionCleanup"
                               name="maintenance.session_cleanup"
                               value="${this.settings.maintenance?.session_cleanup || 24}"
                               class="setting-input">
                    </div>
                    <button class="btn btn-warning" onclick="runCleanup()">
                        Run Cleanup Now
                    </button>
                </div>
            </div>
        `;
    }

    async renderBackupSettings(container) {
        container.innerHTML = `
            <div class="settings-section">
                <div class="settings-group">
                    <h3>Automatic Backups</h3>
                    <div class="checkbox-group">
                        <label>
                            <input type="checkbox" name="backup.auto_backup.enabled"
                                   ${this.settings.backup?.auto_backup?.enabled ? 'checked' : ''}
                                   class="setting-input">
                            Enable Automatic Backups
                        </label>
                    </div>
                    <div class="form-group">
                        <label for="backupFrequency">Backup Frequency</label>
                        <select id="backupFrequency" name="backup.auto_backup.frequency"
                                class="setting-input">
                            <option value="daily" ${this.settings.backup?.auto_backup?.frequency === 'daily' ? 'selected' : ''}>Daily</option>
                            <option value="weekly" ${this.settings.backup?.auto_backup?.frequency === 'weekly' ? 'selected' : ''}>Weekly</option>
                            <option value="monthly" ${this.settings.backup?.auto_backup?.frequency === 'monthly' ? 'selected' : ''}>Monthly</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="backupRetention">Backup Retention (days)</label>
                        <input type="number" id="backupRetention"
                               name="backup.auto_backup.retention_days"
                               value="${this.settings.backup?.auto_backup?.retention_days || 30}"
                               class="setting-input">
                    </div>
                </div>

                <div class="settings-group">
                    <h3>Manual Backup</h3>
                    <div class="backup-actions">
                        <button class="btn btn-primary" onclick="this.createBackup()">
                            Create New Backup
                        </button>
                        <button class="btn btn-secondary" onclick="this.showRestoreModal()">
                            Restore from Backup
                        </button>
                    </div>
                    <div class="backup-list">
                        ${await this.renderBackupList()}
                    </div>
                </div>
            </div>
        `;
    }

    // Event Handlers and Core Functionality
    attachEventListeners() {
        // Navigation between settings sections
        document.querySelectorAll('.settings-nav li').forEach(item => {
            item.addEventListener('click', (e) => {
                document.querySelectorAll('.settings-nav li').forEach(li => li.classList.remove('active'));
                e.currentTarget.classList.add('active');
                document.getElementById('settingsSectionTitle').textContent = 
                    e.currentTarget.textContent.trim();
                this.renderCurrentSection();
            });
        });

        // Save and Reset buttons
        document.getElementById('saveSettingsBtn').addEventListener('click', () => this.saveSettings());
        document.getElementById('resetSettingsBtn').addEventListener('click', () => this.resetSettings());

        // Watch for changes in settings inputs
        this.initializeSettingsWatcher();
    }

    initializeSettingsWatcher() {
        document.querySelectorAll('.setting-input').forEach(input => {
            input.addEventListener('change', () => {
                this.unsavedChanges = true;
                document.getElementById('saveSettingsBtn').disabled = false;
                document.getElementById('resetSettingsBtn').disabled = false;
            });
        });

        // Warn about unsaved changes when leaving
        window.addEventListener('beforeunload', (e) => {
            if (this.unsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    async saveSettings() {
        try {
            const newSettings = this.gatherSettings();
            const response = await fetch('http://localhost:8000/api/settings', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newSettings)
            });

            if (!response.ok) {
                throw new Error('Failed to save settings');
            }

            this.settings = newSettings;
            this.originalSettings = JSON.parse(JSON.stringify(newSettings));
            this.unsavedChanges = false;
            document.getElementById('saveSettingsBtn').disabled = true;
            document.getElementById('resetSettingsBtn').disabled = true;

            this.showSuccess('Settings saved successfully');

            // Apply immediate changes if necessary
            this.applySettings(newSettings);
        } catch (error) {
            this.showError('Error saving settings: ' + error.message);
        }
    }

    resetSettings() {
        if (!confirm('Are you sure you want to reset all changes?')) return;

        this.settings = JSON.parse(JSON.stringify(this.originalSettings));
        this.renderCurrentSection();
        this.unsavedChanges = false;
        document.getElementById('saveSettingsBtn').disabled = true;
        document.getElementById('resetSettingsBtn').disabled = true;
    }

    gatherSettings() {
        const newSettings = {};
        document.querySelectorAll('.setting-input').forEach(input => {
            const path = input.name.split('.');
            let current = newSettings;
            
            for (let i = 0; i < path.length - 1; i++) {
                current[path[i]] = current[path[i]] || {};
                current = current[path[i]];
            }

            const value = this.getInputValue(input);
            current[path[path.length - 1]] = value;
        });
        return newSettings;
    }

    getInputValue(input) {
        switch (input.type) {
            case 'checkbox':
                return input.checked;
            case 'number':
                return parseInt(input.value);
            case 'select-multiple':
                return Array.from(input.selectedOptions).map(option => option.value);
            default:
                return input.value;
        }
    }

    // Backup and Restore Functions
    async createBackup() {
        try {
            const response = await fetch('http://localhost:8000/api/settings/backup', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Backup creation failed');

            const result = await response.json();
            this.showSuccess('Backup created successfully');
            await this.renderBackupList();
        } catch (error) {
            this.showError('Error creating backup: ' + error.message);
        }
    }

    async renderBackupList() {
        try {
            const response = await fetch('http://localhost:8000/api/settings/backups', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const backups = await response.json();

            return backups.map(backup => `
                <div class="backup-item">
                    <div class="backup-info">
                        <span class="backup-date">
                            ${new Date(backup.created_at).toLocaleString()}
                        </span>
                        <span class="backup-size">${this.formatSize(backup.size)}</span>
                    </div>
                    <div class="backup-actions">
                        <button class="btn btn-sm btn-primary" 
                                onclick="restoreBackup('${backup.id}')">
                            Restore
                        </button>
                        <button class="btn btn-sm btn-secondary" 
                                onclick="downloadBackup('${backup.id}')">
                            Download
                        </button>
                        <button class="btn btn-sm btn-danger" 
                                onclick="deleteBackup('${backup.id}')">
                            Delete
                        </button>
                    </div>
                </div>
            `).join('') || '<p>No backups available</p>';
        } catch (error) {
            return `<p class="error">Error loading backups: ${error.message}</p>`;
        }
    }

    // Utility Functions
    generateTimezoneOptions() {
        const timezones = moment.tz.names();
        return timezones.map(tz => `
            <option value="${tz}" ${this.settings.site?.timezone === tz ? 'selected' : ''}>
                ${tz}
            </option>
        `).join('');
    }

    generateRoleOptions() {
        return Object.entries(this.settings.auth?.roles || {}).map(([key, role]) => `
            <option value="${key}" ${this.settings.auth?.default_role === key ? 'selected' : ''}>
                ${role.name}
            </option>
        `).join('');
    }

    generateFontOptions() {
        const fonts = [
            'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 
            'Verdana', 'Tahoma', 'Trebuchet MS'
        ];
        return fonts.map(font => `
            <option value="${font}" 
                    ${this.settings.appearance?.theme?.font_family === font ? 'selected' : ''}>
                ${font}
            </option>
        `).join('');
    }

    formatSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }

    showSuccess(message) {
        const alert = document.getElementById('settingsAlert');
        alert.className = 'alert alert-success';
        alert.textContent = message;
        alert.style.display = 'block';
        setTimeout(() => alert.style.display = 'none', 3000);
    }

    showError(message) {
        const alert = document.getElementById('settingsAlert');
        alert.className = 'alert alert-error';
        alert.textContent = message;
        alert.style.display = 'block';
        setTimeout(() => alert.style.display = 'none', 5000);
    }

    // Apply settings that need immediate effect
    applySettings(settings) {
        // Apply theme settings
        if (settings.appearance?.theme) {
            document.documentElement.style.setProperty(
                '--primary-color', 
                settings.appearance.theme.primary_color
            );
            document.documentElement.style.setProperty(
                '--secondary-color', 
                settings.appearance.theme.secondary_color
            );
            document.body.style.fontFamily = settings.appearance.theme.font_family;
        }

        // Apply layout settings
        if (settings.appearance?.layout?.compact_mode) {
            document.body.classList.toggle('compact-mode', 
                settings.appearance.layout.compact_mode);
        }

        // Apply custom CSS if any
        let customStyleSheet = document.getElementById('custom-styles');
        if (!customStyleSheet) {
            customStyleSheet = document.createElement('style');
            customStyleSheet.id = 'custom-styles';
            document.head.appendChild(customStyleSheet);
        }
        customStyleSheet.textContent = settings.appearance?.custom_css || '';
    }
}