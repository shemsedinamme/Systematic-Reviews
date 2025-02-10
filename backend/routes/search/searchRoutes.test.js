const request = require('supertest');
const express = require('express');
const searchRoutes = require('./searchRoutes');
const pool = require('../../database'); // Import your database connection
const {
  authenticateToken
} = require('../../middleware/authMiddleware');

jest.mock('../../database', () => ({
  executeQuery: jest.fn(),
  handleAPIError: jest.fn(),
  sanitizeInput: jest.fn(),
}));

jest.mock('../../middleware/authMiddleware', () => ({
  authenticateToken: jest.fn((req, res, next) => {
    req.user = {
      user_id: 'mocked_user_id'
    }; // Mock user
    next();
  }),
  authorizeRole: jest.fn()
}));

const app = express();
app.use(express.json());
app.use('/api', searchRoutes);

describe('Search Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /query/transform', () => {
    it('should return 200 with transformed query for valid request', async () => {
      const mockTransformedQuery = 'Transformed query here';
      require('../../database').executeQuery.mockResolvedValue([[{
        transformedQuery: mockTransformedQuery
      }]]);

      const response = await request(app)
        .post('/api/query/transform')
        .set('Authorization', 'Bearer valid_token')
        .send({
          query: 'original query',
          queryForm: 'pubmedshort'
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('transformedQuery', mockTransformedQuery);
    });

    it('should return 400 for invalid input', async () => {
      const response = await request(app)
        .post('/api/query/transform')
        .set('Authorization', 'Bearer valid_token')
        .send({}); // Missing required fields

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 500 for server error', async () => {
      require('../../database').executeQuery.mockRejectedValue(new Error('Test database error'));

      const response = await request(app)
        .post('/api/query/transform')
        .set('Authorization', 'Bearer valid_token')
        .send({
          query: 'original query',
          queryForm: 'pubmedshort'
        });

      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('message', 'Failed to generate query.');
    });
  });

  describe('POST /file-upload', () => {
    it('should return 200 with new query on successful file upload', async () => {
      const mockFileContent = 'extracted query from file';
      require('fs').promises.readFile = jest.fn().mockResolvedValue(mockFileContent);
      require('fs').promises.unlink = jest.fn().mockResolvedValue();

      const response = await request(app)
        .post('/api/file-upload')
        .set('Authorization', 'Bearer valid_token')
        .attach('file', Buffer.from('file content'), 'test.txt');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('newQuery', mockFileContent);
    });

    it('should return 400 if no file is uploaded', async () => {
      const response = await request(app)
        .post('/api/file-upload')
        .set('Authorization', 'Bearer valid_token');

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('message', 'Missing file');
    });

    it('should return 500 if file reading fails', async () => {
      require('fs').promises.readFile = jest.fn().mockRejectedValue(new Error('File reading failed'));
      const response = await request(app)
        .post('/api/file-upload')
        .set('Authorization', 'Bearer valid_token')
        .attach('file', Buffer.from('file content'), 'test.txt');

      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('message', 'Error reading file.');
    });
  });
describe('POST /search/query-builder', () => {
    it('should return 201 when saving a valid search query', async () => {
        require('../../database').executeQuery.mockResolvedValue({}); // Mock successful insert
        require('../../utils').sanitizeInput.mockImplementation(query => query); // Mock sanitize function
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

  //   describe('GET /articles', () => {
  //       it('should return 200 and articles for a valid query', async () => {
  //           const query = 'covid-19';
  //           require('../../database').executeQuery.mockResolvedValue([[{
  //             "article_id": "99999"
  //           }]]); // Mock fetch result); // Mock fetch result;
  //           // Mock the fetchPubMed function here if necessary
  //           const response = await request(app).get(`/api/articles?query=${query}`);
  //           expect(response.status).toBe(200);
  //           expect(Array.isArray(response.body)).toBe(true);
  //       });

  //       it('should return 400 for an empty query', async () => {
  //           const response = await request(app).get('/api/articles?query=');
  //           expect(response.status).toBe(400);
  //           expect(response.body).toHaveProperty('message', 'Search query is required, and must be a string not more than 1000 characters.');
  //       });
  //   });
});
