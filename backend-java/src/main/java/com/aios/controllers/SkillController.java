package com.aios.controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/java/skills")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"})
public class SkillController {

    @GetMapping("/categories")
    public ResponseEntity<?> getCategories() {
        return ResponseEntity.ok(Map.of(
            "categories", java.util.List.of(
                Map.of("name", "Frontend", "icon", "🎨"),
                Map.of("name", "Backend", "icon", "⚙️"),
                Map.of("name", "AI/ML", "icon", "🤖"),
                Map.of("name", "DevOps", "icon", "🚀"),
                Map.of("name", "Data", "icon", "📊")
            )
        ));
    }
}
