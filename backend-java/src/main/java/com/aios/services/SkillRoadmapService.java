package com.aios.services;

import com.aios.models.RoadmapNode;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class SkillRoadmapService {

    public RoadmapNode generateRoadmap(String skillName, String currentLevel) {
        Queue<RoadmapNode> queue = new LinkedList<>();
        RoadmapNode root = new RoadmapNode(skillName, "root", new ArrayList<>());

        // Build tree based on level
        List<RoadmapNode> phases = new ArrayList<>();

        if (!"Advanced".equalsIgnoreCase(currentLevel)) {
            phases.add(new RoadmapNode("Phase 1: Fundamentals", "Beginner", List.of(
                    new RoadmapNode("Core Concepts", "topic", new ArrayList<>()),
                    new RoadmapNode("Environment Setup", "topic", new ArrayList<>()),
                    new RoadmapNode("Basic Syntax & Patterns", "topic", new ArrayList<>()))));
        }

        if (!"Advanced".equalsIgnoreCase(currentLevel)) {
            phases.add(new RoadmapNode("Phase 2: Core Skills", "Intermediate", List.of(
                    new RoadmapNode("Advanced Patterns", "topic", new ArrayList<>()),
                    new RoadmapNode("Data Structures", "topic", new ArrayList<>()),
                    new RoadmapNode("APIs & Integration", "topic", new ArrayList<>()))));
        }

        phases.add(new RoadmapNode("Phase 3: Advanced", "Advanced", List.of(
                new RoadmapNode("Architecture", "topic", new ArrayList<>()),
                new RoadmapNode("Performance Optimization", "topic", new ArrayList<>()),
                new RoadmapNode("Production Deployment", "topic", new ArrayList<>()))));

        root.setChildren(phases);

        // BFS to assign weeks
        queue.add(root);
        int weekNumber = 1;
        while (!queue.isEmpty()) {
            int levelSize = queue.size();
            for (int i = 0; i < levelSize; i++) {
                RoadmapNode node = queue.poll();
                if (node != null) {
                    node.setWeek(weekNumber);
                    if (node.getChildren() != null) {
                        queue.addAll(node.getChildren());
                    }
                }
            }
            weekNumber++;
        }

        return root;
    }

    public int calculateProgressPercentage(List<Boolean> completedWeeks) {
        if (completedWeeks == null || completedWeeks.isEmpty())
            return 0;
        long completed = completedWeeks.stream().filter(Boolean::booleanValue).count();
        return (int) ((completed * 100) / completedWeeks.size());
    }
}
