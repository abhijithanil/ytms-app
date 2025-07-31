package com.insp17.ytms.repository;

import com.insp17.ytms.entity.VideoChapter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VideoChapterRepository extends JpaRepository<VideoChapter, Long> {

    @Query("SELECT vc FROM VideoChapter vc WHERE vc.videoMetadata.id = :metadataId ORDER BY vc.order ASC, vc.timestamp ASC")
    List<VideoChapter> findByVideoMetadataIdOrderByOrder(@Param("metadataId") Long metadataId);

    void deleteByVideoMetadataId(Long metadataId);
}
