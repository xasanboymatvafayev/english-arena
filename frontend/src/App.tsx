import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PageLoading } from "@/components/ui/States";
import { AppShell } from "@/components/layout/AppShell";
import { RequireRole } from "@/components/layout/RequireRole";
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import NotFoundPage from "@/pages/NotFoundPage";
import TeacherDashboardPage from "@/pages/teacher/DashboardPage";
import GroupsPage from "@/pages/teacher/GroupsPage";
import GroupDetailPage from "@/pages/teacher/GroupDetailPage";
import StudentsPage from "@/pages/teacher/StudentsPage";
import StudentDetailPage from "@/pages/teacher/StudentDetailPage";
import InvitationsPage from "@/pages/teacher/InvitationsPage";
import TeacherRewardsPage from "@/pages/teacher/RewardsPage";
import TeacherLibraryPage from "@/pages/teacher/LibraryPage";
import StudentDashboardPage from "@/pages/student/DashboardPage";
import StudentCoinsPage from "@/pages/student/CoinsPage";
import StudentRewardsPage from "@/pages/student/RewardsPage";
import LeaderboardPage from "@/pages/student/LeaderboardPage";
import StudentLibraryPage from "@/pages/student/LibraryPage";
import ReaderPage from "@/pages/student/ReaderPage";
import ProfilePage from "@/pages/student/ProfilePage";
import DictionaryPage from "@/pages/shared/DictionaryPage";
import IrregularVerbsPage from "@/pages/shared/IrregularVerbsPage";

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoading />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "teacher" ? "/teacher" : "/student"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<RequireRole role="teacher" />}>
        <Route path="/teacher" element={<AppShell />}>
          <Route index element={<TeacherDashboardPage />} />
          <Route path="groups" element={<GroupsPage />} />
          <Route path="groups/:groupId" element={<GroupDetailPage />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="students/:studentId" element={<StudentDetailPage />} />
          <Route path="invitations" element={<InvitationsPage />} />
          <Route path="rewards" element={<TeacherRewardsPage />} />
          <Route path="library" element={<TeacherLibraryPage />} />
          <Route path="dictionary" element={<DictionaryPage />} />
          <Route path="irregular-verbs" element={<IrregularVerbsPage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
        </Route>
      </Route>

      <Route element={<RequireRole role="student" />}>
        <Route path="/student" element={<AppShell />}>
          <Route index element={<StudentDashboardPage />} />
          <Route path="coins" element={<StudentCoinsPage />} />
          <Route path="rewards" element={<StudentRewardsPage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="library" element={<StudentLibraryPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="dictionary" element={<DictionaryPage />} />
          <Route path="irregular-verbs" element={<IrregularVerbsPage />} />
        </Route>
        <Route path="/student/library/:bookId/read" element={<ReaderPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
