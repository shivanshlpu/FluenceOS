package com.aios.models;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.*;

@Document(collection = "job_market_data")
public class JobMarketData {
    @Id
    private String id;
    private String role;
    private List<Map<String, Object>> topSkills;
    private Map<String, Object> salaryRange;
    private int totalJobsFound;
    private Date analyzedAt;

    public JobMarketData() {
    }

    public JobMarketData(String id, String role, List<Map<String, Object>> topSkills, Map<String, Object> salaryRange,
            int totalJobsFound, Date analyzedAt) {
        this.id = id;
        this.role = role;
        this.topSkills = topSkills;
        this.salaryRange = salaryRange;
        this.totalJobsFound = totalJobsFound;
        this.analyzedAt = analyzedAt;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public List<Map<String, Object>> getTopSkills() {
        return topSkills;
    }

    public void setTopSkills(List<Map<String, Object>> topSkills) {
        this.topSkills = topSkills;
    }

    public Map<String, Object> getSalaryRange() {
        return salaryRange;
    }

    public void setSalaryRange(Map<String, Object> salaryRange) {
        this.salaryRange = salaryRange;
    }

    public int getTotalJobsFound() {
        return totalJobsFound;
    }

    public void setTotalJobsFound(int totalJobsFound) {
        this.totalJobsFound = totalJobsFound;
    }

    public Date getAnalyzedAt() {
        return analyzedAt;
    }

    public void setAnalyzedAt(Date analyzedAt) {
        this.analyzedAt = analyzedAt;
    }
}
