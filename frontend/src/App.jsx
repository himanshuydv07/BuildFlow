import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

import InvitationLandingPage from './pages/InvitationLandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import MyTasksPage from './pages/MyTasksPage';
import NotificationsPage from './pages/NotificationsPage';
import InvitationsPage from './pages/InvitationsPage';
import SearchResultsPage from './pages/SearchResultsPage';
import NotesPage from './pages/NotesPage';
import ProjectLayout from './pages/project/ProjectLayout';
import ProjectOverviewPage from './pages/project/ProjectOverviewPage';
import ProjectTasksPage from './pages/project/ProjectTasksPage';
import ProjectKanbanPage from './pages/project/ProjectKanbanPage';
import ProjectCalendarPage from './pages/project/ProjectCalendarPage';
import ProjectGanttPage from './pages/project/ProjectGanttPage';
import ProjectMilestonesPage from './pages/project/ProjectMilestonesPage';
import ProjectScrumPage from './pages/project/ProjectScrumPage';
import ProjectTeamPage from './pages/project/ProjectTeamPage';
import ProjectFilesPage from './pages/project/ProjectFilesPage';
import ProjectNotesPage from './pages/project/ProjectNotesPage';
import ProjectAnalyticsPage from './pages/project/ProjectAnalyticsPage';
import ProjectActivityPage from './pages/project/ProjectActivityPage';
import ProjectAssistantPage from './pages/project/ProjectAssistantPage';
import ProjectSettingsPage from './pages/project/ProjectSettingsPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" toastOptions={{ style: { fontSize: '14px' } }} />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
  path="/invitations/:invitationId"
  element={
    <ProtectedRoute>
      <InvitationLandingPage />
    </ProtectedRoute>
  }
/>

            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/my-tasks" element={<MyTasksPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/invitations" element={<InvitationsPage />} />
              <Route path="/search" element={<SearchResultsPage />} />
              <Route path="/notes" element={<NotesPage />} />

              <Route path="/projects/:projectId" element={<ProjectLayout />}>
                <Route index element={<ProjectOverviewPage />} />
                <Route path="tasks" element={<ProjectTasksPage />} />
                <Route path="kanban" element={<ProjectKanbanPage />} />
                <Route path="calendar" element={<ProjectCalendarPage />} />
                <Route path="gantt" element={<ProjectGanttPage />} />
                <Route path="milestones" element={<ProjectMilestonesPage />} />
                <Route path="scrum" element={<ProjectScrumPage />} />
                <Route path="team" element={<ProjectTeamPage />} />
                <Route path="files" element={<ProjectFilesPage />} />
                <Route path="notes" element={<ProjectNotesPage />} />
                <Route path="analytics" element={<ProjectAnalyticsPage />} />
                <Route path="activity" element={<ProjectActivityPage />} />
                <Route path="assistant" element={<ProjectAssistantPage />} />
                <Route path="settings" element={<ProjectSettingsPage />} />
              </Route>
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
