const request = require('supertest');
const app = require('../index'); // Assuming your Express app is in index.js
const mockingoose = require('mockingoose');
const { DataSynthesisResult, MetaAnalysisResult, QualitativeSynthesisResult, NarrativeSynthesisResult, NetworkMetaAnalysisResult, PublicationBiasAssessment, SensitivityAnalysisResult } = require('../utils/models'); // Import models here
const { v4: uuidv4 } = require('uuid');

describe('Module 8: Data Synthesis and Analysis API', () => {
    // Mock a valid token for all tests
    const validAuthToken = 'valid_token';

  const mockSynthesis = {
    synthesis_id: uuidv4(),
    project_id: 'project_uuid',
    synthesis_type: 'meta-analysis',
    synthesis_description: 'Meta analysis of outcome X',
    created_at: new Date(),
  };

  const metaAnalysisData = {
      meta_id: uuidv4(),
       synthesis_id: mockSynthesis.synthesis_id,
      outcome: 'Mortality',
      model_type: 'fixed-effect',
      pooled_estimate: 0.55,
      heterogeneity_i2: 0.2,
      forest_plot_data: [{}],
     subgroup_analysis_data: [{}]
  };
  const qualitativeSynthesisData = {
      qualitative_id: uuidv4(),
      synthesis_id: mockSynthesis.synthesis_id,
     coding_scheme: "{theme: 'coding'}",
     meta_aggregation_results: "[{},{}]",
     thematic_analysis_results: "[{}]"
 };
  const narrativeSynthesisData = {
      narrative_id: uuidv4(),
       synthesis_id: mockSynthesis.synthesis_id,
      narrative_summary: "summary of results and main findings..."
   };
  const networkMetaAnalysisData = {
      network_id: uuidv4(),
      synthesis_id: mockSynthesis.synthesis_id,
       comparison_matrix: "[{},{}]",
        network_plot_data: "[{},{}]"
  };
 const publicationBiasData = {
        bias_id: uuidv4(),
        synthesis_id: mockSynthesis.synthesis_id,
        funnel_plot_data: "[{},{}]",
        eggers_test_p: 0.04,
       trim_and_fill_data: "[{},{}]"
    };
 const sensitivityAnalysisData = {
       sensitivity_id: uuidv4(),
        synthesis_id: mockSynthesis.synthesis_id,
       analysis_type: 'Leave-one-out',
        analysis_description: 'Sensitivity analysis excluding studies one by one',
       analysis_results: '[{},{}]',
   }

  beforeEach(() => {
      mockingoose.resetAll();

    mockingoose(DataSynthesisResult)
        .toReturn(mockSynthesis, 'find')
         .toReturn(mockSynthesis, 'findOne')
         .toReturn(mockSynthesis, 'save')
          .toReturn(mockSynthesis, 'findByIdAndUpdate')
        .toReturn(mockSynthesis, 'findByIdAndDelete')


    mockingoose(MetaAnalysisResult).toReturn(metaAnalysisData, 'save')
    mockingoose(QualitativeSynthesisResult).toReturn(qualitativeSynthesisData, 'save');
    mockingoose(NarrativeSynthesisResult).toReturn(narrativeSynthesisData, 'save');
    mockingoose(NetworkMetaAnalysisResult).toReturn(networkMetaAnalysisData, 'save');
    mockingoose(PublicationBiasAssessment).toReturn(publicationBiasData, 'save');
    mockingoose(SensitivityAnalysisResult).toReturn(sensitivityAnalysisData, 'save');

  });

    // Test case for each get routes for all record and specific record using id and to have proper output based on models data type and properties
     test('GET /data-synthesis/synthesis should return list of synthesis results', async () => {
       const res = await request(app)
           .get(`/data-synthesis/synthesis?project_id=project_uuid`)
           .set('Authorization', `Bearer ${validAuthToken}`);
         expect(res.status).toBe(200);
       expect(res.body).toEqual([expect.objectContaining(mockSynthesis)]);//checks the valid structure of response
     });
     test('GET /data-synthesis/synthesis/:synthesis_id should return a specific synthesis by id', async () => {
         const res = await request(app)
             .get(`/data-synthesis/synthesis/${mockSynthesis.synthesis_id}`)
             .set('Authorization', `Bearer ${validAuthToken}`);
          expect(res.status).toBe(200);
        expect(res.body).toEqual(expect.objectContaining(mockSynthesis))
     });

      test('GET /data-synthesis/synthesis/:synthesis_id should return a 404 when not exists', async () => {
          mockingoose(DataSynthesisResult).toReturn(null, 'findOne');
           const res = await request(app)
               .get(`/data-synthesis/synthesis/invalid_id`)
               .set('Authorization', `Bearer ${validAuthToken}`);
           expect(res.status).toBe(404);
          expect(res.body.message).toEqual("Synthesis not found.");
       });

     test('POST /data-synthesis/synthesis should create a new synthesis record', async () => {
        const newSynthesisData = {
            project_id: 'project_uuid',
             synthesis_type: 'meta-analysis',
            synthesis_description: 'Meta analysis of outcome Y',
        };
      const res = await request(app)
            .post('/data-synthesis/synthesis')
             .set('Authorization', `Bearer ${validAuthToken}`)
            .send(newSynthesisData);
         expect(res.status).toBe(201);
        expect(res.body).toEqual(expect.objectContaining(newSynthesisData));

     });

    test('POST /data-synthesis/synthesis should return 400 for missing input field', async () => {
        const newSynthesisData = {
            project_id: 'project_uuid',
            synthesis_type: 'meta-analysis'
        };
      const res = await request(app)
            .post('/data-synthesis/synthesis')
            .set('Authorization', `Bearer ${validAuthToken}`)
            .send(newSynthesisData);
        expect(res.status).toBe(400);
       expect(res.body.message).toEqual("Missing required fields.");
     });


      test('PUT /data-synthesis/synthesis/:synthesis_id should update synthesis details', async () => {
        const updatedSynthesisData = {
             synthesis_description: 'Updated meta analysis of outcome X',
          };
       const res = await request(app)
            .put(`/data-synthesis/synthesis/${mockSynthesis.synthesis_id}`)
             .set('Authorization', `Bearer ${validAuthToken}`)
            .send(updatedSynthesisData);
          expect(res.status).toBe(200);
        expect(res.body.synthesis_description).toBe(updatedSynthesisData.synthesis_description);

     });

     test('PUT /data-synthesis/synthesis/:synthesis_id should return 404 for invalid synthesis_id', async () => {
         mockingoose(DataSynthesisResult).toReturn(null, 'findOne');
        const updatedSynthesisData = {
            synthesis_description: 'Updated meta analysis of outcome X',
        };
        const res = await request(app)
            .put(`/data-synthesis/synthesis/invalid_synthesis_id`)
            .set('Authorization', `Bearer ${validAuthToken}`)
            .send(updatedSynthesisData);
        expect(res.status).toBe(404);
       expect(res.body.message).toBe('Synthesis not found.');

      });


    test('DELETE /data-synthesis/synthesis/:synthesis_id should delete a synthesis record by id', async () => {
         const res = await request(app)
            .delete(`/data-synthesis/synthesis/${mockSynthesis.synthesis_id}`)
            .set('Authorization', `Bearer ${validAuthToken}`);
        expect(res.status).toBe(200);
          expect(res.body.message).toBe('Synthesis deleted successfully.');
       });
       test('DELETE /data-synthesis/synthesis/:synthesis_id should return a 404 when it is not found', async () => {
        mockingoose(DataSynthesisResult).toReturn(null, 'findOneAndDelete');
          const res = await request(app)
                .delete(`/data-synthesis/synthesis/invalid_synthesis_id`)
                 .set('Authorization', `Bearer ${validAuthToken}`);
           expect(res.status).toBe(404);
        expect(res.body.message).toEqual("Synthesis not found.");
       });

      test('POST /data-synthesis/synthesis/:synthesis_id/meta-analysis should perform meta-analysis and return analysis results', async () => {
        const metaAnalysisData = {
          outcome: 'Mortality',
           model_type: 'fixed-effect',
           study_data: [
             { study_id: uuidv4(), effect_size: 0.5, standard_error: 0.1 },
             { study_id: uuidv4(), effect_size: 0.6, standard_error: 0.2 },
           ],
        };
        const res = await request(app)
           .post(`/data-synthesis/synthesis/${mockSynthesis.synthesis_id}/meta-analysis`)
          .set('Authorization', `Bearer ${validAuthToken}`)
         .send(metaAnalysisData);
       expect(res.status).toBe(200);
        expect(res.body).toEqual(expect.objectContaining({
          synthesis_id: mockSynthesis.synthesis_id,
           outcome: 'Mortality',
         model_type: 'fixed-effect',
        }));
    });

    test('POST /data-synthesis/synthesis/:synthesis_id/meta-analysis should return 400 for invalid data', async () => {
      const res = await request(app)
        .post(`/data-synthesis/synthesis/${mockSynthesis.synthesis_id}/meta-analysis`)
        .set('Authorization', `Bearer ${validAuthToken}`)
        .send({}); // Invalid data
      expect(res.status).toBe(400);
        expect(res.body.message).toBe('Missing required fields.');
  });


    test('POST /data-synthesis/synthesis/:synthesis_id/qualitative-synthesis should perform qualitative synthesis and return results', async () => {
        const qualitativeSynthesisData = {
            coding_scheme: "{theme: 'coding'}",
            meta_aggregation_results: "[{},{}]",
            thematic_analysis_results: "[{}]"
        };
      const res = await request(app)
            .post(`/data-synthesis/synthesis/${mockSynthesis.synthesis_id}/qualitative-synthesis`)
             .set('Authorization', `Bearer ${validAuthToken}`)
            .send(qualitativeSynthesisData);
         expect(res.status).toBe(200);
         expect(res.body).toEqual(expect.objectContaining({
            synthesis_id: mockSynthesis.synthesis_id,
        }));
   });

    test('POST /data-synthesis/synthesis/:synthesis_id/qualitative-synthesis should return 400 for invalid data', async () => {
        const res = await request(app)
            .post(`/data-synthesis/synthesis/${mockSynthesis.synthesis_id}/qualitative-synthesis`)
             .set('Authorization', `Bearer ${validAuthToken}`)
            .send({}); //invalid data
        expect(res.status).toBe(400);
        expect(res.body.message).toEqual('Missing required fields.');
     });

      test('POST /data-synthesis/synthesis/:synthesis_id/narrative-synthesis should perform narrative synthesis and return the summary ', async () => {
          const narrativeSynthesisData = {
            narrative_summary: "summary of results and main findings..."
           };
           const res = await request(app)
            .post(`/data-synthesis/synthesis/${mockSynthesis.synthesis_id}/narrative-synthesis`)
              .set('Authorization', `Bearer ${validAuthToken}`)
            .send(narrativeSynthesisData);
         expect(res.status).toBe(200);
        expect(res.body).toEqual(expect.objectContaining({
               synthesis_id: mockSynthesis.synthesis_id,
         }));
    });
   test('POST /data-synthesis/synthesis/:synthesis_id/narrative-synthesis  should return 400 for missing input', async () => {
        const res = await request(app)
            .post(`/data-synthesis/synthesis/${mockSynthesis.synthesis_id}/narrative-synthesis`)
             .set('Authorization', `Bearer ${validAuthToken}`)
            .send({});
        expect(res.status).toBe(400);
        expect(res.body.message).toEqual('Narrative summary is required.');
    });
       test('POST /data-synthesis/synthesis/:synthesis_id/network-meta-analysis should perform a network meta analysis with the defined schema', async () => {
         const networkMetaAnalysisData = {
            comparison_matrix: "[{},{}]",
             network_plot_data: "[{},{}]"
            };
        const res = await request(app)
                .post(`/data-synthesis/synthesis/${mockSynthesis.synthesis_id}/network-meta-analysis`)
             .set('Authorization', `Bearer ${validAuthToken}`)
              .send(networkMetaAnalysisData);
          expect(res.status).toBe(200);
         expect(res.body).toEqual(expect.objectContaining({
            synthesis_id: mockSynthesis.synthesis_id,
        }));
        });
    test('POST /data-synthesis/synthesis/:synthesis_id/network-meta-analysis should return 400 for invalid data', async () => {
      const res = await request(app)
            .post(`/data-synthesis/synthesis/${mockSynthesis.synthesis_id}/network-meta-analysis`)
              .set('Authorization', `Bearer ${validAuthToken}`)
            .send({});
       expect(res.status).toBe(400);
        expect(res.body.message).toEqual('Missing required fields.');

        });
       test('POST /data-synthesis/synthesis/:synthesis_id/publication-bias-assessment should perform publication bias assessment with provided data', async () => {
        const publicationBiasData = {
            funnel_plot_data: "[{},{}]",
           eggers_test_p: 0.04,
            trim_and_fill_data: "[{},{}]"
          };
         const res = await request(app)
             .post(`/data-synthesis/synthesis/${mockSynthesis.synthesis_id}/publication-bias-assessment`)
              .set('Authorization', `Bearer ${validAuthToken}`)
             .send(publicationBiasData);
           expect(res.status).toBe(200);
          expect(res.body).toEqual(expect.objectContaining({
                synthesis_id: mockSynthesis.synthesis_id,
          }));
        });
        test('POST /data-synthesis/synthesis/:synthesis_id/publication-bias-assessment should return 400 for invalid data', async () => {
          const res = await request(app)
                .post(`/data-synthesis/synthesis/${mockSynthesis.synthesis_id}/publication-bias-assessment`)
                 .set('Authorization', `Bearer ${validAuthToken}`)
               .send({});
           expect(res.status).toBe(400);
         expect(res.body.message).toEqual('Missing required fields.');
        });
      test('POST /data-synthesis/synthesis/:synthesis_id/sensitivity-analysis  should perform sensitivity analysis', async () => {
        const sensitivityAnalysisData = {
            analysis_type: 'Leave-one-out',
             analysis_description: 'Sensitivity analysis excluding studies one by one',
            analysis_results: '[{},{}]',
        };
        const res = await request(app)
             .post(`/data-synthesis/synthesis/${mockSynthesis.synthesis_id}/sensitivity-analysis`)
           .set('Authorization', `Bearer ${validAuthToken}`)
           .send(sensitivityAnalysisData);
       expect(res.status).toBe(200);
        expect(res.body).toEqual(expect.objectContaining({
            synthesis_id: mockSynthesis.synthesis_id,
        }));
    });
    test('POST /data-synthesis/synthesis/:synthesis_id/sensitivity-analysis should return a 400 for invalid data', async () => {
        const res = await request(app)
            .post(`/data-synthesis/synthesis/${mockSynthesis.synthesis_id}/sensitivity-analysis`)
             .set('Authorization', `Bearer ${validAuthToken}`)
            .send({});
         expect(res.status).toBe(400);
      expect(res.body.message).toEqual('Missing required fields.');
     });
  });
