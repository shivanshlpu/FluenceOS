package com.aios.repository;

import com.aios.models.JobMarketData;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface JobDataRepo extends MongoRepository<JobMarketData, String> {

    Optional<JobMarketData> findByRole(String role);
}
