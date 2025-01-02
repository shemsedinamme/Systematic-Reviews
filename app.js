// src/App.js
import React from "react";
import { Route, Switch } from "react-router-dom";

// Importing pages and components
import HomePage from './pages/HomePage';
import DataExtraction from './components/DataExtraction/DataExtraction';
import ExtractionFormBuilder from './components/DataExtraction/ExtractionFormBuilder';
import ExtractionTaskList from './components/DataExtraction/ExtractionTaskList';
import DataAggregation from './components/DataSynthesis/DataAggregation';
import DataAnalysis from './components/DataSynthesis/DataAnalysis';
import MetaAnalysis from './components/DataSynthesis/MetaAnalysis';
import NarrativeSynthesis from './components/DataSynthesis/NarrativeSynthesis';
import NetworkMetaAnalysis from './components/DataSynthesis/NetworkMetaAnalysis';
import SensitivityAnalysis from './components/DataSynthesis/SensitivityAnalysis';
import SubgroupAnalysis from './components/DataSynthesis/SubgroupAnalysis';
import ChatComponent from './components/collaboration/ChatComponent';
import NotificationList from './components/collaboration/Notification List'; // Adjusted name
import RealTimeCollaboration from './components/collaboration/RealTimeCollaboration';
import TaskManagement from './components/collaboration/TaskManagement';
import VersionControlUI from './components/collaboration/VersionControlUI';
import AutomatedDataExtraction from './components/machineLearning/AutomatedDataExtraction';
import AutomatedStudyIdentification from './components/machineLearning/AutomatedStudyIdentification';
import AutomatedTextMining from './components/machineLearning/AutomatedTextMining';
import PredictiveAnalytics from './components/machineLearning/PredictiveAnalytics';
import TextSummarization from './components/machineLearning/TextSummarization';
import ProjectLifecycle from './components/ProjectManagement/ProjectLifecycle';
import ProjectMetadata from './components/ProjectManagement/ProjectMetadata';
import ProjectShare from './components/ProjectManagement/ProjectShare';
import ProjectWorkflow from './components/ProjectManagement/ProjectWorkflow';
import ProjectCollaboration from './components/ProjectManagement/ProjectCollaboration';
import ProjectCreate from './components/ProjectManagement/ProjectCreate';
import ProtocolCreate from './components/protocolManagement/ProtocolCreate';
import ProtocolEdit from './components/protocolManagement/ProtocolEdit';
import ProtocolReview from './components/protocolManagement/ProtocolReview';
import ProtocolTemplate from './components/protocolManagement/ProtocolTemplate';
import QualityAssessmentWorkflow from './components/QualityAssessment/QualityAssessmentWorkflow';
import QualityVisualization from './components/QualityAssessment/QualityVisualization';
import RiskOfBiasAssessment from './components/QualityAssessment/RiskOfBiasAssessment';
import AutomatedQuery from './components/QueryManagement/AutomatedQuery';
import CitationManagement from './components/QueryManagement/CitationManagement';
import DatabaseSelect from './components/QueryManagement/DatabaseSelect';
import QueryTranslation from './components/QueryManagement/QueryTranslation';
import SearchQueryBuilder from './components/QueryManagement/SearchQueryBuilder';
import SearchResults from './components/QueryManagement/SearchResults';
import ManuscriptWriter from './components/Reporting/ManuscriptWriter';
import ReportGenerator from './components/Reporting/ReportGenerator';
import CriteriaManagement from './components/ScreeningAndSelection/CriteriaManagement';
import FullTextScreening from './components/ScreeningAndSelection/FullTextScreening';
import InterRaterReliability from './components/ScreeningAndSelection/InterRaterReliability';
import PrismaDiagram from './components/ScreeningAndSelection/PrismaDiagram';
import ScreeningWorkflow from './components/ScreeningAndSelection/ScreeningWorkflow';
import TitleAbstractScreening from './components/ScreeningAndSelection/TitleAbstractScreening';
import SecuritySettings from './components/SecuritySettings/SecuritySettings';
import BackupRecovery from './components/SystemSettings/BackupRecovery';
import PerformanceMonitoring from './components/SystemSettings/PerformanceMonitoring';
import SystemSettings from './components/SystemSettings/SystemSettings';
import UserAnalytics from './components/SystemSettings/UserAnalytics';

const App = () => {
  return (
    <Switch>
      <Route path="/" exact component={HomePage} />
      <Route path="/data-extraction" exact component={DataExtraction} />
      <Route path="/data-extraction/form" component={ExtractionFormBuilder} />
      <Route path="/data-extraction/task-list" component={ExtractionTaskList} />
      <Route path="/data-synthesis/aggregation" component={DataAggregation} />
      <Route path="/data-synthesis/analysis" component={DataAnalysis} />
      <Route path="/data-synthesis/meta-analysis" component={MetaAnalysis} />
      <Route path="/data-synthesis/narrative-synthesis" component={NarrativeSynthesis} />
      <Route path="/data-synthesis/network-meta-analysis" component={NetworkMetaAnalysis} />
      <Route path="/data-synthesis/sensitivity-analysis" component={SensitivityAnalysis} />
      <Route path="/data-synthesis/subgroup-analysis" component={SubgroupAnalysis} />
      <Route path="/collaboration/chat" component={ChatComponent} />
      <Route path="/collaboration/notifications" component={NotificationList} />
      <Route path="/collaboration/real-time" component={RealTimeCollaboration} />
      <Route path="/collaboration/task-management" component={TaskManagement} />
      <Route path="/collaboration/version-control" component={VersionControlUI} />
      <Route path="/machine-learning/automated-data-extraction" component={AutomatedDataExtraction} />
      <Route path="/machine-learning/automated-study-identification" component={AutomatedStudyIdentification} />
      <Route path="/machine-learning/automated-text-mining" component={AutomatedTextMining} />
      <Route path="/machine-learning/predictive-analytics" component={PredictiveAnalytics} />
      <Route path="/machine-learning/text-summarization" component={TextSummarization} />
      <Route path="/project-management/lifecycle" component={ProjectLifecycle} />
      <Route path="/project-management/metadata" component={ProjectMetadata} />
      <Route path="/project-management/share" component={ProjectShare} />
      <Route path="/project-management/workflow" component={ProjectWorkflow} />
      <Route path="/project-management/collaboration" component={ProjectCollaboration} />
      <Route path="/project-management/create" component={ProjectCreate} />
      <Route path="/protocol-management/create" component={ProtocolCreate} />
      <Route path="/protocol-management/edit" component={ProtocolEdit} />
      <Route path="/protocol-management/review" component={ProtocolReview} />
      <Route path="/protocol-management/template" component={ProtocolTemplate} />
      <Route path="/quality-assessment/workflow" component={QualityAssessmentWorkflow} />
      <Route path="/quality-assessment/visualization" component={QualityVisualization} />
      <Route path="/quality-assessment/risk-of-bias" component={RiskOfBiasAssessment} />
      <Route path="/query-management/automated-query" component={AutomatedQuery} />
      <Route path="/query-management/citation-management" component={CitationManagement} />
      <Route path="/query-management/database-select" component={DatabaseSelect} />
      <Route path="/query-management/query-translation" component={QueryTranslation} />
      <Route path="/query-management/search-query-builder" component={SearchQueryBuilder} />
      <Route path="/query-management/search-results" component={SearchResults} />
      <Route path="/reporting/manuscript-writer" component={ManuscriptWriter} />
      <Route path="/reporting/report-generator" component={ReportGenerator} />
      <Route path="/screening-and-selection/criteria-management" component={CriteriaManagement} />
      <Route path="/screening-and-selection/full-text-screening" component={FullTextScreening} />
      <Route path="/screening-and-selection/inter-rater-reliability" component={InterRaterReliability} />
      <Route path="/screening-and-selection/prisma-diagram" component={PrismaDiagram} />
      <Route path="/screening-and-selection/screening-workflow" component={ScreeningWorkflow} />
      <Route path="/screening-and-selection/title-abstract-screening" component={TitleAbstractScreening} />
      <Route path="/security-settings" component={SecuritySettings} />
      <Route path="/system-settings/backup-recovery" component={BackupRecovery} />
      <Route path="/system-settings/performance-monitoring" component={PerformanceMonitoring} />
      <Route path="/system-settings" component={SystemSettings} />
      <Route path="/system-settings/user-analytics" component={UserAnalytics} />
    </Switch>
  );
};

export default App;
