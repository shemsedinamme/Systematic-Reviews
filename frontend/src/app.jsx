import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import HomePage from './pages/HomePage';
import Login from './pages/Login';
import Registration from './components/registration/registration'; // Updated import path
import Post from './pages/Post';
import DashboardPage from './components/dashboard/index';
import UserManagementPage from './components/userManagement/index';
import ProjectManagementPage from './components/projectManagement/index';
import ProtocolManagementPage from './components/protocolManagement/index';
import QueryManagementPage from './components/queryManagement/index';
import ScreeningSelectionPage from './components/screeningSelection/index';
import QualityAssessmentPage from './components/qualityAssessment/index';
import DataExtractionPage from './components/dataExtractions/index';
import DataSynthesisPage from './components/dataSynthesis/index';
import ReportingPage from './components/reporting/index';
import MachineLearningPage from './components/machineLearning/index';
import CollaborationPage from './components/collaboration/index';
import SystemSettingsPage from './components/systemSettings/index';
import SecuritySettingsPage from './components/securitySettings/index';

function App() {
    return (
        <Router>
            <Switch>
                <Route exact path="/" component={HomePage} />
                <Route path="/login" component={Login} />
                <Route path="/register" component={Registration} />
                <Route path="/post" component={Post} />
                 <Route path="/dashboard" component={DashboardPage} />
                <Route path="/user-management" component={UserManagementPage} />
                <Route path="/project-management" component={ProjectManagementPage} />
                <Route path="/protocol-management" component={ProtocolManagementPage} />
                 <Route path="/query-management" component={QueryManagementPage} />
               <Route path="/screening-selection" component={ScreeningSelectionPage} />
                <Route path="/quality-assessment" component={QualityAssessmentPage} />
               <Route path="/data-extraction" component={DataExtractionPage} />
                 <Route path="/data-synthesis" component={DataSynthesisPage} />
                <Route path="/reporting" component={ReportingPage} />
               <Route path="/machine-learning" component={MachineLearningPage} />
                 <Route path="/collaboration" component={CollaborationPage} />
                <Route path="/system-settings" component={SystemSettingsPage} />
                <Route path="/security-settings" component={SecuritySettingsPage} />
            </Switch>
        </Router>
    );
}

export default App;