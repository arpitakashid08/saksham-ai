import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./settings.css";

export default function Settings() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    name: "Arpita Kashid",
    email: "arpita@example.com",
    phone: "+91 9876543210",
  });

  const [settings, setSettings] = useState({
    darkMode: false,
    voiceFeedback: true,
    largeText: false,
    language: "English",
    signLanguage: "ISL",
    navigationMode: "Wheelchair",
  });

  useEffect(() => {
    const savedSettings = localStorage.getItem("saksham_settings");

    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);
  useEffect(() => {
  if (settings.darkMode) {
    document.body.classList.add("dark-mode");
  } else {
    document.body.classList.remove("dark-mode");
  }
}, [settings.darkMode]);

useEffect(() => {
  if (settings.largeText) {
    document.documentElement.style.fontSize = "18px";
  } else {
    document.documentElement.style.fontSize = "16px";
  }
}, [settings.largeText]);

useEffect(() => {
  localStorage.setItem(
    "saksham_settings",
    JSON.stringify(settings)
  );
}, [settings]);

  const handleToggle = (field) => {
    setSettings((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleSelect = (e) => {
    setSettings({
      ...settings,
      [e.target.name]: e.target.value,
    });
  };
  const speak = (text) => {
  if (!settings.voiceFeedback) return;

  const utterance = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.speak(utterance);
};

  const saveSettings = () => {
  localStorage.setItem(
    "saksham_settings",
    JSON.stringify(settings)
  );

  speak("Settings saved successfully");

  alert("Settings saved successfully!");
};

  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <div className="settings-page">

      {/* LEFT PANEL */}

      <aside className="settings-sidebar">

        <div className="profile-avatar">
          👤
        </div>

        <h1>SAKSHAM AI</h1>

        <p className="sidebar-subtitle">
          Accessibility Preferences
        </p>

        <div className="user-info">
          <h3>{profile.name}</h3>
          <p>{profile.email}</p>
        </div>

        <button
          className="sidebar-btn"
          onClick={() => navigate("/dashboard")}
        >
          ← Dashboard
        </button>

        <button
          className="logout-btn"
          onClick={logout}
        >
          🚪 Logout
        </button>

      </aside>

      {/* RIGHT PANEL */}

      <main className="settings-content">

        <div className="page-header">
          ⚙️ SETTINGS
        </div>

        {/* PROFILE */}

        <section className="settings-card">
          <h2>👤 User Profile</h2>

          <div className="profile-grid">

            <div>
              <label>Name</label>
              <input
                value={profile.name}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    name: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <label>Email</label>
              <input
                value={profile.email}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    email: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <label>Phone</label>
              <input
                value={profile.phone}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    phone: e.target.value,
                  })
                }
              />
            </div>

          </div>
        </section>

        {/* ACCESSIBILITY */}

        <section className="settings-card">
          <h2>♿ Accessibility Settings</h2>

          <div className="toggle-row">
            <span>🌙 Dark Mode</span>

            <input
              type="checkbox"
              checked={settings.darkMode}
              onChange={() =>
                handleToggle("darkMode")
              }
            />
          </div>

          <div className="toggle-row">
            <span>🔊 Voice Feedback</span>

            <input
              type="checkbox"
              checked={settings.voiceFeedback}
              onChange={() =>
                handleToggle("voiceFeedback")
              }
            />
          </div>

          <div className="toggle-row">
            <span>🔠 Large Text Mode</span>

            <input
              type="checkbox"
              checked={settings.largeText}
              onChange={() =>
                handleToggle("largeText")
              }
            />
          </div>
        </section>

        {/* MODULE SETTINGS */}

        <section className="settings-card">
          <h2>🧭 Module Preferences</h2>

          <div className="profile-grid">

            <div>
              <label>Preferred Language</label>

              <select
                name="language"
                value={settings.language}
                onChange={handleSelect}
              >
                <option>English</option>
                <option>Hindi</option>
                <option>Marathi</option>
              </select>
            </div>

            <div>
              <label>Sign Language</label>

              <select
                name="signLanguage"
                value={settings.signLanguage}
                onChange={handleSelect}
              >
                <option>ISL</option>
                <option>ASL</option>
              </select>
            </div>

            <div>
              <label>Navigation Mode</label>

              <select
                name="navigationMode"
                value={settings.navigationMode}
                onChange={handleSelect}
              >
                <option>Wheelchair</option>
                <option>Visually Impaired</option>
                <option>Hearing Impaired</option>
              </select>
            </div>

          </div>
        </section>

        <button
          className="save-btn"
          onClick={saveSettings}
        >
          💾 SAVE SETTINGS
        </button>

      </main>
    </div>
  );
}