package com.insp17.ytms.validation;


import com.insp17.ytms.repository.UserRepository;
import com.insp17.ytms.validation.annotations.Email;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class EmailVerification implements ConstraintValidator<Email, String> {

    @Autowired
    private UserRepository userRepository;

    @Override
    public boolean isValid(String email, ConstraintValidatorContext constraintValidatorContext) {

        if (email == null || email.isBlank() || !email.contains("@")) {
            return false;
        }

        return !userRepository.existsByEmail(email);
    }
}


