import React, { useState } from 'react';
import styles from './DataAnalysis.module.css';
import { Bar, Line, Scatter } from 'react-chartjs-2';
import config from '../config'; // Import the configuration file

const DataAnalysis = ({ projectId }) => {
    const [analysisType, setAnalysisType] = useState('');
    const [chartType, setChartType] = useState('');
    const [data, setData] = useState('');
    const [chartData, setChartData] = useState(null);
    const [analysisResults, setAnalysisResults] = useState(null);
    const token = localStorage.getItem('token');

    const handleAnalysisTypeChange = (e) => {
        setAnalysisType(e.target.value);
    };
    const handleChartTypeChange = (e) => {
        setChartType(e.target.value);
    };
    const handleDataChange = (e) => {
        setData(e.target.value);
    };

    const handleAnalyzeData = async () => {
        if (!analysisType || !data) return;
        try {
            const response = await fetch(`${config.apiBaseUrl}/synthesis/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ analysis_type: analysisType, data: data }),
            });
            if (response.ok) {
                const data = await response.json();
                setAnalysisResults(data);
                alert('Data analysis completed, check console');
                console.log('Data analysis Results:', data);
            } else {
                const errorData = await response.json();
                console.error('Failed to Analyze Data: ', errorData);
                alert('Failed to perform data analysis');
            }
        } catch (error) {
            console.error('Error analyzing data:', error);
            alert('An error occurred during data analysis');
        }
    };

    const handleVisualizeData = async () => {
        if (!chartType || !data) return;
        try {
            const response = await fetch(`${config.apiBaseUrl}/synthesis/visualize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ chart_type: chartType, data: data }),
            });

            if (response.ok) {
                const data = await response.json();
                setChartData(data);
            } else {
                const errorData = await response.json();
                console.error('Failed to visualize data:', errorData);
                alert('Failed to visualize data.');
            }
        } catch (error) {
            console.error('Error visualizing data:', error);
            alert('An error occurred while visualizing the data.');
        }
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
        },
    };

    return (
        <div className={styles.analysisContainer}>
            <h1>Data Analysis and Visualization</h1>
            {projectId ? (
                <>
                    <div className={styles.analysisForm}>
                        <select
                            value={analysisType}
                            onChange={handleAnalysisTypeChange}
                            className={styles.analysisSelect}
                        >
                            <option value="" disabled>Select Analysis Type</option>
                            <option value="t-test">T-Test</option>
                            <option value="anova">ANOVA</option>
                            <option value="chi-square">Chi-Square</option>
                        </select>
                        <textarea
                            placeholder="Enter dataset (e.g. comma separated values)"
                            value={data}
                            onChange={handleDataChange}
                            className={styles.dataText}
                        />
                        <button onClick={handleAnalyzeData} className={styles.analyzeButton}>Analyze Data</button>
                    </div>
                    <div className={styles.visualizationForm}>
                        <select
                            value={chartType}
                            onChange={handleChartTypeChange}
                            className={styles.chartSelect}
                        >
                            <option value="" disabled>Select Chart Type</option>
                            <option value="bar">Bar Chart</option>
                            <option value="line">Line Chart</option>
                            <option value="scatter">Scatter Plot</option>
                        </select>
                        <button onClick={handleVisualizeData} className={styles.visualizeButton}>Visualize Data</button>
                    </div>
                    {chartData && (
                        <div className={styles.chartContainer}>
                            {chartType === 'bar' && <Bar data={chartData} options={chartOptions} />}
                            {chartType === 'line' && <Line data={chartData} options={chartOptions} />}
                            {chartType === 'scatter' && <Scatter data={chartData} options={chartOptions} />}
                        </div>
                    )}
                </>
            ) : (
                <p>Select a project to perform data analysis and visualization</p>
            )}
        </div>
    );
};

export default DataAnalysis;
