package com.insp17.ytms.validation;

import com.insp17.ytms.repository.UserRepository;
import com.insp17.ytms.validation.annotations.Username;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class UserNameVerification implements ConstraintValidator<Username, String> {

    @Autowired
    private UserRepository userRepository;

    @Override
    public boolean isValid(String userName, ConstraintValidatorContext constraintValidatorContext) {
        if (userName == null || userName.isBlank() || userName.length() < 4) {
            return false;
        }

        return !userRepository.existsByUsername(userName);
    }
}
