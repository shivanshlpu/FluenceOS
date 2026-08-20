package com.aios.services;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * JOB DATA SERVICE
 * Fetches job listings from Remotive API (free, no auth required)
 * and parses them into structured data for analysis.
 */
@Service
public class JobDataService {

    @Value("${remotive.api.url}")
    private String remotiveUrl;

    private final OkHttpClient httpClient = new OkHttpClient();
    private final Gson gson = new Gson();

    @Cacheable(value = "jobData", key = "#role")
    public List<Map<String, Object>> fetchJobs(String role) {
        return fetchJobs(role, 50);
    }

    public List<Map<String, Object>> fetchJobs(String role, int limit) {
        try {
            String url = remotiveUrl + "?search=" + role.replace(" ", "+") + "&limit=" + limit;
            Request request = new Request.Builder().url(url).build();
            Response response = httpClient.newCall(request).execute();

            if (response.isSuccessful() && response.body() != null) {
                String body = response.body().string();
                JsonObject json = gson.fromJson(body, JsonObject.class);
                JsonArray jobs = json.getAsJsonArray("jobs");

                List<Map<String, Object>> result = new ArrayList<>();
                if (jobs != null) {
                    for (JsonElement jobElement : jobs) {
                        JsonObject job = jobElement.getAsJsonObject();
                        Map<String, Object> jobMap = new HashMap<>();
                        jobMap.put("title", getStr(job, "title"));
                        jobMap.put("company", getStr(job, "company_name"));
                        jobMap.put("description", getStr(job, "description"));
                        jobMap.put("url", getStr(job, "url"));
                        jobMap.put("category", getStr(job, "category"));
                        jobMap.put("location", getStr(job, "candidate_required_location"));
                        jobMap.put("salary", getStr(job, "salary"));
                        jobMap.put("type", getStr(job, "job_type"));
                        jobMap.put("publishedAt", getStr(job, "publication_date"));
                        result.add(jobMap);
                    }
                }
                return result;
            }
        } catch (Exception e) {
            System.out.println("⚠️ Remotive API failed: " + e.getMessage());
        }
        return new ArrayList<>();
    }

    private String getStr(JsonObject obj, String key) {
        return obj.has(key) && !obj.get(key).isJsonNull() ? obj.get(key).getAsString() : "";
    }
}
