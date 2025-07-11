package com.insp17.ytms.service;

import com.insp17.ytms.entity.AudioInstruction;
import com.insp17.ytms.repository.AudioInstructionRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
@Transactional
public class AudioInstructionService {
    @Autowired
    private AudioInstructionRepository audioInstructionRepository;
    @Autowired
    private FileStorageService fileStorageService;

    @Transactional
    public AudioInstruction addInstruction(AudioInstruction audioInstruction) {
        return audioInstructionRepository.save(audioInstruction);
    }

    @Transactional
    private void deleteAudioInstructionById(long id) {
        audioInstructionRepository.deleteById(id);
    }

    @Transactional
    public void deleteInstruction(Long id) {
        System.out.println("Attempting to delete instruction with ID: " + id);

        AudioInstruction audioInstruction = audioInstructionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("AudioInstruction not found with ID: " + id));

        try {
            fileStorageService.deleteFileFromGCP(audioInstruction.getAudioUrl());
            System.out.println("File deleted from GCP.");
        } catch (Exception e) {
            System.err.println("Error deleting from GCP: " + e.getMessage());
        }

        System.out.println("About to delete from database...");
        int deletedRows = audioInstructionRepository.deleteByIdNativeSql(id);
        System.out.println("Deleted rows: " + deletedRows);

        audioInstructionRepository.flush();
        System.out.println("Flushed changes");
    }

    public AudioInstruction getAudioInstructionById(Long id) {
        return audioInstructionRepository.findById(id).orElseThrow(() -> new RuntimeException("Unable to find audio instruction"));
    }
}
