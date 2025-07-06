package com.insp17.ytms.dtos;

import org.springframework.security.core.annotation.AuthenticationPrincipal;

import java.lang.annotation.*;

// Current User Annotation
@Target({ElementType.PARAMETER, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
@AuthenticationPrincipal
public @interface CurrentUser {
}