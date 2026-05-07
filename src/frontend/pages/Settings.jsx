import React, { useState, useEffect } from 'react';
import { useIPC } from '../hooks/useIPC';

function Settings() {
  const { send, subscribe } = useIPC();
  const [notification, setNotification] = useState(null);
  const [settings, setSettings] = useState({
    startMinimized: false,
    fullscreenArticle: false,
    fullscreenSource: true,
    hideDismiss: false,
    removeOnRead: true,
    deleteMode: '3',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettingsFromStorage();

    const unsubscribe = subscribe('settings-update', () => {
      loadSettingsFromStorage();
    });

    return unsubscribe;
  }, [subscribe]);

  const loadSettingsFromStorage = () => {
    const startMinimized = localStorage.getItem('start.minimized') === 'true';
    const fullscreenArticle = localStorage.getItem('rss.fullscreen.article') === 'true';
    const fullscreenSource = localStorage.getItem('rss.fullscreen.source') !== 'false';
    const hideDismiss = localStorage.getItem('rss.hide.dismiss') === 'true';
    const removeOnRead = localStorage.getItem('rss.remove.on.read') !== 'false';
    const deleteMode = localStorage.getItem('delete.data.mode') || '3';

    setSettings({
      startMinimized,
      fullscreenArticle,
      fullscreenSource,
      hideDismiss,
      removeOnRead,
      deleteMode,
    });
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);

      // Save to localStorage
      localStorage.setItem('start.minimized', settings.startMinimized.toString());
      localStorage.setItem('rss.fullscreen.article', settings.fullscreenArticle.toString());
      localStorage.setItem('rss.fullscreen.source', settings.fullscreenSource.toString());
      localStorage.setItem('rss.hide.dismiss', settings.hideDismiss.toString());
      localStorage.setItem('rss.remove.on.read', settings.removeOnRead.toString());
      localStorage.setItem('delete.data.mode', settings.deleteMode);

      // Verify save
      const tempKey = '__settings_save_test_' + Date.now();
      localStorage.setItem(tempKey, 'test');
      localStorage.removeItem(tempKey);

      // Send to backend
      send('save-settings', {
        delete_mode: settings.deleteMode,
        start_minimized: settings.startMinimized,
      });

      showNotification('Settings saved successfully!', 'success');
    } catch (error) {
      console.error('[Settings] Error saving settings:', error);
      showNotification('Error saving settings. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSettings = () => {
    if (confirm('Are you sure you want to reset all settings to their defaults?')) {
      const defaults = {
        startMinimized: false,
        fullscreenArticle: false,
        fullscreenSource: true,
        hideDismiss: false,
        removeOnRead: true,
        deleteMode: '3',
      };

      setSettings(defaults);

      // Clear and reset localStorage
      ['start.minimized', 'rss.fullscreen.article', 'rss.fullscreen.source', 'rss.hide.dismiss', 'rss.remove.on.read', 'delete.data.mode'].forEach(
        (key) => localStorage.removeItem(key)
      );

      localStorage.setItem('start.minimized', 'false');
      localStorage.setItem('rss.fullscreen.article', 'false');
      localStorage.setItem('rss.fullscreen.source', 'true');
      localStorage.setItem('rss.hide.dismiss', 'false');
      localStorage.setItem('rss.remove.on.read', 'true');
      localStorage.setItem('delete.data.mode', '3');

      send('reset-settings', {});
      showNotification('Settings reset to defaults!', 'success');
    }
  };

  return (
    <div id="entire-settings" className="content-section">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Customize your dashboard experience</p>
      </div>

      {notification && (
        <div className={`notification notification-${notification.type}`}>
          {notification.message}
        </div>
      )}

      {/* Interface Settings */}
      <section className="settings-section">
        <div className="section-title">
          <span className="section-icon">🎨</span>
          <h2>Interface</h2>
        </div>

        <div className="settings-card">
          <SettingItem
            label="Start Minimized"
            description="Launch the dashboard in a minimized state"
            type="toggle"
            checked={settings.startMinimized}
            onChange={(value) => setSettings({ ...settings, startMinimized: value })}
          />
        </div>
      </section>

      {/* Reading Experience */}
      <section className="settings-section">
        <div className="section-title">
          <span className="section-icon">📖</span>
          <h2>Reading Experience</h2>
        </div>

        <div className="settings-card">
          <SettingItem
            label="Open Articles in Fullscreen"
            description="When reading an article, open it in fullscreen mode instead of a new pop-up window"
            type="toggle"
            checked={settings.fullscreenArticle}
            onChange={(value) => setSettings({ ...settings, fullscreenArticle: value })}
          />

          <div className="divider"></div>

          <SettingItem
            label="Open Article Source in Fullscreen"
            description="Open the article source in fullscreen mode instead of a new pop-up window"
            type="toggle"
            checked={settings.fullscreenSource}
            onChange={(value) => setSettings({ ...settings, fullscreenSource: value })}
          />

          <div className="divider"></div>

          <SettingItem
            label="Hide Dismiss Button"
            description="Remove the dismiss button from article cards on the dashboard"
            type="toggle"
            checked={settings.hideDismiss}
            onChange={(value) => setSettings({ ...settings, hideDismiss: value })}
          />

          {!settings.hideDismiss && (
            <>
              <div className="divider"></div>
              <SettingItem
                label="Stop removing from Feed When Reading"
                description="Do not automatically remove articles from the feed when you open them to read"
                hint="Only applies when the dismiss button is visible"
                type="toggle"
                checked={settings.removeOnRead}
                onChange={(value) => setSettings({ ...settings, removeOnRead: value })}
              />
            </>
          )}
        </div>
      </section>

      {/* Data Management */}
      <section className="settings-section">
        <div className="section-title">
          <span className="section-icon">🗑️</span>
          <h2>Data Management</h2>
        </div>

        <div className="settings-card">
          <SettingItem
            label="Auto-delete Old Items"
            description="Automatically remove items older than the selected period"
            type="select"
            value={settings.deleteMode}
            onChange={(value) => setSettings({ ...settings, deleteMode: value })}
            options={[
              { value: '1', label: '1 month' },
              { value: '3', label: '3 months' },
              { value: '6', label: '6 months' },
              { value: '12', label: '1 year' },
              { value: 'never', label: 'Never' },
            ]}
          />
        </div>
      </section>

      {/* Action Buttons */}
      <section className="settings-actions">
        <button
          id="save-settings"
          className="btn btn-primary"
          onClick={handleSaveSettings}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
        <button
          id="reset-settings"
          className="btn btn-secondary"
          onClick={handleResetSettings}
        >
          Reset to Defaults
        </button>
      </section>
    </div>
  );
}

function SettingItem({ label, description, type, hint, checked, value, onChange, options }) {
  return (
    <div className="setting-item">
      <div className="setting-content">
        <label className="setting-label">{label}</label>
        <p className="setting-description">{description}</p>
        {hint && <span className="setting-hint">{hint}</span>}
      </div>
      <div className="setting-control">
        {type === 'toggle' && (
          <>
            <input
              type="checkbox"
              className="toggle-switch"
              checked={checked}
              onChange={(e) => onChange(e.target.checked)}
            />
            <label className="toggle-label"></label>
          </>
        )}
        {type === 'select' && (
          <select value={value} onChange={(e) => onChange(e.target.value)}>
            {options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

export default Settings;
