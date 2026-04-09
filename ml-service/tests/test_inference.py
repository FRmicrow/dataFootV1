import unittest
from unittest.mock import patch, MagicMock
import os
import sys
import json

# Ensure we can import from src
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.models.goals_total.inference import predict_total_goals
from src.models.cards_total.inference import predict_total_cards
from src.models.corners_total.inference import predict_total_corners
from src.models.ft_result.inference import predict_ft_result
from src.models.ht_result.inference import predict_ht_result
from src.orchestrator.predictor import generate_master_prediction

class TestMLInference(unittest.TestCase):

    @patch('src.models.goals_total.inference.get_fixture_context')
    @patch('src.models.goals_total.inference.fetch_features_for_inference')
    @patch('src.models.goals_total.inference.load_models')
    def test_goals_total_inference_structure(self, mock_load, mock_feat, mock_ctx):
        mock_ctx.return_value = {"league_id": 39, "home_team_id": 1, "away_team_id": 2}
        mock_load.return_value = {"type": "heuristic"}
        
        result = predict_total_goals(123)
        self.assertEqual(result['fixture_id'], 123)
        self.assertIn('expected_goals', result)
        self.assertIn('over_under_probabilities', result)
        self.assertEqual(result['prediction_status'], 'success_fallback')

    @patch('src.models.cards_total.inference.get_fixture_context')
    @patch('src.models.cards_total.inference.fetch_features_for_inference_v2')
    @patch('src.models.cards_total.inference.load_models')
    def test_cards_total_inference_structure(self, mock_load, mock_feat, mock_ctx):
        mock_ctx.return_value = {"league_id": 39, "home_team_id": 1, "away_team_id": 2}
        mock_load.return_value = {"type": "heuristic"}
        
        result = predict_total_cards(123)
        self.assertEqual(result['fixture_id'], 123)
        self.assertIn('expected_cards', result)
        self.assertIn('over_under_probabilities', result)
        self.assertTrue(result['is_fallback'])

    @patch('src.models.corners_total.inference.get_fixture_context')
    @patch('src.models.corners_total.inference.fetch_features_for_inference_v2')
    @patch('src.models.corners_total.inference.load_models')
    def test_corners_total_inference_structure(self, mock_load, mock_feat, mock_ctx):
        mock_ctx.return_value = {"league_id": 39, "home_team_id": 1, "away_team_id": 2}
        mock_load.return_value = {"type": "heuristic"}
        
        result = predict_total_corners(123)
        self.assertEqual(result['fixture_id'], 123)
        self.assertIn('expected_corners', result)
        self.assertIn('over_under_probabilities', result)

    @patch('src.models.ft_result.inference.get_fixture_context')
    @patch('src.models.ft_result.inference.fetch_feature_vector_v2')
    @patch('src.models.ft_result.inference.load_global_classifier')
    @patch('src.models.ft_result.inference.load_legacy_poisson_models')
    @patch('time_travel.TemporalFeatureFactory')
    def test_ft_result_inference_structure(self, mock_factory, mock_legacy, mock_global, mock_feat, mock_ctx):
        mock_ctx.return_value = {"league_id": 39, "home_team_id": 1, "away_team_id": 2}
        mock_global.return_value = None
        mock_legacy.return_value = None
        mock_factory.return_value.get_vector.return_value = {"mom_gf_h10": 1.5, "mom_gf_a10": 1.2}
        
        result = predict_ft_result(123)
        self.assertEqual(result['fixture_id'], 123)
        self.assertIn('probabilities_1n2', result)
        self.assertEqual(result['prediction_status'], 'success_fallback')

    @patch('src.orchestrator.predictor.predict_ft_result')
    @patch('src.orchestrator.predictor.predict_ht_result')
    @patch('src.orchestrator.predictor.predict_total_corners')
    @patch('src.orchestrator.predictor.predict_total_cards')
    @patch('src.orchestrator.predictor.predict_total_goals')
    @patch('src.orchestrator.predictor.save_to_submodel_outputs')
    @patch('src.orchestrator.predictor.get_db_connection')
    @patch('src.risk.engine.extract_and_save_fair_odds')
    def test_master_predictor_orchestration(self, mock_risk, mock_conn, mock_save, m5, m4, m3, m2, m1):
        m1.return_value = {"prediction_status": "success_model", "is_fallback": False}
        m2.return_value = {"prediction_status": "success_model", "is_fallback": False}
        m3.return_value = {"prediction_status": "success_model", "is_fallback": False}
        m4.return_value = {"prediction_status": "success_model", "is_fallback": False}
        m5.return_value = {"prediction_status": "success_model", "is_fallback": False}
        
        result = generate_master_prediction(123)
        self.assertTrue(result['success'])
        self.assertIn('FT_RESULT', result['models'])
        self.assertIn('GOALS_TOTAL', result['models'])
        self.assertEqual(mock_save.call_count, 5)

if __name__ == '__main__':
    unittest.main()
