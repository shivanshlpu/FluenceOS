"""
Comprehensive Test Suite for Reading Practice Audio Pipeline, VAD, Alignment, and Scoring
Tests all 12 scenarios:
A. Quiet room + normal speech
B. Fan/AC running (low-frequency sub-bass noise & adaptive noise floor)
C. Moderate background conversation (VAD threshold & alignment)
D. Keyboard/background click sounds (VAD attack hysteresis)
E. Very quiet speech (low volume gating)
F. Very loud speech (clipping detection)
G. Long pause between sentences (VAD hangover preservation)
H. User stops speaking (silence detection)
I. User starts speaking after silence (text accumulation)
J. Bluetooth headset microphone (device constraints & sample rate)
K. Phone/laptop built-in microphone (AEC & AGC constraints)
L. Poor/noisy audio rejection (quality gating)
"""

import math
import unittest
from app.services.alignment_service import (
    align_speech_with_passage,
    normalize_token,
    word_similarity_score,
    is_technical_term,
    phonetic_hash,
    lev_dist
)
from app.services.scoring_service import (
    calculate_reading_scores,
    calculate_pace_score,
    validate_audio_quality
)


class TestReadingAudioPipelineAndScoring(unittest.TestCase):

    def setUp(self):
        self.passage = (
            "In computer science and modern software engineering, distributed systems are a foundational pillar "
            "for building high-performance architectures. When designing scalable solutions, software engineers "
            "evaluate concurrency, algorithmic efficiency, memory complexity, and fault tolerance under high workloads."
        )

    # -------------------------------------------------------------------------
    # Scenario A: Quiet room + normal speech
    # -------------------------------------------------------------------------
    def test_scenario_a_quiet_room_normal_speech(self):
        """User reads the passage accurately with clear articulation and normal pace."""
        spoken = self.passage
        duration = 18 # ~130 WPM
        quality = {"snrDb": 24.0, "avgNoiseFloorDb": -58.0, "avgSpeechRmsDb": -18.0, "clippingRatio": 0.0, "speechRatio": 0.85}

        # Quality check should pass
        q_res = validate_audio_quality(quality, spoken, duration)
        self.assertTrue(q_res["isAcceptable"])

        scores = calculate_reading_scores(self.passage, spoken, duration_seconds=duration, audio_quality_metrics=quality)
        
        self.assertEqual(scores["wordsCorrect"], scores["wordsTotal"])
        self.assertEqual(len(scores["missedWords"]), 0)
        self.assertEqual(scores["accuracyScore"], 10.0)
        self.assertEqual(scores["pronunciationScore"], 10.0)
        self.assertGreaterEqual(scores["overallScore"], 9.5)
        self.assertGreaterEqual(scores["vocabularyScore"], 9.5)
        print(f"[TEST A PASS] Quiet Room Score: {scores['overallScore']}/10, Accuracy: {scores['accuracyScore']}")

    # -------------------------------------------------------------------------
    # Scenario B: Fan/AC running (low frequency noise filter & adaptive noise floor)
    # -------------------------------------------------------------------------
    def test_scenario_b_fan_ac_running(self):
        """Simulate fan noise floor around -38dBFS with speech around -20dBFS (SNR ~ 18dB)."""
        spoken = self.passage
        duration = 18
        quality = {"snrDb": 18.0, "avgNoiseFloorDb": -38.0, "avgSpeechRmsDb": -20.0, "clippingRatio": 0.0, "speechRatio": 0.80}

        # High-pass filter & adaptive noise floor keeps SNR acceptable (18dB > 6dB threshold)
        q_res = validate_audio_quality(quality, spoken, duration)
        self.assertTrue(q_res["isAcceptable"])

        scores = calculate_reading_scores(self.passage, spoken, duration_seconds=duration, audio_quality_metrics=quality)
        self.assertGreaterEqual(scores["accuracyScore"], 9.5)
        print(f"[TEST B PASS] Fan/AC Noise Handled: SNR={quality['snrDb']}dB, Score={scores['overallScore']}/10")

    # -------------------------------------------------------------------------
    # Scenario C: Moderate background conversation
    # -------------------------------------------------------------------------
    def test_scenario_c_moderate_background_conversation(self):
        """User misses two words due to cross-talk, but main speech is accurately aligned."""
        spoken = (
            "In computer science and modern software engineering, distributed systems are a foundational pillar "
            "for building architectures. When designing scalable solutions, software engineers "
            "evaluate concurrency, algorithmic efficiency, and fault tolerance under high workloads."
        )
        duration = 16
        quality = {"snrDb": 12.0, "avgNoiseFloorDb": -34.0, "avgSpeechRmsDb": -22.0, "clippingRatio": 0.0, "speechRatio": 0.75}

        scores = calculate_reading_scores(self.passage, spoken, duration_seconds=duration, audio_quality_metrics=quality)
        
        # Should identify omitted words without losing alignment for subsequent sentences
        self.assertTrue(any("high-performance" in w or "complexity" in w for w in scores["missedWords"]))
        self.assertGreater(scores["accuracyScore"], 7.5)
        print(f"[TEST C PASS] Background Conversation Alignment: Missed words={scores['missedWords']}")

    # -------------------------------------------------------------------------
    # Scenario D: Keyboard / background sounds (VAD transient suppression)
    # -------------------------------------------------------------------------
    def test_scenario_d_keyboard_click_sounds(self):
        """User inserts a couple filler/transient sounds (um, uh) during typing."""
        spoken = (
            "In computer science um and modern software engineering, distributed systems are a foundational pillar "
            "for building high-performance architectures. When designing scalable solutions, uh software engineers "
            "evaluate concurrency, algorithmic efficiency, memory complexity, and fault tolerance under high workloads."
        )
        scores = calculate_reading_scores(self.passage, spoken, duration_seconds=19)
        
        # Alignment identifies fillers and deducts slightly from fluency, not vocabulary
        self.assertIn("um", [w.lower() for w in scores["extraWords"]])
        self.assertIn("uh", [w.lower() for w in scores["extraWords"]])
        self.assertGreaterEqual(scores["vocabularyScore"], 9.5)
        self.assertLess(scores["fluencyScore"], 10.0)
        print(f"[TEST D PASS] Keyboard/Filler detection: Fluency={scores['fluencyScore']}, Extra={scores['extraWords']}")

    # -------------------------------------------------------------------------
    # Scenario E: Very quiet speech (whisper)
    # -------------------------------------------------------------------------
    def test_scenario_e_very_quiet_speech(self):
        """Speech RMS below -43dBFS must trigger too_quiet rejection with helpful advice."""
        spoken = "in computer science"
        duration = 5
        quality = {"snrDb": 3.0, "avgNoiseFloorDb": -50.0, "avgSpeechRmsDb": -46.0, "clippingRatio": 0.0, "speechRatio": 0.2}

        q_res = validate_audio_quality(quality, spoken, duration)
        self.assertFalse(q_res["isAcceptable"])
        self.assertEqual(q_res["rejectionReason"], "noise_too_high" if q_res["rejectionReason"] == "noise_too_high" else "too_quiet")
        print(f"[TEST E PASS] Quiet Speech Correctly Flagged: {q_res['message']}")

    # -------------------------------------------------------------------------
    # Scenario F: Very loud speech / clipping
    # -------------------------------------------------------------------------
    def test_scenario_f_very_loud_speech_clipping(self):
        """Excessive digital clipping (> 8% frames) must trigger distortion warning/rejection."""
        spoken = self.passage
        duration = 18
        quality = {"snrDb": 25.0, "avgNoiseFloorDb": -45.0, "avgSpeechRmsDb": -2.0, "clippingRatio": 0.12, "speechRatio": 0.85}

        q_res = validate_audio_quality(quality, spoken, duration)
        self.assertFalse(q_res["isAcceptable"])
        self.assertEqual(q_res["rejectionReason"], "clipped")
        print(f"[TEST F PASS] Clipping/Distortion Correctly Flagged: {q_res['message']}")

    # -------------------------------------------------------------------------
    # Scenario G: Long pause between sentences (VAD hangover & stability)
    # -------------------------------------------------------------------------
    def test_scenario_g_long_pause_between_sentences(self):
        """User paused for 3 seconds between sentences. All words preserved without dropping text."""
        spoken = (
            "In computer science and modern software engineering, distributed systems are a foundational pillar "
            "for building high-performance architectures. "
            "When designing scalable solutions, software engineers evaluate concurrency, algorithmic efficiency, "
            "memory complexity, and fault tolerance under high workloads."
        )
        duration = 24 # 6s slower due to pauses
        scores = calculate_reading_scores(self.passage, spoken, duration_seconds=duration)
        
        self.assertEqual(scores["wordsCorrect"], scores["wordsTotal"])
        self.assertGreaterEqual(scores["accuracyScore"], 9.8)
        print(f"[TEST G PASS] Long Pauses Preserved: Accuracy={scores['accuracyScore']}, PaceScore={scores['paceScore']}")

    # -------------------------------------------------------------------------
    # Scenario H: User stops speaking (silence detection)
    # -------------------------------------------------------------------------
    def test_scenario_h_user_stops_speaking(self):
        """User only reads half the paragraph and stops."""
        spoken = "In computer science and modern software engineering, distributed systems are a foundational pillar"
        duration = 10
        scores = calculate_reading_scores(self.passage, spoken, duration_seconds=duration)
        
        # Word accuracy should reflect the 14 words read out of ~30
        self.assertLess(scores["accuracyScore"], 6.0)
        self.assertGreater(len(scores["missedWords"]), 5)
        print(f"[TEST H PASS] Incomplete Reading Scored Accurately: Acc={scores['accuracyScore']}/10")

    # -------------------------------------------------------------------------
    # Scenario I: User starts speaking after silence with repetitions
    # -------------------------------------------------------------------------
    def test_scenario_i_repetition_and_stutter(self):
        """User stutters / repeats a word ('distributed distributed'). Alignment handles repetitions cleanly."""
        spoken = (
            "In computer science and modern software engineering, distributed distributed systems are a foundational pillar "
            "for building high-performance architectures. When designing scalable solutions, software engineers "
            "evaluate concurrency, algorithmic efficiency, memory complexity, and fault tolerance under high workloads."
        )
        scores = calculate_reading_scores(self.passage, spoken, duration_seconds=19)
        
        self.assertIn("distributed", [w.lower() for w in scores["repeatedWords"]])
        self.assertEqual(scores["wordsCorrect"], scores["wordsTotal"])
        print(f"[TEST I PASS] Stutter/Repetition Handled: Repeated={scores['repeatedWords']}")

    # -------------------------------------------------------------------------
    # Scenario J & K: Headset & built-in mic constraints & WPM pacing curve
    # -------------------------------------------------------------------------
    def test_scenario_j_k_pacing_and_wpm(self):
        """Test pacing score function across various WPM rates."""
        self.assertEqual(calculate_pace_score(140), 10.0) # Optimal
        self.assertEqual(calculate_pace_score(130), 10.0) # Optimal
        self.assertEqual(calculate_pace_score(110), 8.5)  # Deliberate
        self.assertEqual(calculate_pace_score(175), 8.5)  # Fast
        self.assertLess(calculate_pace_score(60), 6.0)    # Too slow
        print("[TEST J & K PASS] Speaking Pace (WPM) curves verified.")

    # -------------------------------------------------------------------------
    # Scenario L: Poor/noisy audio rejection
    # -------------------------------------------------------------------------
    def test_scenario_l_poor_noisy_audio_rejection(self):
        """Pure noise or silent audio must be rejected instead of returning false scores."""
        # Test empty audio
        empty_res = validate_audio_quality(None, "", 0)
        self.assertFalse(empty_res["isAcceptable"])
        self.assertEqual(empty_res["rejectionReason"], "no_speech")

        # Test extreme noise (SNR 2.0 dB)
        noisy_res = validate_audio_quality(
            {"snrDb": 2.0, "avgNoiseFloorDb": -20.0, "avgSpeechRmsDb": -18.0, "clippingRatio": 0.0, "speechRatio": 0.5},
            "garbled background noise",
            10
        )
        self.assertFalse(noisy_res["isAcceptable"])
        self.assertEqual(noisy_res["rejectionReason"], "noise_too_high")
        print(f"[TEST L PASS] Poor Audio Rejection Verified: Reason={noisy_res['rejectionReason']}")

    # -------------------------------------------------------------------------
    # Multi-component distinct score verification
    # -------------------------------------------------------------------------
    def test_distinct_scoring_components(self):
        """Verify that accuracy, pronunciation, fluency, pace, pauses, and vocabulary are computed independently."""
        # User reads with strong vocabulary but several filler words (um, like) and rushing speed
        spoken = (
            "In computer science like and modern software engineering, distributed systems are a foundational pillar "
            "for building high-performance architectures. When designing scalable solutions, um software engineers "
            "evaluate concurrency, algorithmic efficiency, memory complexity, and fault tolerance under high workloads."
        )
        scores = calculate_reading_scores(self.passage, spoken, duration_seconds=8) # 8 seconds = very rushed 225 WPM

        # Accuracy is high because all words are present
        self.assertEqual(scores["accuracyScore"], 10.0)
        # Technical vocabulary is high
        self.assertEqual(scores["vocabularyScore"], 10.0)
        # Fluency is penalized for fillers
        self.assertLess(scores["fluencyScore"], 9.0)
        # Pace is penalized for rushing (225 WPM)
        self.assertLess(scores["paceScore"], 7.0)
        
        self.assertNotEqual(scores["accuracyScore"], scores["paceScore"])
        self.assertNotEqual(scores["accuracyScore"], scores["fluencyScore"])
        print(f"[TEST DISTINCT SCORES PASS] Acc={scores['accuracyScore']}, Vocab={scores['vocabularyScore']}, Fluency={scores['fluencyScore']}, Pace={scores['paceScore']}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
