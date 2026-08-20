package com.aios.models;

import java.util.*;

public class RoadmapNode {
    private String name;
    private String level;
    private int week;
    private List<RoadmapNode> children;

    public RoadmapNode() {
    }

    public RoadmapNode(String name, String level, int week, List<RoadmapNode> children) {
        this.name = name;
        this.level = level;
        this.week = week;
        this.children = children;
    }

    public RoadmapNode(String name, String level, List<RoadmapNode> children) {
        this.name = name;
        this.level = level;
        this.week = 0;
        this.children = children;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getLevel() {
        return level;
    }

    public void setLevel(String level) {
        this.level = level;
    }

    public int getWeek() {
        return week;
    }

    public void setWeek(int week) {
        this.week = week;
    }

    public List<RoadmapNode> getChildren() {
        return children;
    }

    public void setChildren(List<RoadmapNode> children) {
        this.children = children;
    }
}
