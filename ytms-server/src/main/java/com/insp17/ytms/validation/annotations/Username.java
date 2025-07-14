package com.insp17.ytms.validation.annotations;

import com.insp17.ytms.validation.UserNameVerification;
import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

@Documented
@Constraint(validatedBy = UserNameVerification.class)
@Target({ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
public @interface Username {
    String message() default "UserName is not in right format or is already in use";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
