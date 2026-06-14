import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login               from "./pages/Login";
import Dashboard           from "./pages/Dashboard";
import Camera              from "./pages/Camera";
import History             from "./pages/History";
import Alerts              from "./pages/Alerts";
import Chat                from "./pages/Chat";
import SignRecognition     from "./pages/SignRecognition";
import NavigationAssistant from "./pages/NavigationAssistant";
import SmartAlerts         from "./pages/SmartAlerts";
import EmergencySOS        from "./pages/EmergencySOS";
import Environmental from "./pages/Environmental";
import Settings from "./pages/Settings";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth */}
        <Route path="/"          element={<Login />} />

        {/* Dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Feature modules */}
        <Route path="/sign"        element={<SignRecognition />} />
        <Route path="/navigation"  element={<NavigationAssistant />} />
        <Route path="/environment" element={<Environmental />} />
        <Route path="/smart-alerts" element={<SmartAlerts />} />
        <Route path="/sos"         element={<EmergencySOS />} />
        <Route path="/settings" element={<Settings />} />

        {/* Legacy / other pages */}
        <Route path="/camera"  element={<Camera />} />
        <Route path="/history" element={<History />} />
        <Route path="/alerts"  element={<Alerts />} />
        <Route path="/chat"    element={<Chat />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
