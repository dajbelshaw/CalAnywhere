import { Routes, Route, useLocation } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { SchedulingPage } from "./pages/SchedulingPage";
import { SignupPage } from "./pages/SignupPage";
import { SigninPage } from "./pages/SigninPage";
import { RecoverPage } from "./pages/RecoverPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { NavBar } from "./components/NavBar";

export default function App() {
  const { pathname } = useLocation();
  const isPublicSchedulingPage = pathname.startsWith("/s/");

  return (
    <div className="min-h-screen bg-surface-base text-content">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      {!isPublicSchedulingPage && <NavBar />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/signin" element={<SigninPage />} />
        <Route path="/recover" element={<RecoverPage />} />
        <Route path="/s/:slug" element={<SchedulingPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}
