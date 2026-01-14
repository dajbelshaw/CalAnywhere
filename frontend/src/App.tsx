import { Routes, Route } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { SchedulingPage } from "./pages/SchedulingPage";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/s/:slug" element={<SchedulingPage />} />
      </Routes>
    </div>
  );
}

