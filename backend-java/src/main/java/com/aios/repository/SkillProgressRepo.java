package com.aios.repository;

import com.aios.models.SkillProgress;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface SkillProgressRepo extends MongoRepository<SkillProgress, String> {

    List<SkillProgress> findByUserId(String userId);

    Optional<SkillProgress> findByUserIdAndSkillName(String userId, String skillName);

    List<SkillProgress> findByUserIdAndCategory(String userId, String category);
}
