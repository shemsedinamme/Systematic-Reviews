// searchRoutes.test.js
const request = require('supertest');
const express = require('express');
const app = express();
const searchRoutes = require('./searchRoutes'); // Adjust the path as necessary

app.use(express.json());
app.use('/api', searchRoutes); // Mount the routes

describe('Search Routes', () => {

    // Mock the database and any other dependencies as needed
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /articles', () => {
        it('should return 200 and articles for a valid query', async () => {
            const query = 'covid-19';
            // Mock the fetchPubMed function here if necessary
            const response = await request(app).get(`/api/articles?query=${query}`);
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });

        it('should return 400 for an empty query', async () => {
            const response = await request(app).get('/api/articles?query=');
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('message', 'Search query is required, and must be a string not more than 1000 characters.');
        });
    });

    describe('GET /search/query-builder', () => {
        it('should return 200 and saved queries for a valid user', async () => {
            // Mock the user authentication and database fetching
            const response = await request(app).get('/api/search/query-builder').set('Authorization', 'Bearer valid_token');
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });

        it('should return 500 on database error', async () => {
            // Mock a scenario where the database call fails
            const response = await request(app).get('/api/search/query-builder').set('Authorization', 'Bearer valid_token');
            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('message', 'Failed to fetch saved queries.');
        });
    });

    describe('POST /search/query-builder', () => {
        it('should return 201 when saving a valid search query', async () => {
            const response = await request(app)
                .post('/api/search/query-builder')
                .set('Authorization', 'Bearer valid_token')
                .send({
                    search_query: "(title:(covid-19) OR abstract:(covid-19)) AND (author:johnson)",
                    databases: ["PubMed"]
                });
            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('query_id');
            expect(response.body).toHaveProperty('search_query');
        });

        it('should return 400 for invalid input', async () => {
            const response = await request(app)
                .post('/api/search/query-builder')
                .set('Authorization', 'Bearer valid_token')
                .send({}); // Missing required fields
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('message', 'Search query is required and must be a string not more than 2000 characters.');
        });
    });

    // Additional tests for other routes (e.g., generate-query, translate-query) can be structured similarly

});

