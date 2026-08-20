package com.aios.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@Configuration
@EnableMongoAuditing
@EnableMongoRepositories(basePackages = "com.aios.repository")
public class MongoConfig {
    // MongoDB config handled by Spring Boot auto-configuration
    // Connection URI set in application.properties
}
