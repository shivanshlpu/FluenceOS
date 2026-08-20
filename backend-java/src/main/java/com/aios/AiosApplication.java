package com.aios;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class AiosApplication {
    public static void main(String[] args) {
        SpringApplication.run(AiosApplication.class, args);
        System.out.println("🚀 AI Growth OS - Market Engine running on port 8080");
    }
}
