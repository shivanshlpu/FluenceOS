package com.aios.services;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * AI INTEGRATION SERVICE
 * Calls Groq API from Java for AI-powered features in the market engine.
 * Used for generating skill summaries and market insights.
 */
@Service
public class AIIntegrationService {

    @Value("${groq.api.key:}")
    private String groqApiKey;

    private final OkHttpClient httpClient = new OkHttpClient();
    private final Gson gson = new Gson();
    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

    public String generateAIInsight(String prompt) {
        if (groqApiKey == null || groqApiKey.isEmpty()) {
            return "AI insight unavailable — configure GROQ_API_KEY in application.properties";
        }

        try {
            JsonObject message = new JsonObject();
            message.addProperty("role", "user");
            message.addProperty("content", prompt);

            JsonObject body = new JsonObject();
            body.addProperty("model", "llama3-70b-8192");
            body.add("messages", gson.toJsonTree(new JsonObject[] { message }));
            body.addProperty("temperature", 0.7);
            body.addProperty("max_tokens", 512);

            Request request = new Request.Builder()
                    .url(GROQ_URL)
                    .addHeader("Authorization", "Bearer " + groqApiKey)
                    .addHeader("Content-Type", "application/json")
                    .post(RequestBody.create(
                            gson.toJson(body),
                            MediaType.parse("application/json")))
                    .build();

            Response response = httpClient.newCall(request).execute();
            if (response.isSuccessful() && response.body() != null) {
                JsonObject result = gson.fromJson(response.body().string(), JsonObject.class);
                return result.getAsJsonArray("choices")
                        .get(0).getAsJsonObject()
                        .getAsJsonObject("message")
                        .get("content").getAsString();
            }
        } catch (Exception e) {
            System.out.println("⚠️ Groq AI call failed: " + e.getMessage());
        }
        return "Unable to generate AI insight at this time.";
    }

    public String summarizeMarketForRole(String role, String topSkills) {
        String prompt = String.format(
                "In 2-3 sentences, summarize the job market outlook for a %s role. " +
                        "The most in-demand skills are: %s. " +
                        "Include salary expectations and growth trends.",
                role, topSkills);
        return generateAIInsight(prompt);
    }

    public List<Map<String, Object>> generateDynamicSkills(String role) {
        String prompt = String.format(
                "List the top 10 most important and heavily demanded skills for a '%s' job role. " +
                        "Do NOT include general IT skills unless they are strictly required for this exact role. " +
                        "Return ONLY a valid JSON array of objects in this exact format: " +
                        "[{\"skill\": \"Skill Name\", \"demand\": 95}] " +
                        "where demand is a realistic popularity score out of 100. Do not include any markdown or extra text.",
                role);

        String jsonResponse = generateAIInsight(prompt);

        try {
            // Clean up backticks if AI returns markdown
            if (jsonResponse.startsWith("```json")) {
                jsonResponse = jsonResponse.substring(7);
                if (jsonResponse.endsWith("```")) {
                    jsonResponse = jsonResponse.substring(0, jsonResponse.length() - 3);
                }
            } else if (jsonResponse.startsWith("```")) {
                jsonResponse = jsonResponse.substring(3);
                if (jsonResponse.endsWith("```")) {
                    jsonResponse = jsonResponse.substring(0, jsonResponse.length() - 3);
                }
            }
            jsonResponse = jsonResponse.trim();

            com.google.gson.JsonArray array = gson.fromJson(jsonResponse, com.google.gson.JsonArray.class);
            List<Map<String, Object>> skills = new java.util.ArrayList<>();
            for (com.google.gson.JsonElement el : array) {
                JsonObject obj = el.getAsJsonObject();
                Map<String, Object> map = new java.util.HashMap<>();
                map.put("skill", obj.get("skill").getAsString());
                map.put("demand", obj.get("demand").getAsLong());
                skills.add(map);
            }
            return skills;
        } catch (Exception e) {
            System.out
                    .println("⚠️ Failed to parse dynamic skills from AI: " + e.getMessage() + "\nRaw: " + jsonResponse);
            return new java.util.ArrayList<>();
        }
    }
}
