package com.aios.controllers;

import com.aios.services.MarketAnalysisService;
import com.aios.services.SkillRoadmapService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/java")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"})
public class MarketController {

    @Autowired
    private MarketAnalysisService marketService;

    @Autowired
    private SkillRoadmapService roadmapService;

    /** GET /api/java/market/analyze?role=Software+Engineer */
    @GetMapping("/market/analyze")
    public ResponseEntity<?> analyzeMarket(@RequestParam String role) {
        try {
            return ResponseEntity.ok(marketService.analyzeRole(role));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /** GET /api/java/market/skills?role=... */
    @GetMapping("/market/skills")
    public ResponseEntity<?> getSkills(@RequestParam String role) {
        try {
            var data = marketService.analyzeRole(role);
            return ResponseEntity.ok(Map.of("skills", data.getTopSkills()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /** POST /api/java/roadmap/generate */
    @PostMapping("/roadmap/generate")
    public ResponseEntity<?> generateRoadmap(@RequestBody Map<String, String> body) {
        String skill = body.get("skill");
        String level = body.getOrDefault("level", "Beginner");
        return ResponseEntity.ok(roadmapService.generateRoadmap(skill, level));
    }

    /** PUT /api/java/roadmap/progress */
    @PutMapping("/roadmap/progress")
    public ResponseEntity<?> updateProgress(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(Map.of("status", "updated"));
    }

    /** GET /api/java/roadmap/progress/{userId}/{skillId} */
    @GetMapping("/roadmap/progress/{userId}/{skillId}")
    public ResponseEntity<?> getProgress(
        @PathVariable String userId,
        @PathVariable String skillId
    ) {
        return ResponseEntity.ok(Map.of("progress", 0, "userId", userId, "skillId", skillId));
    }
}
