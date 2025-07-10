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

    public AudioInstruction addInstruction(AudioInstruction audioInstruction) {
        return audioInstructionRepository.save(audioInstruction);
    }

    private void deleteAudioInstructionById(long id) {
        audioInstructionRepository.deleteById(id);
    }

}
