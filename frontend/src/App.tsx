import { Routes, Route } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { SchedulingPage } from "./pages/SchedulingPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export default function App() {
  return (
    <div className="min-h-screen bg-surface-base text-content">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/s/:slug" element={<SchedulingPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}

