import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login               from "./pages/Login";
import Dashboard           from "./pages/Dashboard";
import Camera              from "./pages/Camera";
import History             from "./pages/History";
import Alerts              from "./pages/Alerts";
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
        
        <Route path="/"          element={<Login />} />

        
        <Route path="/dashboard" element={<Dashboard />} />

       
        <Route path="/sign"        element={<SignRecognition />} />
        <Route path="/navigation"  element={<NavigationAssistant />} />
        <Route path="/environment" element={<Environmental />} />
        <Route path="/smart-alerts" element={<SmartAlerts />} />
        <Route path="/sos"         element={<EmergencySOS />} />
        <Route path="/settings" element={<Settings />} />

        
        <Route path="/camera"  element={<Camera />} />
        <Route path="/history" element={<History />} />
        <Route path="/alerts"  element={<Alerts />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
