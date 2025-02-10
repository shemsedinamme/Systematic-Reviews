//app.hsx
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

const HomePage = lazy(() => import('./pages/HomePage'));
const Login = lazy(() => import('./pages/Login'));
const Registration = lazy(() => import('./components/registration/registration'));
const Post = lazy(() => import('./pages/Post'));
const DashboardPage = lazy(() => import('./components/dashboard/index'));
const UserManagementPage = lazy(() => import('./components/userManagement/index'));
const ProjectManagementPage = lazy(() => import('./components/projectManagement/index'));
const ProtocolManagementPage = lazy(() => import('./components/protocolManagement/index'));
const QueryManagementPage = lazy(() => import('./components/queryManagement/index'));
const ScreeningSelectionPage = lazy(() => import('./components/screeningSelection/index'));
const QualityAssessmentPage = lazy(() => import('./components/qualityAssessment/index'));
const DataExtractionPage = lazy(() => import('./components/dataExtractions/index'));
const DataSynthesisPage = lazy(() => import('./components/dataSynthesis/index'));
const ReportingPage = lazy(() => import('./components/reporting/index'));
const MachineLearningPage = lazy(() => import('./components/machineLearning/index'));
const CollaborationPage = lazy(() => import('./components/collaboration/index'));
const SystemSettingsPage = lazy(() => import('./components/systemSettings/index'));
const SecuritySettingsPage = lazy(() => import('./components/securitySettings/index'));
const NotFound = () => <div>404 Not Found</div>;

const routes = [
  { path: '/', component: HomePage, exact: true },
  { path: '/login', component: Login },
  { path: '/register', component: Registration },
  { path: '/post', component: Post },
  { path: '/dashboard', component: DashboardPage },
  { path: '/user-management', component: UserManagementPage },
  { path: '/project-management', component: ProjectManagementPage },
  { path: '/protocol-management', component: ProtocolManagementPage },
  { path: '/query-management', component: QueryManagementPage },
  { path: '/screening-selection', component: ScreeningSelectionPage },
  { path: '/quality-assessment', component: QualityAssessmentPage },
  { path: '/data-extraction', component: DataExtractionPage },
  { path: '/data-synthesis', component: DataSynthesisPage },
  { path: '/reporting', component: ReportingPage },
  { path: '/machine-learning', component: MachineLearningPage },
  { path: '/collaboration', component: CollaborationPage },
  { path: '/system-settings', component: SystemSettingsPage },
  { path: '/security-settings', component: SecuritySettingsPage }
];

function App() {
  return (
    <Router>
      <Suspense fallback={<div>Loading...</div>}>
        <Switch>
          {routes.map((route, index) => (
            <Route key={index} path={route.path} component={route.component} exact={route.exact} />
          ))}
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </Router>
  );
}

export default App;
