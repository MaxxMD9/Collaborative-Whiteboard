
function SettingsPanel({ isOpen, onClose, settings, onSettingChange }) {
  if (!isOpen) return null;

  const categories = [
    {
      name: "Whiteboard",
      settings: [
        {
          label: "Default Tool",
          key: "defaultTool",
          type: "select",
          options: ["Pen", "Eraser"]
        },
        {
          label: "Default Brush Size",
          key: "defaultBrushSize",
          type: "number"
        },
        {
          label: "Show Status Box",
          key: "showStatus",
          type: "checkbox"
        }
      ]
    },
    {
      name: "Appearance",
      settings: [
        {
          label: "Canvas Background",
          key: "canvasBackground",
          type: "color"
        },
        {
          label: "Grid Enabled",
          key: "gridEnabled",
          type: "checkbox"
        },
        {
          label: "Grid Size",
          key: "gridSize",
          type: "number"
        }
      ]
    },
    {
      name: "Sync",
      settings: [
        {
          label: "Room Name",
          key: "roomName",
          type: "text"
        },
        {
          label: "Live Sync Enabled",
          key: "liveSyncEnabled",
          type: "checkbox"
        }
      ]
    }
  ];

  function renderSetting(setting) {
    const value = settings[setting.key];

    if (setting.type === "checkbox") {
      return (
        <input
          type="checkbox"
          checked={value}
          onChange={event => onSettingChange(setting.key, event.target.checked)}
        />
      );
    }

    if (setting.type === "select") {
      return (
        <select
          value={value}
          onChange={event => onSettingChange(setting.key, event.target.value)}
        >
          {setting.options.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type={setting.type}
        value={value}
        onChange={event => onSettingChange(setting.key, event.target.value)}
      />
    );
  }

  return (
    <div className="settings-backdrop">
      <section className="settings-window" aria-label="Settings panel">
        <header className="settings-title-bar">
          <div className="settings-title">Settings</div>
          <button className="settings-close-button" type="button" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="settings-search-row">
          <input type="text" placeholder="Search..." />
        </div>

        <div className="settings-body">
          <aside className="settings-sidebar">
            {categories.map((category, index) => (
              <button
                key={category.name}
                className={`settings-sidebar-item ${index === 0 ? "selected" : ""}`}
                type="button"
              >
                {category.name}
              </button>
            ))}
          </aside>

          <div className="settings-content">
            {categories.map(category => (
              <section key={category.name} className="settings-category">
                <div className="settings-category-header">
                  <span className="settings-arrow">▾</span>
                  {category.name}
                </div>

                {category.settings.map(setting => (
                  <div key={setting.key} className="settings-row">
                    <div className="settings-label">{setting.label}</div>
                    <div className="settings-control">{renderSetting(setting)}</div>
                  </div>
                ))}
              </section>
            ))}
          </div>
        </div>

        <footer className="settings-footer">
          <button className="settings-footer-button" type="button">
            Reset All Settings
          </button>
          <button className="settings-footer-button" type="button" onClick={onClose}>
            Close
          </button>
        </footer>
      </section>
    </div>
  );
}

export default SettingsPanel;