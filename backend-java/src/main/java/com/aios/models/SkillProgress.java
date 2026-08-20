package com.aios.models;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.*;

@Document(collection = "skill_progress")
public class SkillProgress {
    @Id
    private String id;
    private String userId;
    private String skillName;
    private String category;
    private String currentLevel;
    private int progressPercentage;
    private Date startedAt;
    private Date updatedAt;

    public SkillProgress() {
    }

    public SkillProgress(String id, String userId, String skillName, String category, String currentLevel,
            int progressPercentage, Date startedAt, Date updatedAt) {
        this.id = id;
        this.userId = userId;
        this.skillName = skillName;
        this.category = category;
        this.currentLevel = currentLevel;
        this.progressPercentage = progressPercentage;
        this.startedAt = startedAt;
        this.updatedAt = updatedAt;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getSkillName() {
        return skillName;
    }

    public void setSkillName(String skillName) {
        this.skillName = skillName;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getCurrentLevel() {
        return currentLevel;
    }

    public void setCurrentLevel(String currentLevel) {
        this.currentLevel = currentLevel;
    }

    public int getProgressPercentage() {
        return progressPercentage;
    }

    public void setProgressPercentage(int progressPercentage) {
        this.progressPercentage = progressPercentage;
    }

    public Date getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(Date startedAt) {
        this.startedAt = startedAt;
    }

    public Date getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Date updatedAt) {
        this.updatedAt = updatedAt;
    }
}
